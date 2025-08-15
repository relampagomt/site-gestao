# backend/src/routes/finance.py
import os
import json
import uuid
import logging
import importlib
from datetime import datetime
from typing import Any, Dict, List

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

log = logging.getLogger(__name__)
finance_bp = Blueprint("finance", __name__)

# ========================= BACKEND DE DADOS (3 MODOS) =========================
def _try_import_get_collection():
    """
    Tenta achar uma função get_collection() em módulos do projeto.
    Se achar e der erro ao executar, vamos cair no fallback JSON sem quebrar.
    """
    for modname in ("src.db", "src.database", "src.services.db", "src.db_client"):
        try:
            mod = importlib.import_module(modname)
            fn = getattr(mod, "get_collection", None)
            if callable(fn):
                log.info("[finance] usando get_collection de %s", modname)
                return fn
        except Exception as e:
            log.debug("[finance] %s sem get_collection (%s)", modname, e)
    return None

def _try_build_mongo_get_collection():
    """
    Só usa pymongo se existir e se as variáveis MONGODB_URI/DB estiverem presentes.
    """
    try:
        pymongo = importlib.import_module("pymongo")
    except Exception:
        return None
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
    dbname = os.getenv("MONGODB_DB") or os.getenv("MONGO_DBNAME") or "site_gestao"
    if not uri:
        return None
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[dbname]
    log.info("[finance] usando MongoDB (%s/%s)", uri.split("@")[-1] if "@" in uri else "uri", dbname)
    return lambda name: db[name]

_get_collection_fn = _try_import_get_collection() or _try_build_mongo_get_collection()

_JSON_PATH = os.getenv("FINANCE_JSON_PATH") or "/tmp/finance_transactions.json"

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
    os.makedirs(os.path.dirname(_JSON_PATH), exist_ok=True)
    with open(_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2, default=str)

# ============================== HELPERS DE DOMÍNIO ============================
_VALID_TYPES = {"entrada", "saida", "despesa"}

def _iso_date_only(val) -> str:
    """Normaliza para YYYY-MM-DD (string); retorna '' se inválida."""
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

def _doc_to_json(doc):
    d = dict(doc or {})
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    if not d.get("id"):
        d["id"] = str(uuid.uuid4())
    d["amount"] = _to_number(d.get("amount", 0))
    d["date"] = _iso_date_only(d.get("date"))
    return d

def _safe_get_collection(name: str):
    if not _get_collection_fn:
        return None
    try:
        return _get_collection_fn(name)
    except Exception as e:
        log.warning("[finance] get_collection('%s') falhou, usando JSON fallback: %s", name, e)
        return None

# ================================= ROTAS =====================================

# LISTAR (com filtros ?type=entrada|saida|despesa, ?action_id=..., ?month=YYYY-MM)
@finance_bp.route("/finance/transactions", methods=["GET"])
@finance_bp.route("/transactions", methods=["GET"])  # alias
@jwt_required(optional=True)
def list_transactions():
    try:
        ttype = (request.args.get("type") or "").strip().lower()
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()  # YYYY-MM

        col = _safe_get_collection("transactions")
        if col:
            query: Dict[str, Any] = {}
            if ttype in _VALID_TYPES:
                query["type"] = ttype
            if action_id:
                query["action_id"] = action_id
            if len(month) == 7:
                # string date em ISO, filtra prefixo YYYY-MM
                query["date"] = {"$regex": f"^{month}"}

            items: List[Dict[str, Any]] = []
            try:
                cur = col.find(query)  # pymongo-like
                try:
                    cur = cur.sort([("date", -1), ("_id", -1)])
                except Exception:
                    pass
                for x in cur:
                    items.append(_doc_to_json(x))
                return jsonify(items), 200
            except Exception as e:
                log.warning("[finance][GET] driver falhou (%s), usando JSON fallback", e)

        # JSON fallback
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
@finance_bp.route("/transactions", methods=["POST"])  # alias
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
            "type": ttype,
            "date": date,
            "amount": abs(_to_number(data.get("amount", 0))),
            "category": (data.get("category") or "").strip(),
            "notes": (data.get("notes") or "").strip(),
            "action_id": (data.get("action_id") or "").strip() or None,
            "created_by": get_jwt_identity(),
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        col = _safe_get_collection("transactions")
        if col:
            # tenta várias APIs comuns; em qualquer erro cai pro JSON
            try:
                if hasattr(col, "insert_one"):
                    res = col.insert_one(doc)  # pymongo
                    inserted_id = getattr(res, "inserted_id", None)
                    saved = None
                    if inserted_id is not None and hasattr(col, "find_one"):
                        try:
                            saved = col.find_one({"_id": inserted_id})
                        except Exception:
                            saved = None
                    return jsonify(_doc_to_json(saved or {**doc, "_id": inserted_id})), 201

                if hasattr(col, "insert"):
                    res = col.insert(doc)  # alguns drivers retornam id/doc
                    if isinstance(res, dict):
                        return jsonify(_doc_to_json({**doc, **res})), 201
                    return jsonify(_doc_to_json({**doc, "id": str(res)})), 201

                if hasattr(col, "create"):
                    saved = col.create(doc)
                    return jsonify(_doc_to_json(saved)), 201
            except Exception as e:
                log.warning("[finance][POST] erro no driver, usando JSON fallback: %s", e)

        # JSON fallback
        items = _json_load()
        doc["id"] = str(uuid.uuid4())
        items.append(doc)
        _json_save(items)
        return jsonify(_doc_to_json(doc)), 201

    except Exception as e:
        log.exception("[finance][POST] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500

# ATUALIZAR
@finance_bp.route("/finance/transactions/<txid>", methods=["PUT", "PATCH"])
@finance_bp.route("/transactions/<txid>", methods=["PUT", "PATCH"])  # alias
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
                upd[k] = (data[k] or "").strip() if isinstance(data[k], str) else data[k]

        if not upd:
            return jsonify({"message": "Nada para atualizar"}), 400

        col = _safe_get_collection("transactions")
        if col:
            try:
                from bson import ObjectId  # opcional; se não existir, cai no except
                _id = ObjectId(txid)
                col.update_one({"_id": _id}, {"$set": upd})
                saved = col.find_one({"_id": _id})
                return jsonify(_doc_to_json(saved)), 200
            except Exception:
                try:
                    col.update_one({"id": txid}, {"$set": upd})
                    saved = col.find_one({"id": txid})
                    return jsonify(_doc_to_json(saved)), 200
                except Exception as e:
                    log.warning("[finance][PUT] driver falhou (%s), usando JSON fallback", e)

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
@finance_bp.route("/transactions/<txid>", methods=["DELETE"])  # alias
@jwt_required()
def delete_transaction(txid):
    try:
        col = _safe_get_collection("transactions")
        if col:
            try:
                from bson import ObjectId
                _id = ObjectId(txid)
                col.delete_one({"_id": _id})
                return ("", 204)
            except Exception:
                try:
                    col.delete_one({"id": txid})
                    return ("", 204)
                except Exception as e:
                    log.warning("[finance][DELETE] driver falhou (%s), usando JSON fallback", e)

        items = _json_load()
        new_items = [x for x in items if str(x.get("id")) != str(txid)]
        _json_save(new_items)
        return ("", 204)
    except Exception as e:
        log.exception("[finance][DELETE] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500
