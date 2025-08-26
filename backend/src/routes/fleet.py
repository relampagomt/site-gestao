# backend/src/routes/fleet.py
# CRUD de Veículos + Abastecimentos (Firestorm/Firestore), rotas /api/fleet/*
# Substitui o arquivo atual por este INTEIRO.

from flask import Blueprint, request, jsonify
from datetime import datetime
import os

# ---- Firestore bootstrap -----------------------------------------------------
# Usa credenciais via GOOGLE_APPLICATION_CREDENTIALS. Se não houver, tenta encontrar
# firebase-credentials.json na raiz do backend.
import firebase_admin
from firebase_admin import credentials, firestore

def _ensure_firebase():
    try:
        firebase_admin.get_app()
    except ValueError:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            # tenta resolver automaticamente (backend/ .. /firebase-credentials.json)
            here = os.path.dirname(os.path.abspath(__file__))                           # backend/src/routes
            root = os.path.abspath(os.path.join(here, "..", ".."))                     # backend/src
            guess1 = os.path.join(root, "firebase-credentials.json")                   # backend/src/firebase-credentials.json
            guess2 = os.path.abspath(os.path.join(root, "..", "firebase-credentials.json"))  # backend/firebase-credentials.json
            cred_path = guess1 if os.path.exists(guess1) else (guess2 if os.path.exists(guess2) else None)
        if cred_path and os.path.exists(cred_path):
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
        else:
            # Último recurso: inicializa sem arquivo se a Render tiver ADC configurada
            firebase_admin.initialize_app()

_ensure_firebase()
db = firestore.client()

# ---- Blueprint ----------------------------------------------------------------
fleet_bp = Blueprint("fleet", __name__)

# ---- Helpers ------------------------------------------------------------------
COL_VEHICLES   = "fleet_vehicles"
COL_FUEL_LOGS  = "fleet_fuel_logs"

def _now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _doc_to_dict(doc):
    d = doc.to_dict() or {}
    d["id"] = doc.id
    return d

def _parse_float(v, default=0.0):
    try:
        if v is None or v == "":
            return float(default)
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v).replace(".", "").replace(",", ".")
        return float(s)
    except Exception:
        return float(default)

def _parse_int(v, default=0):
    try:
        if v is None or v == "":
            return int(default)
        return int(float(v))
    except Exception:
        return int(default)

# ==============================================================================
# VEÍCULOS
# ==============================================================================

@fleet_bp.get("/fleet/vehicles")
def vehicles_list():
    q = db.collection(COL_VEHICLES).order_by("created_at")
    items = [_doc_to_dict(doc) for doc in q.stream()]
    return jsonify(items), 200

