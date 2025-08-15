import os
import time
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

# Tenta usar utilitário de DB do projeto; se não existir, faz fallback para PyMongo
try:
    # ex.: def get_collection(name): return db[name]
    from src.db import get_collection  # type: ignore
except Exception:  # fallback independente
    from pymongo import MongoClient  # type: ignore

    _MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    _DB_NAME = os.getenv("MONGODB_DB") or os.getenv("MONGO_DBNAME") or "site_gestao"

    _cli = MongoClient(_MONGO_URI, serverSelectionTimeoutMS=5000)
    _db = _cli[_DB_NAME]

    def get_collection(name: str):
        return _db[name]


finance_bp = Blueprint("finance", __name__)

# --------- helpers ---------
_VALID_TYPES = {"entrada", "saida", "despesa"}

def _iso_date_only(s: str) -> str:
    """Normaliza para YYYY-MM-DD (retorna '' se inválido)."""
    try:
        d = datetime.fromisoformat(str(s)[:10])
        return d.strftime("%Y-%m-%d")
    except Exception:
        return ""

def _to_number(v):
    try:
        return float(v)
    except Exception:
        return 0.0

def _doc_to_json(doc):
    if not doc:
        return None
    d = dict(doc)
    _id = str(d.pop("_id", "")) if "_id" in d else d.get("id") or ""
    d["id"] = _id
    # normaliza amount para float
    d["amount"] = _to_number(d.get("amount", 0))
    # garante date YYYY-MM-DD
    d["date"] = _iso_date_only(d.get("date", ""))
    return d


# ========= LISTAR =========
@finance_bp.route("/finance/transactions", methods=["GET"])
@finance_bp.route("/transactions", methods=["GET"])  # alias legado
@jwt_required(optional=True)
def list_transactions():
    col = get_collection("transactions")
    q = {}

    # filtros simples opcionais
    t = request.args.get("type")
    if t in _VALID_TYPES:
        q["type"] = t

    action_id = request.args.get("action_id")
    if action_id:
        q["action_id"] = action_id

    cur = col.find(q).sort([("date", -1), ("_id", -1)])
    items = [_doc_to_json(x) for x in cur]
    return jsonify(items), 200


# ========= CRIAR =========
@finance_bp.route("/finance/transactions", methods=["POST"])
@finance_bp.route("/transactions", methods=["POST"])  # alias legado
@jwt_required()  # exige token (igual ao resto do painel)
def create_transaction():
    col = get_collection("transactions")
    data = request.get_json(silent=True) or {}

    ttype = str(data.get("type", "")).lower().strip()
    if ttype not in _VALID_TYPES:
        return jsonify({"message": "type inválido (use: entrada, saida, despesa)"}), 400

    date = _iso_date_only(data.get("date", ""))
    if not date:
        return jsonify({"message": "date inválida (YYYY-MM-DD)"}), 400

    amount = _to_number(data.get("amount", 0))
    try:
        # pode ter despesa negativa? Aqui guardamos sempre positivo
        amount = abs(float(amount))
    except Exception:
        return jsonify({"message": "amount inválido"}), 400

    doc = {
        "type": ttype,
        "date": date,
        "amount": amount,
        "category": (data.get("category") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
        "action_id": (data.get("action_id") or None),
        "created_by": get_jwt_identity(),  # id do usuário do token
        "created_at": datetime.utcnow(),
        "ts": int(time.time()),
    }

    res = col.insert_one(doc)
    saved = col.find_one({"_id": res.inserted_id})
    return jsonify(_doc_to_json(saved)), 201


# ========= (OPCIONAL) ATUALIZAR =========
@finance_bp.route("/finance/transactions/<txid>", methods=["PUT", "PATCH"])
@finance_bp.route("/transactions/<txid>", methods=["PUT", "PATCH"])  # alias legado
@jwt_required()
def update_transaction(txid):
    from bson import ObjectId  # type: ignore
    col = get_collection("transactions")
    try:
        _id = ObjectId(txid)
    except Exception:
        return jsonify({"message": "id inválido"}), 400

    data = request.get_json(silent=True) or {}
    upd = {}

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

    col.update_one({"_id": _id}, {"$set": upd})
    saved = col.find_one({"_id": _id})
    return jsonify(_doc_to_json(saved)), 200


# ========= (OPCIONAL) DELETAR =========
@finance_bp.route("/finance/transactions/<txid>", methods=["DELETE"])
@finance_bp.route("/transactions/<txid>", methods=["DELETE"])  # alias legado
@jwt_required()
def delete_transaction(txid):
    from bson import ObjectId  # type: ignore
    col = get_collection("transactions")
    try:
        _id = ObjectId(txid)
    except Exception:
        return jsonify({"message": "id inválido"}), 400

    col.delete_one({"_id": _id})
    return ("", 204)
