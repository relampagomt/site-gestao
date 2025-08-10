from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.user_service import get_user_by_id

def require_role(required_role):
    """Decorator para verificar role do usuário"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = get_user_by_id(current_user_id)
            
            if not user:
                return jsonify({'message': 'Usuário não encontrado'}), 404
            
            if not user.get('active', True):
                return jsonify({'message': 'Usuário inativo'}), 403
            
            user_role = user.get('role', 'supervisor')
            
            # Admin tem acesso a tudo
            if user_role == 'admin':
                return f(*args, **kwargs)
            
            # Verificar se o usuário tem a role necessária
            if user_role != required_role:
                return jsonify({'message': 'Acesso negado'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def require_admin():
    """Decorator para exigir role admin"""
    return require_role('admin')

def require_supervisor():
    """Decorator para exigir role supervisor ou admin"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = get_user_by_id(current_user_id)
            
            if not user:
                return jsonify({'message': 'Usuário não encontrado'}), 404
            
            if not user.get('active', True):
                return jsonify({'message': 'Usuário inativo'}), 403
            
            user_role = user.get('role', 'supervisor')
            
            # Admin e supervisor têm acesso
            if user_role in ['admin', 'supervisor']:
                return f(*args, **kwargs)
            
            return jsonify({'message': 'Acesso negado'}), 403
        
        return decorated_function
    return decorator

