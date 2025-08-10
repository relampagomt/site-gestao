from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

def _load_user(user_id):
    # Lazy import para evitar ciclos de importação
    from src.services.user_service import get_user_by_id
    return get_user_by_id(user_id)

def require_user(f=None):
    """
    Pode usar como @require_user OU @require_user()
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = _load_user(user_id)
            if not user:
                return jsonify({"message": "Usuário inválido"}), 401
            request.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator if f is None else decorator(f)

def require_admin(f=None):
    """
    Pode usar como @require_admin OU @require_admin()
    """
    def decorator(fn):
        @require_user
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = request.current_user.get("role")
            if role != "admin":
                return jsonify({"message": "Acesso negado"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator if f is None else decorator(f)

def require_supervisor(f=None):
    """
    Pode usar como @require_supervisor OU @require_supervisor()
    """
    def decorator(fn):
        @require_user
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = request.current_user.get("role")
            if role not in ("admin", "supervisor"):
                return jsonify({"message": "Acesso negado"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator if f is None else decorator(f)
