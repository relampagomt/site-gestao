from src.models import db
from datetime import datetime

class Action(db.Model):
    __tablename__ = 'actions'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    service_type = db.Column(db.String(50), nullable=False)  # residencial, sinaleiros, eventos, promocional
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, cancelled
    budget = db.Column(db.Numeric(10, 2), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    target_audience = db.Column(db.String(200), nullable=True)
    materials_quantity = db.Column(db.Integer, nullable=True)
    team_size = db.Column(db.Integer, nullable=True)
    gps_tracking = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Campos adicionais do projeto Gestão
    nome_cliente = db.Column(db.String(100), nullable=True)  # Para compatibilidade
    empresa = db.Column(db.String(100), nullable=True)
    tipo_acao = db.Column(db.String(50), nullable=True)
    quantidade_material = db.Column(db.String(20), nullable=True)
    hora_inicio = db.Column(db.String(10), nullable=True)
    hora_termino = db.Column(db.String(10), nullable=True)
    locais = db.Column(db.String(200), nullable=True)
    quantidade_pessoas = db.Column(db.String(10), nullable=True)
    responsavel = db.Column(db.String(100), nullable=True)
    material_acao = db.Column(db.String(200), nullable=True)
    foto_equipe = db.Column(db.String(200), nullable=True)
    
    # Relacionamento com usuário (supervisor)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    user = db.relationship('User', backref='actions')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com relatórios
    reports = db.relationship('ActionReport', backref='action', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'service_type': self.service_type,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'budget': float(self.budget) if self.budget else None,
            'location': self.location,
            'target_audience': self.target_audience,
            'materials_quantity': self.materials_quantity,
            'team_size': self.team_size,
            'gps_tracking': self.gps_tracking,
            'notes': self.notes,
            # Campos do Gestão
            'nome_cliente': self.nome_cliente,
            'empresa': self.empresa,
            'tipo_acao': self.tipo_acao,
            'quantidade_material': self.quantidade_material,
            'hora_inicio': self.hora_inicio,
            'hora_termino': self.hora_termino,
            'locais': self.locais,
            'quantidade_pessoas': self.quantidade_pessoas,
            'responsavel': self.responsavel,
            'material_acao': self.material_acao,
            'foto_equipe': self.foto_equipe,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Action {self.title}>'

