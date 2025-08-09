from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.user import User
from src.models.action import Action, db
from src.models.client import Client
from datetime import datetime, date

actions_bp = Blueprint('actions', __name__)

@actions_bp.route('/', methods=['GET'])
@jwt_required()
def get_actions():
    """Listar todas as ações com paginação e filtros"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        service_type = request.args.get('service_type', '')
        client_id = request.args.get('client_id', type=int)
        
        query = Action.query
        
        # Aplicar filtros
        if search:
            query = query.filter(
                (Action.title.contains(search)) |
                (Action.description.contains(search)) |
                (Action.location.contains(search))
            )
        
        if status:
            query = query.filter(Action.status == status)
        
        if service_type:
            query = query.filter(Action.service_type == service_type)
        
        if client_id:
            query = query.filter(Action.client_id == client_id)
        
        # Ordenar por data de criação (mais recentes primeiro)
        query = query.order_by(Action.created_at.desc())
        
        # Paginação
        actions = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'actions': [action.to_dict() for action in actions.items],
            'total': actions.total,
            'pages': actions.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@actions_bp.route('/<int:action_id>', methods=['GET'])
@jwt_required()
def get_action(action_id):
    """Obter uma ação específica"""
    try:
        action = Action.query.get_or_404(action_id)
        return jsonify({'action': action.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@actions_bp.route('/', methods=['POST'])
@jwt_required()
def create_action():
    """Criar uma nova ação"""
    try:
        data = request.get_json()
        
        if not data or not data.get('title') or not data.get('client_id') or not data.get('start_date'):
            return jsonify({'error': 'Título, cliente e data de início são obrigatórios'}), 400
        
        # Verificar se cliente existe
        client = Client.query.get(data.get('client_id'))
        if not client:
            return jsonify({'error': 'Cliente não encontrado'}), 404
        
        # Converter datas
        start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
        end_date = None
        if data.get('end_date'):
            end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
        
        action = Action(
            title=data.get('title'),
            description=data.get('description'),
            service_type=data.get('service_type', 'residencial'),
            client_id=data.get('client_id'),
            start_date=start_date,
            end_date=end_date,
            status=data.get('status', 'pending'),
            budget=data.get('budget'),
            location=data.get('location'),
            target_audience=data.get('target_audience'),
            materials_quantity=data.get('materials_quantity'),
            team_size=data.get('team_size'),
            gps_tracking=data.get('gps_tracking', True),
            notes=data.get('notes')
        )
        
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            'message': 'Ação criada com sucesso',
            'action': action.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@actions_bp.route('/<int:action_id>', methods=['PUT'])
@jwt_required()
def update_action(action_id):
    """Atualizar uma ação"""
    try:
        action = Action.query.get_or_404(action_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        # Verificar se cliente existe (se fornecido)
        if 'client_id' in data:
            client = Client.query.get(data.get('client_id'))
            if not client:
                return jsonify({'error': 'Cliente não encontrado'}), 404
        
        # Atualizar campos
        if 'title' in data:
            action.title = data['title']
        if 'description' in data:
            action.description = data['description']
        if 'service_type' in data:
            action.service_type = data['service_type']
        if 'client_id' in data:
            action.client_id = data['client_id']
        if 'start_date' in data:
            action.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        if 'end_date' in data:
            if data['end_date']:
                action.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            else:
                action.end_date = None
        if 'status' in data:
            action.status = data['status']
        if 'budget' in data:
            action.budget = data['budget']
        if 'location' in data:
            action.location = data['location']
        if 'target_audience' in data:
            action.target_audience = data['target_audience']
        if 'materials_quantity' in data:
            action.materials_quantity = data['materials_quantity']
        if 'team_size' in data:
            action.team_size = data['team_size']
        if 'gps_tracking' in data:
            action.gps_tracking = data['gps_tracking']
        if 'notes' in data:
            action.notes = data['notes']
        
        action.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Ação atualizada com sucesso',
            'action': action.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@actions_bp.route('/<int:action_id>', methods=['DELETE'])
@jwt_required()
def delete_action(action_id):
    """Deletar uma ação"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Acesso negado'}), 403
        
        action = Action.query.get_or_404(action_id)
        
        db.session.delete(action)
        db.session.commit()
        
        return jsonify({'message': 'Ação deletada com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@actions_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_actions_stats():
    """Obter estatísticas das ações"""
    try:
        total_actions = Action.query.count()
        pending_actions = Action.query.filter_by(status='pending').count()
        in_progress_actions = Action.query.filter_by(status='in_progress').count()
        completed_actions = Action.query.filter_by(status='completed').count()
        cancelled_actions = Action.query.filter_by(status='cancelled').count()
        
        # Ações por tipo de serviço
        from sqlalchemy import func
        service_stats = db.session.query(
            Action.service_type,
            func.count(Action.id).label('count')
        ).group_by(Action.service_type).all()
        
        # Ações por mês (últimos 6 meses)
        from sqlalchemy import extract
        monthly_stats = db.session.query(
            extract('month', Action.created_at).label('month'),
            extract('year', Action.created_at).label('year'),
            func.count(Action.id).label('count'),
            func.sum(Action.budget).label('total_budget')
        ).group_by(
            extract('year', Action.created_at),
            extract('month', Action.created_at)
        ).order_by(
            extract('year', Action.created_at).desc(),
            extract('month', Action.created_at).desc()
        ).limit(6).all()
        
        return jsonify({
            'total_actions': total_actions,
            'pending_actions': pending_actions,
            'in_progress_actions': in_progress_actions,
            'completed_actions': completed_actions,
            'cancelled_actions': cancelled_actions,
            'service_stats': [
                {
                    'service_type': stat.service_type,
                    'count': stat.count
                } for stat in service_stats
            ],
            'monthly_stats': [
                {
                    'month': int(stat.month),
                    'year': int(stat.year),
                    'count': stat.count,
                    'total_budget': float(stat.total_budget) if stat.total_budget else 0
                } for stat in monthly_stats
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@actions_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Obter dados para o dashboard"""
    try:
        # Estatísticas gerais
        total_actions = Action.query.count()
        active_actions = Action.query.filter(Action.status.in_(['pending', 'in_progress'])).count()
        completed_actions = Action.query.filter_by(status='completed').count()
        
        # Receita total
        from sqlalchemy import func
        total_revenue = db.session.query(func.sum(Action.budget)).filter_by(status='completed').scalar() or 0
        
        # Ações recentes
        recent_actions = Action.query.order_by(Action.created_at.desc()).limit(5).all()
        
        return jsonify({
            'total_actions': total_actions,
            'active_actions': active_actions,
            'completed_actions': completed_actions,
            'total_revenue': float(total_revenue),
            'recent_actions': [action.to_dict() for action in recent_actions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

