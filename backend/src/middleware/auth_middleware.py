from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def _load_user(user_id):
    # Lazy import para evitar ciclos de importação
    from src.services.user_service import get_user_by_id
    return get_user_by_id(user_id)

def require_user(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = _load_user(user_id)
        if not user:
            return jsonify({"message": "Usuário inválido"}), 401
        # anexa o usuário na request
        request.current_user = user
        return f(*args, **kwargs)
    return wrapper

def require_admin(f):
    @require_user
    @wraps(f)
    def wrapper(*args, **kwargs):
        role = request.current_user.get("role")
        if role != "admin":
            return jsonify({"message": "Acesso negado"}), 403
        return f(*args, **kwargs)
    return wrapper

def require_supervisor(f):
    @require_user
    @wraps(f)
    def wrapper(*args, **kwargs):
        role = request.current_user.get("role")
        if role not in ("admin", "supervisor"):
            return jsonify({"message": "Acesso negado"}), 403
        return f(*args, **kwargs)
    return wrapper
