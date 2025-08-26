# relampago/backend/src/routes/fleet.py
from flask import Blueprint, request, jsonify
from datetime import datetime
import os, json

fleet_bp = Blueprint("fleet", __name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

def _path(name): return os.path.join(DATA_DIR, f"{name}.json")
def _load(name, default=None):
    try:
        with open(_path(name), "r", encoding="utf-8") as f: return json.load(f)
    except: return [] if default is None else default
def _save(name, items):
    with open(_path(name), "w", encoding="utf-8") as f: json.dump(items, f, ensure_ascii=False, indent=2)
def _now(): return datetime.utcnow().strftime("%Y-%m-%d")
def _next_id(items): return (max([int(i.get("id", 0)) for i in items] or [0]) + 1)

# ---- Veículos
@fleet_bp.get("/fleet/vehicles")
def vehicles_list(): return jsonify(_load("vehicles"))

@fleet_bp.post("/fleet/vehicles")
def vehicles_create():
    items = _load("vehicles")
    body = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "placa": (body.get("placa") or "").upper().strip(),
        "modelo": (body.get("modelo") or "").strip(),
        "marca": (body.get("marca") or "").strip(),
        "ano": (body.get("ano") or "").strip(),
        "ativo": bool(body.get("ativo", True)),
        "created_at": _now(),
    }
    items.append(item); _save("vehicles", items)
    return jsonify(item), 201

# ---- Motoristas
@fleet_bp.get("/fleet/drivers")
def drivers_list(): return jsonify(_load("drivers"))

@fleet_bp.post("/fleet/drivers")
def drivers_create():
    items = _load("drivers")
    body = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "nome": (body.get("nome") or "").strip(),
        "documento": (body.get("documento") or "").strip(),
        "ativo": bool(body.get("ativo", True)),
        "created_at": _now(),
    }
    items.append(item); _save("drivers", items)
    return jsonify(item), 201

# ---- Vínculos placa/veículo/motorista
@fleet_bp.get("/fleet/assignments")
def asg_list(): return jsonify(_load("assignments"))

