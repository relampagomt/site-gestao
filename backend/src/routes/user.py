from flask import Blueprint, request, jsonify
from src.services.user_service import create_user, get_user_by_id, find_user_by_username, update_user, delete_user, get_all_users
from src.middleware.auth_middleware import require_admin

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/users', methods=['POST'])
@require_admin()
def add_user():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username e password são obrigatórios'}), 400
    try:
        user = create_user(data['username'], data['password'], data.get('role', 'supervisor'), data.get('name', ''))
        return jsonify(user), 201
    except ValueError as e:
        return jsonify({'message': str(e)}), 409 # Conflict
    except Exception as e:
        return jsonify({'message': f'Erro ao criar usuário: {str(e)}'}), 500

@user_bp.route('/users', methods=['GET'])
@require_admin()
def list_users():
    users = get_all_users()
    return jsonify(users), 200

@user_bp.route('/users/<user_id>', methods=['GET'])
@require_admin()
def get_single_user(user_id):
    user = get_user_by_id(user_id)
    if user:
        return jsonify(user), 200
    return jsonify({'message': 'Usuário não encontrado'}), 404

@user_bp.route('/users/<user_id>', methods=['PUT'])
@require_admin()
def update_single_user(user_id):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Dados não fornecidos'}), 400
    try:
        if update_user(user_id, data):
            return jsonify({'message': 'Usuário atualizado com sucesso'}), 200
        return jsonify({'message': 'Usuário não encontrado ou nada para atualizar'}), 404
    except Exception as e:
        return jsonify({'message': f'Erro ao atualizar usuário: {str(e)}'}), 500

@user_bp.route('/users/<user_id>', methods=['DELETE'])
@require_admin()
def delete_single_user(user_id):
    try:
        if delete_user(user_id):
            return jsonify({'message': 'Usuário deletado com sucesso'}), 200
        return jsonify({'message': 'Usuário não encontrado'}), 404
    except Exception as e:
        return jsonify({'message': f'Erro ao deletar usuário: {str(e)}'}), 500


