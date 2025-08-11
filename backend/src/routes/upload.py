# backend/src/routes/upload.py
import os
import logging
from typing import Optional
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

import cloudinary
import cloudinary.uploader as cu
from cloudinary import api as cld_api
from cloudinary.exceptions import Error as CloudinaryError

log = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

# ---------------- helpers ----------------

def _env(name: str) -> Optional[str]:
    """Lê env e remove espaços/aspas acidentais."""
    v = os.getenv(name)
    if not v:
        return None
    v = v.strip()
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1]
    return v.strip() or None

def _extract_url_from_misplaced_secret(secret: str) -> Optional[str]:
    """
    Alguns setups colocam por engano a URL completa dentro de CLOUDINARY_API_SECRET,
    às vezes até com o prefixo 'CLOUDINARY_URL='.
    Tenta extrair 'cloudinary://...'.
    """
    s = secret.strip()
    if "cloudinary://" in s:
        # corta antes de 'cloudinary://'
        idx = s.index("cloudinary://")
        return s[idx:].strip()
    return None

def _configure_cloudinary():
    """
    Configura Cloudinary a partir das envs.
    Suporta CLOUDINARY_URL ou chaves separadas.
    Se detectar URL colada por engano em API_SECRET, corrige automaticamente.
    """
    # 1) primeiro tenta CLOUDINARY_URL
    url = _env("CLOUDINARY_URL")
    if url:
        cloudinary.config(cloudinary_url=url, secure=True)
    else:
        cloud_name = _env("CLOUDINARY_CLOUD_NAME")
        api_key    = _env("CLOUDINARY_API_KEY")
        api_secret = _env("CLOUDINARY_API_SECRET")

        # 2) correção automática se API_SECRET contém a URL inteira
        if api_secret and "cloudinary://" in api_secret and not (cloud_name and api_key):
            maybe_url = _extract_url_from_misplaced_secret(api_secret)
            if maybe_url:
                cloudinary.config(cloudinary_url=maybe_url, secure=True)
            else:
                cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
        else:
            cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)

    cfg = cloudinary.config()
    if not cfg.cloud_name or not cfg.api_key or not cfg.api_secret:
        raise RuntimeError("cloudinary_config_missing")

# --------------- routes ------------------

ALLOWED_PREFIX = "image/"  # só imagens
MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", "10485760"))  # 10 MB padrão

@upload_bp.get("/upload/status")
def upload_status():
    """Diagnóstico rápido sem vazar segredos."""
    try:
        _configure_cloudinary()
        cld_api.ping()  # testa acesso
        cfg = cloudinary.config()
        return jsonify(
            ok=True,
            cloud=str(cfg.cloud_name),
            key_tail=str(cfg.api_key)[-4:] if cfg.api_key else None,
            secret_len=len(cfg.api_secret or ""),
            using_url=bool(_env("CLOUDINARY_URL")),
        ), 200
    except Exception as e:
        log.exception("upload_status_error")
        return jsonify(ok=False, error=str(e)[:200]), 500

@upload_bp.post("/upload")
@jwt_required(optional=True)  # troque para jwt_required() se quiser exigir login
def upload():
    # 1) Config
    try:
        _configure_cloudinary()
    except Exception:
        log.exception("cloudinary_config_error")
        return jsonify(error="cloudinary_config_error"), 500

    # 2) Arquivo
    f = request.files.get("file")
    if not f or not getattr(f, "filename", ""):
        return jsonify(error="missing_file"), 400

    # limite simples de tamanho (se Content-Length vier)
    clen = request.content_length or 0
    if MAX_BYTES and clen > MAX_BYTES:
        return jsonify(error="file_too_large", max_bytes=MAX_BYTES), 413

    ctype = (f.mimetype or "").lower()
    if not ctype.startswith(ALLOWED_PREFIX):
        return jsonify(error="unsupported_type", mimetype=ctype), 415

    # 3) Upload
    try:
        folder = _env("CLOUDINARY_FOLDER") or "relampago"
        up = cu.upload(
            f,                       # FileStorage funciona direto aqui
            folder=folder,
            resource_type="image",
            unique_filename=True,
            overwrite=False,
            timeout=60,
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
        # Mensagem amigável para a causa mais comum
        msg = str(ce)
        hint = None
        if "Invalid Signature" in msg:
            hint = (
                "Assinatura inválida. Verifique as variáveis no Render: "
                "prefira definir apenas CLOUDINARY_URL (ex.: cloudinary://<api_key>:<api_secret>@<cloud_name>) "
                "ou garanta que CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET estejam corretas. "
                "Evite colar a URL inteira dentro de CLOUDINARY_API_SECRET."
            )
        log.exception("cloudinary_upload_error")
        return jsonify(error="cloudinary_upload_error", detail=msg[:160], hint=hint), 500

    except Exception as e:
        log.exception("upload_failed")
        return jsonify(error="upload_failed", detail=str(e)[:160]), 500
