# backend/src/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from src.services.user_service import authenticate_user, get_user_by_id

auth_bp = Blueprint("auth", __name__)

def _public_user(user: dict) -> dict:
    """Remove campos sensíveis e padroniza payload do usuário."""
    return {
        "id": user.get("id"),
        "username": user.get("username"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role"),
    }

# -------- LOGIN --------
# Aceita /api/auth/login e /api/login (alias de compatibilidade)
@auth_bp.route("/auth/login", methods=["POST", "OPTIONS"])
@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def auth_login():
    # Preflight CORS explícito
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    username = data.get("username") or data.get("email") or data.get("user")
    password = data.get("password") or data.get("senha")

    if not username or not password:
        return jsonify({"message": "Username/email e password são obrigatórios"}), 400

    # Autenticação delegada ao serviço
    user = authenticate_user(username, password)
    if not user:
        return jsonify({"message": "Credenciais inválidas"}), 401

    # Cria JWT (em main.py JWT_ACCESS_TOKEN_EXPIRES=False -> sem expirar)
    additional_claims = {
        "role": user.get("role"),
        "username": user.get("username") or user.get("name") or user.get("email") or "",
    }
    access_token = create_access_token(
        identity=str(user.get("id")),
        additional_claims=additional_claims,
    )

    body = {
        "access_token": access_token,
        "user": _public_user(user),
    }
    # Também retorna o token no header Authorization, para clientes que leem de lá
    return (jsonify(body), 200, {"Authorization": f"Bearer {access_token}"})


# -------- ME --------
# Aceita /api/auth/me e /api/me (alias de compatibilidade)
@auth_bp.route("/auth/me", methods=["GET"])
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    user = get_user_by_id(current_user_id)

    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404
    if not user.get("active", True):
        return jsonify({"message": "Usuário inativo"}), 403

    return jsonify({"user": _public_user(user)}), 200
