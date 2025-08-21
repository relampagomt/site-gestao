# backend/src/routes/finance.py
from __future__ import annotations

import decimal
from datetime import datetime, date
from typing import Any, Dict, Optional

from flask import Blueprint, request, jsonify, current_app
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

# -----------------------------------------------------------------------------
# Integrações básicas
# -----------------------------------------------------------------------------
# Espera-se que o app já tenha SQLAlchemy inicializado em main.py:
#   db = SQLAlchemy(app)
# Para evitar import cíclico, pegamos via current_app.extensions quando necessário.

def _get_db() -> SQLAlchemy:
    db: SQLAlchemy = current_app.extensions["sqlalchemy"].db  # type: ignore
    return db

finance_bp = Blueprint("finance", __name__)

# -----------------------------------------------------------------------------
# Modelo (caso seu projeto já tenha, deixe este como referência ou alinhe o nome)
# -----------------------------------------------------------------------------
# Tabela padrão: transactions
# Campos mínimos: id, date, amount, type ('entrada'|'saida'), category, notes, action_id
# Ajuste nomes se já existir um modelo equivalente no projeto.

def _decimal_two(v: Any) -> decimal.Decimal:
    try:
        return decimal.Decimal(str(v)).quantize(decimal.Decimal("0.01"))
    except Exception:
        return decimal.Decimal("0.00")

def _iso_date_only(d: Any) -> Optional[str]:
    if not d:
        return None
    if isinstance(d, date):
        return d.strftime("%Y-%m-%d")
    s = str(d).strip()
    # aceita DD/MM/AAAA, YYYY-MM-DD e ISO datetime
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            dt = datetime.strptime(s[:19], fmt) if "T" in s else datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    return None

