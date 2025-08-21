# backend/src/routes/finance.py
import os
import json
import base64
import uuid
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.middleware.auth_middleware import roles_allowed

log = logging.getLogger(__name__)
finance_bp = Blueprint("finance", __name__)

# ========================== Storage opts ==========================
# Firestore
try:
    from google.cloud import firestore  # type: ignore
except Exception:
    firestore = None

# Firestore collection
_COLL = os.getenv("FIRESTORE_FINANCE_COLL", "finance_transactions")

# Fallback JSON (volátil no plano grátis da Render)
_JSON_PATH = os.getenv("FINANCE_JSON_PATH") or "/tmp/finance_transactions.json"

# Firestore toggle
_USE_FIRESTORE = (os.getenv("USE_FIRESTORE", "true").lower() in ("1", "true", "yes"))

# CORS: FRONTEND_URL pode ter várias origens separadas por vírgula
# Ex.: "https://site-gestao-mu.vercel.app, http://localhost:5173"
_ALLOWED_ORIGINS = set(
    [o.strip() for o in (os.getenv("FRONTEND_URL") or "").split(",") if o.strip()]
)
_DEFAULT_ALLOW_ORIGIN = "*" if not _ALLOWED_ORIGINS else None


# ============================ Utils gerais =============================
def _iso_date_only(val) -> str:
    """Normaliza para YYYY-MM-DD; retorna '' se inválida."""
    s = str(val or "")[:10]
    try:
        d = datetime.strptime(s, "%Y-%m-%d")
        return d.strftime("%Y-%m-%d")
    except Exception:
        return ""

def _to_number(v):
    try:
        return float(v)
    except Exception:
        return 0.0

def _decode_b64_json(b64: str) -> Optional[dict]:
    try:
        raw = base64.b64decode(b64).decode("utf-8")
        return json.loads(raw)
    except Exception:
        return None

