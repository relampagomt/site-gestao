# backend/src/routes/finance.py
from __future__ import annotations

import math
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request

# ------------------------------------------------------------
# Firestore
# ------------------------------------------------------------
# Usa o mesmo wrapper de Firestore do seu projeto (ex.: clients, materials)
# Certifique-se de que src/services/firebase.py expõe "db" (google.cloud.firestore.Client)
try:
    from src.services.firebase import db  # type: ignore
except Exception as e:
    raise RuntimeError(
        "Não foi possível importar Firestore. "
        "Verifique se src/services/firebase.py expõe 'db' (instância do firestore.Client)."
    ) from e


finance_bp = Blueprint("finance", __name__)

COLLECTION = "transactions"  # coleção única para entradas (receber) e saídas (pagar)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _iso_date_only(d: Any) -> Optional[str]:
    """
    Converte diversos formatos para 'YYYY-MM-DD'.
    Aceita: 'YYYY-MM-DD', 'DD/MM/YYYY', datetime/date, ISO com 'T'.
    """
    if not d:
        return None
    if isinstance(d, date):
        return d.strftime("%Y-%m-%d")

    s = str(d).strip()
    # Tentativas em ordem
    fmts = ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ")
    for fmt in fmts:
        try:
            # se vier com T, corta para 19 chars p/ o formato com segundos
            dt = datetime.strptime(s[:19], fmt) if "T" in s else datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    return None


def _to_number(v: Any) -> float:
    if v is None or v == "":
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    # trata números no formato brasileiro
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        # fallback bruto
        try:
            return float(v)
        except Exception:
            return 0.0


def _doc_to_dict(doc) -> Dict[str, Any]:
    data = doc.to_dict() or {}
    data["id"] = doc.id
    # normaliza date para 'YYYY-MM-DD' (se armazenado de outro jeito)
    if "date" in data:
        data["date"] = _iso_date_only(data.get("date")) or data.get("date")
    # normaliza amount para float
    if "amount" in data and not isinstance(data["amount"], (int, float)):
        data["amount"] = _to_number(data["amount"])
    return data


def _apply_text_search(items: List[Dict[str, Any]], term: str) -> List[Dict[str, Any]]:
    if not term:
        return items
    term_low = term.lower()
    out = []
    for it in items:
        notes = str(it.get("notes") or "").lower()
        category = str(it.get("category") or "").lower()
        if term_low in notes or term_low in category:
            out.append(it)
    return out


def _apply_date_range(items: List[Dict[str, Any]], date_from: Optional[str], date_to: Optional[str]) -> List[Dict[str, Any]]:
    if not date_from and not date_to:
        return items

    def _in_range(dstr: Optional[str]) -> bool:
        if not dstr:
            return False
        if date_from and dstr < date_from:
            return False
        if date_to and dstr > date_to:
            return False
        return True

    return [it for it in items if _in_range(_iso_date_only(it.get("date")))]


def _sort_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Ordena por date desc + created_at desc (se houver)
    def _key(it):
        d = _iso_date_only(it.get("date")) or ""
        ca = str(it.get("created_at") or "")
        return (d, ca)

    return sorted(items, key=_key, reverse=True)


# ----------------- Mapeamentos de payload (front → Firestore) -----------------
def _map_payable_to_tx_payload(data: dict) -> dict:
    """
    Contas a Pagar → documento em COLLECTION (type='saida').
    Front envia (geralmente): vencimento, valor, descricao, categoria, action_id
    """
    date_norm = _iso_date_only(
        data.get("vencimento") or data.get("date") or data.get("data")
    ) or _iso_date_only(datetime.utcnow().date())
    amount = abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount")))
    return {
        "type": "saida",
        "date": date_norm,
        "amount": amount,
        "category": (data.get("categoria") or data.get("category") or "conta_pagar"),
        "notes": (data.get("descricao") or data.get("notes") or "").strip(),
        "action_id": (data.get("action_id") or None),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }


def _map_receivable_to_tx_payload(data: dict) -> dict:
    """
    Contas a Receber → documento em COLLECTION (type='entrada').
    Front envia (geralmente): vencimento, valor, descricao/cliente/notaFiscal, categoria, action_id
    """
    date_norm = _iso_date_only(
        data.get("vencimento") or data.get("dataEmissao") or data.get("date") or data.get("data")
    ) or _iso_date_only(datetime.utcnow().date())
    amount = abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount")))
    notes = (
        data.get("descricao")
        or data.get("cliente")
        or data.get("notaFiscal")
        or data.get("notes")
        or ""
    )
    return {
        "type": "entrada",
        "date": date_norm,
        "amount": amount,
        "category": (data.get("categoria") or data.get("category") or "conta_receber"),
        "notes": notes.strip(),
        "action_id": (data.get("action_id") or None),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }


