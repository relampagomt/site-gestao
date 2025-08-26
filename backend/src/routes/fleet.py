# backend/src/routes/fleet.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from typing import Any, Dict
import math

from src.services.firestore_service import firestore_service as fs

fleet_bp = Blueprint("fleet", __name__)

COL_VEH = "fleet_vehicles"
COL_DRV = "fleet_drivers"
COL_ASG = "fleet_assignments"
COL_FUEL = "fleet_fuel_logs"
COL_KM   = "fleet_km_logs"
COL_TX   = "finance_transactions"  # para lançamentos de pagar (combustível)

def _iso_now():
    return datetime.utcnow().isoformat()

def _parse_date(v: Any) -> str:
    if not v: return ""
    s = str(v).strip()
    try:
        datetime.strptime(s, "%Y-%m-%d"); return s
    except Exception:
        try:
            d = datetime.strptime(s, "%d/%m/%Y"); return d.strftime("%Y-%m-%d")
        except Exception:
            return ""

def _num(v: Any, default: float=0.0) -> float:
    if v is None or v == "": return default
    if isinstance(v, (int,float)) and math.isfinite(float(v)): return float(v)
    s = str(v).strip().replace(".", "").replace(",", ".")
    try:
        n = float(s); return n if math.isfinite(n) else default
    except Exception:
        return default

# ---------------- Vehicles ----------------
@fleet_bp.get("/fleet/vehicles")
def vehicles_list():
    return jsonify(fs.get_all_documents(COL_VEH) or [])

@fleet_bp.post("/fleet/vehicles")
def vehicles_create():
    b = request.get_json(force=True) or {}
    data = {
        "placa": (b.get("placa") or "").upper().strip(),
        "modelo": (b.get("modelo") or "").strip(),
        "marca": (b.get("marca") or "").strip(),
        "ano": (b.get("ano") or "").strip(),
        "ativo": bool(b.get("ativo", True)),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_VEH, data)
    saved = fs.get_document(COL_VEH, doc_id)
    return jsonify(saved), 201

@fleet_bp.put("/fleet/vehicles/<id>")
def vehicles_update(id):
    b = request.get_json(force=True) or {}
    b["updated_at"] = _iso_now()
    fs.update_document(COL_VEH, id, b)
    saved = fs.get_document(COL_VEH, id)
    if not saved: return jsonify({"error": "não encontrado"}), 404
    return jsonify(saved)

@fleet_bp.delete("/fleet/vehicles/<id>")
def vehicles_delete(id):
    fs.delete_document(COL_VEH, id)
    return jsonify({"ok": True})

# ---------------- Drivers ----------------
@fleet_bp.get("/fleet/drivers")
def drivers_list():
    return jsonify(fs.get_all_documents(COL_DRV) or [])

@fleet_bp.post("/fleet/drivers")
def drivers_create():
    b = request.get_json(force=True) or {}
    data = {
        "nome": (b.get("nome") or b.get("name") or "").strip(),
        "cnh": (b.get("cnh") or "").strip(),
        "ativo": bool(b.get("ativo", True)),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_DRV, data)
    return jsonify(fs.get_document(COL_DRV, doc_id)), 201

@fleet_bp.put("/fleet/drivers/<id>")
def drivers_update(id):
    b = request.get_json(force=True) or {}
    b["updated_at"] = _iso_now()
    fs.update_document(COL_DRV, id, b)
    saved = fs.get_document(COL_DRV, id)
    if not saved: return jsonify({"error": "não encontrado"}), 404
    return jsonify(saved)

@fleet_bp.delete("/fleet/drivers/<id>")
def drivers_delete(id):
    fs.delete_document(COL_DRV, id)
    return jsonify({"ok": True})

# -------------- Assignments --------------
@fleet_bp.get("/fleet/assignments")
def asg_list():
    return jsonify(fs.get_all_documents(COL_ASG) or [])

@fleet_bp.post("/fleet/assignments")
def asg_create():
    b = request.get_json(force=True) or {}
    data = {
        "vehicle_id": b.get("vehicle_id"),
        "driver_id": b.get("driver_id"),
        "placa": (b.get("placa") or "").upper().strip(),
        "inicio": _parse_date(b.get("inicio") or _iso_now()[:10]) or _iso_now()[:10],
        "fim": _parse_date(b.get("fim") or "") or None,
        "observacao": (b.get("observacao") or b.get("obs") or "").strip(),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_ASG, data)
    return jsonify(fs.get_document(COL_ASG, doc_id)), 201

@fleet_bp.put("/fleet/assignments/<id>")
def asg_update(id):
    b = request.get_json(force=True) or {}
    if "inicio" in b: b["inicio"] = _parse_date(b["inicio"]) or _iso_now()[:10]
    if "fim" in b: b["fim"] = _parse_date(b["fim"]) or None
    b["updated_at"] = _iso_now()
    fs.update_document(COL_ASG, id, b)
    saved = fs.get_document(COL_ASG, id)
    if not saved: return jsonify({"error": "não encontrado"}), 404
    return jsonify(saved)

