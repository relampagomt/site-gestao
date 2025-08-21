# backend/src/routes/finance.py
import os
import json
import threading
from datetime import datetime
from flask import Blueprint, request, jsonify

finance_bp = Blueprint("finance", __name__)

# -----------------------------
# Armazenamento em arquivo JSON
# -----------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../backend/src
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
TX_FILE = os.path.join(DATA_DIR, "transactions.json")
_LOCK = threading.Lock()


def _read_all():
    if not os.path.exists(TX_FILE):
        return []
    try:
        with open(TX_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception:
        return []


def _write_all(items):
    tmp = TX_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, TX_FILE)


def _next_id(items):
    return (max([int(x.get("id", 0)) for x in items] + [0]) + 1)


def _is_ymd(s):
    try:
        if not isinstance(s, str) or len(s) < 10:
            return False
        datetime.strptime(s[:10], "%Y-%m-%d")
        return True
    except Exception:
        return False


def _normalize_status(s):
    if not s:
        return "Pendente"
    s = str(s).strip().lower()
    if "pago" in s:
        return "Pago"
    if "cancel" in s:
        return "Cancelado"
    return "Pendente"


def _normalize_type(t):
    t = (t or "").lower()
    if t in ("entrada", "saida", "despesa"):
        return t
    return "entrada"


def _coerce_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return float(default)


def _sort_key(tx):
    # Ordena por data desc e id desc
    date = str(tx.get("date") or "0000-01-01")[:10]
    return (date, int(tx.get("id", 0)))


def _sanitize_payload(payload, existing=None):
    """
    Aceita payloads novos e antigos.
    Mantém retrocompatibilidade, mas prioriza os novos campos *_text e status.
    """
    existing = existing or {}
    tx = {}

    tx["id"] = existing.get("id")

    # tipo
    tx["type"] = _normalize_type(payload.get("type") or existing.get("type"))

    # data
    date = payload.get("date") or existing.get("date")
    if not _is_ymd(date):
        raise ValueError("Data inválida. Use YYYY-MM-DD (sem timezone).")
    tx["date"] = date[:10]

    # valor
    tx["amount"] = _coerce_float(payload.get("amount", existing.get("amount", 0)))

    # categoria / notes
    tx["category"] = (payload.get("category") or existing.get("category") or "").strip()
    tx["notes"] = (payload.get("notes") or existing.get("notes") or "").strip()

    # NOVOS (strings livres)
    tx["action_text"] = (payload.get("action_text") or existing.get("action_text") or "").strip()
    tx["client_text"] = (payload.get("client_text") or existing.get("client_text") or "").strip()
    tx["material_text"] = (payload.get("material_text") or existing.get("material_text") or "").strip()

    # STATUS normalizado
    tx["status"] = _normalize_status(payload.get("status") or existing.get("status"))

    # LEGADO (mantidos só por compatibilidade; opcional)
    tx["action_id"] = payload.get("action_id", existing.get("action_id"))
    tx["client_id"] = payload.get("client_id", existing.get("client_id"))
    tx["material_id"] = payload.get("material_id", existing.get("material_id"))

    # Se vierem alias camelCase, aceita também (compat c/ front)
    tx["action_id"] = payload.get("actionId", tx["action_id"])
    tx["client_id"] = payload.get("clientId", tx["client_id"])
    tx["material_id"] = payload.get("materialId", tx["material_id"])

    return tx


# =========================
#       ROTAS /transactions
# =========================

@finance_bp.get("/transactions")
def list_transactions():
    with _LOCK:
        items = _read_all()
    # Ordenar desc por data/id
    items_sorted = sorted(items, key=_sort_key, reverse=True)
    return jsonify(items_sorted), 200


@finance_bp.get("/transactions/<int:tx_id>")
def get_transaction(tx_id: int):
    with _LOCK:
        items = _read_all()
        for it in items:
            if int(it.get("id")) == tx_id:
                return jsonify(it), 200
    return jsonify({"error": "not_found"}), 404


@finance_bp.post("/transactions")
def create_transaction():
    payload = request.get_json(silent=True) or {}
    try:
        with _LOCK:
            items = _read_all()
            tx = _sanitize_payload(payload)
            tx["id"] = _next_id(items)
            items.append(tx)
            _write_all(items)
        return jsonify(tx), 201
    except ValueError as ve:
        return jsonify({"error": "validation_error", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "internal_error", "message": str(e)}), 500


@finance_bp.put("/transactions/<int:tx_id>")
def update_transaction(tx_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        with _LOCK:
            items = _read_all()
            for idx, it in enumerate(items):
                if int(it.get("id")) == tx_id:
                    new_obj = _sanitize_payload(payload, existing=it)
                    new_obj["id"] = tx_id
                    items[idx] = new_obj
                    _write_all(items)
                    return jsonify(new_obj), 200
        return jsonify({"error": "not_found"}), 404
    except ValueError as ve:
        return jsonify({"error": "validation_error", "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "internal_error", "message": str(e)}), 500


@finance_bp.patch("/transactions/<int:tx_id>")
def patch_transaction(tx_id: int):
    """
    Permite atualizar parcialmente (ex.: apenas status).
    """
    payload = request.get_json(silent=True) or {}
    try:
        with _LOCK:
            items = _read_all()
            for idx, it in enumerate(items):
                if int(it.get("id")) == tx_id:
                    # merge simples:
                    merged = {**it, **payload}

                    # normalizações pontuais:
                    if "status" in payload:
                        merged["status"] = _normalize_status(payload.get("status"))
                    if "type" in payload:
                        merged["type"] = _normalize_type(payload.get("type"))
                    if "amount" in payload:
                        merged["amount"] = _coerce_float(payload.get("amount"), it.get("amount", 0))
                    if "date" in payload:
                        if not _is_ymd(merged["date"]):
                            return jsonify({"error": "validation_error", "message": "Data inválida (YYYY-MM-DD)."}), 400

                    # garantir campos *_text existam:
                    merged["action_text"] = (merged.get("action_text") or "").strip()
                    merged["client_text"] = (merged.get("client_text") or "").strip()
                    merged["material_text"] = (merged.get("material_text") or "").strip()

                    items[idx] = merged
                    _write_all(items)
                    return jsonify(merged), 200
        return jsonify({"error": "not_found"}), 404
    except Exception as e:
        return jsonify({"error": "internal_error", "message": str(e)}), 500


@finance_bp.delete("/transactions/<int:tx_id>")
def delete_transaction(tx_id: int):
    with _LOCK:
        items = _read_all()
        new_items = [it for it in items if int(it.get("id", 0)) != tx_id]
        if len(new_items) == len(items):
            return jsonify({"error": "not_found"}), 404
        _write_all(new_items)
    return jsonify({"status": "deleted"}), 200