@fleet_bp.post("/fleet/assignments")
def asg_create():
    items = _load("assignments")
    body = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "vehicle_id": body.get("vehicle_id"),
        "driver_id": body.get("driver_id"),
        "placa": (body.get("placa") or "").upper().strip(),
        "inicio": (body.get("inicio") or _now()),
        "fim": body.get("fim") or None,
        "observacao": (body.get("observacao") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("assignments", items)
    return jsonify(item), 201

# ---- Integração Finance (Contas a Pagar, reaproveita arquivo de transactions)
def _finance_add_payable(data_iso, descricao, categoria, valor, ref):
    tx = _load("transactions")  # mesmo arquivo do finance.py
    new_id = _next_id(tx)
    tx.append({
        "id": str(new_id),
        "tipo": "pagar",
        "data": data_iso,
        "descricao": descricao,
        "categoria": categoria,
        "valor": float(valor or 0),
        "status": "Pendente",
        "created_at": _now(),
        "ref": ref,
    })
    _save("transactions", tx)
    return new_id

# ---- Abastecimentos
@fleet_bp.get("/fleet/fuel-logs")
def fuel_list(): return jsonify(_load("fuel_logs"))

@fleet_bp.post("/fleet/fuel-logs")
def fuel_create():
    items = _load("fuel_logs")
    b = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "vehicle_id": b.get("vehicle_id"),
        "driver_id": b.get("driver_id"),
        "placa": (b.get("placa") or "").upper().strip(),
        "data": b.get("data"),  # ISO YYYY-MM-DD
        "km": int(b.get("km") or 0),
        "litros": float(b.get("litros") or 0),
        "valor_unit": float(b.get("valor_unit") or 0),
        "valor_total": float(b.get("valor_total") or 0),
        "combustivel": (b.get("combustivel") or "Gasolina").strip(),
        "posto": (b.get("posto") or "").strip(),
        "nota_fiscal": (b.get("nota_fiscal") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("fuel_logs", items)

    # Contas a pagar automática
    payable_id = _finance_add_payable(
        item["data"],
        f"Combustível {item['placa']}",
        "Combustível",
        item["valor_total"],
        {"type": "fuel_log", "id": item["id"]}
    )
    return jsonify({"fuel": item, "payable_id": payable_id}), 201

# ---- KM
@fleet_bp.get("/fleet/km-logs")
def km_list(): return jsonify(_load("km_logs"))

@fleet_bp.post("/fleet/km-logs")
def km_create():
    items = _load("km_logs")
    b = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "vehicle_id": b.get("vehicle_id"),
        "placa": (b.get("placa") or "").upper().strip(),
        "data": b.get("data"),
        "km": int(b.get("km") or 0),
        "tipo": (b.get("tipo") or "leitura"),
        "origem": (b.get("origem") or "").strip(),
        "destino": (b.get("destino") or "").strip(),
        "observacao": (b.get("observacao") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("km_logs", items)
    return jsonify(item), 201

# ---- Limpeza
@fleet_bp.get("/fleet/cleanings")
def clean_list(): return jsonify(_load("cleanings"))

@fleet_bp.post("/fleet/cleanings")
def clean_create():
    items = _load("cleanings")
    b = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "vehicle_id": b.get("vehicle_id"),
        "placa": (b.get("placa") or "").upper().strip(),
        "data": b.get("data"),
        "tipo": (b.get("tipo") or "Lavagem Completa"),
        "valor": float(b.get("valor") or 0),
        "local": (b.get("local") or "").strip(),
        "observacao": (b.get("observacao") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("cleanings", items)
    return jsonify(item), 201

# ---- Fotos (URL – upload feito pelo front)
@fleet_bp.get("/fleet/photos")
def photos_list(): return jsonify(_load("photos"))

@fleet_bp.post("/fleet/photos")
def photos_create():
    items = _load("photos")
    b = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "vehicle_id": b.get("vehicle_id"),
        "placa": (b.get("placa") or "").upper().strip(),
        "data": b.get("data"),
        "tipo": (b.get("tipo") or "Interior"),
        "url": (b.get("url") or "").strip(),
        "observacao": (b.get("observacao") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("photos", items)
    return jsonify(item), 201

# ---- Ocorrências
@fleet_bp.get("/fleet/occurrences")
def occ_list(): return jsonify(_load("occurrences"))

@fleet_bp.post("/fleet/occurrences")
def occ_create():
    items = _load("occurrences")
    b = request.get_json(force=True)
    item = {
        "id": _next_id(items),
        "vehicle_id": b.get("vehicle_id"),
        "placa": (b.get("placa") or "").upper().strip(),
        "data": b.get("data"),
        "tipo": (b.get("tipo") or "Multa"),
        "descricao": (b.get("descricao") or "").strip(),
        "valor_estimado": float(b.get("valor_estimado") or 0),
        "responsavel": (b.get("responsavel") or "").strip(),
        "created_at": _now(),
    }
    items.append(item); _save("occurrences", items)
    return jsonify(item), 201

# ---- Dashboard consolidado
@fleet_bp.get("/fleet/dashboard")
def dash():
    fuels = _load("fuel_logs"); kms = _load("km_logs"); cl = _load("cleanings"); oc = _load("occurrences")
    kpis = {
        "gasto_combustivel": sum(f.get("valor_total", 0) for f in fuels),
        "litros": sum(f.get("litros", 0) for f in fuels),
        "abastecimentos": len(fuels),
        "ocorrencias": len(oc),
        "limpezas": len(cl),
        "km_total_trajetos": sum(k.get("km", 0) for k in kms if k.get("tipo") == "trajeto"),
    }
    return jsonify({"kpis": kpis})
