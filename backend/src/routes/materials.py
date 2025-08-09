from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from src.models.user import db
from src.models.material import Material
import os
from werkzeug.utils import secure_filename

materials_bp = Blueprint('materials', __name__)

# Configurações de upload
UPLOAD_FOLDER = 'src/static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx', 'csv', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def handle_file_upload(file, prefix):
    if file and allowed_file(file.filename):
        original_name = secure_filename(file.filename)
        filename = f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_name}"
        
        # Criar diretório se não existir
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        return filename
    return None

@materials_bp.route('/', methods=['GET'])
@jwt_required()
def get_materials():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        query = Material.query
        
        if search:
            query = query.filter(
                db.or_(
                    Material.empresa.contains(search),
                    Material.nome_campanha.contains(search),
                    Material.responsavel.contains(search)
                )
            )
        
        materials = query.order_by(Material.data_cadastro.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'materials': [material.to_dict() for material in materials.items],
            'total': materials.total,
            'pages': materials.pages,
            'current_page': page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@materials_bp.route('/', methods=['POST'])
@jwt_required()
def create_material():
    try:
        data = request.form.to_dict()
        
        # Handle file uploads
        documento = handle_file_upload(request.files.get('documento'), 'doc')
        amostra = handle_file_upload(request.files.get('amostra'), 'img')
        
        material = Material(
            empresa=data.get('empresa'),
            quantidade=int(data.get('quantidade', 0)),
            data_inicio=datetime.strptime(data.get('data_inicio'), '%Y-%m-%d').date() if data.get('data_inicio') else None,
            data_termino=datetime.strptime(data.get('data_termino'), '%Y-%m-%d').date() if data.get('data_termino') else None,
            nome_campanha=data.get('nome_campanha'),
            responsavel=data.get('responsavel'),
            documento_url=documento,
            imagem_url=amostra
        )
        
        db.session.add(material)
        db.session.commit()
        
        return jsonify(material.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@materials_bp.route('/<int:material_id>', methods=['GET'])
@jwt_required()
def get_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        return jsonify(material.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@materials_bp.route('/<int:material_id>', methods=['PUT'])
@jwt_required()
def update_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        data = request.form.to_dict()
        
        # Update fields
        material.empresa = data.get('empresa', material.empresa)
        material.quantidade = int(data.get('quantidade', material.quantidade))
        
        if data.get('data_inicio'):
            material.data_inicio = datetime.strptime(data.get('data_inicio'), '%Y-%m-%d').date()
        if data.get('data_termino'):
            material.data_termino = datetime.strptime(data.get('data_termino'), '%Y-%m-%d').date()
            
        material.nome_campanha = data.get('nome_campanha', material.nome_campanha)
        material.responsavel = data.get('responsavel', material.responsavel)
        
        # Handle file uploads
        if 'documento' in request.files and request.files['documento'].filename:
            documento = handle_file_upload(request.files['documento'], 'doc')
            if documento:
                material.documento_url = documento
                
        if 'amostra' in request.files and request.files['amostra'].filename:
            amostra = handle_file_upload(request.files['amostra'], 'img')
            if amostra:
                material.imagem_url = amostra
        
        db.session.commit()
        return jsonify(material.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@materials_bp.route('/<int:material_id>', methods=['DELETE'])
@jwt_required()
def delete_material(material_id):
    try:
        material = Material.query.get_or_404(material_id)
        db.session.delete(material)
        db.session.commit()
        return jsonify({'message': 'Material deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

