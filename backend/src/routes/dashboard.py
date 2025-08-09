from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from src.models.client import Client
from src.models.action import Action
from src.models.vacancy import Vacancy
from src.models.contact import Contact
from src.models.user import User, db
from sqlalchemy import func, extract
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Obter dados completos para o dashboard"""
    try:
        # Estatísticas principais
        total_clients = Client.query.count()
        active_actions = Action.query.filter(Action.status.in_(['pending', 'in_progress'])).count()
        total_revenue = db.session.query(func.sum(Action.budget)).filter_by(status='completed').scalar() or 0
        completed_campaigns = Action.query.filter_by(status='completed').count()
        
        # Dados para gráfico de receita mensal (últimos 6 meses)
        monthly_revenue = db.session.query(
            extract('month', Action.created_at).label('month'),
            extract('year', Action.created_at).label('year'),
            func.sum(Action.budget).label('receita')
        ).filter(
            Action.status == 'completed'
        ).group_by(
            extract('year', Action.created_at),
            extract('month', Action.created_at)
        ).order_by(
            extract('year', Action.created_at).desc(),
            extract('month', Action.created_at).desc()
        ).limit(6).all()
        
        # Dados para gráfico de campanhas por mês
        monthly_campaigns = db.session.query(
            extract('month', Action.created_at).label('month'),
            extract('year', Action.created_at).label('year'),
            func.count(Action.id).label('campanhas')
        ).group_by(
            extract('year', Action.created_at),
            extract('month', Action.created_at)
        ).order_by(
            extract('year', Action.created_at).desc(),
            extract('month', Action.created_at).desc()
        ).limit(6).all()
        
        # Distribuição de serviços
        service_distribution = db.session.query(
            Action.service_type,
            func.count(Action.id).label('count')
        ).group_by(Action.service_type).all()
        
        # Atividades recentes
        recent_activities = []
        
        # Últimas ações criadas
        recent_actions = Action.query.order_by(Action.created_at.desc()).limit(3).all()
        for action in recent_actions:
            recent_activities.append({
                'id': len(recent_activities) + 1,
                'action': 'Nova campanha criada',
                'client': action.client.name if action.client else 'Cliente não encontrado',
                'time': _time_ago(action.created_at)
            })
        
        # Últimos contatos
        recent_contacts = Contact.query.order_by(Contact.created_at.desc()).limit(2).all()
        for contact in recent_contacts:
            recent_activities.append({
                'id': len(recent_activities) + 1,
                'action': 'Novo contato recebido',
                'client': contact.name,
                'time': _time_ago(contact.created_at)
            })
        
        # Últimos clientes
        recent_clients = Client.query.order_by(Client.created_at.desc()).limit(2).all()
        for client in recent_clients:
            recent_activities.append({
                'id': len(recent_activities) + 1,
                'action': 'Cliente cadastrado',
                'client': client.name,
                'time': _time_ago(client.created_at)
            })
        
        # Ordenar atividades por tempo
        recent_activities.sort(key=lambda x: x['time'])
        recent_activities = recent_activities[:4]  # Limitar a 4 atividades
        
        # Formatar dados dos gráficos
        months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        
        monthly_data = []
        for i in range(6):
            month_data = {'month': '', 'campanhas': 0, 'receita': 0}
            
            # Buscar dados de receita
            for revenue in monthly_revenue:
                if len(monthly_data) <= i:
                    month_data['month'] = months[int(revenue.month) - 1]
                    month_data['receita'] = float(revenue.receita) if revenue.receita else 0
                    break
            
            # Buscar dados de campanhas
            for campaign in monthly_campaigns:
                if month_data['month'] == months[int(campaign.month) - 1]:
                    month_data['campanhas'] = campaign.campanhas
                    break
            
            if month_data['month']:
                monthly_data.append(month_data)
        
        # Se não há dados suficientes, preencher com dados padrão
        if len(monthly_data) < 6:
            default_months = ['Jun', 'Mai', 'Abr', 'Mar', 'Fev', 'Jan']
            for i in range(len(monthly_data), 6):
                monthly_data.append({
                    'month': default_months[i],
                    'campanhas': 0,
                    'receita': 0
                })
        
        # Dados para gráfico de pizza
        service_colors = {
            'residencial': '#dc2626',
            'sinaleiros': '#ea580c',
            'eventos': '#ca8a04',
            'promocional': '#16a34a'
        }
        
        service_data = []
        total_services = sum([s.count for s in service_distribution])
        
        for service in service_distribution:
            percentage = (service.count / total_services * 100) if total_services > 0 else 0
            service_data.append({
                'name': _get_service_name(service.service_type),
                'value': percentage,
                'color': service_colors.get(service.service_type, '#6b7280')
            })
        
        return jsonify({
            'stats': {
                'totalClients': total_clients,
                'activeActions': active_actions,
                'monthlyRevenue': float(total_revenue),
                'completedCampaigns': completed_campaigns
            },
            'monthlyData': monthly_data,
            'serviceData': service_data,
            'recentActivities': recent_activities
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _time_ago(dt):
    """Calcular tempo decorrido desde uma data"""
    if not dt:
        return 'Data não disponível'
    
    now = datetime.utcnow()
    diff = now - dt
    
    if diff.days > 0:
        return f'{diff.days} dia{"s" if diff.days > 1 else ""} atrás'
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f'{hours} hora{"s" if hours > 1 else ""} atrás'
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f'{minutes} minuto{"s" if minutes > 1 else ""} atrás'
    else:
        return 'Agora mesmo'

def _get_service_name(service_type):
    """Converter tipo de serviço para nome amigável"""
    names = {
        'residencial': 'Panfletagem Residencial',
        'sinaleiros': 'Sinaleiros/Pedestres',
        'eventos': 'Eventos Estratégicos',
        'promocional': 'Ações Promocionais'
    }
    return names.get(service_type, service_type.title())

