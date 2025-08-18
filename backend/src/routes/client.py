from flask import Blueprint, request, jsonify
from src.models import Client
from src.middleware.auth_middleware import require_admin, require_supervisor, roles_allowed

client_bp = Blueprint('client_bp', __name__)

@client_bp.route('/clients', methods=['POST'])
@roles_allowed('admin')
def create_client():
    data = request.json
    client_id = Client.create(data)
    return jsonify({'id': client_id}), 201

@client_bp.route('/clients', methods=['GET'])
@roles_allowed('admin')
def get_all_clients():
    clients = Client.get_all()
    return jsonify(clients), 200

@client_bp.route('/clients/<client_id>', methods=['GET'])
@roles_allowed('admin')
def get_client_by_id(client_id):
    client = Client.get_by_id(client_id)
    if client:
        return jsonify(client), 200
    return jsonify({'message': 'Client not found'}), 404

@client_bp.route('/clients/<client_id>', methods=['PUT'])
@roles_allowed('admin')
def update_client(client_id):
    data = request.json
    Client.update(client_id, data)
    return jsonify({'message': 'Client updated successfully'}), 200

@client_bp.route('/clients/<client_id>', methods=['DELETE'])
@roles_allowed('admin')
def delete_client(client_id):
    Client.delete(client_id)
    return jsonify({'message': 'Client deleted successfully'}), 200