def _to_number(v: Any) -> float:
    if v is None or v == "":
        return 0.0
    s = str(v).replace(".", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        try:
            return float(v)
        except Exception:
            return 0.0

def _ok(payload, status=200):
    return jsonify(payload), status

# Obtemos o Model dinamicamente, caso já exista no projeto:
def _get_transaction_model():
    db = _get_db()
    class Transaction(db.Model):  # type: ignore
        __tablename__ = "transactions"

        id = db.Column(db.Integer, primary_key=True)
        date = db.Column(db.Date, nullable=False, index=True)
        amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
        type = db.Column(db.String(16), nullable=False, index=True)  # 'entrada' | 'saida'
        category = db.Column(db.String(64), nullable=True, index=True)
        notes = db.Column(db.Text, nullable=True)
        action_id = db.Column(db.String(64), nullable=True, index=True)

        created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
        updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

        def to_dict(self):
            return {
                "id": self.id,
                "date": self.date.strftime("%Y-%m-%d"),
                "amount": float(self.amount or 0),
                "type": self.type,
                "category": self.category,
                "notes": self.notes,
                "action_id": self.action_id,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            }
    return Transaction

# -----------------------------------------------------------------------------
# CRUD de /transactions (genéricas) — usado também pelos aliases
# -----------------------------------------------------------------------------

@finance_bp.route("/transactions", methods=["GET"])
def list_transactions():
    """
    Filtros aceitos (querystring):
      - type: 'entrada' | 'saida'
      - date_from, date_to: YYYY-MM-DD
      - category: str
      - q: busca em notes
    """
    db = _get_db()
    Transaction = _get_transaction_model()

    q = Transaction.query

    t = request.args.get("type")
    if t in ("entrada", "saida"):
        q = q.filter(Transaction.type == t)

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    if date_from:
        d = _iso_date_only(date_from)
        if d:
            q = q.filter(Transaction.date >= d)
    if date_to:
        d = _iso_date_only(date_to)
        if d:
            q = q.filter(Transaction.date <= d)

    category = request.args.get("category")
    if category:
        q = q.filter(Transaction.category == category)

    term = request.args.get("q")
    if term:
        q = q.filter(Transaction.notes.ilike(f"%{term}%"))

    q = q.order_by(Transaction.date.desc(), Transaction.id.desc())

    items = [it.to_dict() for it in q.all()]
    return _ok({"items": items, "count": len(items)})


@finance_bp.route("/transactions", methods=["POST"])
def create_transaction():
    """
    body:
      - type (obrigatório): 'entrada' | 'saida'
      - date (YYYY-MM-DD, obrigatório)
      - amount (number, obrigatório)
      - category (opcional)
      - notes (opcional)
      - action_id (opcional)
    """
    db = _get_db()
    Transaction = _get_transaction_model()

    data: Dict[str, Any] = (request.get_json(silent=True) or {})
    # Permite que aliases injetem um json já mapeado pela property privada
    data = getattr(request, "_cached_json", data)

    typ = (data.get("type") or "").strip().lower()
    if typ not in ("entrada", "saida"):
        return _ok({"message": "type inválido: use 'entrada' ou 'saida'."}, 400)

    d = _iso_date_only(data.get("date"))
    if not d:
        return _ok({"message": "date inválida. Formato esperado: YYYY-MM-DD."}, 400)

    amount = _to_number(data.get("amount"))
    if amount <= 0:
        return _ok({"message": "amount deve ser maior que zero."}, 400)

    tx = Transaction(
        type=typ,
        date=datetime.strptime(d, "%Y-%m-%d").date(),
        amount=_decimal_two(amount),
        category=(data.get("category") or None),
        notes=(data.get("notes") or None),
        action_id=(data.get("action_id") or None),
    )
    db.session.add(tx)
    db.session.commit()
    return _ok(tx.to_dict(), 201)


@finance_bp.route("/transactions/<int:txid>", methods=["PUT", "PATCH"])
def update_transaction(txid: int):
    db = _get_db()
    Transaction = _get_transaction_model()

    tx = Transaction.query.get(txid)
    if not tx:
        return _ok({"message": "Transação não encontrada."}, 404)

    data: Dict[str, Any] = (request.get_json(silent=True) or {})
    data = getattr(request, "_cached_json", data)

    if "type" in data:
        typ = (data.get("type") or "").strip().lower()
        if typ in ("entrada", "saida"):
            tx.type = typ

    if "date" in data:
        d = _iso_date_only(data.get("date"))
        if d:
            tx.date = datetime.strptime(d, "%Y-%m-%d").date()

    if "amount" in data:
        tx.amount = _decimal_two(_to_number(data.get("amount")))

    if "category" in data:
        tx.category = (data.get("category") or None)

    if "notes" in data:
        tx.notes = (data.get("notes") or None)

    if "action_id" in data:
        tx.action_id = (data.get("action_id") or None)

    db.session.commit()
    return _ok(tx.to_dict(), 200)


@finance_bp.route("/transactions/<int:txid>", methods=["DELETE"])
def delete_transaction(txid: int):
    db = _get_db()
    Transaction = _get_transaction_model()

    tx = Transaction.query.get(txid)
    if not tx:
        return _ok({"message": "Transação não encontrada."}, 404)
    db.session.delete(tx)
    db.session.commit()
    return _ok({}, 204)

# -----------------------------------------------------------------------------
# Mapeadores dos aliases (front envia 'vencimento', 'valor', 'descricao'…)
# -----------------------------------------------------------------------------

def _map_payable_to_tx_payload(data: dict) -> dict:
    """Contas a Pagar → /transactions"""
    return {
        "type": "saida",
        "date": _iso_date_only(data.get("vencimento") or data.get("date")),
        "amount": abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount"))),
        "category": (data.get("categoria") or data.get("category") or "conta_pagar"),
        "notes": (data.get("descricao") or data.get("notes") or "").strip(),
        "action_id": (data.get("action_id") or None),
    }

def _map_receivable_to_tx_payload(data: dict) -> dict:
    """Contas a Receber → /transactions"""
    return {
        "type": "entrada",
        "date": _iso_date_only(data.get("vencimento") or data.get("dataEmissao") or data.get("date")),
        "amount": abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount"))),
        "category": (data.get("categoria") or data.get("category") or "conta_receber"),
        "notes": (
            data.get("descricao")
            or data.get("cliente")
            or data.get("notaFiscal")
            or data.get("notes")
            or ""
        ).strip(),
        "action_id": (data.get("action_id") or None),
    }

# -----------------------------------------------------------------------------
# Aliases: /contas-pagar  e  /contas-receber
# -----------------------------------------------------------------------------

# --------- LISTAR (corrige 405 do print) ---------
@finance_bp.route("/contas-pagar", methods=["GET"])
def listar_contas_pagar():
    # injeta filtro type=saida e reutiliza list_transactions
    args = request.args.to_dict(flat=True)
    args["type"] = "saida"
    # hack simples para repassar filtros:
    with current_app.test_request_context(query_string=args):
        return list_transactions()

@finance_bp.route("/contas-receber", methods=["GET"])
def listar_contas_receber():
    args = request.args.to_dict(flat=True)
    args["type"] = "entrada"
    with current_app.test_request_context(query_string=args):
        return list_transactions()

# --------- CRIAR (corrige 500 mapeando campos) ---------
@finance_bp.route("/contas-pagar", methods=["POST"])
def criar_conta_pagar():
    data = request.get_json(silent=True) or {}
    mapped = _map_payable_to_tx_payload(data)
    if not mapped.get("date"):
        return _ok({"message": "vencimento/date inválido. Use YYYY-MM-DD."}, 400)
    request._cached_json = mapped  # repassa para create_transaction
    return create_transaction()

@finance_bp.route("/contas-receber", methods=["POST"])
def criar_conta_receber():
    data = request.get_json(silent=True) or {}
    mapped = _map_receivable_to_tx_payload(data)
    if not mapped.get("date"):
        return _ok({"message": "vencimento/date inválido. Use YYYY-MM-DD."}, 400)
    request._cached_json = mapped
    return create_transaction()

# --------- ATUALIZAR ---------
@finance_bp.route("/contas-pagar/<int:txid>", methods=["PUT", "PATCH"])
def atualizar_conta_pagar(txid: int):
    data = request.get_json(silent=True) or {}
    upd: Dict[str, Any] = {}
    if any(k in data for k in ("vencimento", "date")):
        d = _iso_date_only(data.get("vencimento") or data.get("date"))
        if d:
            upd["date"] = d
    if any(k in data for k in ("valor", "amount")):
        upd["amount"] = abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount")))
    if any(k in data for k in ("descricao", "notes")):
        upd["notes"] = (data.get("descricao") or data.get("notes") or "").strip()
    if any(k in data for k in ("categoria", "category")):
        upd["category"] = (data.get("categoria") or data.get("category") or "").strip()
    upd["type"] = "saida"
    if not upd:
        return _ok({"message": "Nada para atualizar."}, 400)
    request._cached_json = upd
    return update_transaction(txid)

@finance_bp.route("/contas-receber/<int:txid>", methods=["PUT", "PATCH"])
def atualizar_conta_receber(txid: int):
    data = request.get_json(silent=True) or {}
    upd: Dict[str, Any] = {}
    if any(k in data for k in ("vencimento", "dataEmissao", "date")):
        d = _iso_date_only(data.get("vencimento") or data.get("dataEmissao") or data.get("date"))
        if d:
            upd["date"] = d
    if any(k in data for k in ("valor", "amount")):
        upd["amount"] = abs(_to_number(data.get("valor") if data.get("valor") is not None else data.get("amount")))
    if any(k in data for k in ("descricao","cliente","notaFiscal","notes")):
        upd["notes"] = (
            data.get("descricao")
            or data.get("cliente")
            or data.get("notaFiscal")
            or data.get("notes")
            or ""
        ).strip()
    if any(k in data for k in ("categoria", "category")):
        upd["category"] = (data.get("categoria") or data.get("category") or "").strip()
    upd["type"] = "entrada"
    if not upd:
        return _ok({"message": "Nada para atualizar."}, 400)
    request._cached_json = upd
    return update_transaction(txid)

# --------- DELETAR ---------
@finance_bp.route("/contas-pagar/<int:txid>", methods=["DELETE"])
def deletar_conta_pagar(txid: int):
    return delete_transaction(txid)

@finance_bp.route("/contas-receber/<int:txid>", methods=["DELETE"])
def deletar_conta_receber(txid: int):
    return delete_transaction(txid)