def _partial_update_from_alias(data: dict, force_type: Optional[str] = None) -> dict:
    """
    Atualização parcial vinda dos aliases. Converte campos comuns do front.
    """
    upd: Dict[str, Any] = {}
    if any(k in data for k in ("vencimento", "date", "data", "dataEmissao")):
        d = _iso_date_only(
            data.get("vencimento") or data.get("dataEmissao") or data.get("date") or data.get("data")
        )
        if d:
            upd["date"] = d
    if any(k in data for k in ("valor", "amount")):
        upd["amount"] = abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount")))
    if any(k in data for k in ("descricao", "cliente", "notaFiscal", "notes")):
        upd["notes"] = (
            data.get("descricao")
            or data.get("cliente")
            or data.get("notaFiscal")
            or data.get("notes")
            or ""
        ).strip()
    if any(k in data for k in ("categoria", "category")):
        upd["category"] = (data.get("categoria") or data.get("category") or "").strip()
    if "action_id" in data:
        upd["action_id"] = data.get("action_id") or None

    if force_type in ("entrada", "saida"):
        upd["type"] = force_type

    if upd:
        upd["updated_at"] = _now_iso()
    return upd


def _validate_tx_payload(payload: dict) -> Optional[Tuple[str, int]]:
    """
    Checagens simples de payload.
    Retorna (mensagem, status) se inválido; caso contrário, None.
    """
    if payload.get("type") not in ("entrada", "saida"):
        return ("type inválido (use 'entrada' ou 'saida')", 400)
    if not _iso_date_only(payload.get("date")):
        return ("date inválido (use YYYY-MM-DD)", 400)
    if _to_number(payload.get("amount")) <= 0:
        return ("amount deve ser maior que zero", 400)
    return None


# ------------------------------------------------------------
# Rotas genéricas: /transactions
# ------------------------------------------------------------
@finance_bp.route("/transactions", methods=["GET"])
def list_transactions():
    """
    Filtros via querystring:
      - type: 'entrada' | 'saida'
      - date_from, date_to: YYYY-MM-DD
      - category: str
      - q: busca textual (notes/category)
      - limit (opcional, default 500)
    """
    qs = request.args or {}
    typ = qs.get("type")
    date_from = _iso_date_only(qs.get("date_from"))
    date_to = _iso_date_only(qs.get("date_to"))
    category = qs.get("category")
    term = (qs.get("q") or "").strip()
    limit = int(qs.get("limit") or 500)
    limit = max(1, min(limit, 2000))  # saneamento

    # Firestore: preferimos compor por igualdades e filtrar range em memória (para flexibilidade)
    col = db.collection(COLLECTION)
    query = col
    if typ in ("entrada", "saida"):
        query = query.where("type", "==", typ)
    if category:
        query = query.where("category", "==", category)

    docs = list(query.stream())
    items = [_doc_to_dict(d) for d in docs]

    # Filtros complementares em memória
    items = _apply_date_range(items, date_from, date_to)
    if term:
        items = _apply_text_search(items, term)

    items = _sort_items(items)
    if limit:
        items = items[:limit]

    return jsonify({"items": items, "count": len(items)}), 200


