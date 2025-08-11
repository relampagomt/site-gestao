import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

# pip install cloudinary
import cloudinary
import cloudinary.uploader as cu

# Lê do ambiente (Render → Settings → Environment)
# CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

upload_bp = Blueprint("upload", __name__)

ALLOWED_MIME_PREFIXES = ("image/",)  # limite a imagens

@upload_bp.post("/upload")
@jwt_required(optional=True)  # troque para jwt_required() se quiser exigir login
def upload():
    """
    Recebe multipart/form-data com o campo 'file' e sobe a imagem no Cloudinary.
    Retorna JSON com a URL segura e metadados básicos.
    """
    f = request.files.get("file")
    if not f:
        return jsonify(error="missing file"), 400

    # Validação simples de tipo
    content_type = f.mimetype or ""
    if not content_type.startswith(ALLOWED_MIME_PREFIXES):
        return jsonify(error=f"unsupported content-type: {content_type}"), 415

    try:
        folder = os.getenv("CLOUDINARY_FOLDER", "relampago")
        result = cu.upload(
            f,
            folder=folder,
            resource_type="image",
            unique_filename=True,
            overwrite=False,
        )

        return jsonify(
            url=result.get("secure_url"),
            public_id=result.get("public_id"),
            format=result.get("format"),
            bytes=result.get("bytes"),
            width=result.get("width"),
            height=result.get("height"),
        ), 201

    except Exception as e:
        # Evita vazar detalhes sensíveis
        return jsonify(error="upload_failed", detail=str(e)), 500
