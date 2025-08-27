# backend/src/services/firestore_service.py
import os
import json
import base64
from datetime import datetime, timezone
from types import SimpleNamespace

import firebase_admin
from firebase_admin import credentials, firestore, storage


# ---------------------------
# Credenciais / Inicialização
# ---------------------------
def _build_cred_from_env_fields():
    """
    Monta um service account a partir de variáveis avulsas:
      FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    (PRIVATE_KEY pode vir com '\\n', que é convertido para quebras reais)
    """
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")

    if project_id and client_email and private_key:
        return {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", "auto"),
            "private_key": private_key.replace("\\n", "\n"),
            "client_email": client_email,
            "client_id": os.getenv("FIREBASE_CLIENT_ID", "0"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL", ""),
            "universe_domain": "googleapis.com",
        }
    return None


def _load_cred():
    """
    Carrega credenciais do Firebase a partir de UMA destas opções (nesta ordem):
      1) FIREBASE_CREDENTIALS_B64  -> base64 do JSON do service account
      2) FIREBASE_CREDENTIALS_JSON -> JSON puro do service account
      3) FIREBASE_CREDENTIALS_PATH -> caminho do arquivo .json
      4) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
    Se nenhuma existir, lança erro (sem fallback).
    """
    b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
    raw_json = os.getenv("FIREBASE_CREDENTIALS_JSON") or os.getenv("FIREBASE_CREDENTIALS")
    path = (
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or os.getenv("FIREBASE_CREDENTIALS_PATH")
        or os.getenv("FIREBASE_CREDENTIALS_FILE")
    )

    if b64:
        data = json.loads(base64.b64decode(b64).decode("utf-8"))
        return credentials.Certificate(data)

    if raw_json:
        data = json.loads(raw_json)
        return credentials.Certificate(data)

    if path:
        return credentials.Certificate(path)

    fields = _build_cred_from_env_fields()
    if fields:
        return credentials.Certificate(fields)

    raise RuntimeError(
        "Credenciais do Firebase ausentes. "
        "Defina uma das opções: FIREBASE_CREDENTIALS_B64, "
        "FIREBASE_CREDENTIALS_JSON, FIREBASE_CREDENTIALS_PATH, "
        "ou o trio FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY."
    )


def init_firebase():
    """
    Inicializa o app do Firebase uma única vez.
    (Sem fallback; se falhar, levanta exceção e derruba o serviço.)
    """
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred = _load_cred()
    opts = {}
    if os.getenv("FIREBASE_PROJECT_ID"):
        opts["projectId"] = os.getenv("FIREBASE_PROJECT_ID")
    if os.getenv("FIREBASE_STORAGE_BUCKET"):
        opts["storageBucket"] = os.getenv("FIREBASE_STORAGE_BUCKET")

    return firebase_admin.initialize_app(cred, opts or None)


# ---------------------------
# Acesso ao Firestore/Storage
# ---------------------------
def get_db():
    """
    Retorna SEMPRE o cliente Firestore real.
    Sem fallback em memória.
    """
    init_firebase()
    return firestore.client()


def get_firestore_client():
    """Alias explícito para Firestore real."""
    return get_db()


def get_storage_bucket():
    """Retorna o bucket do Cloud Storage associado ao app Firebase."""
    if not firebase_admin._apps:
        init_firebase()
    return storage.bucket(app=firebase_admin.get_app())


# ---------------------------
# Helpers
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
    """
    Converte DocumentSnapshot em dict com 'id'.
    """
    if hasattr(doc, "to_dict") and hasattr(doc, "id"):
        data = doc.to_dict() or {}
        data["id"] = doc.id
        return data
    return dict(doc or {})


def _set_merge(doc_ref, data: dict):
    """set(..., merge=True) quando disponível."""
    try:
        doc_ref.set(data, merge=True)
    except TypeError:
        doc_ref.set(data)


# ---------------------------
# API compatível com modelos legados
# ---------------------------
def add_document(collection_name: str, data: dict):
    """
    Cria um documento e retorna (doc_id, None).
    Seus modelos esperam: doc_id, _ = add_document(...)
    """
    db = get_db()
    payload = dict(data or {})
    payload.setdefault("created_at", _server_ts())
    payload.setdefault("updated_at", _server_ts())

    ref = db.collection(collection_name).document()
    ref.set(payload)
    return ref.id, None


def get_all_documents(collection_name: str):
    db = get_db()
    snaps = db.collection(collection_name).get()
    return [_doc_to_dict(s) for s in snaps] if snaps else []


def get_document(collection_name: str, doc_id: str):
    if not doc_id:
        return None
    db = get_db()
    snap = db.collection(collection_name).document(doc_id).get()
    if hasattr(snap, "exists") and not snap.exists:
        return None
    return _doc_to_dict(snap)


def update_document(collection_name: str, doc_id: str, data: dict):
    if not doc_id:
        return False
    db = get_db()
    payload = dict(data or {})
    payload["updated_at"] = _server_ts()
    ref = db.collection(collection_name).document(doc_id)
    _set_merge(ref, payload)
    return True


def delete_document(collection_name: str, doc_id: str):
    if not doc_id:
        return False
    db = get_db()
    db.collection(collection_name).document(doc_id).delete()
    return True


# Fachada no mesmo nome esperado nos imports antigos
firestore_service = SimpleNamespace(
    add_document=add_document,
    get_all_documents=get_all_documents,
    get_document=get_document,
    update_document=update_document,
    delete_document=delete_document,
)


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
