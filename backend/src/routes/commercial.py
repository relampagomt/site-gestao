# relampago/backend/src/routes/commercial.py
import os, json
import requests
from flask import Blueprint, request, jsonify
from datetime import datetime

commercial_bp = Blueprint("commercial", __name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

def _path(n): return os.path.join(DATA_DIR, f"{n}.json")
def _load(n, default=None):
    try:
        with open(_path(n), "r", encoding="utf-8") as f: return json.load(f)
    except: return [] if default is None else default
def _save(n, items):
    with open(_path(n), "w", encoding="utf-8") as f: json.dump(items, f, ensure_ascii=False, indent=2)
def _now(): return datetime.utcnow().strftime("%Y-%m-%d")
def _next_id(items): return (max([int(i.get("id", 0)) for i in items] or [0]) + 1)

VALID = ["Esperando","Atendido","Retornar","Cancelado"]

def _alert(tipo, payload):
    items = _load("alerts")
    item = {"id": _next_id(items), "tipo": tipo, "payload": payload, "created_at": _now(), "lido": False}
    items.append(item); _save("alerts", items); return item

def _whatsapp(text):
    url = os.getenv("WHATSAPP_WEBHOOK_URL", "").strip()
    if not url: return {"ok": False, "reason": "WHATSAPP_WEBHOOK_URL não configurada"}
    try:
        r = requests.post(url, json={"message": text}, timeout=5)
        return {"ok": r.ok, "status": r.status_code}
    except Exception as e:
        return {"ok": False, "reason": str(e)}

# ---- Clientes
@commercial_bp.get("/commercial/clients")
def clients_list(): return jsonify(_load("clients"))

@commercial_bp.post("/commercial/clients")
def clients_create():
    items = _load("clients")
    b = request.get_json(force=True)
    st = b.get("status") if b.get("status") in VALID else "Esperando"
    item = {
        "id": _next_id(items),
        "nome": (b.get("nome") or "").strip(),
        "telefone": (b.get("telefone") or "").strip(),
        "email": (b.get("email") or "").strip(),
        "empresa": (b.get("empresa") or "").strip(),
        "segmento": (b.get("segmento") or "").strip(),
        "origem": (b.get("origem") or "Orgânico").strip(),
        "status": st,
        "obs": (b.get("obs") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("clients", items)
    alert = _alert("Novo Cliente", {"client_id": item["id"], "nome": item["nome"], "status": item["status"]})
    notify = _whatsapp(f"Novo cliente: {item['nome']} | Status: {item['status']} | Tel: {item['telefone']}")
    return jsonify({"client": item, "alert": alert, "notify": notify}), 201

@commercial_bp.patch("/commercial/clients/<int:cid>/status")
def clients_status(cid):
    items = _load("clients")
    b = request.get_json(force=True); st = b.get("status")
    if st not in VALID: return jsonify({"error":"Status inválido"}), 400
    found = None
    for c in items:
        if c["id"] == cid:
            c["status"] = st; found = c; break
    if not found: return jsonify({"error":"Cliente não encontrado"}), 404
    _save("clients", items)
    alert = _alert("Status", {"client_id": cid, "status": st})
    notify = _whatsapp(f"Status atualizado: {found['nome']} → {st}")
    return jsonify({"client": found, "alert": alert, "notify": notify})

# ---- Alertas
@commercial_bp.get("/commercial/alerts")
def alerts_list(): return jsonify(_load("alerts"))

@commercial_bp.patch("/commercial/alerts/<int:aid>/read")
def alerts_read(aid):
    items = _load("alerts")
    for a in items:
        if a["id"] == aid:
            a["lido"] = True; _save("alerts", items); return jsonify(a)
    return jsonify({"error":"Alerta não encontrado"}), 404

# ---- Ordens de Serviço
@commercial_bp.get("/commercial/orders")
def orders_list(): return jsonify(_load("orders"))

@commercial_bp.post("/commercial/orders")
def orders_create():
    items = _load("orders")
    b = request.get_json(force=True)
    itens = []
    for it in (b.get("itens") or []):
        qtd = float(it.get("quantidade") or 1)
        vu  = float(it.get("valor_unit") or 0)
        itens.append({"tipo": it.get("tipo") or "ação", "nome": (it.get("nome") or "").strip(),
                      "quantidade": qtd, "valor_unit": vu, "valor_total": qtd*vu})
    total = sum(i["valor_total"] for i in itens)
    item = {
        "id": _next_id(items),
        "client_id": b.get("client_id"),
        "titulo": (b.get("titulo") or "Ordem de Serviço"),
        "descricao": (b.get("descricao") or "").strip(),
        "status": (b.get("status") or "Aberta"),
        "data": b.get("data") or _now(),
        "itens": itens,
        "valor_total": total,
        "created_at": _now(),
    }
    items.append(item); _save("orders", items)
    alert = _alert("OS", {"order_id": item["id"], "client_id": item["client_id"], "valor_total": total})
    return jsonify({"order": item, "alert": alert}), 201