@finance_bp.route("/transactions", methods=["POST"])
def create_transaction():
    """
    body esperado:
      - type: 'entrada' | 'saida'  (obrigatório)
      - date: 'YYYY-MM-DD'         (obrigatório)
      - amount: number             (obrigatório > 0)
      - category, notes, action_id (opcional)
    """
    data = (request.get_json(silent=True) or {})
    payload = {
        "type": (data.get("type") or "").strip(),
        "date": _iso_date_only(data.get("date")) or _iso_date_only(datetime.utcnow().date()),
        "amount": abs(_to_number(data.get("amount"))),
        "category": (data.get("category") or None),
        "notes": (data.get("notes") or None),
        "action_id": (data.get("action_id") or None),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    invalid = _validate_tx_payload(payload)
    if invalid:
        msg, code = invalid
        return jsonify({"message": msg}), code

    ref = db.collection(COLLECTION).add(payload)
    # ref = (update_time, doc_ref)
    doc_id = ref[1].id
    return jsonify({"id": doc_id, **payload}), 201


@finance_bp.route("/transactions/<string:txid>", methods=["PUT", 'PATCH'])
def update_transaction(txid: str):
    data = (request.get_json(silent=True) or {})
    upd: Dict[str, Any] = {}

    # mapeia campos já no formato "genérico"
    if "type" in data and (data.get("type") in ("entrada", "saida")):
        upd["type"] = data.get("type")

    if "date" in data or "vencimento" in data or "data" in data or "dataEmissao" in data:
        d = _iso_date_only(data.get("date") or data.get("vencimento") or data.get("data") or data.get("dataEmissao"))
        if d:
            upd["date"] = d

    if "amount" in data or "valor" in data:
        upd["amount"] = abs(_to_number(data.get("amount") if "amount" in data else data.get("valor")))

    for k_src, k_dst in (("category", "category"), ("categoria", "category")):
        if k_src in data:
            upd[k_dst] = (data.get(k_src) or "").strip() or None

    if any(k in data for k in ("notes", "descricao", "cliente", "notaFiscal")):
        upd["notes"] = (
            data.get("notes")
            or data.get("descricao")
            or data.get("cliente")
            or data.get("notaFiscal")
            or ""
        ).strip() or None

    if "action_id" in data:
        upd["action_id"] = data.get("action_id") or None

    if not upd:
        return jsonify({"message": "Nada para atualizar"}), 400

    upd["updated_at"] = _now_iso()

    doc_ref = db.collection(COLLECTION).document(txid)
    if not doc_ref.get().exists:
        return jsonify({"message": "Transação não encontrada"}), 404

    doc_ref.update(upd)
    new_doc = doc_ref.get()
    return jsonify(_doc_to_dict(new_doc)), 200


@finance_bp.route("/transactions/<string:txid>", methods=["DELETE"])
def delete_transaction(txid: str):
    doc_ref = db.collection(COLLECTION).document(txid)
    if not doc_ref.get().exists:
        return jsonify({"message": "Transação não encontrada"}), 404
    doc_ref.delete()
    return ("", 204)


# ------------------------------------------------------------
# Aliases: /contas-pagar (type='saida') e /contas-receber (type='entrada')
# ------------------------------------------------------------
# LISTAR
@finance_bp.route("/contas-pagar", methods=["GET"])
def listar_contas_pagar():
    # Reaproveita listagem genérica com type=saida
    args = request.args.to_dict(flat=True)
    args["type"] = "saida"
    with finance_bp.test_request_context(query_string=args):
        return list_transactions()


@finance_bp.route("/contas-receber", methods=["GET"])
def listar_contas_receber():
    args = request.args.to_dict(flat=True)
    args["type"] = "entrada"
    with finance_bp.test_request_context(query_string=args):
        return list_transactions()


# CRIAR
@finance_bp.route("/contas-pagar", methods=["POST"])
def criar_conta_pagar():
    data = request.get_json(silent=True) or {}
    payload = _map_payable_to_tx_payload(data)
    invalid = _validate_tx_payload(payload)
    if invalid:
        msg, code = invalid
        return jsonify({"message": msg}), code
    ref = db.collection(COLLECTION).add(payload)
    return jsonify({"id": ref[1].id, **payload}), 201


@finance_bp.route("/contas-receber", methods=["POST"])
def criar_conta_receber():
    data = request.get_json(silent=True) or {}
    payload = _map_receivable_to_tx_payload(data)
    invalid = _validate_tx_payload(payload)
    if invalid:
        msg, code = invalid
        return jsonify({"message": msg}), code
    ref = db.collection(COLLECTION).add(payload)
    return jsonify({"id": ref[1].id, **payload}), 201


# ATUALIZAR
@finance_bp.route("/contas-pagar/<string:txid>", methods=["PUT", "PATCH"])
def atualizar_conta_pagar(txid: str):
    data = request.get_json(silent=True) or {}
    upd = _partial_update_from_alias(data, force_type="saida")
    if not upd:
        return jsonify({"message": "Nada para atualizar"}), 400
    doc_ref = db.collection(COLLECTION).document(txid)
    if not doc_ref.get().exists:
        return jsonify({"message": "Transação não encontrada"}), 404
    doc_ref.update(upd)
    return jsonify(_doc_to_dict(doc_ref.get())), 200


@finance_bp.route("/contas-receber/<string:txid>", methods=["PUT", "PATCH"])
def atualizar_conta_receber(txid: str):
    data = request.get_json(silent=True) or {}
    upd = _partial_update_from_alias(data, force_type="entrada")
    if not upd:
        return jsonify({"message": "Nada para atualizar"}), 400
    doc_ref = db.collection(COLLECTION).document(txid)
    if not doc_ref.get().exists:
        return jsonify({"message": "Transação não encontrada"}), 404
    doc_ref.update(upd)
    return jsonify(_doc_to_dict(doc_ref.get())), 200


# DELETAR
@finance_bp.route("/contas-pagar/<string:txid>", methods=["DELETE"])
def deletar_conta_pagar(txid: str):
    doc_ref = db.collection(COLLECTION).document(txid)
    if not doc_ref.get().exists:
        return jsonify({"message": "Transação não encontrada"}), 404
    doc_ref.delete()
    return ("", 204)


@finance_bp.route("/contas-receber/<string:txid>", methods=["DELETE"])
def deletar_conta_receber(txid: str):
    doc_ref = db.collection(COLLECTION).document(txid)
    if not doc_ref.get().exists:
        return jsonify({"message": "Transação não encontrada"}), 404
    doc_ref.delete()
    return ("", 204)
