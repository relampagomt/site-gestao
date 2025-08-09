from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.user import User
from src.models.client import Client
from src.models import db
from src.decorators import supervisor_or_admin_required, admin_required
from datetime import datetime

clients_bp = Blueprint('clients', __name__)

@clients_bp.route('/', methods=['GET'])
@jwt_required()
@supervisor_or_admin_required
def get_clients():
    """Listar todos os clientes com paginação e filtros"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get('role')
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        query = Client.query
        
        # Filtrar por usuário se for supervisor
        if user_role == 'supervisor':
            query = query.filter(Client.user_id == current_user_id)
        
        # Aplicar filtros
        if search:
            query = query.filter(
                (Client.name.contains(search)) |
                (Client.email.contains(search)) |
                (Client.company.contains(search))
            )
        
        if status:
            query = query.filter(Client.status == status)
        
        # Ordenar por data de criação (mais recentes primeiro)
        query = query.order_by(Client.created_at.desc())
        
        # Paginação
        clients = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'clients': [client.to_dict() for client in clients.items],
            'total': clients.total,
            'pages': clients.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clients_bp.route('/<int:client_id>', methods=['GET'])
@jwt_required()
def get_client(client_id):
    """Obter um cliente específico"""
    try:
        client = Client.query.get_or_404(client_id)
        return jsonify({'client': client.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clients_bp.route('/', methods=['POST'])
@jwt_required()
@supervisor_or_admin_required
def create_client():
    """Criar um novo cliente"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('name') or not data.get('email'):
            return jsonify({'error': 'Nome e email são obrigatórios'}), 400
        
        # Verificar se email já existe
        if Client.query.filter_by(email=data.get('email')).first():
            return jsonify({'error': 'Email já cadastrado'}), 400
        
        client = Client(
            name=data.get('name'),
            email=data.get('email'),
            phone=data.get('phone'),
            company=data.get('company'),
            address=data.get('address'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code'),
            status=data.get('status', 'active'),
            notes=data.get('notes'),
            # Campos do Gestão
            segmento=data.get('segmento'),
            cpf_cnpj=data.get('cpf_cnpj'),
            # Associar ao usuário atual
            user_id=current_user_id
        )
        
        db.session.add(client)
        db.session.commit()
        
        return jsonify({
            'message': 'Cliente criado com sucesso',
            'client': client.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clients_bp.route('/<int:client_id>', methods=['PUT'])
@jwt_required()
def update_client(client_id):
    """Atualizar um cliente"""
    try:
        client = Client.query.get_or_404(client_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        # Verificar se email já existe (exceto para o próprio cliente)
        if data.get('email') and data.get('email') != client.email:
            if Client.query.filter_by(email=data.get('email')).first():
                return jsonify({'error': 'Email já cadastrado'}), 400
        
        # Atualizar campos
        if 'name' in data:
            client.name = data['name']
        if 'email' in data:
            client.email = data['email']
        if 'phone' in data:
            client.phone = data['phone']
        if 'company' in data:
            client.company = data['company']
        if 'address' in data:
            client.address = data['address']
        if 'city' in data:
            client.city = data['city']
        if 'state' in data:
            client.state = data['state']
        if 'zip_code' in data:
            client.zip_code = data['zip_code']
        if 'status' in data:
            client.status = data['status']
        if 'notes' in data:
            client.notes = data['notes']
        # Campos do Gestão
        if 'segmento' in data:
            client.segmento = data['segmento']
        if 'cpf_cnpj' in data:
            client.cpf_cnpj = data['cpf_cnpj']
        
        client.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Cliente atualizado com sucesso',
            'client': client.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clients_bp.route('/<int:client_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_client(client_id):
    """Deletar um cliente"""
    try:
        client = Client.query.get_or_404(client_id)
        
        # Verificar se cliente tem ações associadas
        if client.actions:
            return jsonify({'error': 'Não é possível deletar cliente com ações associadas'}), 400
        
        db.session.delete(client)
        db.session.commit()
        
        return jsonify({'message': 'Cliente deletado com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clients_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_clients_stats():
    """Obter estatísticas dos clientes"""
    try:
        total_clients = Client.query.count()
        active_clients = Client.query.filter_by(status='active').count()
        inactive_clients = Client.query.filter_by(status='inactive').count()
        
        # Clientes por mês (últimos 6 meses)
        from sqlalchemy import func, extract
        monthly_stats = db.session.query(
            extract('month', Client.created_at).label('month'),
            extract('year', Client.created_at).label('year'),
            func.count(Client.id).label('count')
        ).group_by(
            extract('year', Client.created_at),
            extract('month', Client.created_at)
        ).order_by(
            extract('year', Client.created_at).desc(),
            extract('month', Client.created_at).desc()
        ).limit(6).all()
        
        return jsonify({
            'total_clients': total_clients,
            'active_clients': active_clients,
            'inactive_clients': inactive_clients,
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



@clients_bp.route('/import', methods=['POST'])
@jwt_required()
def import_clients():
    """Importar clientes via CSV/XLSX"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not file.filename.lower().endswith(('.csv', '.xlsx')):
            return jsonify({'error': 'Formato de arquivo não suportado. Use CSV ou XLSX'}), 400
        
        import pandas as pd
        from io import StringIO
        
        try:
            if file.filename.lower().endswith('.csv'):
                # Ler CSV
                stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
                df = pd.read_csv(stream)
            else:
                # Ler XLSX
                df = pd.read_excel(file)
            
            # Mapear colunas esperadas
            expected_columns = ['name', 'email', 'phone', 'company', 'segmento', 'cpf_cnpj']
            
            # Verificar se as colunas necessárias existem
            missing_columns = [col for col in ['name', 'email'] if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Colunas obrigatórias ausentes: {missing_columns}'}), 400
            
            imported_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Verificar se email já existe
                    if Client.query.filter_by(email=row['email']).first():
                        errors.append(f'Linha {index + 1}: Email {row["email"]} já existe')
                        continue
                    
                    client = Client(
                        name=row.get('name', ''),
                        email=row.get('email', ''),
                        phone=row.get('phone', ''),
                        company=row.get('company', ''),
                        segmento=row.get('segmento', ''),
                        cpf_cnpj=row.get('cpf_cnpj', ''),
                        status='active'
                    )
                    
                    db.session.add(client)
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f'Linha {index + 1}: {str(e)}')
                    continue
            
            db.session.commit()
            
            return jsonify({
                'message': f'{imported_count} clientes importados com sucesso',
                'imported_count': imported_count,
                'errors': errors
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'Erro ao processar arquivo: {str(e)}'}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clients_bp.route('/download-template', methods=['GET'])
@jwt_required()
def download_template():
    """Download do modelo CSV para importação"""
    try:
        from flask import Response
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Cabeçalho
        writer.writerow(['name', 'email', 'phone', 'company', 'segmento', 'cpf_cnpj'])
        
        # Exemplos
        writer.writerow(['João Silva', 'joao@empresa.com', '11999999999', 'Empresa A', 'Tecnologia', '123.456.789-00'])
        writer.writerow(['Maria Souza', 'maria@empresa.com', '21988888888', 'Empresa B', 'Educação', '987.654.321-00'])
        
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=modelo_clientes.csv"}
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

