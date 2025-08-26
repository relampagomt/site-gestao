# backend/src/routes/finance.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Any, Dict, Tuple, List
import math

# Usa Firestore (ou memória) via serviço centralizado
from src.services.firestore_service import firestore_service as fs

finance_bp = Blueprint("finance", __name__)

COL_TX = "finance_transactions"

# -----------------------
# Helpers
# -----------------------
def _iso_now():
    return datetime.utcnow().isoformat()

def _parse_date_any(v: Any) -> str:
    """
    Aceita 'YYYY-MM-DD' ou 'DD/MM/YYYY'. Retorna ISO 'YYYY-MM-DD' ou ''.
    """
    if not v:
        return ""
    s = str(v).strip()
    # ISO
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return s
    except Exception:
        pass
    # BR
    try:
        d = datetime.strptime(s, "%d/%m/%Y")
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

ALLOWED_STATUS = {"Pago", "Pendente", "Cancelado"}
ALLOWED_TIPOS = {"entrada", "saida", "despesa", "pagar", "receber"}

def _apply_aliases(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza os campos vindos do front para o modelo único de transações.
    """
    data_raw = payload.get("date") or payload.get("due_date") or payload.get("dueDate")
    pay_raw  = payload.get("action_text") or payload.get("pay_date") or payload.get("payDate")

    data_iso = _parse_date_any(data_raw)
    pay_iso  = _parse_date_any(pay_raw)

    # status/tipo
    status = str(payload.get("status") or "Pendente").capitalize()
    if status not in ALLOWED_STATUS:
        status = "Pendente"

    tipo = (payload.get("tipo") or payload.get("type") or "").lower()
    if tipo not in ALLOWED_TIPOS:
        # heurística: se vier "pagar"/"receber" seguimos; senão decide por sinal do valor
        tipo = "pagar" if _parse_brl(payload.get("valor")) >= 0 else "despesa"

    return {
        "tipo": tipo,
        "descricao": (payload.get("descricao") or payload.get("description") or "").strip(),
        "categoria": (payload.get("categoria") or payload.get("category") or "").strip(),
        "date": data_iso,                    # ISO YYYY-MM-DD (obrigatório)
        "status": status,                    # Pago | Pendente | Cancelado
        "valor": _parse_brl(payload.get("valor") or payload.get("amount") or 0),
        "client_text": (payload.get("client_text") or payload.get("payment_method") or payload.get("paymentMethod") or "").strip(),
        "material_text": (payload.get("material_text") or payload.get("interest_rate") or payload.get("interestRate") or "").strip(),
        # Campo livre: registra a data de pagamento OU o texto recebido
        "action_text": pay_iso if pay_iso else (payload.get("action_text") or pay_raw or ""),
        # Meta
        "updated_at": _iso_now(),
    }

def _validate_required_date(data: Dict[str, Any]) -> Tuple[bool, str]:
    if not data.get("date"):
        return False, "data (date) é obrigatória no formato YYYY-MM-DD ou DD/MM/AAAA"
    return True, ""

def _sort_default(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def keyf(x):
        d = x.get("date") or ""
        ts = x.get("updated_at") or x.get("created_at") or ""
        return (d, ts)
    return sorted(items, key=keyf, reverse=True)

# -----------------------
# Endpoints
# -----------------------
@finance_bp.get("/transactions")
def list_transactions():
    items = fs.get_all_documents(COL_TX) or []
    items = _sort_default(items)
    return jsonify(items), 200

@finance_bp.post("/transactions")
def create_transaction():
    payload = request.get_json(force=True, silent=True) or {}
    data = _apply_aliases(payload)
    ok, msg = _validate_required_date(data)
    if not ok:
        return jsonify({"error": msg}), 400
    data.setdefault("created_at", _iso_now())
    doc_id, _ = fs.add_document(COL_TX, data)
    saved = fs.get_document(COL_TX, doc_id) or {**data, "id": doc_id}
    return jsonify(saved), 201

@finance_bp.put("/transactions/<id>")
def update_transaction(id):
    payload = request.get_json(force=True, silent=True) or {}
    data = _apply_aliases(payload)
    ok, msg = _validate_required_date(data)
    if not ok:
        return jsonify({"error": msg}), 400
    fs.update_document(COL_TX, id, data)
    saved = fs.get_document(COL_TX, id)
    if not saved:
        return jsonify({"error": "Registro não encontrado"}), 404
    return jsonify(saved), 200

@finance_bp.patch("/transactions/<id>")
def patch_transaction(id):
    payload = request.get_json(force=True, silent=True) or {}
    # patch parcial (normaliza apenas o que existir)
    partial = {}
    if "status" in payload:
        st = str(payload.get("status") or "").capitalize()
        if st in ALLOWED_STATUS:
            partial["status"] = st
    if "valor" in payload:
        partial["valor"] = _parse_brl(payload.get("valor"))
    if "date" in payload or "due_date" in payload or "dueDate" in payload:
        d = _parse_date_any(payload.get("date") or payload.get("due_date") or payload.get("dueDate"))
        if d: partial["date"] = d
    if "action_text" in payload or "pay_date" in payload or "payDate" in payload:
        p = _parse_date_any(payload.get("action_text") or payload.get("pay_date") or payload.get("payDate"))
        partial["action_text"] = p if p else (payload.get("action_text") or payload.get("pay_date") or payload.get("payDate"))

    if partial:
        partial["updated_at"] = _iso_now()

    fs.update_document(COL_TX, id, partial)
    saved = fs.get_document(COL_TX, id)
    if not saved:
        return jsonify({"error": "Registro não encontrado"}), 404
    return jsonify(saved), 200

@finance_bp.get("/transactions/<id>")
def get_single(id):
    it = fs.get_document(COL_TX, id)
    if not it:
        return jsonify({"error": "Registro não encontrado"}), 404
    return jsonify(it), 200

@finance_bp.delete("/transactions/<id>")
def delete_transaction(id):
    it = fs.get_document(COL_TX, id)
    if not it:
        return jsonify({"error": "Registro não encontrado"}), 404
    fs.delete_document(COL_TX, id)
    return jsonify({"ok": True}), 200
