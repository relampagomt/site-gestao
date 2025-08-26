# backend/src/routes/fleet.py
# Firestore CRUD sem inicializar Firebase aqui (evita erro ASN.1 no Render).
# Usa o app já inicializado pelos serviços centrais do projeto.

from flask import Blueprint, request, jsonify
from datetime import datetime
import firebase_admin
from firebase_admin import firestore

fleet_bp = Blueprint("fleet", __name__)

COL_VEHICLES  = "fleet_vehicles"
COL_FUEL_LOGS = "fleet_fuel_logs"

def _now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _doc(snap):
    if hasattr(snap, "to_dict"):
        d = snap.to_dict() or {}
        d["id"] = snap.id
        return d
    return snap or {}

def _get_db():
    # NÃO inicialize aqui com credenciais. Apenas garanta que há um app.
    try:
        firebase_admin.get_app()
    except ValueError:
        # fallback leve: usa ADC se existir (não quebra se já houver app)
        firebase_admin.initialize_app()
    return firestore.client()

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
# Veículos
# ==============================================================================

@fleet_bp.get("/fleet/vehicles")
def vehicles_list():
    db = _get_db()
    q = db.collection(COL_VEHICLES).order_by("created_at")
    return jsonify([_doc(doc) for doc in q.stream()]), 200

@fleet_bp.post("/fleet/vehicles")
def vehicles_create():
    db = _get_db()
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
    ref = db.collection(COL_VEHICLES).add(data)[1]
    return jsonify(_doc(ref.get())), 201

@fleet_bp.put("/fleet/vehicles/<id>")
def vehicles_update(id):
    db = _get_db()
    ref = db.collection(COL_VEHICLES).document(id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({"error": "Veículo não encontrado"}), 404
    b = request.get_json(force=True) or {}
    patch = {
        "placa":  (b.get("placa")  or "").upper().strip(),
        "modelo": (b.get("modelo") or "").strip(),
        "marca":  (b.get("marca")  or "").strip(),
        "ano":    (b.get("ano")    or "").strip(),
        "ativo":  bool(b.get("ativo", snap.to_dict().get("ativo", True))),
        "updated_at": _now_iso(),
    }
    patch = {k: v for k, v in patch.items() if not (isinstance(v, str) and v == "")}
    ref.update(patch)
    return jsonify(_doc(ref.get())), 200

@fleet_bp.delete("/fleet/vehicles/<id>")
def vehicles_delete(id):
    db = _get_db()
    ref = db.collection(COL_VEHICLES).document(id)
    if not ref.get().exists:
        return jsonify({"error": "Veículo não encontrado"}), 404
    ref.delete()
    return ("", 204)

# ==============================================================================
# Abastecimentos
# ==============================================================================

@fleet_bp.get("/fleet/fuel-logs")
def fuel_list():
    db = _get_db()
    placa = (request.args.get("placa") or "").strip().upper()
    de    = request.args.get("de")
    ate   = request.args.get("ate")
    q = db.collection(COL_FUEL_LOGS)
    if placa:
        q = q.where("placa", "==", placa)
    if de:
        q = q.where("data", ">=", de)
    if ate:
        q = q.where("data", "<=", ate)
    q = q.order_by("data")
    return jsonify([_doc(doc) for doc in q.stream()]), 200

@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
    db = _get_db()
    b = request.get_json(force=True) or {}
    data = {
        "placa":       (b.get("placa") or "").upper().strip(),
        "carro":       (b.get("carro") or "").strip(),
        "motorista":   (b.get("motorista") or "").strip(),
        "data":        (b.get("data") or "")[:10],  # YYYY-MM-DD
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
    if not data["valor_total"]:
        data["valor_total"] = round(data["litros"] * (data["preco_litro"] or 0), 2)

    if data["placa"]:
        vq = db.collection(COL_VEHICLES).where("placa", "==", data["placa"]).limit(1).stream()
        for vdoc in vq:
            v = vdoc.to_dict() or {}
            data.setdefault("carro", v.get("modelo") or v.get("marca") or "")

    ref = db.collection(COL_FUEL_LOGS).add(data)[1]
    return jsonify(_doc(ref.get())), 201

@fleet_bp.put("/fleet/fuel-logs/<id>")
def fuel_update(id):
    db = _get_db()
    ref = db.collection(COL_FUEL_LOGS).document(id)
    snap = ref.get()
    if not snap.exists:
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
    # remove strings vazias; mantém numéricos/booleanos válidos
    clean = {}
    for k, v in patch.items():
        if isinstance(v, str):
            if v != "":
                clean[k] = v
        else:
            if v is not None:
                clean[k] = v

    base = snap.to_dict() or {}
    if "litros" in clean or "preco_litro" in clean:
        litros = clean.get("litros", base.get("litros", 0))
        preco  = clean.get("preco_litro", base.get("preco_litro", 0))
        clean.setdefault("valor_total", round(float(litros) * float(preco or 0), 2))

    ref.update(clean)
    return jsonify(_doc(ref.get())), 200

@fleet_bp.delete("/fleet/fuel-logs/<id>")
def fuel_delete(id):
    db = _get_db()
    ref = db.collection(COL_FUEL_LOGS).document(id)
    if not ref.get().exists:
        return jsonify({"error": "Registro não encontrado"}), 404
    ref.delete()
    return ("", 204)

@fleet_bp.get("/fleet/health")
def fleet_health():
    return jsonify({"ok": True, "module": "fleet"}), 200
