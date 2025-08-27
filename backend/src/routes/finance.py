# backend/src/routes/finance.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from typing import Any, Dict, Tuple, List
import math

# Firestore centralizado (Firebase real)
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
        tipo = "pagar" if _parse_brl(payload.get("valor") or payload.get("amount")) >= 0 else "despesa"

    return {
        "type": "entrada" if tipo == "receber" else ("saida" if tipo == "pagar" else tipo),
        "description": (payload.get("descricao") or payload.get("description") or "").strip(),
        "category": (payload.get("categoria") or payload.get("category") or "").strip(),
        "date": data_iso,                    # ISO YYYY-MM-DD (obrigatório)
        "status": status,                    # Pago | Pendente | Cancelado
        "amount": _parse_brl(payload.get("valor") or payload.get("amount") or 0),
        # mapeamento dos “textos livres”
        "client_text": (payload.get("client_text") or payload.get("payment_method") or payload.get("paymentMethod") or "").strip(),
        "material_text": (payload.get("material_text") or payload.get("interest_rate") or payload.get("interestRate") or "").strip(),
        # Campo livre: registra a data de pagamento OU o texto recebido
        "action_text": pay_iso if pay_iso else (payload.get("action_text") or pay_raw or ""),
        # Meta
        "updated_at": _iso_now(),
        # Observações se existirem
        "notes": (payload.get("notes") or payload.get("observacoes") or payload.get("obs") or "").strip(),
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

def _json_error(e: Exception, status: int = 500):
    msg = str(e)
    code = "internal_error"
    # Sinaliza credencial ruim de forma clara (para você ver no front)
    if "Credenciais do Firebase" in msg or "Failed to initialize a certificate credential" in msg:
        code = "firebase_credentials_error"
    current_app.logger.exception("finance error: %s", msg)
    return jsonify({"error": code, "detail": msg}), status

# -----------------------
# Endpoints
# -----------------------
@finance_bp.get("/transactions")
def list_transactions():
    try:
        items = fs.get_all_documents(COL_TX) or []
        items = _sort_default(items)
        return jsonify(items), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.post("/transactions")
def create_transaction():
    try:
        payload = request.get_json(force=True, silent=True) or {}
        data = _apply_aliases(payload)
        ok, msg = _validate_required_date(data)
        if not ok:
            return jsonify({"error": msg}), 400
        data.setdefault("created_at", _iso_now())
        doc_id, _ = fs.add_document(COL_TX, data)
        saved = fs.get_document(COL_TX, doc_id) or {**data, "id": doc_id}
        return jsonify(saved), 201
    except Exception as e:
        return _json_error(e)

@finance_bp.put("/transactions/<id>")
def update_transaction(id):
    try:
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
    except Exception as e:
        return _json_error(e)

@finance_bp.patch("/transactions/<id>")
def patch_transaction(id):
    try:
        payload = request.get_json(force=True, silent=True) or {}
        partial = {}

        if "status" in payload:
            st = str(payload.get("status") or "").capitalize()
            if st in ALLOWED_STATUS:
                partial["status"] = st
        if "valor" in payload or "amount" in payload:
            partial["amount"] = _parse_brl(payload.get("valor") or payload.get("amount"))
        if any(k in payload for k in ("date", "due_date", "dueDate")):
            d = _parse_date_any(payload.get("date") or payload.get("due_date") or payload.get("dueDate"))
            if d:
                partial["date"] = d
        if any(k in payload for k in ("action_text", "pay_date", "payDate")):
            p = _parse_date_any(payload.get("action_text") or payload.get("pay_date") or payload.get("payDate"))
            partial["action_text"] = p if p else (payload.get("action_text") or payload.get("pay_date") or payload.get("payDate"))

        if "notes" in payload or "observacoes" in payload or "obs" in payload:
            partial["notes"] = (payload.get("notes") or payload.get("observacoes") or payload.get("obs") or "").strip()

        if partial:
            partial["updated_at"] = _iso_now()

        fs.update_document(COL_TX, id, partial)
        saved = fs.get_document(COL_TX, id)
        if not saved:
            return jsonify({"error": "Registro não encontrado"}), 404
        return jsonify(saved), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.get("/transactions/<id>")
def get_single(id):
    try:
        it = fs.get_document(COL_TX, id)
        if not it:
            return jsonify({"error": "Registro não encontrado"}), 404
        return jsonify(it), 200
    except Exception as e:
        return _json_error(e)

@finance_bp.delete("/transactions/<id>")
def delete_transaction(id):
    try:
        it = fs.get_document(COL_TX, id)
        if not it:
            return jsonify({"error": "Registro não encontrado"}), 404
        fs.delete_document(COL_TX, id)
        return jsonify({"ok": True}), 200
    except Exception as e:
        return _json_error(e)

# -----------------------
# Debug rápido (sem segredos)
# -----------------------
@finance_bp.get("/finance/_debug")
def finance_debug():
    """
    Checa se o Firebase foi inicializado e se a coleção é acessível.
    Útil para Render/Vercel.
    """
    try:
        # tenta apenas contar docs
        items = fs.get_all_documents(COL_TX) or []
        return jsonify({
            "ok": True,
            "count": len(items),
        }), 200
    except Exception as e:
        return _json_error(e)
