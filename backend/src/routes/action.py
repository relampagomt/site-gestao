from flask import Blueprint, request, jsonify
from src.models import Action
from src.middleware.auth_middleware import require_admin, require_supervisor, roles_allowed

action_bp = Blueprint("action_bp", __name__)

@action_bp.route("/actions", methods=["POST"])
@roles_allowed('admin', 'supervisor')
def create_action():
    data = request.json
    action_id = Action.create(data)
    return jsonify({"id": action_id}), 201

@action_bp.route("/actions", methods=["GET"])
@roles_allowed('admin', 'supervisor')
def get_all_actions():
    actions = Action.get_all()
    return jsonify(actions), 200

@action_bp.route("/actions/<action_id>", methods=["GET"])
@roles_allowed('admin', 'supervisor')
def get_action_by_id(action_id):
    action = Action.get_by_id(action_id)
    if action:
        return jsonify(action), 200
    return jsonify({"message": "Action not found"}), 404

@action_bp.route("/actions/<action_id>", methods=["PUT"])
@roles_allowed('admin', 'supervisor')
def update_action(action_id):
    data = request.json
    Action.update(action_id, data)
    return jsonify({"message": "Action updated successfully"}), 200

@action_bp.route("/actions/<action_id>", methods=["DELETE"])
@roles_allowed('admin')
def delete_action(action_id):
    Action.delete(action_id)
    return jsonify({"message": "Action deleted successfully"}), 200


