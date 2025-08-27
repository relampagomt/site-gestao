# backend/src/routes/finance.py
# Persistência em Firebase Firestore (sem JSON local)
# Endpoints: /api/transactions[/:id]
# Correções: sanitização de datetimes/Timestamp e ordenação segura.

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from typing import Any, Dict, List, Tuple
import math

from src.services.firestore_service import firestore_service as fs

finance_bp = Blueprint("finance", __name__)
COLLECTION = "finance_transactions"

# ----------------------- Helpers -----------------------

def _iso_now() -> str:
    return datetime.utcnow().isoformat()

def _is_ymd(s: str) -> bool:
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except Exception:
        return False

def _parse_date_any(v: Any) -> str:
    """
    Aceita YYYY-MM-DD ou DD/MM/YYYY. Retorna sempre YYYY-MM-DD ou ''.
    """
    if not v:
        return ""
    s = str(v).strip()
    if _is_ymd(s[:10]):
        return s[:10]
    try:
        d = datetime.strptime(s[:10], "%d/%m/%Y")
        return d.strftime("%Y-%m-%d")
    except Exception:
        return ""

def _parse_brl(v: Any, default: float = 0.0) -> float:
    if v is None or v == "":
        return default
    if isinstance(v, (int, float)) and math.isfinite(float(v)):
        return float(v)
    s = str(v).strip().replace(".", "").replace(",", ".")
    try:
        n = float(s)
        return n if math.isfinite(n) else default
    except Exception:
        return default

def _to_iso_if_datetime(x: Any) -> Any:
    """
    Converte datetime/objetos Timestamp retornados pelo client do Firestore
    em string ISO. Mantém os demais valores.
    """
    if isinstance(x, datetime):
        return x.isoformat()
    return x