def _month_bounds(ym: str) -> Optional[tuple]:
    """Recebe 'YYYY-MM' e devolve ('YYYY-MM-01', 'YYYY-MM-último_dia')."""
    if not (isinstance(ym, str) and len(ym) == 7 and ym[4] == "-"):
        return None
    y, m = ym.split("-")
    try:
        y, m = int(y), int(m)
        start = datetime(y, m, 1)
        if m == 12:
            end = datetime(y + 1, 1, 1) - timedelta(days=1)
        else:
            end = datetime(y, m + 1, 1) - timedelta(days=1)
        return (start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
    except Exception:
        return None


# ========================== Fallback JSON I/O ==========================
def _ensure_dir(path: str):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
    except Exception as e:
        log.warning("[finance] não foi possível criar diretório: %s", e)

def _json_load() -> List[Dict[str, Any]]:
    try:
        if not os.path.exists(_JSON_PATH):
            return []
        with open(_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []

def _json_save(items: List[Dict[str, Any]]):
    try:
        _ensure_dir(_JSON_PATH)
        with open(_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False)
    except Exception as e:
        log.warning("[finance] não foi possível salvar JSON fallback: %s", e)


# ========================== Firestore helper ==========================
_fs_client = None
_fs_ready = False

def _get_firestore():
    global _fs_client, _fs_ready

    if not _USE_FIRESTORE or firestore is None:
        return None

    if _fs_ready and _fs_client is not None:
        return _fs_client

    try:
        # 1) Preferir FIREBASE_CREDENTIALS_B64 (env que você já tem)
        b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
        if b64:
            from google.oauth2 import service_account  # type: ignore
            info = _decode_b64_json(b64)
            if not info:
                raise RuntimeError("FIREBASE_CREDENTIALS_B64 inválido")
            creds = service_account.Credentials.from_service_account_info(info)
            project = info.get("project_id") or os.getenv("FIREBASE_PROJECT_ID")
            _client = firestore.Client(credentials=creds, project=project)
            log.info("[finance] Firestore inicializado via FIREBASE_CREDENTIALS_B64")
            _fs_ready = True
            _fs_client = _client
            return _fs_client

        # 2) Alternativa: GOOGLE_APPLICATION_CREDENTIALS_JSON
        gac_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
        if gac_json:
            from google.oauth2 import service_account  # type: ignore
            info = json.loads(gac_json)
            creds = service_account.Credentials.from_service_account_info(info)
            _client = firestore.Client(credentials=creds, project=info.get("project_id"))
            log.info("[finance] Firestore inicializado via GOOGLE_APPLICATION_CREDENTIALS_JSON")
            _fs_ready = True
            _fs_client = _client
            return _fs_client

        # 3) Como fallback, tente Application Default Credentials (se estiver setado no ambiente)
        _client = firestore.Client()
        _fs_ready = True
        _fs_client = _client
        log.info("[finance] Firestore inicializado via ADC")
        return _fs_client

    except Exception as e:
        log.warning("[finance] Firestore indisponível: %s", e)
        return None


# ========================== CRUD Helpers ==========================
_VALID_TYPES = {"entrada", "saida", "despesa"}

def _doc_to_json(doc: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(doc or {})
    if not d.get("id"):
        d["id"] = str(uuid.uuid4())
    d["amount"] = _to_number(d.get("amount", 0))
    d["date"] = _iso_date_only(d.get("date"))
    return d

def _fs_list(ttype: Optional[str], action_id: Optional[str], month: Optional[str]) -> List[Dict[str, Any]]:
    client = _get_firestore()
    if not client:
        items = [_doc_to_json(x) for x in _json_load()]
        # filtros
        if ttype in _VALID_TYPES:
            items = [x for x in items if (x.get("type") or "") == ttype]
        if action_id:
            items = [x for x in items if str(x.get("action_id") or "") == action_id]
        if isinstance(month, str) and len(month) == 7:
            rng = _month_bounds(month)
            if rng:
                start, end = rng
                items = [x for x in items if start <= (x.get("date") or "") <= end]
        items.sort(key=lambda x: (x.get("date") or "", x.get("id") or ""), reverse=True)
        return items

    # Firestore
    try:
        q = client.collection(_COLL)
        if ttype in _VALID_TYPES:
            q = q.where("type", "==", ttype)
        if action_id:
            q = q.where("action_id", "==", action_id)
        if isinstance(month, str) and len(month) == 7:
            rng = _month_bounds(month)
            if rng:
                start, end = rng
                q = q.where("date", ">=", start).where("date", "<=", end)

        docs = q.stream()
        items = []
        for doc in docs:
            d = doc.to_dict() or {}
            d["id"] = doc.id
            # normaliza e PRESERVA extras
            it = {
                "id": d.get("id"),
                "type": d.get("type"),
                "date": _iso_date_only(d.get("date")),
                "amount": _to_number(d.get("amount")),
                "category": d.get("category") or "",
                "notes": d.get("notes") or "",
                "action_id": d.get("action_id"),
                "created_by": d.get("created_by"),
                "created_at": d.get("created_at"),
            }
            # Merge dos extras (documento, cliente, etc.)
            for k, v in d.items():
                if k not in it:
                    it[k] = v
            items.append(_doc_to_json(it))

        # filtros
        if ttype in _VALID_TYPES:
            items = [x for x in items if (x.get("type") or "") == ttype]
        if action_id:
            items = [x for x in items if str(x.get("action_id") or "") == action_id]
        if isinstance(month, str) and len(month) == 7:
            rng = _month_bounds(month)
            if rng:
                start, end = rng
                items = [x for x in items if start <= (x.get("date") or "") <= end]

        items.sort(key=lambda x: (x.get("date") or "", x.get("id") or ""), reverse=True)
        return items
    except Exception as e:
        log.exception("[finance][fs_list] falha: %s", e)
        return _json_load()


def _fs_create(doc: Dict[str, Any]) -> Dict[str, Any]:
    client = _get_firestore()
    if not client:
        items = _json_load()
        items.append(_doc_to_json(doc))
        _json_save(items)
        return doc

    try:
        txid = doc.get("id") or str(uuid.uuid4())
        doc["id"] = txid
        client.collection(_COLL).document(txid).set(doc)
        return doc
    except Exception as e:
        log.exception("[finance][fs_create] falha: %s", e)
        # Fallback
        items = _json_load()
        items.append(_doc_to_json(doc))
        _json_save(items)
        return doc


def _fs_update(txid: str, changes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = _get_firestore()
    if not client:
        items = _json_load()
        out = None
        for it in items:
            if str(it.get("id")) == str(txid):
                it.update(changes)
                out = it
                break
        _json_save(items)
        return out

    try:
        ref = client.collection(_COLL).document(txid)
        snap = ref.get()
        if not snap.exists:
            return None
        current = snap.to_dict() or {}
        current.update(changes)
        ref.set(current)
        current["id"] = txid
        return current
    except Exception as e:
        log.exception("[finance][fs_update] falha: %s", e)
        return None

def _fs_delete(txid: str) -> bool:
    client = _get_firestore()
    if not client:
        items = _json_load()
        new_items = [x for x in items if str(x.get("id")) != str(txid)]
        _json_save(new_items)
        return True

    try:
        client.collection(_COLL).document(txid).delete()
        return True
    except Exception as e:
        log.exception("[finance][fs_delete] falha: %s", e)
        items = _json_load()
        new_items = [x for x in items if str(x.get("id")) != str(txid)]
        _json_save(new_items)
        return True


# ============================== CORS ===================================
@finance_bp.after_request
def _add_cors_headers(resp: Response):
    # reflete a origem quando FRONTEND_URL está configurado
    origin = request.headers.get("Origin")
    allow = _DEFAULT_ALLOW_ORIGIN
    if origin and _ALLOWED_ORIGINS:
        if origin in _ALLOWED_ORIGINS:
            allow = origin
        else:
            # se quiser, pode logar as origens negadas para depuração
            pass

    if allow:
        resp.headers["Access-Control-Allow-Origin"] = allow
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    resp.headers["Access-Control-Expose-Headers"] = "Authorization, Content-Type"
    return resp


# ============================== /transactions ==========================
# PREFLIGHT
@finance_bp.route("/finance/transactions", methods=["OPTIONS"])
@finance_bp.route("/transactions", methods=["OPTIONS"])
def preflight_transactions():
    return ("", 204)

# LISTAR
@finance_bp.route("/finance/transactions", methods=["GET"])
@finance_bp.route("/transactions", methods=["GET"])
@roles_allowed('admin')
def list_transactions():
    try:
        ttype = (request.args.get("type") or "").strip().lower() or None
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()
        items = _fs_list(ttype, action_id, month)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500

# CRIAR
@finance_bp.route("/finance/transactions", methods=["POST"])
@finance_bp.route("/transactions", methods=["POST"])
@roles_allowed('admin')
def create_transaction():
    try:
        data = request.get_json(silent=True) or {}

        ttype = str(data.get("type", "")).lower().strip()
        if ttype not in _VALID_TYPES:
            return jsonify({"message": "type inválido (entrada, saida, despesa)"}), 400

        date = _iso_date_only(data.get("date"))
        if not date:
            return jsonify({"message": "date inválida (YYYY-MM-DD)"}), 400

        doc = {
            "id": str(uuid.uuid4()),
            "type": ttype,
            "date": date,
            "amount": abs(_to_number(data.get("amount", 0))),
            "category": (data.get("category") or "").strip(),
            "notes": (data.get("notes") or "").strip(),
            "action_id": (data.get("action_id") or "").strip() or None,
            "created_by": get_jwt_identity(),
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        saved = _fs_create(doc)
        return jsonify(_doc_to_json(saved)), 201
    except Exception as e:
        log.exception("[finance][POST] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500


# ATUALIZAR
@finance_bp.route("/finance/transactions/<txid>", methods=["PUT", "PATCH"])
@finance_bp.route("/transactions/<txid>", methods=["PUT", "PATCH"])
@roles_allowed('admin')
def update_transaction(txid):
    try:
        data = request.get_json(silent=True) or {}
        changes = {}
        if "type" in data:
            ttype = str(data.get("type", "")).lower().strip()
            if ttype in _VALID_TYPES:
                changes["type"] = ttype
        if "date" in data:
            dd = _iso_date_only(data.get("date"))
            if dd:
                changes["date"] = dd
        if "amount" in data:
            changes["amount"] = abs(_to_number(data.get("amount", 0)))
        if "category" in data:
            changes["category"] = (data.get("category") or "").strip()
        if "notes" in data:
            changes["notes"] = (data.get("notes") or "").strip()
        if "action_id" in data:
            changes["action_id"] = (data.get("action_id") or "").strip() or None

        changes["updated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        out = _fs_update(txid, changes)
        if not out:
            return jsonify({"message": "não encontrado"}), 404
        return jsonify(_doc_to_json(out)), 200
    except Exception as e:
        log.exception("[finance][PUT] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500

# DELETAR
@finance_bp.route("/finance/transactions/<txid>", methods=["DELETE"])
@finance_bp.route("/transactions/<txid>", methods=["DELETE"])
@roles_allowed('admin')
def delete_transaction(txid):
    try:
        ok = _fs_delete(txid)
        if ok:
            return ("", 204)
        return jsonify({"message": "não encontrado"}), 404
    except Exception as e:
        log.exception("[finance][DELETE] falha: %s", e)
        return jsonify({"message": "internal_error"}), 500


# ========================= Aliases: Contas a Pagar / Receber =========================
def _map_contas_pagar_payload(data: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
    """Converte payload de Contas a Pagar para nosso modelo base."""
    out: Dict[str, Any] = {}
    # Campos base
    if not is_update:
        out["type"] = "saida"
    elif data.get("type"):
        out["type"] = "saida"

    if any(k in data for k in ("vencimento", "date", "data")):
        out["date"] = _iso_date_only(data.get("vencimento") or data.get("date") or data.get("data"))
    if any(k in data for k in ("valor", "amount")):
        out["amount"] = abs(_to_number(data.get("valor") if "valor" in data else data.get("amount")))

    # Extras (preservamos no doc)
    for src in ("documento", "descricao", "dataPagamento", "valorPago", "categoria", "category", "notes", "action_id"):
        if src in data:
            out[src] = data.get(src)
    # Normalizações
    if "dataPagamento" in out:
        out["dataPagamento"] = _iso_date_only(out["dataPagamento"])
    if "categoria" in out and "category" not in out:
        out["category"] = (out.pop("categoria") or "").strip()
    if "descricao" in out and "notes" not in out:
        out["notes"] = (out.get("descricao") or "").strip()
    return out

def _map_contas_receber_payload(data: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if not is_update:
        out["type"] = "entrada"
    elif data.get("type"):
        out["type"] = "entrada"

    if any(k in data for k in ("vencimento", "date", "data", "dataEmissao")):
        out["date"] = _iso_date_only(
            data.get("vencimento") or data.get("dataEmissao") or data.get("date") or data.get("data")
        )
    if any(k in data for k in ("valor", "amount")):
        out["amount"] = abs(_to_number(data.get("valor") if "valor" in data else data.get("amount")))

    # Extras específicos
    for src in (
        "cliente","notaFiscal","dataEmissao","taxasJuros","documentoRecebimento",
        "dataBaixa","valorLiqRecebido","descricao","categoria","category","notes","action_id"
    ):
        if src in data:
            out[src] = data.get(src)
    # Normalizações
    if "dataEmissao" in out:
        out["dataEmissao"] = _iso_date_only(out["dataEmissao"])
    if "dataBaixa" in out:
        out["dataBaixa"] = _iso_date_only(out["dataBaixa"])
    if "categoria" in out and "category" not in out:
        out["category"] = (out.pop("categoria") or "").strip()
    if "descricao" in out and "notes" not in out:
        out["notes"] = (out.get("descricao") or "").strip()
    return out

# -------- Contas a Pagar --------
@finance_bp.route("/contas-pagar", methods=["GET"])
@roles_allowed('admin')
def contas_pagar_list():
    try:
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()
        items = _fs_list("saida", action_id, month)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET /contas-pagar] %s", e)
        return jsonify({"message": "internal_error"}), 500

@finance_bp.route("/contas-pagar", methods=["POST"])
@roles_allowed('admin')
def contas_pagar_create():
    try:
        data = request.get_json(silent=True) or {}
        mapped = _map_contas_pagar_payload(data, is_update=False)

        # validação mínima
        if not _iso_date_only(mapped.get("date")):
            return jsonify({"message": "vencimento/date inválido (YYYY-MM-DD)"}), 400
        if _to_number(mapped.get("amount")) <= 0:
            return jsonify({"message": "valor/amount deve ser maior que zero"}), 400

        doc = {
            "id": str(uuid.uuid4()),
            **mapped,
            "created_by": get_jwt_identity(),
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        saved = _fs_create(doc)
        return jsonify(_doc_to_json(saved)), 201
    except Exception as e:
        log.exception("[finance][POST /contas-pagar] %s", e)
        return jsonify({"message": "internal_error"}), 500

@finance_bp.route("/contas-pagar/<txid>", methods=["PUT", "PATCH"])
@roles_allowed('admin')
def contas_pagar_update(txid: str):
    try:
        data = request.get_json(silent=True) or {}
        upd = _map_contas_pagar_payload(data, is_update=True)
        if "date" in upd and not _iso_date_only(upd.get("date")):
            upd.pop("date", None)
        upd["updated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        out = _fs_update(txid, upd)
        if not out:
            return jsonify({"message": "não encontrado"}), 404
        return jsonify(_doc_to_json(out)), 200
    except Exception as e:
        log.exception("[finance][PUT /contas-pagar/%s] %s", txid, e)
        return jsonify({"message": "internal_error"}), 500

@finance_bp.route("/contas-pagar/<txid>", methods=["DELETE"])
@roles_allowed('admin')
def contas_pagar_delete(txid: str):
    try:
        ok = _fs_delete(txid)
        return ("", 204) if ok else (jsonify({"message": "não encontrado"}), 404)
    except Exception as e:
        log.exception("[finance][DELETE /contas-pagar/%s] %s", txid, e)
        return jsonify({"message": "internal_error"}), 500

# -------- Contas a Receber --------
@finance_bp.route("/contas-receber", methods=["GET"])
@roles_allowed('admin')
def contas_receber_list():
    try:
        action_id = (request.args.get("action_id") or "").strip()
        month = (request.args.get("month") or "").strip()
        items = _fs_list("entrada", action_id, month)
        return jsonify(items), 200
    except Exception as e:
        log.exception("[finance][GET /contas-receber] %s", e)
        return jsonify({"message": "internal_error"}), 500

@finance_bp.route("/contas-receber", methods=["POST"])
@roles_allowed('admin')
def contas_receber_create():
    try:
        data = request.get_json(silent=True) or {}
        mapped = _map_contas_receber_payload(data, is_update=False)

        if not _iso_date_only(mapped.get("date")):
            return jsonify({"message": "vencimento/date inválido (YYYY-MM-DD)"}), 400
        if _to_number(mapped.get("amount")) <= 0:
            return jsonify({"message": "valor/amount deve ser maior que zero"}), 400

        doc = {
            "id": str(uuid.uuid4()),
            **mapped,
            "created_by": get_jwt_identity(),
            "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        saved = _fs_create(doc)
        return jsonify(_doc_to_json(saved)), 201
    except Exception as e:
        log.exception("[finance][POST /contas-receber] %s", e)
        return jsonify({"message": "internal_error"}), 500

@finance_bp.route("/contas-receber/<txid>", methods=["PUT", "PATCH"])
@roles_allowed('admin')
def contas_receber_update(txid: str):
    try:
        data = request.get_json(silent=True) or {}
        upd = _map_contas_receber_payload(data, is_update=True)
        if "date" in upd and not _iso_date_only(upd.get("date")):
            upd.pop("date", None)
        upd["updated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        out = _fs_update(txid, upd)
        if not out:
            return jsonify({"message": "não encontrado"}), 404
        return jsonify(_doc_to_json(out)), 200
    except Exception as e:
        log.exception("[finance][PUT /contas-receber/%s] %s", txid, e)
        return jsonify({"message": "internal_error"}), 500

@finance_bp.route("/contas-receber/<txid>", methods=["DELETE"])
@roles_allowed('admin')
def contas_receber_delete(txid: str):
    try:
        ok = _fs_delete(txid)
        return ("", 204) if ok else (jsonify({"message": "não encontrado"}), 404)
    except Exception as e:
        log.exception("[finance][DELETE /contas-receber/%s] %s", txid, e)
        return jsonify({"message": "internal_error"}), 500
