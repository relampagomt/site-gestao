# backend/src/routes/fleet.py
# CRUD de Veículos + Abastecimentos em Firestore
# -> Substitua o arquivo por este conteúdo INTEIRO.
# -> Corrige inicialização do Firebase (erro ASN.1/extra data) tratando credenciais
#    via arquivo, JSON em env e Base64, normalizando quebras de linha do private_key.

from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import json
import base64

# ==== Firebase / Firestore =====================================================
import firebase_admin
from firebase_admin import credentials, firestore

def _load_sa_from_env() -> dict | None:
    """
    Tenta carregar as credenciais do Service Account a partir de variáveis de ambiente.
    Suporta:
      - FIREBASE_CREDENTIALS_JSON (JSON puro)
      - FIREBASE_CREDENTIALS (JSON puro)
      - FIREBASE_CREDENTIALS_BASE64 (JSON em Base64)
    Normaliza o campo private_key substituindo '\\n' por '\n'.
    """
    raw = os.getenv("FIREBASE_CREDENTIALS_JSON") or os.getenv("FIREBASE_CREDENTIALS")
    if raw:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # às vezes vem como base64 por engano
            try:
                data = json.loads(base64.b64decode(raw).decode("utf-8"))
            except Exception:
                data = None
        if isinstance(data, dict):
            if "private_key" in data and isinstance(data["private_key"], str):
                data["private_key"] = data["private_key"].replace("\\n", "\n")
            return data

    b64 = os.getenv("FIREBASE_CREDENTIALS_BASE64")
    if b64:
        try:
            data = json.loads(base64.b64decode(b64).decode("utf-8"))
            if "private_key" in data and isinstance(data["private_key"], str):
                data["private_key"] = data["private_key"].replace("\\n", "\n")
            return data
        except Exception:
            return None
    return None

def _load_sa_from_file(path: str) -> dict | None:
    """
    Carrega o JSON do arquivo e normaliza o private_key (\n).
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "private_key" in data and isinstance(data["private_key"], str):
            data["private_key"] = data["private_key"].replace("\\n", "\n")
        return data
    except Exception:
        return None

def _ensure_firebase():
    """
    Inicializa o firebase_admin de forma resiliente:
      1) Usa credenciais via JSON de env (FIREBASE_CREDENTIALS_JSON / FIREBASE_CREDENTIALS / FIREBASE_CREDENTIALS_BASE64)
      2) Usa caminho de arquivo em GOOGLE_APPLICATION_CREDENTIALS (lendo e normalizando o private_key)
      3) Procura firebase-credentials.json em locais comuns do projeto
      4) Por fim, tenta inicializar sem credencial explícita (ADC)
    """
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass

    # 1) Env JSON
    sa = _load_sa_from_env()
    if sa:
        firebase_admin.initialize_app(credentials.Certificate(sa))
        return

    # 2) Caminho em GOOGLE_APPLICATION_CREDENTIALS
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        sa = _load_sa_from_file(cred_path)
        if sa:
            firebase_admin.initialize_app(credentials.Certificate(sa))
            return

    # 3) Arquivo no repositório (tenta alguns caminhos)
    here = os.path.dirname(os.path.abspath(__file__))                 # backend/src/routes
    src_root = os.path.abspath(os.path.join(here, "..", ".."))        # backend/src
    repo_root = os.path.abspath(os.path.join(src_root, ".."))         # backend/
    guesses = [
        os.path.join(src_root, "firebase-credentials.json"),
        os.path.join(repo_root, "firebase-credentials.json"),
    ]
    for g in guesses:
        if os.path.exists(g):
            sa = _load_sa_from_file(g)
            if sa:
                firebase_admin.initialize_app(credentials.Certificate(sa))
                return

    # 4) ADC (útil se a plataforma já injeta credenciais)
    firebase_admin.initialize_app()

_ensure_firebase()
db = firestore.client()

# ==== Blueprint ================================================================
fleet_bp = Blueprint("fleet", __name__)

# ==== Helpers =================================================================
COL_VEHICLES  = "fleet_vehicles"
COL_FUEL_LOGS = "fleet_fuel_logs"

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
    ref = db.collection(COL_VEHICLES).add(data)[1]
    return jsonify(_doc_to_dict(ref.get())), 201

@fleet_bp.put("/fleet/vehicles/<id>")
def vehicles_update(id):
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
    # remove strings vazias
    patch = {k: v for k, v in patch.items() if not (isinstance(v, str) and v == "")}
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
    items = [_doc_to_dict(doc) for doc in q.stream()]
    return jsonify(items), 200

@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
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

    # snapshot de modelo a partir da placa (opcional)
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
    clean = {}
    for k, v in patch.items():
        if isinstance(v, str):
            if v != "":
                clean[k] = v
        else:
            if v is not None:
                clean[k] = v

    # recalcula total se litros/preço mudaram
    base = snap.to_dict() or {}
    litros = clean.get("litros", base.get("litros", 0))
    preco  = clean.get("preco_litro", base.get("preco_litro", 0))
    if "litros" in clean or "preco_litro" in clean:
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

# Opcional: health do módulo
@fleet_bp.get("/fleet/health")
def fleet_health():
    return jsonify({"ok": True, "module": "fleet"}), 200
