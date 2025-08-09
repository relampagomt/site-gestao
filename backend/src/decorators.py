from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, get_current_user

def role_required(required_role):
    """
    Decorador para verificar se o usuário tem o role necessário
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role')
            
            if user_role != required_role and user_role != 'admin':
                return jsonify({'message': 'Acesso negado. Role insuficiente.'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def admin_required(f):
    """
    Decorador para verificar se o usuário é admin
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get('role')
        
        if user_role != 'admin':
            return jsonify({'message': 'Acesso negado. Apenas administradores.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

def supervisor_or_admin_required(f):
    """
    Decorador para verificar se o usuário é supervisor ou admin
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get('role')
        
        if user_role not in ['supervisor', 'admin']:
            return jsonify({'message': 'Acesso negado. Role insuficiente.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

