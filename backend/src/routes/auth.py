from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from src.models.user import User
from src.models import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Endpoint para login de usuários"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username e password são obrigatórios'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        # Buscar usuário
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Usuário inativo'}), 401
        
        # Atualizar último login
        user.update_last_login()
        db.session.commit()
        
        # Criar token
        access_token = create_access_token(
            identity=user.id,
            additional_claims={"role": user.role}
        )
        
        return jsonify({
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    """Endpoint para registro de novos usuários (apenas admins)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email e password são obrigatórios'}), 400
        
        # Verificar se usuário já existe
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify({'error': 'Username já existe'}), 400
        
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'error': 'Email já existe'}), 400
        
        # Criar novo usuário
        new_user = User(
            username=data.get('username'),
            email=data.get('email'),
            role=data.get('role', 'supervisor'),
            first_name=data.get('first_name'),
            last_name=data.get('last_name')
        )
        new_user.set_password(data.get('password'))
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Endpoint para obter dados do usuário atual"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Endpoint para alterar senha do usuário"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Senha atual e nova senha são obrigatórias'}), 400
        
        if not user.check_password(data.get('current_password')):
            return jsonify({'error': 'Senha atual incorreta'}), 400
        
        user.set_password(data.get('new_password'))
        db.session.commit()
        
        return jsonify({'message': 'Senha alterada com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

