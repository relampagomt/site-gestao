# backend/src/services/firestore_service.py
import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore, storage
from src.services.memory_db import memory_db  # fallback p/ dev/teste

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

def get_db():
    # Firestore quando habilitado; senão, cai para memória
    if not _use_firestore():
        return memory_db
    try:
        init_firebase()
        return firestore.client()
    except Exception as e:
        print("[firestore_service] Falha ao iniciar Firestore, usando memória:", repr(e))
        return memory_db

def get_firestore_client():
    # Útil quando você quer EXIGIR Firestore real
    if not _use_firestore():
        raise RuntimeError(
            "Firestore desabilitado. Defina USE_FIRESTORE=true; "
            "ou use get_db() para cair no memory_db."
        )
    init_firebase()
    return firestore.client()

def get_storage_bucket():
    if not firebase_admin._apps:
        init_firebase()
    return storage.bucket(app=firebase_admin.get_app())
