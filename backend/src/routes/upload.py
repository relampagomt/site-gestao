# backend/src/routes/upload.py
import os, json, base64, uuid, datetime, logging
from typing import Optional
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from google.cloud import storage

log = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

ALLOWED_PREFIX = "image/"
MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", "10485760"))  # 10MB
BUCKET_ENV = "GCS_BUCKET_NAME"
FOLDER = os.getenv("GCS_FOLDER", "uploads")
PUBLIC = (os.getenv("GCS_PUBLIC", "true").lower() == "true")

def _creds_dict() -> dict:
    """Lê credenciais do service account via env GCS_CREDENTIALS_B64 ou GCS_CREDENTIALS_JSON."""
    b64 = os.getenv("GCS_CREDENTIALS_B64")
    if b64:
        return json.loads(base64.b64decode(b64).decode("utf-8"))
    j = os.getenv("GCS_CREDENTIALS_JSON")
    if j:
        return json.loads(j)
    raise RuntimeError("missing GCS_CREDENTIALS_B64 or GCS_CREDENTIALS_JSON")

def _client() -> storage.Client:
    return storage.Client.from_service_account_info(_creds_dict())

def _ext(name: Optional[str]) -> str:
    if not name: return ""
    i = name.rfind(".")
    return name[i:].lower() if i != -1 else ""

@upload_bp.get("/upload/status")
def status():
    try:
        client = _client()
        bucket_name = os.getenv(BUCKET_ENV) or ""
        ok = bool(bucket_name and client.bucket(bucket_name))
        return jsonify(ok=ok, bucket=bucket_name, public=PUBLIC, folder=FOLDER), 200 if ok else 500
    except Exception as e:
        return jsonify(ok=False, error=str(e)[:200]), 500

@upload_bp.post("/upload")
@jwt_required(optional=True)  # troque para @jwt_required() se quiser exigir login
def upload():
    # arquivo + validações
    f = request.files.get("file")
    if not f or not getattr(f, "filename", ""):
        return jsonify(error="missing_file"), 400
    if MAX_BYTES and (request.content_length or 0) > MAX_BYTES:
        return jsonify(error="file_too_large", max_bytes=MAX_BYTES), 413
    ctype = (f.mimetype or "").lower()
    if not ctype.startswith(ALLOWED_PREFIX):
        return jsonify(error="unsupported_type", mimetype=ctype), 415

    bucket_name = os.getenv(BUCKET_ENV)
    if not bucket_name:
        return jsonify(error="missing_env", detail=BUCKET_ENV), 500

    try:
        client = _client()
        bucket = client.bucket(bucket_name)

        blob_name = f"{FOLDER}/{uuid.uuid4().hex}{_ext(f.filename)}"
        blob = bucket.blob(blob_name)

        # sobe mantendo o mimetype
        blob.upload_from_file(f.stream, content_type=ctype, rewind=True)

        if PUBLIC:
            # requer bucket com ACLs "Fine-grained" e sem Public Access Prevention
            blob.make_public()
            url = blob.public_url
        else:
            # bucket privado: gera URL assinada (24h)
            url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(days=1),
                method="GET",
            )

        return jsonify(
            url=url,
            bucket=bucket_name,
            object=blob_name,
            content_type=ctype,
        ), 201

    except Exception as e:
        log.exception("gcs_upload_failed")
        return jsonify(error="gcs_upload_failed", detail=str(e)[:200]), 500
