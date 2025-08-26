# backend/src/routes/fleet.py
# Firestore CRUD para Frota (Veículos + Abastecimentos)

from flask import Blueprint, request, jsonify
from datetime import datetime
import firebase_admin
from firebase_admin import firestore

fleet_bp = Blueprint("fleet", __name__)

COL_VEHICLES = "fleet_vehicles"
COL_FUEL_LOGS = "fleet_fuel_logs"


# ----------------- helpers -----------------
def _now_iso():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _doc(snap):
    d = snap.to_dict() or {}
    d["id"] = snap.id
    return d


def _get_db():
    """Inicializa o app Firebase se necessário (credenciais já devem estar configuradas no ambiente)."""
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app()
    return firestore.client()


def _parse_float(v, default=0.0):
    """
    Converte para float aceitando formatos BR/US.
    - '1.234,56' -> 1234.56
    - '1234,56'  -> 1234.56
    - '1,234.56' -> 1234.56
    - '4.00'     -> 4.0
    Se default for None e valor vazio, retorna None.
    """
    try:
        if v is None or v == "":
            return default
        if isinstance(v, (int, float)):
            return float(v)

        s = str(v).strip().replace(" ", "")

        if "," in s and "." in s:
            # assume '.' como milhar e ',' como decimal (pt-BR)
            s = s.replace(".", "").replace(",", ".")
        elif "," in s:
            # só vírgula -> decimal BR
            s = s.replace(",", ".")
        else:
            # ponto já é decimal (mantém)
            s = s

        return float(s)
    except Exception:
        return default


def _parse_int(v, default=0):
    """
    Converte para inteiro tratando separadores de milhar.
    - '55000'   -> 55000
    - '55.000'  -> 55000
    - '55,000'  -> 55000
    - ''/None   -> default
    """
    try:
        if v is None or v == "":
            return default
        if isinstance(v, (int, float)):
            return int(v)
        s = "".join(ch for ch in str(v) if ch.isdigit())
        return int(s) if s else default
    except Exception:
        return default


def _normalize_date(s: str) -> str:
    """Converte para 'AAAA-MM-DD' (aceita 'AAAA-MM-DD', 'DD/MM/AAAA', 'DDMMAAAA')."""
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
    items = [_doc(doc) for doc in db.collection(COL_VEHICLES).stream()]
    items.sort(key=lambda x: x.get("created_at", ""))
    return jsonify(items), 200


@fleet_bp.post("/fleet/vehicles")
def vehicles_create():
    db = _get_db()
    b = request.get_json(force=True) or {}
    data = {
        "placa": (b.get("placa") or "").upper().strip(),
        "modelo": (b.get("modelo") or "").strip(),
        "marca": (b.get("marca") or "").strip(),
        "ano": (b.get("ano") or "").strip(),
        "ativo": bool(b.get("ativo", True)),
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
        "placa": (b.get("placa") or "").upper().strip(),
        "modelo": (b.get("modelo") or "").strip(),
        "marca": (b.get("marca") or "").strip(),
        "ano": (b.get("ano") or "").strip(),
        "ativo": bool(b.get("ativo", snap.to_dict().get("ativo", True))),
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
      precoMin, precoMax, de, ate
    """
    db = _get_db()
    args = request.args

    placa = (args.get("placa") or "").upper().strip()
    veiculo = (args.get("veiculo") or args.get("carro") or "").strip()
    motorista = (args.get("motorista") or "").strip()
    combustivel = (args.get("combustivel") or "").strip()
    posto = (args.get("posto") or "").strip()
    preco_min = _parse_float(args.get("precoMin"), None)
    preco_max = _parse_float(args.get("precoMax"), None)
    de = _normalize_date(args.get("de") or args.get("dataDe") or "")
    ate = _normalize_date(args.get("ate") or args.get("dataAte") or "")

    # Busca tudo e filtra/ordena em memória (evita necessidade de índices compostos)
    items = [_doc(doc) for doc in db.collection(COL_FUEL_LOGS).stream()]

    norm = []
    for it in items:
        it["data"] = _normalize_date(it.get("data"))
        if placa and (it.get("placa") or "").upper() != placa:
            continue
        if veiculo and not _contains(it.get("carro"), veiculo):
            continue
        if motorista and not _contains(it.get("motorista"), motorista):
            continue
        if combustivel and (it.get("combustivel") or "").lower() != combustivel.lower():
            continue
        if posto and not _contains(it.get("posto"), posto):
            continue
        if preco_min is not None and _parse_float(it.get("preco_litro")) < preco_min:
            continue
        if preco_max is not None and _parse_float(it.get("preco_litro")) > preco_max:
            continue
        if de and it["data"] and it["data"] < de:
            continue
        if ate and it["data"] and it["data"] > ate:
            continue
        norm.append(it)

    norm.sort(key=lambda x: x.get("data", ""))
    return jsonify(norm), 200


@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
    db = _get_db()
    b = request.get_json(force=True) or {}
    data = {
        "placa": (b.get("placa") or "").upper().strip(),
        "carro": (b.get("carro") or "").strip(),
        "motorista": (b.get("motorista") or "").strip(),
        "data": _normalize_date(b.get("data")),
        "litros": _parse_float(b.get("litros")),
        "preco_litro": _parse_float(b.get("preco_litro") or b.get("preco") or b.get("precoLitro")),
        "valor_total": _parse_float(b.get("valor_total") or b.get("valor") or 0),
        "odometro": _parse_int(b.get("odometro") or b.get("km") or 0),
        "posto": (b.get("posto") or "").strip(),
        "nota_fiscal": (b.get("nota_fiscal") or b.get("nf") or "").strip(),
        "observacoes": (b.get("observacoes") or b.get("obs") or "").strip(),
        "combustivel": (b.get("combustivel") or "Gasolina").strip(),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    if not data["valor_total"]:
        data["valor_total"] = round(data["litros"] * (data["preco_litro"] or 0), 2)

    # snapshot do modelo do veículo pela placa (se não enviado)
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
        "placa": (b.get("placa") or "").upper().strip(),
        "carro": (b.get("carro") or "").strip(),
        "motorista": (b.get("motorista") or "").strip(),
        "data": _normalize_date(b.get("data")),
        "litros": _parse_float(b.get("litros")),
        "preco_litro": _parse_float(b.get("preco_litro") or b.get("preco") or b.get("precoLitro")),
        "valor_total": _parse_float(b.get("valor_total") or b.get("valor") or 0),
        "odometro": _parse_int(b.get("odometro") or b.get("km") or 0),
        "posto": (b.get("posto") or "").strip(),
        "nota_fiscal": (b.get("nota_fiscal") or b.get("nf") or "").strip(),
        "observacoes": (b.get("observacoes") or b.get("obs") or "").strip(),
        "combustivel": (b.get("combustivel") or "").strip(),
        "updated_at": _now_iso(),
    }

    # limpa strings vazias e None
    clean = {}
    for k, v in patch.items():
        if isinstance(v, str):
            if v != "":
                clean[k] = v
        else:
            if v is not None:
                clean[k] = v

    # recalcula valor_total quando litros/preço mudarem
    base = snap.to_dict() or {}
    if "litros" in clean or "preco_litro" in clean:
        litros = clean.get("litros", base.get("litros", 0))
        preco = clean.get("preco_litro", base.get("preco_litro", 0))
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
