from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User
from src.models.vacancy import Vacancy, db
from src.models.vacancy_application import VacancyApplication
from datetime import datetime

vacancies_bp = Blueprint('vacancies', __name__)

@vacancies_bp.route('/', methods=['GET'])
def get_vacancies():
    """Listar todas as vagas (público)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        location = request.args.get('location', '')
        employment_type = request.args.get('employment_type', '')
        
        query = Vacancy.query.filter_by(status='active')
        
        # Aplicar filtros
        if search:
            query = query.filter(
                (Vacancy.title.contains(search)) |
                (Vacancy.description.contains(search))
            )
        
        if location:
            query = query.filter(Vacancy.location.contains(location))
        
        if employment_type:
            query = query.filter(Vacancy.employment_type == employment_type)
        
        # Ordenar por data de criação (mais recentes primeiro)
        query = query.order_by(Vacancy.created_at.desc())
        
        # Paginação
        vacancies = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'vacancies': [vacancy.to_dict() for vacancy in vacancies.items],
            'total': vacancies.total,
            'pages': vacancies.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/admin', methods=['GET'])
@jwt_required()
def get_vacancies_admin():
    """Listar todas as vagas (admin)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        query = Vacancy.query
        
        # Aplicar filtros
        if search:
            query = query.filter(
                (Vacancy.title.contains(search)) |
                (Vacancy.description.contains(search))
            )
        
        if status:
            query = query.filter(Vacancy.status == status)
        
        # Ordenar por data de criação (mais recentes primeiro)
        query = query.order_by(Vacancy.created_at.desc())
        
        # Paginação
        vacancies = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'vacancies': [vacancy.to_dict() for vacancy in vacancies.items],
            'total': vacancies.total,
            'pages': vacancies.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/<int:vacancy_id>', methods=['GET'])
def get_vacancy(vacancy_id):
    """Obter uma vaga específica (público)"""
    try:
        vacancy = Vacancy.query.get_or_404(vacancy_id)
        return jsonify({'vacancy': vacancy.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/', methods=['POST'])
@jwt_required()
def create_vacancy():
    """Criar uma nova vaga"""
    try:
        data = request.get_json()
        
        if not data or not data.get('title') or not data.get('description'):
            return jsonify({'error': 'Título e descrição são obrigatórios'}), 400
        
        # Converter data de deadline se fornecida
        application_deadline = None
        if data.get('application_deadline'):
            application_deadline = datetime.strptime(data.get('application_deadline'), '%Y-%m-%d').date()
        
        vacancy = Vacancy(
            title=data.get('title'),
            description=data.get('description'),
            requirements=data.get('requirements'),
            location=data.get('location'),
            salary_range=data.get('salary_range'),
            employment_type=data.get('employment_type'),
            status=data.get('status', 'active'),
            positions_available=data.get('positions_available', 1),
            application_deadline=application_deadline,
            contact_email=data.get('contact_email'),
            benefits=data.get('benefits')
        )
        
        db.session.add(vacancy)
        db.session.commit()
        
        return jsonify({
            'message': 'Vaga criada com sucesso',
            'vacancy': vacancy.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/<int:vacancy_id>', methods=['PUT'])
@jwt_required()
def update_vacancy(vacancy_id):
    """Atualizar uma vaga"""
    try:
        vacancy = Vacancy.query.get_or_404(vacancy_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        # Atualizar campos
        if 'title' in data:
            vacancy.title = data['title']
        if 'description' in data:
            vacancy.description = data['description']
        if 'requirements' in data:
            vacancy.requirements = data['requirements']
        if 'location' in data:
            vacancy.location = data['location']
        if 'salary_range' in data:
            vacancy.salary_range = data['salary_range']
        if 'employment_type' in data:
            vacancy.employment_type = data['employment_type']
        if 'status' in data:
            vacancy.status = data['status']
        if 'positions_available' in data:
            vacancy.positions_available = data['positions_available']
        if 'application_deadline' in data:
            if data['application_deadline']:
                vacancy.application_deadline = datetime.strptime(data['application_deadline'], '%Y-%m-%d').date()
            else:
                vacancy.application_deadline = None
        if 'contact_email' in data:
            vacancy.contact_email = data['contact_email']
        if 'benefits' in data:
            vacancy.benefits = data['benefits']
        
        vacancy.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Vaga atualizada com sucesso',
            'vacancy': vacancy.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/<int:vacancy_id>', methods=['DELETE'])
@jwt_required()
def delete_vacancy(vacancy_id):
    """Deletar uma vaga"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        vacancy = Vacancy.query.get_or_404(vacancy_id)
        
        db.session.delete(vacancy)
        db.session.commit()
        
        return jsonify({'message': 'Vaga deletada com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/<int:vacancy_id>/apply', methods=['POST'])
def apply_to_vacancy(vacancy_id):
    """Candidatar-se a uma vaga (público)"""
    try:
        vacancy = Vacancy.query.get_or_404(vacancy_id)
        
        if vacancy.status != 'active':
            return jsonify({'error': 'Esta vaga não está mais ativa'}), 400
        
        data = request.get_json()
        
        if not data or not data.get('name') or not data.get('email'):
            return jsonify({'error': 'Nome e email são obrigatórios'}), 400
        
        # Verificar se já existe candidatura para este email nesta vaga
        existing_application = VacancyApplication.query.filter_by(
            vacancy_id=vacancy_id,
            email=data.get('email')
        ).first()
        
        if existing_application:
            return jsonify({'error': 'Você já se candidatou a esta vaga'}), 400
        
        application = VacancyApplication(
            vacancy_id=vacancy_id,
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            resume_url=data.get('resume_url'),
            cover_letter=data.get('cover_letter')
        )
        
        db.session.add(application)
        db.session.commit()
        
        return jsonify({
            'message': 'Candidatura enviada com sucesso',
            'application': application.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/<int:vacancy_id>/applications', methods=['GET'])
@jwt_required()
def get_vacancy_applications(vacancy_id):
    """Listar candidaturas de uma vaga"""
    try:
        vacancy = Vacancy.query.get_or_404(vacancy_id)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status', '')
        
        query = VacancyApplication.query.filter_by(vacancy_id=vacancy_id)
        
        if status:
            query = query.filter(VacancyApplication.status == status)
        
        query = query.order_by(VacancyApplication.created_at.desc())
        
        applications = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'applications': [app.to_dict() for app in applications.items],
            'total': applications.total,
            'pages': applications.pages,
            'current_page': page,
            'per_page': per_page,
            'vacancy': vacancy.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@vacancies_bp.route('/applications/<int:application_id>', methods=['PUT'])
@jwt_required()
def update_application_status(application_id):
    """Atualizar status de uma candidatura"""
    try:
        application = VacancyApplication.query.get_or_404(application_id)
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Status é obrigatório'}), 400
        
        application.status = data['status']
        if 'notes' in data:
            application.notes = data['notes']
        
        application.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Status da candidatura atualizado com sucesso',
            'application': application.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

