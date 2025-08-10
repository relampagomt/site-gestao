# backend/src/services/firestore_service.py
import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore, storage
from types import SimpleNamespace
from datetime import datetime, timezone

# Fallback em memória (mantém app viva se Firestore não estiver habilitado)
from src.services.memory_db import memory_db


# ---------------------------
# Credenciais / Inicialização
# ---------------------------
def _load_cred():
    b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
    raw = os.getenv("FIREBASE_CREDENTIALS_JSON")
    path = os.getenv("FIREBASE_CREDENTIALS_PATH")

    if b64:
        data = json.loads(base64.b64decode(b64).decode("utf-8"))
        return credentials.Certificate(data)
    if raw:
        data = json.loads(raw)
        return credentials.Certificate(data)
    if path:
        return credentials.Certificate(path)

    raise RuntimeError(
        "Credenciais do Firebase ausentes. "
        "Defina FIREBASE_CREDENTIALS_B64 ou FIREBASE_CREDENTIALS_JSON ou FIREBASE_CREDENTIALS_PATH."
    )


def init_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    cred = _load_cred()
    opts = {}
    if os.getenv("FIREBASE_PROJECT_ID"):
        opts["projectId"] = os.getenv("FIREBASE_PROJECT_ID")
    if os.getenv("FIREBASE_STORAGE_BUCKET"):
        opts["storageBucket"] = os.getenv("FIREBASE_STORAGE_BUCKET")
    return firebase_admin.initialize_app(cred, opts or None)


def _use_firestore() -> bool:
    return os.getenv("USE_FIRESTORE", "false").lower() == "true"


# ---------------------------
# Clientes / Acesso DB
# ---------------------------
def get_db():
    """Retorna Firestore quando habilitado; senão, cai no memory_db."""
    if not _use_firestore():
        return memory_db
    try:
        init_firebase()
        return firestore.client()
    except Exception as e:
        print("[firestore_service] Falha ao iniciar Firestore, usando memória:", repr(e))
        return memory_db


def get_firestore_client():
    """Força Firestore real (lança erro se USE_FIRESTORE != true)."""
    if not _use_firestore():
        raise RuntimeError("Firestore desabilitado. Defina USE_FIRESTORE=true ou use get_db().")
    init_firebase()
    return firestore.client()


def get_storage_bucket():
    if not firebase_admin._apps:
        init_firebase()
    return storage.bucket(app=firebase_admin.get_app())


# ---------------------------
# Helpers compat (models antigos)
# ---------------------------
try:
    from firebase_admin import firestore as _fs  # SERVER_TIMESTAMP
    _HAS_FS = True
except Exception:
    _HAS_FS = False


def _server_ts():
    if _HAS_FS:
        try:
            return _fs.SERVER_TIMESTAMP
        except Exception:
            pass
    return datetime.now(timezone.utc)


def _doc_to_dict(doc):
    """Converte DocumentSnapshot em dict com 'id' (ou retorna dict no memory_db)."""
    if hasattr(doc, "to_dict") and hasattr(doc, "id"):
        data = doc.to_dict() or {}
        data["id"] = doc.id
        return data
    return dict(doc)


def _set_merge(doc_ref, data: dict):
    """set(..., merge=True) quando disponível; compat com memory_db."""
    try:
        doc_ref.set(data, merge=True)
    except TypeError:
        doc_ref.set(data)


# -- API compatível com o código legado dos modelos ----------------
def add_document(collection_name: str, data: dict):
    """
    Cria um documento e retorna (doc_id, None).
    (Mantém assinatura que seus modelos esperam: doc_id, _ = add_document(...))
    """
    db = get_db()
    ref = db.collection(collection_name).document()
    # timestamps básicos se não vierem
    data = dict(data)
    data.setdefault("created_at", _server_ts())
    data.setdefault("updated_at", _server_ts())
    ref.set(data)
    return ref.id, None


def get_all_documents(collection_name: str):
    db = get_db()
    snaps = db.collection(collection_name).get()
    return [_doc_to_dict(s) for s in snaps] if snaps else []


def get_document(collection_name: str, doc_id: str):
    db = get_db()
    snap = db.collection(collection_name).document(doc_id).get()
    if hasattr(snap, "exists") and not snap.exists:
        return None
    return _doc_to_dict(snap)


def update_document(collection_name: str, doc_id: str, data: dict):
    db = get_db()
    ref = db.collection(collection_name).document(doc_id)
    payload = dict(data)
    payload["updated_at"] = _server_ts()
    _set_merge(ref, payload)
    return True


def delete_document(collection_name: str, doc_id: str):
    db = get_db()
    ref = db.collection(collection_name).document(doc_id)
    ref.delete()
    return True


# Expor uma "fachada" com o mesmo nome que seus modelos importam:
firestore_service = SimpleNamespace(
    add_document=add_document,
    get_all_documents=get_all_documents,
    get_document=get_document,
    update_document=update_document,
    delete_document=delete_document,
)

# Continuiamos exportando as funções "modernas" também:
__all__ = [
    "get_db",
    "get_firestore_client",
    "get_storage_bucket",
    "add_document",
    "get_all_documents",
    "get_document",
    "update_document",
    "delete_document",
    "firestore_service",
]
