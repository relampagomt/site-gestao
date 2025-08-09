from datetime import datetime
from src.models import db


class Material(db.Model):
    __tablename__ = 'materials'
    
    id = db.Column(db.Integer, primary_key=True)
    empresa = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Integer)
    data_inicio = db.Column(db.Date)
    data_termino = db.Column(db.Date)
    nome_campanha = db.Column(db.String(100))
    responsavel = db.Column(db.String(100))
    documento_url = db.Column(db.String(200))
    imagem_url = db.Column(db.String(200))
    # Relacionamento com usuário (supervisor)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    user = db.relationship('User', backref='materials')
    
    data_cadastro = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'empresa': self.empresa,
            'quantidade': self.quantidade,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_termino': self.data_termino.isoformat() if self.data_termino else None,
            'nome_campanha': self.nome_campanha,
            'responsavel': self.responsavel,
            'documento_url': self.documento_url,
            'imagem_url': self.imagem_url,
            'user_id': self.user_id,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None
        }

