# backend/src/routes/finance.py
import logging
from flask import Blueprint, request, jsonify
from ..services.firebase_service import (
    fs_add,
    fs_update,
    fs_delete,
    fs_get_by_id,
    fs_list,
)
from ..utils.auth_decorator import require_auth

finance_bp = Blueprint("finance", __name__)
log = logging.getLogger(__name__)


# ==============================
# Helpers
# ==============================
def _require_admin():
    """Garante que o usuário tem role=admin, retorna response se não tiver."""
    from flask import g

    user = getattr(g, "user", None)
    if not user or user.get("role") != "admin":
        return jsonify({"message": "unauthorized"}), 401
    return None


def _fs_list(ttype, action_id=None, month=None):
    """Lista registros filtrados por tipo/ação/mês."""
    filters = {"type": ttype}
    if action_id:
        filters["action_id"] = action_id
    if month:
        filters["month"] = month
    return fs_list("finance", filters)


# ==============================
# CONTAS A PAGAR
# ==============================
@finance_bp.route("/contas-pagar", methods=["GET"])
def listar_contas_pagar():
    guard = _require_admin()
    if guard:
        return guard
    try:
        ttype = "saida"
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()
        items = _fs_list(ttype, action_id, month)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET /contas-pagar] %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/contas-pagar", methods=["POST"])
@require_auth
def criar_conta_pagar():
    try:
        data = request.get_json()
        data["type"] = "saida"
        item_id = fs_add("finance", data)
        return jsonify({"id": item_id}), 201
    except Exception as e:
        log.exception("[finance][POST /contas-pagar] %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/contas-pagar/<item_id>", methods=["PUT", "PATCH"])
@require_auth
def atualizar_conta_pagar(item_id):
    try:
        data = request.get_json()
        fs_update("finance", item_id, data)
        return jsonify({"id": item_id}), 200
    except Exception as e:
        log.exception("[finance][PUT/PATCH /contas-pagar] %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/contas-pagar/<item_id>", methods=["DELETE"])
@require_auth
def excluir_conta_pagar(item_id):
    try:
        fs_delete("finance", item_id)
        return jsonify({"id": item_id}), 200
    except Exception as e:
        log.exception("[finance][DELETE /contas-pagar] %s", e)
        return jsonify({"message": "internal_error"}), 500


# ==============================
# CONTAS A RECEBER
# ==============================
@finance_bp.route("/contas-receber", methods=["GET"])
def listar_contas_receber():
    guard = _require_admin()
    if guard:
        return guard
    try:
        ttype = "entrada"
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()
        items = _fs_list(ttype, action_id, month)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET /contas-receber] %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/contas-receber", methods=["POST"])
@require_auth
def criar_conta_receber():
    try:
        data = request.get_json()
        data["type"] = "entrada"
        item_id = fs_add("finance", data)
        return jsonify({"id": item_id}), 201
    except Exception as e:
        log.exception("[finance][POST /contas-receber] %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/contas-receber/<item_id>", methods=["PUT", "PATCH"])
@require_auth
def atualizar_conta_receber(item_id):
    try:
        data = request.get_json()
        fs_update("finance", item_id, data)
        return jsonify({"id": item_id}), 200
    except Exception as e:
        log.exception("[finance][PUT/PATCH /contas-receber] %s", e)
        return jsonify({"message": "internal_error"}), 500


@finance_bp.route("/contas-receber/<item_id>", methods=["DELETE"])
@require_auth
def excluir_conta_receber(item_id):
    try:
        fs_delete("finance", item_id)
        return jsonify({"id": item_id}), 200
    except Exception as e:
        log.exception("[finance][DELETE /contas-receber] %s", e)
        return jsonify({"message": "internal_error"}), 500


# ==============================
# TRANSACTIONS (GENÉRICO)
# ==============================
@finance_bp.route("/transactions/<item_id>", methods=["GET"])
def get_transaction(item_id):
    guard = _require_admin()
    if guard:
        return guard
    try:
        item = fs_get_by_id("finance", item_id)
        if not item:
            return jsonify({"message": "not_found"}), 404
        return jsonify(item), 200
    except Exception as e:
        log.exception("[finance][GET /transactions/<id>] %s", e)
        return jsonify({"message": "internal_error"}), 500
