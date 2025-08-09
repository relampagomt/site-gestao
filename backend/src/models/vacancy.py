from src.models import db
from datetime import datetime

class Vacancy(db.Model):
    __tablename__ = 'vacancies'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(100), nullable=True)
    salary_range = db.Column(db.String(100), nullable=True)
    employment_type = db.Column(db.String(50), nullable=True)  # full-time, part-time, contract
    status = db.Column(db.String(20), default='active')  # active, inactive, filled
    positions_available = db.Column(db.Integer, default=1)
    application_deadline = db.Column(db.Date, nullable=True)
    contact_email = db.Column(db.String(120), nullable=True)
    benefits = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com candidaturas
    applications = db.relationship('VacancyApplication', backref='vacancy', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'requirements': self.requirements,
            'location': self.location,
            'salary_range': self.salary_range,
            'employment_type': self.employment_type,
            'status': self.status,
            'positions_available': self.positions_available,
            'application_deadline': self.application_deadline.isoformat() if self.application_deadline else None,
            'contact_email': self.contact_email,
            'benefits': self.benefits,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Vacancy {self.title}>'