@fleet_bp.delete("/fleet/assignments/<id>")
def asg_delete(id):
    fs.delete_document(COL_ASG, id)
    return jsonify({"ok": True})

# ---------------- Fuel logs ----------------
@fleet_bp.get("/fleet/fuel-logs")
def fuel_list():
    items = fs.get_all_documents(COL_FUEL) or []
    # ordenar por date desc, created_at desc
    items.sort(key=lambda x: (x.get("date",""), x.get("created_at","")), reverse=True)
    return jsonify(items)

def _finance_add_payable(date_iso: str, descricao: str, categoria: str, valor: float, ref_doc: Dict[str, str]):
    """Cria um lançamento em finance_transactions vinculado ao abastecimento."""
    data = {
        "tipo": "pagar",
        "descricao": descricao,
        "categoria": categoria or "Combustível",
        "date": date_iso,
        "status": "Pendente",
        "valor": float(valor or 0.0),
        "refs": [ref_doc],
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    tx_id, _ = fs.add_document(COL_TX, data)
    return tx_id

@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
    b = request.get_json(force=True) or {}

    liters = _num(b.get("liters"))
    ppl = _num(b.get("price_per_liter"))
    total = _num(b.get("total"), liters * ppl)

    date_iso = _parse_date(b.get("date"))
    if not date_iso:
        return jsonify({"error": "date é obrigatório (YYYY-MM-DD ou DD/MM/AAAA)"}), 400

    data = {
        "vehicle_id": b.get("vehicle_id"),
        "date": date_iso,
        "liters": liters,
        "price_per_liter": ppl,
        "total": total,
        "odometer": _num(b.get("odometer")),
        "station": (b.get("station") or "").strip(),
        "driver": (b.get("driver") or "").strip(),
        "notes": (b.get("notes") or "").strip(),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_FUEL, data)
    saved = fs.get_document(COL_FUEL, doc_id)

    # vincula em finanças (opcional)
    should_fin = b.get("create_payable", True)
    if should_fin:
        desc = data["station"] or "Abastecimento"
        placa = (b.get("placa") or "").upper().strip()
        descricao = f"Combustível {placa} - {desc}".strip(" -")
        payable_id = _finance_add_payable(date_iso, descricao, "Combustível", total, {"type": "fuel_log", "id": doc_id})
        saved["payable_id"] = payable_id

    return jsonify(saved), 201

@fleet_bp.put("/fleet/fuel-logs/<id>")
def fuel_update(id):
    b = request.get_json(force=True) or {}
    upd = dict(b)
    if "liters" in upd: upd["liters"] = _num(upd["liters"])
    if "price_per_liter" in upd: upd["price_per_liter"] = _num(upd["price_per_liter"])
    if "total" in upd: upd["total"] = _num(upd["total"])
    if "date" in upd:
        d = _parse_date(upd["date"])
        if not d: return jsonify({"error": "date inválida"}), 400
        upd["date"] = d
    upd["updated_at"] = _iso_now()
    fs.update_document(COL_FUEL, id, upd)
    saved = fs.get_document(COL_FUEL, id)
    if not saved: return jsonify({"error": "não encontrado"}), 404
    return jsonify(saved)

@fleet_bp.delete("/fleet/fuel-logs/<id>")
def fuel_delete(id):
    fs.delete_document(COL_FUEL, id)
    return jsonify({"ok": True})

# ---------------- KM logs ----------------
@fleet_bp.get("/fleet/km-logs")
def km_list():
    items = fs.get_all_documents(COL_KM) or []
    items.sort(key=lambda x: (x.get("date",""), x.get("created_at","")), reverse=True)
    return jsonify(items)

@fleet_bp.post("/fleet/km-logs")
def km_create():
    b = request.get_json(force=True) or {}
    date_iso = _parse_date(b.get("date"))
    if not date_iso:
        return jsonify({"error":"date é obrigatório"}), 400
    data = {
        "vehicle_id": b.get("vehicle_id"),
        "date": date_iso,
        "km": _num(b.get("km")),
        "notes": (b.get("notes") or "").strip(),
        "created_at": _iso_now(),
        "updated_at": _iso_now(),
    }
    doc_id, _ = fs.add_document(COL_KM, data)
    return jsonify(fs.get_document(COL_KM, doc_id)), 201

@fleet_bp.put("/fleet/km-logs/<id>")
def km_update(id):
    b = request.get_json(force=True) or {}
    if "date" in b:
        d = _parse_date(b["date"])
        if not d: return jsonify({"error":"date inválida"}), 400
        b["date"] = d
    if "km" in b:
        b["km"] = _num(b["km"])
    b["updated_at"] = _iso_now()
    fs.update_document(COL_KM, id, b)
    saved = fs.get_document(COL_KM, id)
    if not saved: return jsonify({"error":"não encontrado"}), 404
    return jsonify(saved)

@fleet_bp.delete("/fleet/km-logs/<id>")
def km_delete(id):
    fs.delete_document(COL_KM, id)
    return jsonify({"ok": True})
