# backend/src/routes/upload.py
import os
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

import cloudinary
import cloudinary.uploader as cu
from cloudinary.exceptions import Error as CloudinaryError

log = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

# ---- helpers ---------------------------------------------------------------

def _configure_cloudinary():
    """
    Configura o Cloudinary a partir das variáveis de ambiente.
    Suporta tanto CLOUDINARY_URL quanto as chaves separadas.
    Lança RuntimeError se faltar algo.
    """
    url = os.getenv("CLOUDINARY_URL")
    if url:
        cloudinary.config(cloudinary_url=url, secure=True)
    else:
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )

    cfg = cloudinary.config()
    if not cfg.cloud_name or not cfg.api_key or not cfg.api_secret:
        raise RuntimeError("cloudinary_config_missing")

# ---- route -----------------------------------------------------------------

ALLOWED_PREFIX = "image/"  # só imagens

@upload_bp.post("/upload")
@jwt_required(optional=True)  # troque para jwt_required() se quiser exigir login
def upload():
    # 1) Config do Cloudinary
    try:
        _configure_cloudinary()
    except Exception:
        log.exception("Cloudinary config error")
        return jsonify(error="cloudinary_config_error"), 500

    # 2) Arquivo
    f = request.files.get("file")
    if not f or not getattr(f, "filename", ""):
        return jsonify(error="missing_file"), 400

    ctype = (f.mimetype or "").lower()
    if not ctype.startswith(ALLOWED_PREFIX):
        return jsonify(error="unsupported_type", mimetype=ctype), 415

    # 3) Upload
    try:
        folder = os.getenv("CLOUDINARY_FOLDER", "relampago")
        up = cu.upload(
            f,
            folder=folder,
            resource_type="image",
            unique_filename=True,
            overwrite=False,
        )
        return jsonify(
            url=up.get("secure_url"),
            public_id=up.get("public_id"),
            format=up.get("format"),
            bytes=int(up.get("bytes") or 0),
            width=up.get("width"),
            height=up.get("height"),
        ), 201

    except CloudinaryError as ce:
        # erro vindo da API do Cloudinary (credencial, quota, etc.)
        log.exception("cloudinary_upload_error")
        return jsonify(error="cloudinary_upload_error", detail=str(ce)[:160]), 500
    except Exception:
        log.exception("upload_failed")
        return jsonify(error="upload_failed"), 500
