# backend/src/routes/upload.py
import os, uuid, datetime, logging, mimetypes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from google.cloud import storage

log = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

# ===== Config =====
BUCKET_ENV = "GCS_BUCKET_NAME"
FOLDER = os.getenv("GCS_FOLDER", "uploads")
PUBLIC = (os.getenv("GCS_PUBLIC", "true").lower() == "true")
MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", "10485760"))  # 10MB
ALLOWED_MIME = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}

def _guess_mime(filename: str, fallback: str = "application/octet-stream") -> str:
    mime, _ = mimetypes.guess_type(filename or "")
    return mime or fallback

def _pick_file(req):
    # aceita diversos nomes de campo para compat
    for k in ("file", "document", "documents", "material", "image", "upload"):
      f = req.files.get(k)
      if f:
        return f
    return None

@upload_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    try:
        # valida arquivo
        f = _pick_file(request)
        if not f or not getattr(f, "filename", ""):
            return jsonify(error="no_file", detail="Nenhum arquivo enviado."), 400

        # tamanho (se conhecido)
        clen = request.content_length or 0
        if clen and clen > MAX_BYTES:
            return jsonify(error="too_large", detail="Arquivo excede o limite."), 413

        # tipo/mime
        ctype = getattr(f, "mimetype", None) or _guess_mime(f.filename)
        if ctype not in ALLOWED_MIME:
            return jsonify(
                error="unsupported_type",
                detail=f"Tipo não permitido: {ctype}. Permitidos: PDF/PNG/JPG/WEBP."
            ), 415

        bucket_name = os.getenv(BUCKET_ENV)
        if not bucket_name:
            return jsonify(error="misconfig", detail=f"Variável {BUCKET_ENV} ausente."), 500

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        # caminho: uploads/aaaa/mm/uuid-nome.ext
        now = datetime.datetime.utcnow()
        sub = f"{now:%Y/%m}"
        safe_name = os.path.basename(f.filename)
        blob_name = f"{FOLDER}/{sub}/{uuid.uuid4().hex}-{safe_name}"

        blob = bucket.blob(blob_name)
        blob.upload_from_file(f.stream, content_type=ctype)

        if PUBLIC:
            blob.make_public()
            url = blob.public_url
        else:
            url = blob.generate_signed_url(
                expiration=datetime.timedelta(days=1), method="GET"
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
