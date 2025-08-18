from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

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
            if not user.get('active', True):
                return jsonify({"message": "Usuário inativo"}), 403
            request.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator if f is None else decorator(f)

def roles_allowed(*allowed_roles):
    """
    Decorator flexível para controle de acesso baseado em roles.
    Uso: @roles_allowed('admin') ou @roles_allowed('admin', 'supervisor')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            # Tentar obter role do JWT claims primeiro
            claims = get_jwt()
            role = claims.get('role')
            
            # Se não tiver no JWT, carregar do banco
            if not role:
                user_id = get_jwt_identity()
                user = _load_user(user_id)
                if not user:
                    return jsonify({"message": "Usuário inválido"}), 401
                if not user.get('active', True):
                    return jsonify({"message": "Usuário inativo"}), 403
                role = user.get("role")
                request.current_user = user
            else:
                # Se tiver role no JWT, ainda precisamos carregar o usuário para outras verificações
                user_id = get_jwt_identity()
                user = _load_user(user_id)
                if not user:
                    return jsonify({"message": "Usuário inválido"}), 401
                if not user.get('active', True):
                    return jsonify({"message": "Usuário inativo"}), 403
                request.current_user = user
            
            if role not in allowed_roles:
                roles_str = ', '.join(allowed_roles)
                return jsonify({"message": f"Acesso negado - Requer perfil: {roles_str}"}), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def require_admin(f=None):
    """
    Pode usar como @require_admin OU @require_admin()
    Verifica role no JWT claims primeiro, fallback para DB
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            # Tentar obter role do JWT claims primeiro
            claims = get_jwt()
            role = claims.get('role')
            
            # Se não tiver no JWT, carregar do banco
            if not role:
                user_id = get_jwt_identity()
                user = _load_user(user_id)
                if not user:
                    return jsonify({"message": "Usuário inválido"}), 401
                if not user.get('active', True):
                    return jsonify({"message": "Usuário inativo"}), 403
                role = user.get("role")
                request.current_user = user
            else:
                # Se tiver role no JWT, ainda precisamos carregar o usuário para outras verificações
                user_id = get_jwt_identity()
                user = _load_user(user_id)
                if not user:
                    return jsonify({"message": "Usuário inválido"}), 401
                if not user.get('active', True):
                    return jsonify({"message": "Usuário inativo"}), 403
                request.current_user = user
            
            if role != "admin":
                return jsonify({"message": "Acesso negado - Apenas administradores"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator if f is None else decorator(f)

def require_supervisor(f=None):
    """
    Pode usar como @require_supervisor OU @require_supervisor()
    Verifica role no JWT claims primeiro, fallback para DB
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            # Tentar obter role do JWT claims primeiro
            claims = get_jwt()
            role = claims.get('role')
            
            # Se não tiver no JWT, carregar do banco
            if not role:
                user_id = get_jwt_identity()
                user = _load_user(user_id)
                if not user:
                    return jsonify({"message": "Usuário inválido"}), 401
                if not user.get('active', True):
                    return jsonify({"message": "Usuário inativo"}), 403
                role = user.get("role")
                request.current_user = user
            else:
                # Se tiver role no JWT, ainda precisamos carregar o usuário para outras verificações
                user_id = get_jwt_identity()
                user = _load_user(user_id)
                if not user:
                    return jsonify({"message": "Usuário inválido"}), 401
                if not user.get('active', True):
                    return jsonify({"message": "Usuário inativo"}), 403
                request.current_user = user
            
            if role not in ("admin", "supervisor"):
                return jsonify({"message": "Acesso negado - Supervisores ou administradores apenas"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator if f is None else decorator(f)
