# backend/src/routes/finance.py
import os
import json
import uuid
import logging
from datetime import datetime
from typing import Any, Dict, List

from flask import Blueprint, request, jsonify, Response

from flask_jwt_extended import jwt_required, get_jwt_identity

log = logging.getLogger(__name__)
finance_bp = Blueprint("finance", __name__)

# ===================== Persistência (JSON somente) =====================

# Use sempre FINANCE_JSON_PATH; se não setar, cai em /tmp (volátil!)
_JSON_PATH = os.getenv("FINANCE_JSON_PATH") or "/tmp/finance_transactions.json"

def _ensure_dir(path: str):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
    except Exception as e:
        log.warning("[finance] não foi possível criar diretório: %s", e)

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

def _json_save(items: List[Dict[str, Any]]):
    _ensure_dir(_JSON_PATH)
    with open(_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2, default=str)

# ========================= Helpers de domínio ==========================

_VALID_TYPES = {"entrada", "saida", "despesa"}

def _iso_date_only(val) -> str:
    """Normaliza para YYYY-MM-DD; retorna '' se inválida."""
    s = str(val or "")[:10]
    try:
        d = datetime.strptime(s, "%Y-%m-%d")
        return d.strftime("%Y-%m-%d")
    except Exception:
        return ""

def _to_number(v):
    try:
        return float(v)
    except Exception:
        return 0.0

def _doc_to_json(doc: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(doc or {})
    if not d.get("id"):
        d["id"] = str(uuid.uuid4())
    d["amount"] = _to_number(d.get("amount", 0))
    d["date"] = _iso_date_only(d.get("date"))
    return d

# =========================== CORS (robusto) ============================

_ALLOW_ORIGIN = os.getenv("CORS_ALLOW_ORIGIN", "*")

@finance_bp.after_request
def _add_cors_headers(resp: Response):
    # Garante CORS mesmo em 4xx/5xx.
    resp.headers["Access-Control-Allow-Origin"] = _ALLOW_ORIGIN
    resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    resp.headers["Access-Control-Expose-Headers"] = "Authorization, Content-Type"
    return resp

# Preflight dedicado (evita 404/405 no OPTIONS)
@finance_bp.route("/finance/transactions", methods=["OPTIONS"])
@finance_bp.route("/transactions", methods=["OPTIONS"])
def _preflight_transactions():
    return ("", 204)

# ================================ Rotas =================================

# LISTAR (?type, ?action_id, ?month=YYYY-MM)
@finance_bp.route("/finance/transactions", methods=["GET"])
@finance_bp.route("/transactions", methods=["GET"])
@jwt_required(optional=True)
def list_transactions():
    try:
        ttype = (request.args.get("type") or "").strip().lower()
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()  # YYYY-MM

        items = _json_load()

        if ttype in _VALID_TYPES:
            items = [x for x in items if (x.get("type") or "") == ttype]
        if action_id:
            items = [x for x in items if str(x.get("action_id") or "") == action_id]
        if len(month) == 7:
            items = [x for x in items if str(x.get("date") or "").startswith(month)]

        items.sort(key=lambda x: (x.get("date") or "", x.get("id") or ""), reverse=True)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500

# CRIAR
@finance_bp.route("/finance/transactions", methods=["POST"])
@finance_bp.route("/transactions", methods=["POST"])
@jwt_required()
def create_transaction():
    try:
        data = request.get_json(silent=True) or {}
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
            "amount": abs(_to_number(data.get("amount", 0))),
            "category": (data.get("category") or "").strip(),
            "notes": (data.get("notes") or "").strip(),
            "action_id": (data.get("action_id") or "").strip() or None,
            "created_by": get_jwt_identity(),
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        items = _json_load()
        items.append(doc)
        _json_save(items)
        return jsonify(_doc_to_json(doc)), 201
    except Exception as e:
        log.exception("[finance][POST] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500

# ATUALIZAR
@finance_bp.route("/finance/transactions/<txid>", methods=["PUT", "PATCH"])
@finance_bp.route("/transactions/<txid>", methods=["PUT", "PATCH"])
@jwt_required()
def update_transaction(txid):
    try:
        data = request.get_json(silent=True) or {}
        upd: Dict[str, Any] = {}

        if "type" in data and str(data["type"]).lower() in _VALID_TYPES:
            upd["type"] = str(data["type"]).lower()
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

        items = _json_load()
        for i, it in enumerate(items):
            if str(it.get("id")) == str(txid):
                items[i].update(upd)
                _json_save(items)
                return jsonify(_doc_to_json(items[i])), 200

        return jsonify({"message": "não encontrado"}), 404
    except Exception as e:
        log.exception("[finance][PUT] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500

# DELETAR
@finance_bp.route("/finance/transactions/<txid>", methods=["DELETE"])
@finance_bp.route("/transactions/<txid>", methods=["DELETE"])
@jwt_required()
def delete_transaction(txid):
    try:
        items = _json_load()
        new_items = [x for x in items if str(x.get("id")) != str(txid)]
        _json_save(new_items)
        return ("", 204)
    except Exception as e:
        log.exception("[finance][DELETE] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500
