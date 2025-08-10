# backend/src/services/firebase_service.py
import os, json, base64
import firebase_admin
from firebase_admin import credentials, firestore, storage

_app = None
_db = None
_bucket = None

def _load_credential():
    # 1) Base64 (recomendado no Render)
    b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
    if b64:
        try:
            data = base64.b64decode(b64).decode("utf-8")
            info = json.loads(data)
            return credentials.Certificate(info)
        except Exception as e:
            raise RuntimeError("FIREBASE_CREDENTIALS_B64 inválido") from e

    # 2) JSON cru em env
    raw = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if raw:
        try:
            info = json.loads(raw)
            return credentials.Certificate(info)
        except Exception as e:
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON inválido") from e

    # 3) Caminho para arquivo
    path = os.getenv("FIREBASE_CREDENTIALS_PATH") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if path and os.path.exists(path):
        return credentials.Certificate(path)

    # Nada configurado → erro claro
    raise RuntimeError(
        "Credenciais não configuradas. Defina FIREBASE_CREDENTIALS_B64 (recomendado) "
        "ou FIREBASE_CREDENTIALS_JSON ou FIREBASE_CREDENTIALS_PATH/GOOGLE_APPLICATION_CREDENTIALS."
    )

def init_firebase():
    global _app, _db, _bucket
    if firebase_admin._apps:
        _app = firebase_admin.get_app()
    else:
        cred = _load_credential()
        opts = {}
        proj = os.getenv("FIREBASE_PROJECT_ID")
        bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
        if proj:   opts["projectId"] = proj
        if bucket: opts["storageBucket"] = bucket
        _app = firebase_admin.initialize_app(cred, opts or None)

    _db = firestore.client(_app)
    try:
        _bucket = storage.bucket(app=_app)
    except Exception:
        _bucket = None
    return _app

def get_firestore_client():
    if not firebase_admin._apps:
        init_firebase()
    return firestore.client()

def get_storage_bucket():
    if not firebase_admin._apps:
        init_firebase()
    try:
        return storage.bucket()
    except Exception:
        return None