@fleet_bp.post("/fleet/vehicles")
def vehicles_create():
    b = request.get_json(force=True) or {}
    data = {
        "placa":  (b.get("placa")  or "").upper().strip(),
        "modelo": (b.get("modelo") or "").strip(),
        "marca":  (b.get("marca")  or "").strip(),
        "ano":    (b.get("ano")    or "").strip(),
        "ativo":  bool(b.get("ativo", True)),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    ref = db.collection(COL_VEHICLES).add(data)[1]  # add retorna (update_time, ref)
    doc = ref.get()
    return jsonify(_doc_to_dict(doc)), 201

@fleet_bp.put("/fleet/vehicles/<id>")
def vehicles_update(id):
    ref = db.collection(COL_VEHICLES).document(id)
    if not ref.get().exists:
        return jsonify({"error": "Veículo não encontrado"}), 404
    b = request.get_json(force=True) or {}
    patch = {
        "placa":  (b.get("placa")  or "").upper().strip(),
        "modelo": (b.get("modelo") or "").strip(),
        "marca":  (b.get("marca")  or "").strip(),
        "ano":    (b.get("ano")    or "").strip(),
        "ativo":  bool(b.get("ativo", True)),
        "updated_at": _now_iso(),
    }
    # remove chaves vazias para não sobrescrever com string vazia quando não vier no payload
    patch = {k: v for k, v in patch.items() if v != ""}
    ref.update(patch)
    return jsonify(_doc_to_dict(ref.get())), 200

@fleet_bp.delete("/fleet/vehicles/<id>")
def vehicles_delete(id):
    ref = db.collection(COL_VEHICLES).document(id)
    if not ref.get().exists:
        return jsonify({"error": "Veículo não encontrado"}), 404
    ref.delete()
    return ("", 204)

# ==============================================================================
# ABASTECIMENTOS
# ==============================================================================

@fleet_bp.get("/fleet/fuel-logs")
def fuel_list():
    # suporta filtros simples via querystring: placa, de, ate (YYYY-MM-DD)
    placa = request.args.get("placa", "").strip().upper()
    de    = request.args.get("de")
    ate   = request.args.get("ate")

    q = db.collection(COL_FUEL_LOGS)
    if placa:
        q = q.where("placa", "==", placa)
    # datas salvas como ISO (YYYY-MM-DD), então podemos filtrar por string
    if de:
        q = q.where("data", ">=", de)
    if ate:
        q = q.where("data", "<=", ate)

    q = q.order_by("data")
    items = [_doc_to_dict(doc) for doc in q.stream()]
    return jsonify(items), 200

@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
    b = request.get_json(force=True) or {}
    data = {
        "placa":       (b.get("placa") or "").upper().strip(),
        "carro":       (b.get("carro") or "").strip(),          # opcional (modelo)
        "motorista":   (b.get("motorista") or "").strip(),
        "data":        (b.get("data") or "")[:10],              # "YYYY-MM-DD"
        "litros":      _parse_float(b.get("litros")),
        "preco_litro": _parse_float(b.get("preco_litro") or b.get("preco") or b.get("precoLitro")),
        "valor_total": _parse_float(b.get("valor_total") or b.get("valor") or 0),
        "odometro":    _parse_int(b.get("odometro") or b.get("km") or 0),
        "posto":       (b.get("posto") or "").strip(),
        "nota_fiscal": (b.get("nota_fiscal") or b.get("nf") or "").strip(),
        "observacoes": (b.get("observacoes") or b.get("obs") or "").strip(),
        "combustivel": (b.get("combustivel") or "Gasolina").strip(),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    # calcula valor_total caso não enviado
    if not data["valor_total"]:
        data["valor_total"] = round(data["litros"] * (data["preco_litro"] or 0), 2)

    # guarda snapshot da placa/modelo do veículo (opcional)
    if data["placa"]:
        vq = db.collection(COL_VEHICLES).where("placa", "==", data["placa"]).limit(1).stream()
        for vdoc in vq:
            v = vdoc.to_dict() or {}
            data.setdefault("carro", v.get("modelo") or v.get("marca") or "")

    ref = db.collection(COL_FUEL_LOGS).add(data)[1]
    return jsonify(_doc_to_dict(ref.get())), 201

@fleet_bp.put("/fleet/fuel-logs/<id>")
def fuel_update(id):
    ref = db.collection(COL_FUEL_LOGS).document(id)
    if not ref.get().exists:
        return jsonify({"error": "Registro não encontrado"}), 404
    b = request.get_json(force=True) or {}
    patch = {
        "placa":       (b.get("placa") or "").upper().strip(),
        "carro":       (b.get("carro") or "").strip(),
        "motorista":   (b.get("motorista") or "").strip(),
        "data":        (b.get("data") or "")[:10],
        "litros":      _parse_float(b.get("litros")),
        "preco_litro": _parse_float(b.get("preco_litro") or b.get("preco") or b.get("precoLitro")),
        "valor_total": _parse_float(b.get("valor_total") or b.get("valor") or 0),
        "odometro":    _parse_int(b.get("odometro") or b.get("km") or 0),
        "posto":       (b.get("posto") or "").strip(),
        "nota_fiscal": (b.get("nota_fiscal") or b.get("nf") or "").strip(),
        "observacoes": (b.get("observacoes") or b.get("obs") or "").strip(),
        "combustivel": (b.get("combustivel") or "").strip(),
        "updated_at": _now_iso(),
    }
    # limpa campos vazios para não sobrescrever com ""
    clean = {}
    for k, v in patch.items():
        if isinstance(v, str):
            if v != "":
                clean[k] = v
        else:
            if v is not None:
                clean[k] = v
    # se preço/litro ou litros mudou, recalcula
    if "litros" in clean or "preco_litro" in clean:
        litros = clean.get("litros", ref.get().to_dict().get("litros", 0))
        preco  = clean.get("preco_litro", ref.get().to_dict().get("preco_litro", 0))
        clean.setdefault("valor_total", round(float(litros) * float(preco or 0), 2))
    ref.update(clean)
    return jsonify(_doc_to_dict(ref.get())), 200

@fleet_bp.delete("/fleet/fuel-logs/<id>")
def fuel_delete(id):
    ref = db.collection(COL_FUEL_LOGS).document(id)
    if not ref.get().exists:
        return jsonify({"error": "Registro não encontrado"}), 404
    ref.delete()
    return ("", 204)

# ------------------------------------------------------------------------------
# (Opcional) Health local do módulo
# ------------------------------------------------------------------------------
@fleet_bp.get("/fleet/health")
def _health():
    return jsonify({"ok": True, "module": "fleet"}), 200
