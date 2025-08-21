# backend/src/routes/finance.py
import os
import json
import threading
from datetime import datetime
from typing import Optional
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
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _write_all(items):
    tmp = TX_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, TX_FILE)


def _next_id(items):
    return (max([int(x.get("id", 0)) for x in items] + [0]) + 1)


def _is_ymd(s: Optional[str]) -> bool:
    try:
        if not isinstance(s, str) or len(s) < 10:
            return False
        datetime.strptime(s[:10], "%Y-%m-%d")
        return True
    except Exception:
        return False


def _br_to_iso(s: str) -> Optional[str]:
    """DD/MM/AAAA -> YYYY-MM-DD (retorna None se inválido)."""
    try:
        d, m, y = s.strip()[:10].split("/")
        dt = datetime(int(y), int(m), int(d))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


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


def _parse_date_value(raw, *, field_name: str, required: bool) -> Optional[str]:
    """
    Aceita YYYY-MM-DD ou DD/MM/AAAA.
    - Se required=True, lança ValueError quando vazio/ inválido.
    - Se required=False, retorna '' quando vazio, e lança quando formato inválido não-vazio.
    """
    if raw is None or str(raw).strip() == "":
        if required:
            raise ValueError(f"{field_name} é obrigatório (YYYY-MM-DD ou DD/MM/AAAA).")
        return ""

    s = str(raw).strip()
    if _is_ymd(s):
        return s[:10]

    iso = _br_to_iso(s)
    if iso:
        return iso

    raise ValueError(f"{field_name} inválido. Use YYYY-MM-DD ou DD/MM/AAAA.")


def _sanitize_payload(payload, existing=None):
    """
    Aceita payloads novos e antigos.
    Mapeamentos/aliases:
      - Vencimento:  date  | due_date | dueDate
      - Pagamento:   action_text | pay_date | payDate  (salvamos em action_text)
      - Meio pagto:  client_text | payment_method | paymentMethod
      - Juros:       material_text | interest_rate | interestRate
    Mantém retrocompatibilidade com *_id e *_text.
    """
    existing = existing or {}
    tx = {}

    tx["id"] = existing.get("id")

    # tipo
    tx["type"] = _normalize_type(payload.get("type") or existing.get("type"))

    # data de vencimento (obrigatória)
    date_raw = (
        payload.get("date")
        or payload.get("due_date")
        or payload.get("dueDate")
        or existing.get("date")
    )
    tx["date"] = _parse_date_value(date_raw, field_name="Data de vencimento", required=True)

    # valor
    tx["amount"] = _coerce_float(payload.get("amount", existing.get("amount", 0)))

    # categoria / notes
    tx["category"] = (payload.get("category") or existing.get("category") or "").strip()
    tx["notes"] = (payload.get("notes") or existing.get("notes") or "").strip()

    # ----------------------------
    # Campos NOVOS / aliases
    # ----------------------------

    # Data de pagamento (opcional) -> action_text (ISO ou vazio)
    pay_raw = (
        payload.get("action_text")
        or payload.get("pay_date")
        or payload.get("payDate")
        or existing.get("action_text")
    )
    try:
        tx["action_text"] = _parse_date_value(pay_raw, field_name="Data de pagamento", required=False)
    except ValueError:
        # Se já existia um texto livre antigo, mantemos como string pura para não quebrar histórico
        # mas priorizamos o formato ISO quando possível.
        tx["action_text"] = (str(pay_raw) or "").strip()

    # Meio de pagamento -> client_text
    payment_method = (
        payload.get("client_text")
        or payload.get("payment_method")
        or payload.get("paymentMethod")
        or existing.get("client_text")
        or ""
    )
    tx["client_text"] = str(payment_method).strip()

    # Taxa de juros -> material_text (string) + interest_rate (float auxiliar)
    interest_raw = (
        payload.get("material_text")
        or payload.get("interest_rate")
        or payload.get("interestRate")
        or existing.get("material_text")
        or ""
    )
    tx["material_text"] = str(interest_raw).strip()
    # Campo auxiliar numérico (não obrigatório, só para quem quiser usar depois)
    try:
        tx["interest_rate"] = float(str(interest_raw).replace(",", "."))
    except Exception:
        tx["interest_rate"] = None

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
    Suporta aliases: pay_date/payDate -> action_text,
                     payment_method/paymentMethod -> client_text,
                     interest_rate/interestRate -> material_text (+ interest_rate numérico),
                     due_date/dueDate -> date.
    """
    payload = request.get_json(silent=True) or {}
    try:
        with _LOCK:
            items = _read_all()
            for idx, it in enumerate(items):
                if int(it.get("id")) == tx_id:
                    merged = {**it}  # base atual

                    # ---- mapeamentos de aliases ----
                    if "due_date" in payload or "dueDate" in payload:
                        payload["date"] = payload.get("due_date") or payload.get("dueDate")

                    if "pay_date" in payload or "payDate" in payload:
                        payload["action_text"] = payload.get("pay_date") or payload.get("payDate")

                    if "payment_method" in payload or "paymentMethod" in payload:
                        payload["client_text"] = payload.get("payment_method") or payload.get("paymentMethod")

                    if "interest_rate" in payload or "interestRate" in payload:
                        payload["material_text"] = payload.get("interest_rate") or payload.get("interestRate")

                    # ---- aplica campos simples primeiro ----
                    for k in ("category", "notes"):
                        if k in payload:
                            merged[k] = (payload.get(k) or "").strip()

                    if "type" in payload:
                        merged["type"] = _normalize_type(payload.get("type"))

                    if "status" in payload:
                        merged["status"] = _normalize_status(payload.get("status"))

                    if "amount" in payload:
                        merged["amount"] = _coerce_float(payload.get("amount"), merged.get("amount", 0))

                    # vencimento
                    if "date" in payload:
                        merged["date"] = _parse_date_value(payload.get("date"), field_name="Data de vencimento", required=True)

                    # pagamento (opcional)
                    if "action_text" in payload:
                        try:
                            merged["action_text"] = _parse_date_value(payload.get("action_text"), field_name="Data de pagamento", required=False)
                        except ValueError:
                            merged["action_text"] = (str(payload.get("action_text")) or "").strip()

                    # meio de pagamento
                    if "client_text" in payload:
                        merged["client_text"] = (str(payload.get("client_text")) or "").strip()

                    # juros (string + campo numérico auxiliar)
                    if "material_text" in payload:
                        mt = str(payload.get("material_text") or "").strip()
                        merged["material_text"] = mt
                        try:
                            merged["interest_rate"] = float(mt.replace(",", "."))
                        except Exception:
                            merged["interest_rate"] = None

                    items[idx] = merged
                    _write_all(items)
                    return jsonify(merged), 200

        return jsonify({"error": "not_found"}), 404
    except ValueError as ve:
        return jsonify({"error": "validation_error", "message": str(ve)}), 400
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
