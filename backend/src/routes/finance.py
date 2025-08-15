# backend/src/routes/finance.py
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime
import uuid

from middleware.auth_middleware import require_user  # mesmo padrão das outras rotas
from services.memory_db import memory_db  # mesmo DB em memória usado no projeto

finance_bp = Blueprint("finance", __name__)

COLLECTION = "finance_transactions"

def _col():
    # garante que a coleção exista
    if COLLECTION not in memory_db.collections:
        memory_db.collections[COLLECTION] = {}
    return memory_db.collections[COLLECTION]

def _normalize(doc):
    # normaliza campos para o frontend
    return {
        "id": doc.get("id"),
        "type": doc.get("type", "entrada"),               # entrada | saida | despesa
        "date": doc.get("date"),                          # YYYY-MM-DD
        "amount": float(doc.get("amount", 0)),
        "category": doc.get("category") or "",
        "notes": doc.get("notes") or "",
        "action_id": doc.get("action_id"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }

@finance_bp.route("/finance/transactions", methods=["OPTIONS"])
@cross_origin(
    origins="*",
    methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Authorization", "Content-Type"],
    max_age=86400,
)
def finance_options():
    # Responde OK aos preflights
    return ("", 204)

@finance_bp.route("/finance/transactions", methods=["GET"])
@cross_origin(
    origins="*",
    methods=["GET"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Authorization", "Content-Type"],
)
@require_user
def list_transactions(user):
    col = _col()
    items = [_normalize(doc) for doc in col.values()]

    # filtros simples (opcionais)
    action_id = request.args.get("action_id")
    if action_id:
        items = [it for it in items if str(it.get("action_id")) == str(action_id)]

    # ordena por data desc
    items.sort(key=lambda x: (x.get("date") or ""), reverse=True)
    return jsonify(items), 200

@finance_bp.route("/finance/transactions", methods=["POST"])
@cross_origin(
    origins="*",
    methods=["POST"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Authorization", "Content-Type"],
)
@require_user
def create_transaction(user):
    data = request.get_json(silent=True) or {}

    t_type = str(data.get("type", "entrada")).lower()
    if t_type not in {"entrada", "saida", "despesa"}:
        return jsonify({"message": "Tipo inválido. Use: entrada | saida | despesa."}), 400

    date = str(data.get("date") or "")[:10]
    try:
        # valida data simples (YYYY-MM-DD)
        datetime.strptime(date, "%Y-%m-%d")
    except Exception:
        return jsonify({"message": "Data inválida. Use YYYY-MM-DD."}), 400

    try:
        amount = float(data.get("amount", 0))
    except Exception:
        return jsonify({"message": "Valor inválido."}), 400

    doc = {
        "id": str(uuid.uuid4()),
        "type": t_type,
        "date": date,
        "amount": amount,
        "category": (data.get("category") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
        "action_id": data.get("action_id") or None,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "user_id": getattr(user, "id", None),  # se seu decorator injeta um objeto user
    }

    col = _col()
    col[doc["id"]] = doc
    return jsonify(_normalize(doc)), 201
