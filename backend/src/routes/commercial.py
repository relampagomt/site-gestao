# backend/src/routes/commercial.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Any, Dict
from src.services.firestore_service import firestore_service as fs

commercial_bp = Blueprint("commercial", __name__)

COL_CLIENTS = "commercial_clients"
COL_RECORDS = "commercial_records"
COL_ORDERS  = "commercial_orders"

def _iso_now(): return datetime.utcnow().isoformat()

def _parse_date(v: Any) -> str:
    if not v: return ""
    s = str(v).strip()
    from datetime import datetime
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return ""

# ---------- Clients ----------
@commercial_bp.get("/commercial/clients")
def clients_list():
    return jsonify(fs.get_all_documents(COL_CLIENTS) or [])

@commercial_bp.post("/commercial/clients")
def clients_create():
    b = request.get_json(force=True) or {}
    data = {
        "nome": (b.get("nome") or b.get("name") or "").strip(),
        "empresa": (b.get("empresa") or b.get("company") or "").strip(),
        "telefone": (b.get("telefone") or b.get("phone") or "").strip(),
        "email": (b.get("email") or "").strip(),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_CLIENTS, data)
    return jsonify(fs.get_document(COL_CLIENTS, doc_id)), 201

@commercial_bp.put("/commercial/clients/<id>")
def clients_update(id):
    b = request.get_json(force=True) or {}
    b["updated_at"] = _iso_now()
    fs.update_document(COL_CLIENTS, id, b)
    saved = fs.get_document(COL_CLIENTS, id)
    if not saved: return jsonify({"error":"não encontrado"}), 404
    return jsonify(saved)

@commercial_bp.delete("/commercial/clients/<id>")
def clients_delete(id):
    fs.delete_document(COL_CLIENTS, id)
    return jsonify({"ok": True})

# ---------- Records (Leads/CRM) ----------
@commercial_bp.get("/commercial/records")
def records_list():
    items = fs.get_all_documents(COL_RECORDS) or []
    items.sort(key=lambda x: x.get("created_at",""), reverse=True)
    return jsonify(items)

@commercial_bp.post("/commercial/records")
def records_create():
    b = request.get_json(force=True) or {}
    data = {
        "name": (b.get("name") or "").strip(),
        "company": (b.get("company") or "").strip(),
        "phone": (b.get("phone") or "").strip(),
        "stage": (b.get("stage") or "Novo").strip(),
        "value": float(b.get("value") or 0),
        "source": (b.get("source") or "").strip(),
        "notes": (b.get("notes") or "").strip(),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_RECORDS, data)
    return jsonify(fs.get_document(COL_RECORDS, doc_id)), 201

@commercial_bp.put("/commercial/records/<id>")
def records_update(id):
    b = request.get_json(force=True) or {}
    b["updated_at"] = _iso_now()
    fs.update_document(COL_RECORDS, id, b)
    saved = fs.get_document(COL_RECORDS, id)
    if not saved: return jsonify({"error":"não encontrado"}), 404
    return jsonify(saved)

@commercial_bp.delete("/commercial/records/<id>")
def records_delete(id):
    fs.delete_document(COL_RECORDS, id)
    return jsonify({"ok": True})

# ---------- Orders ----------
@commercial_bp.get("/commercial/orders")
def orders_list():
    items = fs.get_all_documents(COL_ORDERS) or []
    items.sort(key=lambda x: (x.get("date") or x.get("data") or "", x.get("created_at","")), reverse=True)
    return jsonify(items)

@commercial_bp.post("/commercial/orders")
def orders_create():
    b = request.get_json(force=True) or {}
    items = b.get("itens") or b.get("items") or []
    # converte numeros
    def to_num(v):
        s = str(v).replace(".","").replace(",",".")
        try: return float(s)
        except: return 0.0
    total = b.get("valor_total") or b.get("total") or 0.0
    if not total:
        total = sum((to_num(i.get("quantidade",1))*to_num(i.get("valor_unit",0)) for i in items))
    data = {
        "cliente": b.get("cliente") or b.get("client"),
        "titulo": b.get("titulo") or "Ordem de Serviço",
        "descricao": b.get("descricao") or "",
        "status": b.get("status") or "Aberta",
        "data": _parse_date(b.get("data") or ""),
        "itens": items,
        "valor_total": float(total),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_ORDERS, data)
    return jsonify(fs.get_document(COL_ORDERS, doc_id)), 201

@commercial_bp.put("/commercial/orders/<id>")
def orders_update(id):
    b = request.get_json(force=True) or {}
    if "data" in b:
        b["data"] = _parse_date(b["data"])
    b["updated_at"] = _iso_now()
    fs.update_document(COL_ORDERS, id, b)
    saved = fs.get_document(COL_ORDERS, id)
    if not saved: return jsonify({"error":"não encontrado"}), 404
    return jsonify(saved)

@commercial_bp.delete("/commercial/orders/<id>")
def orders_delete(id):
    fs.delete_document(COL_ORDERS, id)
    return jsonify({"ok": True})
