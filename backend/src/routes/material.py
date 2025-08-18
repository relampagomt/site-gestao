from flask import Blueprint, request, jsonify
from src.models import Material
from src.middleware.auth_middleware import require_admin, require_supervisor, roles_allowed

material_bp = Blueprint("material_bp", __name__)

@material_bp.route("/materials", methods=["POST"])
@roles_allowed('admin', 'supervisor')
def create_material():
    data = request.json
    material_id = Material.create(data)
    return jsonify({"id": material_id}), 201

@material_bp.route("/materials", methods=["GET"])
@roles_allowed('admin', 'supervisor')
def get_all_materials():
    materials = Material.get_all()
    return jsonify(materials), 200

@material_bp.route("/materials/<material_id>", methods=["GET"])
@roles_allowed('admin', 'supervisor')
def get_material_by_id(material_id):
    material = Material.get_by_id(material_id)
    if material:
        return jsonify(material), 200
    return jsonify({"message": "Material not found"}), 404

@material_bp.route("/materials/<material_id>", methods=["PUT"])
@roles_allowed('admin', 'supervisor')
def update_material(material_id):
    data = request.json
    Material.update(material_id, data)
    return jsonify({"message": "Material updated successfully"}), 200

@material_bp.route("/materials/<material_id>", methods=["DELETE"])
@roles_allowed('admin')
def delete_material(material_id):
    Material.delete(material_id)
    return jsonify({"message": "Material deleted successfully"}), 200


