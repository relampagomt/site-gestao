# backend/src/routes/finance.py
import os
import json
import base64
import uuid
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import get_jwt_identity
from src.middleware.auth_middleware import roles_allowed

log = logging.getLogger(__name__)
finance_bp = Blueprint("finance", __name__)

# ============================ Constantes ============================
_VALID_TYPES = {"entrada", "saida", "despesa"}
_COLL = os.getenv("FINANCE_COLL", "finance_transactions")

# Fallback JSON (volátil no plano grátis da Render)
_JSON_PATH = os.getenv("FINANCE_JSON_PATH") or "/tmp/finance_transactions.json"

# Firestore toggle
_USE_FIRESTORE = (os.getenv("USE_FIRESTORE", "true").lower() in ("1", "true", "yes"))

# CORS: FRONTEND_URL pode ter várias origens separadas por vírgula
_ALLOWED_ORIGINS = set(
    [o.strip() for o in (os.getenv("FRONTEND_URL") or "").split(",") if o.strip()]
)
_DEFAULT_ALLOW_ORIGIN = "*" if not _ALLOWED_ORIGINS else None


# ============================ Utils gerais =============================
def _iso_date_only(val) -> str:
    """Normaliza para YYYY-MM-DD; retorna '' se inválida."""
    s = str(val or "")[:10]
    try:
        d = datetime.strptime(s, "%Y-%m-%d")
        return d.strftime("%Y-%m-%d")
    except Exception:
        # tenta DD/MM/AAAA
        try:
            d = datetime.strptime(str(val or ""), "%d/%m/%Y")
            return d.strftime("%Y-%m-%d")
        except Exception:
            return ""


def _to_number(v):
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    # BR -> EN
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        try:
            return float(v)
        except Exception:
            return 0.0


