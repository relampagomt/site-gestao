# backend/src/routes/finance.py
# Drop-in: substitui seu arquivo atual.
# Implementa aliases, normalizações, validações e exporta finance_bp (compat Render).

from flask import Blueprint, request, jsonify
from datetime import datetime
import json
import os

bp = Blueprint("finance", __name__)
finance_bp = bp  # alias para compatibilidade com `from src.routes.finance import finance_bp`
__all__ = ["finance_bp"]

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
TX_PATH = os.path.join(DATA_DIR, "transactions.json")

ALLOWED_TYPES = {"entrada", "saida", "despesa"}
ALLOWED_STATUS = {"Pago", "Pendente", "Cancelado"}

def _load_all():
    if not os.path.exists(TX_PATH):
        return []
    try:
        with open(TX_PATH, "r", encoding="utf-8") as f:
            return json.load(f) or []
    except Exception:
        return []

def _save_all(items):
    with open(TX_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

def _parse_date_any(v):
    """Aceita DD/MM/AAAA ou YYYY-MM-DD e retorna YYYY-MM-DD; caso inválido, retorna ''."""
    if not v:
        return ""
    s = str(v).strip()
    # ISO
    try:
        if len(s) >= 10 and s[4] == "-" and s[7] == "-":
            dt = datetime.strptime(s[:10], "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    # BR
    try:
        if len(s) >= 10 and s[2] == "/" and s[5] == "/":
            dt = datetime.strptime(s[:10], "%d/%m/%Y")
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return ""

def _norm_status(v):
    s = (v or "").strip().lower()
    if s == "pago": return "Pago"
    if s == "pendente": return "Pendente"
    if s == "cancelado": return "Cancelado"
    return "Pendente"

def _norm_type(v):
    s = (v or "").strip().lower()
    return s if s in ALLOWED_TYPES else "entrada"

def _to_float(v, default=0.0):
    try:
        if isinstance(v, str):
            vv = v.replace(".", "").replace(",", ".")
            return float(vv)
        return float(v)
    except Exception:
        return float(default)

def _next_id(items):
    mx = 0
    for it in items:
        try:
            mx = max(mx, int(str(it.get("id", 0)).split("-")[0]))
        except Exception:
            pass
    return str(mx + 1)

def _apply_aliases(payload):
    """
    Mapeia aliases do front para os campos internos.
    - date <= date | due_date | dueDate (BR ou ISO)
    - action_text <= action_text | pay_date | payDate (BR ou ISO; opcional)
    - client_text <= client_text | payment_method | paymentMethod
    - material_text <= material_text | interest_rate | interestRate
    """
    # vencimento
    date_raw = payload.get("date") or payload.get("due_date") or payload.get("dueDate")
    date_iso = _parse_date_any(date_raw)

    # pagamento (opcional)
    action_raw = payload.get("action_text") or payload.get("pay_date") or payload.get("payDate")
    action_iso = _parse_date_any(action_raw)
    action_value = action_iso if action_iso else (payload.get("action_text") or action_raw or "")

    # meio de pagamento
    client_value = payload.get("client_text") or payload.get("payment_method") or payload.get("paymentMethod") or ""

    # juros (string) + auxiliar numérico
    material_value = payload.get("material_text") or payload.get("interest_rate") or payload.get("interestRate") or ""
    interest_rate_num = None
    try:
        iv = str(material_value).replace(".", "").replace(",", ".")
        interest_rate_num = float(iv)
    except Exception:
        try:
            ir = payload.get("interest_rate") or payload.get("interestRate")
            if ir is not None:
                interest_rate_num = _to_float(ir)
        except Exception:
            interest_rate_num = None

    data = {
        "date": date_iso,
        "action_text": action_value,             # ISO (se válido) ou texto antigo
        "client_text": str(client_value),
        "material_text": str(material_value),
        "type": _norm_type(payload.get("type")),
        "status": _norm_status(payload.get("status")),
        "amount": _to_float(payload.get("amount", 0)),
        "category": (payload.get("category") or "").strip(),
        "notes": (payload.get("notes") or "").strip(),
        # retrocompat - manter *_id se vierem
        "action_id": payload.get("action_id") or payload.get("actionId"),
        "client_id": payload.get("client_id") or payload.get("clientId"),
        "material_id": payload.get("material_id") or payload.get("materialId"),
    }

    if interest_rate_num is not None and not isinstance(interest_rate_num, bool):
        data["interest_rate"] = float(interest_rate_num)

    return data

def _validate_required_date(data):
    if not data.get("date"):
        return False, "Campo 'date' (vencimento) é obrigatório e deve ser DD/MM/AAAA ou YYYY-MM-DD."
    return True, ""

def _sort_default(items):
    # ordenar por date desc, depois id desc
    def keyf(x):
        return (str(x.get("date") or ""), str(x.get("id") or ""))
    return sorted(items, key=lambda x: (keyf(x)[0], keyf(x)[1]), reverse=True)

@bp.route("/transactions", methods=["GET"])
def list_transactions():
    items = _load_all()
    items = _sort_default(items)
    return jsonify(items), 200

@bp.route("/transactions", methods=["POST"])
def create_transaction():
    payload = request.get_json(force=True, silent=True) or {}
    data = _apply_aliases(payload)
    ok, msg = _validate_required_date(data)
    if not ok:
        return jsonify({"error": msg}), 400

    items = _load_all()
    data["id"] = _next_id(items)
    items.append(data)
    items = _sort_default(items)
    _save_all(items)
    return jsonify(data), 201

@bp.route("/transactions/<id>", methods=["PUT"])
def update_transaction(id):
    payload = request.get_json(force=True, silent=True) or {}
    data = _apply_aliases(payload)
    ok, msg = _validate_required_date(data)
    if not ok:
        return jsonify({"error": msg}), 400

    items = _load_all()
    found = None
    for i, it in enumerate(items):
        if str(it.get("id")) == str(id):
            found = i
            break
    if found is None:
        return jsonify({"error": "Registro não encontrado"}), 404

    data["id"] = items[found].get("id")
    items[found] = {**items[found], **data}
    items = _sort_default(items)
    _save_all(items)
    return jsonify(items[found]), 200

@bp.route("/transactions/<id>", methods=["PATCH"])
def patch_transaction(id):
    payload = request.get_json(force=True, silent=True) or {}
    items = _load_all()
    idx = None
    for i, it in enumerate(items):
        if str(it.get("id")) == str(id):
            idx = i
            break
    if idx is None:
        return jsonify({"error": "Registro não encontrado"}), 404

    current = items[idx]
    partial = _apply_aliases(payload)

    # Se não veio date no PATCH, mantemos o atual
    if not (payload.get("date") or payload.get("due_date") or payload.get("dueDate")):
      partial["date"] = current.get("date")

    # Merge
    merged = { **current, **{k: v for k, v in partial.items() if v is not None} }
    merged["type"] = _norm_type(merged.get("type"))
    merged["status"] = _norm_status(merged.get("status"))
    merged["amount"] = _to_float(merged.get("amount", current.get("amount", 0)))

    items[idx] = merged
    items = _sort_default(items)
    _save_all(items)
    return jsonify(items[idx]), 200

@bp.route("/transactions/<id>", methods=["GET"])
def get_transaction(id):
    items = _load_all()
    for it in items:
        if str(it.get("id")) == str(id):
            return jsonify(it), 200
    return jsonify({"error": "Registro não encontrado"}), 404

@bp.route("/transactions/<id>", methods=["DELETE"])
def delete_transaction(id):
    items = _load_all()
    new_items = [it for it in items if str(it.get("id")) != str(id)]
    if len(new_items) == len(items):
        return jsonify({"error": "Registro não encontrado"}), 404
    _save_all(new_items)
    return jsonify({"ok": True}), 200
