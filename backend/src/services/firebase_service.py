import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore, storage

_app = None
_db = None
_bucket = None

def _load_credential():
    """
    Ordem de leitura das credenciais:
      1) FIREBASE_CREDENTIALS_B64  (JSON em base64)  ← recomendado em produção
      2) FIREBASE_CREDENTIALS_JSON (JSON cru como string)
      3) FIREBASE_CREDENTIALS_PATH ou GOOGLE_APPLICATION_CREDENTIALS (caminho p/ arquivo .json)
    Se nada for encontrado, lança erro (evita cair em ApplicationDefault sem arquivo).
    """
    b64 = os.getenv("FIREBASE_CREDENTIALS_B64")
    if b64:
        try:
            data = base64.b64decode(b64).decode("utf-8")
            info = json.loads(data)
            return credentials.Certificate(info)
        except Exception as e:
            raise RuntimeError("FIREBASE_CREDENTIALS_B64 inválido") from e

    raw = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if raw:
        try:
            info = json.loads(raw)
            return credentials.Certificate(info)
        except Exception as e:
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON inválido") from e

    path = os.getenv("FIREBASE_CREDENTIALS_PATH") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if path and os.path.exists(path):
        return credentials.Certificate(path)

    raise RuntimeError(
        "Credenciais do Firebase não configuradas. Defina FIREBASE_CREDENTIALS_B64 "
        "(recomendado) OU FIREBASE_CREDENTIALS_JSON OU FIREBASE_CREDENTIALS_PATH/GOOGLE_APPLICATION_CREDENTIALS."
    )

def init_firebase():
    """Inicializa o Firebase uma única vez e prepara Firestore/Storage."""
    global _app, _db, _bucket

    if firebase_admin._apps:
        _app = firebase_admin.get_app()
    else:
        cred = _load_credential()
        options = {}
        proj = os.getenv("FIREBASE_PROJECT_ID")
        bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
        if proj:
            options["projectId"] = proj
        if bucket:
            options["storageBucket"] = bucket
        _app = firebase_admin.initialize_app(cred, options or None)

    _db = firestore.client(_app)
    try:
        _bucket = storage.bucket(app=_app)
    except Exception:
        _bucket = None
    return _app

def get_firestore_client():
    """Retorna o cliente do Firestore (inicializa se necessário)."""
    # Verificar se está em modo de desenvolvimento
    if os.getenv("FLASK_ENV") == "development" and not os.getenv("USE_FIRESTORE"):
        # Para desenvolvimento, usar banco em memória
        from src.services.memory_db import memory_db
        return memory_db
    
    # Para produção ou quando USE_FIRESTORE=true, usar Firestore
    if not firebase_admin._apps:
        init_firebase()
    return _db

def get_storage_bucket():
    """Retorna o bucket do Storage (pode ser None se não configurado)."""
    if not firebase_admin._apps:
        init_firebase()
    try:
        return storage.bucket()
    except Exception:
        return None


# Variável global para facilitar o acesso ao Firestore
# db = get_firestore_client()

