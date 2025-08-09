from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from flask_mail import Message, Mail
from src.models.contact import Contact, db
from datetime import datetime

contacts_bp = Blueprint('contacts', __name__)

@contacts_bp.route('/', methods=['POST'])
def create_contact():
    """Criar um novo contato (público - formulário do site)"""
    try:
        data = request.get_json()
        
        if not data or not data.get('name') or not data.get('email') or not data.get('subject') or not data.get('message'):
            return jsonify({'error': 'Nome, email, assunto e mensagem são obrigatórios'}), 400
        
        # Capturar informações da requisição
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
        user_agent = request.headers.get('User-Agent')
        
        contact = Contact(
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            company=data.get('company'),
            subject=data.get('subject'),
            message=data.get('message'),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.session.add(contact)
        db.session.commit()
        
        # Enviar email de notificação (opcional)
        try:
            from flask import current_app
            mail = Mail(current_app)
            
            if current_app.config.get('MAIL_USERNAME'):
                msg = Message(
                    subject=f'Novo contato: {contact.subject}',
                    recipients=[current_app.config.get('MAIL_DEFAULT_SENDER', 'admin@relampago.com')],
                    body=f"""
Novo contato recebido:

Nome: {contact.name}
Email: {contact.email}
Telefone: {contact.phone or 'Não informado'}
Empresa: {contact.company or 'Não informado'}
Assunto: {contact.subject}

Mensagem:
{contact.message}

IP: {contact.ip_address}
Data: {contact.created_at}
                    """
                )
                mail.send(msg)
        except Exception as email_error:
            print(f"Erro ao enviar email: {email_error}")
        
        return jsonify({
            'message': 'Contato enviado com sucesso',
            'contact_id': contact.id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@contacts_bp.route('/', methods=['GET'])
@jwt_required()
def get_contacts():
    """Listar todos os contatos (admin)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        query = Contact.query
        
        # Aplicar filtros
        if search:
            query = query.filter(
                (Contact.name.contains(search)) |
                (Contact.email.contains(search)) |
                (Contact.subject.contains(search)) |
                (Contact.company.contains(search))
            )
        
        if status:
            query = query.filter(Contact.status == status)
        
        # Ordenar por data de criação (mais recentes primeiro)
        query = query.order_by(Contact.created_at.desc())
        
        # Paginação
        contacts = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'contacts': [contact.to_dict() for contact in contacts.items],
            'total': contacts.total,
            'pages': contacts.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@contacts_bp.route('/<int:contact_id>', methods=['GET'])
@jwt_required()
def get_contact(contact_id):
    """Obter um contato específico"""
    try:
        contact = Contact.query.get_or_404(contact_id)
        
        # Marcar como lido se ainda não foi
        if contact.status == 'new':
            contact.status = 'read'
            contact.updated_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({'contact': contact.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@contacts_bp.route('/<int:contact_id>', methods=['PUT'])
@jwt_required()
def update_contact_status(contact_id):
    """Atualizar status de um contato"""
    try:
        contact = Contact.query.get_or_404(contact_id)
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': 'Status é obrigatório'}), 400
        
        contact.status = data['status']
        contact.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Status do contato atualizado com sucesso',
            'contact': contact.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@contacts_bp.route('/<int:contact_id>', methods=['DELETE'])
@jwt_required()
def delete_contact(contact_id):
    """Deletar um contato"""
    try:
        contact = Contact.query.get_or_404(contact_id)
        
        db.session.delete(contact)
        db.session.commit()
        
        return jsonify({'message': 'Contato deletado com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@contacts_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_contacts_stats():
    """Obter estatísticas dos contatos"""
    try:
        total_contacts = Contact.query.count()
        new_contacts = Contact.query.filter_by(status='new').count()
        read_contacts = Contact.query.filter_by(status='read').count()
        replied_contacts = Contact.query.filter_by(status='replied').count()
        closed_contacts = Contact.query.filter_by(status='closed').count()
        
        # Contatos por mês (últimos 6 meses)
        from sqlalchemy import func, extract
        monthly_stats = db.session.query(
            extract('month', Contact.created_at).label('month'),
            extract('year', Contact.created_at).label('year'),
            func.count(Contact.id).label('count')
        ).group_by(
            extract('year', Contact.created_at),
            extract('month', Contact.created_at)
        ).order_by(
            extract('year', Contact.created_at).desc(),
            extract('month', Contact.created_at).desc()
        ).limit(6).all()
        
        return jsonify({
            'total_contacts': total_contacts,
            'new_contacts': new_contacts,
            'read_contacts': read_contacts,
            'replied_contacts': replied_contacts,
            'closed_contacts': closed_contacts,
            'monthly_stats': [
                {
                    'month': int(stat.month),
                    'year': int(stat.year),
                    'count': stat.count
                } for stat in monthly_stats
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