def _sanitize_doc(d: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in (d or {}).items():
        if isinstance(v, dict):
            out[k] = _sanitize_doc(v)
        elif isinstance(v, list):
            out[k] = [
                _sanitize_doc(i) if isinstance(i, dict)
                else _to_iso_if_datetime(i)
                for i in v
            ]
        else:
            out[k] = _to_iso_if_datetime(v)
    return out

ALLOWED_STATUS = {"Pago", "Pendente", "Cancelado"}
ALLOWED_TYPES = {"entrada", "saida", "despesa", "pagar", "receber"}

def _normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza os campos aceitos pelo front.
    """
    due_raw = payload.get("date") or payload.get("due_date") or payload.get("dueDate")
    pay_raw = payload.get("action_text") or payload.get("pay_date") or payload.get("payDate")

    due_iso = _parse_date_any(due_raw)
    pay_iso = _parse_date_any(pay_raw)

    status = str(payload.get("status") or "Pendente").capitalize()
    if status not in ALLOWED_STATUS:
        status = "Pendente"

    t = (payload.get("type") or payload.get("tipo") or "").lower().strip()
    if t not in ALLOWED_TYPES:
        t = "entrada" if _parse_brl(payload.get("amount") or payload.get("valor") or 0) >= 0 else "saida"
    if t == "pagar":
        t = "saida"
    elif t == "receber":
        t = "entrada"

    return {
        "type": t,
        "date": due_iso,  # obrigatório (YYYY-MM-DD)
        "action_text": pay_iso if pay_iso else (payload.get("action_text") or ""),
        "amount": _parse_brl(payload.get("amount") or payload.get("valor") or 0),
        "category": (payload.get("category") or payload.get("categoria") or "").strip(),
        "status": status,
        "notes": (payload.get("notes") or payload.get("observacoes") or payload.get("obs") or "").strip(),
        "client_text": (payload.get("client_text") or payload.get("payment_method") or payload.get("paymentMethod") or "").strip(),
        "material_text": (payload.get("material_text") or payload.get("interest_rate") or payload.get("interestRate") or "").strip(),
        "updated_at": _iso_now(),
    }

def _require_date(data: Dict[str, Any]) -> Tuple[bool, str]:
    if not data.get("date"):
        return False, "Campo 'date' é obrigatório (DD/MM/AAAA ou YYYY-MM-DD)."
    return True, ""

def _k_str(x: Any) -> str:
    x = _to_iso_if_datetime(x)
    return "" if x is None else str(x)

def _sort_desc(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ordena por (date, updated_at|created_at) convertendo chaves para string,
    evitando TypeError quando existem datetimes misturados com strings.
    """
    def keyf(x):
        d = _k_str(x.get("date"))
        ts = _k_str(x.get("updated_at") or x.get("created_at"))
        return (d, ts)
    return sorted(items, key=keyf, reverse=True)

def _json_error(e: Exception, status: int = 500):
    msg = str(e)
    code = "internal_error"
    if "Credenciais do Firebase" in msg or "Failed to initialize a certificate credential" in msg:
        code = "firebase_credentials_error"
    current_app.logger.exception("finance error: %s", msg)
    return jsonify({"error": code, "detail": msg}), status

# ----------------------- Endpoints -----------------------

@finance_bp.get("/transactions")
def list_transactions():
    try:
        raw = fs.get_all_documents(COLLECTION) or []
        items = [_sanitize_doc(i) for i in raw]
        items = _sort_desc(items)
        return jsonify(items), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.post("/transactions")
def create_transaction():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        data = _normalize_payload(payload)
        ok, msg = _require_date(data)
        if not ok:
            return jsonify({"error": msg}), 400
        data.setdefault("created_at", _iso_now())
        doc_id, _ = fs.add_document(COLLECTION, data)
        saved = fs.get_document(COLLECTION, doc_id) or {**data, "id": doc_id}
        saved = _sanitize_doc(saved)
        return jsonify(saved), 201
    except Exception as e:
        return _json_error(e)

@finance_bp.put("/transactions/<id>")
def update_transaction(id):
    try:
        payload = request.get_json(force=True, silent=True) or {}
        data = _normalize_payload(payload)
        ok, msg = _require_date(data)
        if not ok:
            return jsonify({"error": msg}), 400
        fs.update_document(COLLECTION, id, data)
        saved = fs.get_document(COLLECTION, id)
        if not saved:
            return jsonify({"error": "Registro não encontrado"}), 404
        saved = _sanitize_doc(saved)
        return jsonify(saved), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.patch("/transactions/<id>")
def patch_transaction(id):
    try:
        payload = request.get_json(force=True, silent=True) or {}
        partial: Dict[str, Any] = {}

        if "status" in payload:
            st = str(payload.get("status") or "").capitalize()
            if st in ALLOWED_STATUS:
                partial["status"] = st

        if "amount" in payload or "valor" in payload:
            partial["amount"] = _parse_brl(payload.get("amount") or payload.get("valor"))

        if any(k in payload for k in ("date", "due_date", "dueDate")):
            d = _parse_date_any(payload.get("date") or payload.get("due_date") or payload.get("dueDate"))
            if d:
                partial["date"] = d

        if any(k in payload for k in ("action_text", "pay_date", "payDate")):
            p = _parse_date_any(payload.get("action_text") or payload.get("pay_date") or payload.get("payDate"))
            partial["action_text"] = p if p else (payload.get("action_text") or payload.get("pay_date") or payload.get("payDate") or "")

        if "category" in payload or "categoria" in payload:
            partial["category"] = (payload.get("category") or payload.get("categoria") or "").strip()

        if "notes" in payload or "observacoes" in payload or "obs" in payload:
            partial["notes"] = (payload.get("notes") or payload.get("observacoes") or payload.get("obs") or "").strip()

        if "client_text" in payload or "payment_method" in payload or "paymentMethod" in payload:
            partial["client_text"] = (payload.get("client_text") or payload.get("payment_method") or payload.get("paymentMethod") or "").strip()

        if "material_text" in payload or "interest_rate" in payload or "interestRate" in payload:
            partial["material_text"] = (payload.get("material_text") or payload.get("interest_rate") or payload.get("interestRate") or "").strip()

        if partial:
            partial["updated_at"] = _iso_now()

        fs.update_document(COLLECTION, id, partial)
        saved = fs.get_document(COLLECTION, id)
        if not saved:
            return jsonify({"error": "Registro não encontrado"}), 404
        saved = _sanitize_doc(saved)
        return jsonify(saved), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.get("/transactions/<id>")
def get_single(id):
    try:
        it = fs.get_document(COLLECTION, id)
        if not it:
            return jsonify({"error": "Registro não encontrado"}), 404
        it = _sanitize_doc(it)
        return jsonify(it), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.delete("/transactions/<id>")
def delete_transaction(id):
    try:
        it = fs.get_document(COLLECTION, id)
        if not it:
            return jsonify({"error": "Registro não encontrado"}), 404
        fs.delete_document(COLLECTION, id)
        return jsonify({"ok": True}), 200
    except Exception as e:
        return _json_error(e)

# Diagnóstico rápido
@finance_bp.get("/finance/_debug")
def finance_debug():
    try:
        raw = fs.get_all_documents(COLLECTION) or []
        items = [_sanitize_doc(i) for i in raw]
        return jsonify({"ok": True, "count": len(items)}), 200
    except Exception as e:
        return _json_error(e)