def _month_range(ym: str) -> Optional[tuple[str, str]]:
    """Recebe YYYY-MM e retorna (YYYY-MM-01, YYYY-MM-último)"""
    if not ym or len(ym) != 7 or "-" not in ym:
        return None
    y, m = ym.split("-")
    try:
        y, m = int(y), int(m)
        start = datetime(y, m, 1)
        if m == 12:
            end = datetime(y + 1, 1, 1) - timedelta(days=1)
        else:
            end = datetime(y, m + 1, 1) - timedelta(days=1)
        return (start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
    except Exception:
        return None


def _decode_b64_json(b64) -> Optional[dict]:
    try:
        raw = base64.b64decode(b64).decode("utf-8")
        return json.loads(raw)
    except Exception:
        return None


# ============================ Firestore I/O ============================
_fs_client = None
_fs_ready: Optional[bool] = None

def _get_firestore():
    """Inicializa Firestore com FIREBASE_CREDENTIALS_B64 ou GOOGLE_APPLICATION_CREDENTIALS_JSON."""
    global _fs_client, _fs_ready

    if not _USE_FIRESTORE:
        _fs_ready = False
        return None

    if _fs_ready is not None:
        return _fs_client if _fs_ready else None

    try:
        from google.cloud import firestore  # type: ignore
    except Exception as e:
        log.warning("[finance] google-cloud-firestore não instalado: %s", e)
        _fs_ready = False
        return None

    try:
        b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
        if b64:
            from google.oauth2 import service_account  # type: ignore
            info = _decode_b64_json(b64)
            if not info:
                raise RuntimeError("FIREBASE_CREDENTIALS_B64 inválido")
            creds = service_account.Credentials.from_service_account_info(info)
            project = info.get("project_id") or os.getenv("FIREBASE_PROJECT_ID")
            _client = firestore.Client(credentials=creds, project=project)
            _fs_ready = True
            _fs_client = _client
            return _fs_client

        gac_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if gac_json:
            from google.oauth2 import service_account  # type: ignore
            info = json.loads(gac_json)
            creds = service_account.Credentials.from_service_account_info(info)
            _client = firestore.Client(credentials=creds, project=info.get("project_id"))
            _fs_ready = True
            _fs_client = _client
            return _fs_client

        _client = firestore.Client()
        _fs_ready = True
        _fs_client = _client
        return _fs_client

    except Exception as e:
        log.warning("[finance] Firestore indisponível: %s (usando fallback JSON)", e)
        _fs_ready = False
        _fs_client = None
        return None


# ========================== Fallback JSON I/O ====================
def _json_load() -> List[Dict[str, Any]]:
    try:
        if not os.path.exists(_JSON_PATH):
            return []
        with open(_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception as e:
        log.exception("[finance] erro lendo JSON: %s", e)
        return []


def _json_save(items: List[Dict[str, Any]]) -> None:
    try:
        with open(_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False)
    except Exception as e:
        log.exception("[finance] erro salvando JSON: %s", e)


# ============================ FS helpers ============================
def _doc_to_json(d: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(d)
    out["amount"] = _to_number(out.get("amount"))
    if out.get("date"):
        out["date"] = _iso_date_only(out["date"]) or out["date"]
    return out


def _fs_list(ttype: str, action_id: str, month: str) -> List[Dict[str, Any]]:
    client = _get_firestore()
    if not client:
        return _json_load()

    try:
        coll = client.collection(_COLL)
        docs = [d.to_dict() for d in coll.stream()]
        items = []
        for d in docs:
            it = {
                "id": d.get("id") or d.get("doc_id") or d.get("uuid"),
                "type": d.get("type"),
                "date": d.get("date"),
                "amount": _to_number(d.get("amount")),
                "category": d.get("category") or "",
                "notes": d.get("notes") or "",
                "action_id": d.get("action_id"),
                "created_by": d.get("created_by"),
                "created_at": d.get("created_at"),
            }
            items.append(_doc_to_json(it))

        if ttype in _VALID_TYPES:
            items = [x for x in items if (x.get("type") or "") == ttype]
        if action_id:
            items = [x for x in items if str(x.get("action_id") or "") == action_id]
        if month:
            r = _month_range(month)
            if r:
                a, b = r
                items = [x for x in items if a <= (x.get("date") or "") <= b]

        # ordena por date desc, created_at desc
        items.sort(key=lambda x: ((x.get("date") or ""), (x.get("created_at") or "")), reverse=True)
        return items
    except Exception as e:
        log.exception("[finance][fs_list] falha: %s", e)
        return _json_load()


def _fs_create(doc: Dict[str, Any]) -> Dict[str, Any]:
    client = _get_firestore()
    if not client:
        items = _json_load()
        items.append(doc)
        _json_save(items)
        return doc

    try:
        client.collection(_COLL).document(doc["id"]).set(doc)
        return doc
    except Exception as e:
        log.exception("[finance][fs_create] falha: %s", e)
        items = _json_load()
        items.append(doc)
        _json_save(items)
        return doc


def _fs_update(txid: str, upd: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = _get_firestore()
    if not client:
        items = _json_load()
        for i, it in enumerate(items):
            if str(it.get("id")) == str(txid):
                items[i].update(upd)
                _json_save(items)
                return items[i]
        return None

    try:
        ref = client.collection(_COLL).document(txid)
        if not ref.get().exists:
            return None
        ref.update(upd)
        return ref.get().to_dict()
    except Exception as e:
        log.exception("[finance][fs_update] falha: %s", e)
        return None


def _fs_delete(txid: str) -> bool:
    client = _get_firestore()
    if not client:
        items = _json_load()
        new_items = [x for x in items if str(x.get("id")) != str(txid)]
        _json_save(new_items)
        return True

    try:
        ref = client.collection(_COLL).document(txid)
        if not ref.get().exists:
            return True
        ref.delete()
        return True
    except Exception as e:
        log.exception("[finance][fs_delete] falha: %s", e)
        items = _json_load()
        new_items = [x for x in items if str(x.get("id")) != str(txid)]
        _json_save(new_items)
        return True


# ============================== CORS ===================================
@finance_bp.after_request
def _add_cors_headers(resp: Response):
    origin = request.headers.get("Origin")
    allow = _DEFAULT_ALLOW_ORIGIN
    if origin and _ALLOWED_ORIGINS:
        if origin in _ALLOWED_ORIGINS:
            allow = origin
        else:
            log.debug("[finance][CORS] origem não permitida: %s", origin)

    if allow:
        resp.headers["Access-Control-Allow-Origin"] = allow
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type"
        resp.headers["Access-Control-Max-Age"] = "86400"
    return resp


# ============================ Rotas genéricas ============================
@finance_bp.route("/finance/transactions", methods=["GET"])
@finance_bp.route("/transactions", methods=["GET"])
@roles_allowed('admin')
def list_transactions():
    """
    Query params:
      - type: entrada|saida|despesa
      - action_id: string
      - month: YYYY-MM (opcional, atalho de range)
    """
    try:
        ttype = (request.args.get("type") or "").strip().lower()
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()

        items = _fs_list(ttype, action_id, month)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/finance/transactions", methods=["POST"])
@finance_bp.route("/transactions", methods=["POST"])
@roles_allowed('admin')
def create_transaction():
    try:
        data = request.get_json(silent=True) or {}

        # permite que alias injete json mapeado
        if hasattr(request, "_cached_json") and isinstance(request._cached_json, dict):
            data = request._cached_json

        ttype = str(data.get("type", "")).lower().strip()
        if ttype not in _VALID_TYPES:
            return jsonify({"message": "type inválido (entrada, saida, despesa)"}), 400

        date = _iso_date_only(data.get("date"))
        if not date:
            return jsonify({"message": "date inválida (YYYY-MM-DD)"}), 400

        doc = {
            "id": str(uuid.uuid4()),
            "type": ttype,
            "date": date,
            "amount": abs(_to_number(data.get("amount"))),
            "category": (data.get("category") or "").strip(),
            "notes": (data.get("notes") or "").strip(),
            "action_id": (data.get("action_id") or "").strip() or None,
            "created_by": get_jwt_identity(),
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        saved = _fs_create(doc)
        return jsonify(_doc_to_json(saved)), 201
    except Exception as e:
        log.exception("[finance][POST] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/finance/transactions/<txid>", methods=["PUT", "PATCH"])
@finance_bp.route("/transactions/<txid>", methods=["PUT", "PATCH"])
@roles_allowed('admin')
def update_transaction(txid: str):
    try:
        data = request.get_json(silent=True) or {}
        upd: Dict[str, Any] = {}

        if "type" in data:
            t = str(data["type"]).lower()
            if t in _VALID_TYPES:
                upd["type"] = t
        if "date" in data:
            d = _iso_date_only(data["date"])
            if d:
                upd["date"] = d
        if "amount" in data:
            upd["amount"] = abs(_to_number(data["amount"]))
        for k in ("category", "notes", "action_id"):
            if k in data:
                v = data[k]
                upd[k] = (v or "").strip() if isinstance(v, str) else v

        if not upd:
            return jsonify({"message": "Nada para atualizar"}), 400

        out = _fs_update(txid, upd)
        if not out:
            return jsonify({"message": "Transação não encontrada"}), 404
        return jsonify(_doc_to_json(out)), 200
    except Exception as e:
        log.exception("[finance][PUT] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/finance/transactions/<txid>", methods=["DELETE"])
@finance_bp.route("/transactions/<txid>", methods=["DELETE"])
@roles_allowed('admin')
def delete_transaction(txid: str):
    try:
        _fs_delete(txid)
        return ("", 204)
    except Exception as e:
        log.exception("[finance][DELETE] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500


# ============================ Aliases (Pagar/Receber) ============================
def _map_payable_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mapeia payload do front → /transactions para Contas a Pagar (type='saida')."""
    return {
        "type": "saida",
        "date": _iso_date_only(data.get("vencimento") or data.get("date") or data.get("data")),
        "amount": abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount"))),
        "category": (data.get("categoria") or data.get("category") or "conta_pagar").strip(),
        "notes": (data.get("descricao") or data.get("notes") or "").strip(),
        "action_id": (data.get("action_id") or "").strip() or None,
    }


def _map_receivable_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mapeia payload do front → /transactions para Contas a Receber (type='entrada')."""
    notes = (
        data.get("descricao")
        or data.get("cliente")
        or data.get("notaFiscal")
        or data.get("notes")
        or ""
    )
    return {
        "type": "entrada",
        "date": _iso_date_only(data.get("vencimento") or data.get("dataEmissao") or data.get("date") or data.get("data")),
        "amount": abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount"))),
        "category": (data.get("categoria") or data.get("category") or "conta_receber").strip(),
        "notes": notes.strip(),
        "action_id": (data.get("action_id") or "").strip() or None,
    }


# ------ LISTAR ------
@finance_bp.route("/contas-pagar", methods=["GET"])
@roles_allowed('admin')
def listar_contas_pagar():
    # Reusa a listagem genérica com type=saida
    args = request.args.to_dict(flat=True)
    args["type"] = "saida"
    with finance_bp.test_request_context(query_string=args):
        return list_transactions()


@finance_bp.route("/contas-receber", methods=["GET"])
@roles_allowed('admin')
def listar_contas_receber():
    args = request.args.to_dict(flat=True)
    args["type"] = "entrada"
    with finance_bp.test_request_context(query_string=args):
        return list_transactions()


# ------ CRIAR ------
@finance_bp.route("/contas-pagar", methods=["POST"])
@roles_allowed('admin')
def criar_conta_pagar():
    data = request.get_json(silent=True) or {}
    mapped = _map_payable_payload(data)
    if not mapped.get("date"):
        return jsonify({"message": "vencimento/date inválido (YYYY-MM-DD)"}), 400
    request._cached_json = mapped
    return create_transaction()


@finance_bp.route("/contas-receber", methods=["POST"])
@roles_allowed('admin')
def criar_conta_receber():
    data = request.get_json(silent=True) or {}
    mapped = _map_receivable_payload(data)
    if not mapped.get("date"):
        return jsonify({"message": "vencimento/date inválido (YYYY-MM-DD)"}), 400
    request._cached_json = mapped
    return create_transaction()


# ------ ATUALIZAR ------
@finance_bp.route("/contas-pagar/<txid>", methods=["PUT", "PATCH"])
@roles_allowed('admin')
def atualizar_conta_pagar(txid: str):
    data = request.get_json(silent=True) or {}
    # monta update parcial
    upd = _map_payable_payload(data)
    # remove campos não enviados
    upd = {k: v for k, v in upd.items() if k in data or k in ("type",)}
    if not upd:
        return jsonify({"message": "Nada para atualizar"}), 400
    out = _fs_update(txid, {**upd, "updated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")})
    if not out:
        return jsonify({"message": "Transação não encontrada"}), 404
    return jsonify(_doc_to_json(out)), 200


@finance_bp.route("/contas-receber/<txid>", methods=["PUT", "PATCH"])
@roles_allowed('admin')
def atualizar_conta_receber(txid: str):
    data = request.get_json(silent=True) or {}
    upd = _map_receivable_payload(data)
    upd = {k: v for k, v in upd.items() if k in data or k in ("type",)}
    if not upd:
        return jsonify({"message": "Nada para atualizar"}), 400
    out = _fs_update(txid, {**upd, "updated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")})
    if not out:
        return jsonify({"message": "Transação não encontrada"}), 404
    return jsonify(_doc_to_json(out)), 200


# ------ DELETAR ------
@finance_bp.route("/contas-pagar/<txid>", methods=["DELETE"])
@roles_allowed('admin')
def deletar_conta_pagar(txid: str):
    _fs_delete(txid)
    return ("", 204)


@finance_bp.route("/contas-receber/<txid>", methods=["DELETE"])
@roles_allowed('admin')
def deletar_conta_receber(txid: str):
    _fs_delete(txid)
    return ("", 204)
