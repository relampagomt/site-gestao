# backend/src/routes/fleet.py
# Firestore CRUD (Veículos + Abastecimentos) com:
# - normalização de DATA (aceita "DD/MM/AAAA", "DDMMAAAA" e "AAAA-MM-DD")
# - filtros por placa, veiculo (carro), motorista, combustivel, posto, preço (min/max) e datas (de/ate)
# - sem inicialização de credencial aqui (usa app já inicializado)

from flask import Blueprint, request, jsonify
from datetime import datetime
import firebase_admin
from firebase_admin import firestore

fleet_bp = Blueprint("fleet", __name__)

COL_VEHICLES  = "fleet_vehicles"
COL_FUEL_LOGS = "fleet_fuel_logs"

# ----------------- helpers comuns -----------------
def _now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _doc(snap):
    d = snap.to_dict() or {}
    d["id"] = snap.id
    return d

def _get_db():
    try:
        firebase_admin.get_app()
    except ValueError:
        # fallback leve (ADC), não quebra se já houver app
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

def _normalize_date(s: str) -> str:
    """
    Converte para 'AAAA-MM-DD'.
    Aceita:
      - 'AAAA-MM-DD'  -> retorna igual
      - 'DD/MM/AAAA'  -> converte
      - 'DDMMAAAA'    -> converte
      - caso não reconheça, devolve os 10 primeiros chars
    """
    if not s:
        return ""
    s = str(s).strip()
    if len(s) >= 10 and s[4:5] == "-" and s[7:8] == "-":
        return s[:10]
    if len(s) >= 10 and s[2:3] == "/" and s[5:6] == "/":
        dd, mm, yy = s[:10].split("/")
        return f"{yy}-{mm}-{dd}"
    if len(s) == 8 and s.isdigit():
        dd, mm, yy = s[:2], s[2:4], s[4:8]
        return f"{yy}-{mm}-{dd}"
    return s[:10]

def _contains(val: str, term: str) -> bool:
    if not term:
        return True
    return term.lower() in (val or "").lower()

# ==============================================================================
# VEÍCULOS
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
# ABASTECIMENTOS
# ==============================================================================

@fleet_bp.get("/fleet/fuel-logs")
def fuel_list():
    """
    Filtros (querystring):
      placa, veiculo (carro), motorista, combustivel, posto,
      precoMin, precoMax  (preço por litro)
      de, ate             (datas 'AAAA-MM-DD' ou 'DD/MM/AAAA' ou 'DDMMAAAA')
    """
    db = _get_db()
    args = request.args

    placa       = (args.get("placa") or "").upper().strip()
    veiculo     = (args.get("veiculo") or args.get("carro") or "").strip()
    motorista   = (args.get("motorista") or "").strip()
    combustivel = (args.get("combustivel") or "").strip()
    posto       = (args.get("posto") or "").strip()
    preco_min   = _parse_float(args.get("precoMin"), None)
    preco_max   = _parse_float(args.get("precoMax"), None)
    de          = _normalize_date(args.get("de") or args.get("dataDe") or "")
    ate         = _normalize_date(args.get("ate") or args.get("dataAte") or "")

    # Busca base ordenada por data; aplicamos filtros em memória para evitar índices compostos
    q = db.collection(COL_FUEL_LOGS).order_by("data")
    items = [_doc(doc) for doc in q.stream()]

    def keep(it):
        if placa and (it.get("placa") or "").upper() != placa:
            return False
        if veiculo and not _contains(it.get("carro"), veiculo):
            return False
        if motorista and not _contains(it.get("motorista"), motorista):
            return False
        if combustivel and (it.get("combustivel") or "").lower() != combustivel.lower():
            return False
        if posto and not _contains(it.get("posto"), posto):
            return False
        if preco_min is not None and _parse_float(it.get("preco_litro")) < preco_min:
            return False
        if preco_max is not None and _parse_float(it.get("preco_litro")) > preco_max:
            return False
        d = _normalize_date(it.get("data"))
        if de and d < de:
            return False
        if ate and d > ate:
            return False
        return True

    items = [it for it in items if keep(it)]
    return jsonify(items), 200

@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
    db = _get_db()
    b = request.get_json(force=True) or {}
    data = {
        "placa":       (b.get("placa") or "").upper().strip(),
        "carro":       (b.get("carro") or "").strip(),
        "motorista":   (b.get("motorista") or "").strip(),
        "data":        _normalize_date(b.get("data")),
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

    # snapshot do modelo pela placa (se houver)
    if data["placa"] and not data["carro"]:
        vq = db.collection(COL_VEHICLES).where("placa", "==", data["placa"]).limit(1).stream()
        for vdoc in vq:
            v = vdoc.to_dict() or {}
            data["carro"] = v.get("modelo") or v.get("marca") or ""

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
        "data":        _normalize_date(b.get("data")),
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
