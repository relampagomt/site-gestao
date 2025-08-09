from src.models import db
from datetime import datetime

class VacancyApplication(db.Model):
    __tablename__ = 'vacancy_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    vacancy_id = db.Column(db.Integer, db.ForeignKey('vacancies.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    resume_url = db.Column(db.String(500), nullable=True)
    cover_letter = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, reviewing, approved, rejected
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'vacancy_id': self.vacancy_id,
            'vacancy_title': self.vacancy.title if self.vacancy else None,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'resume_url': self.resume_url,
            'cover_letter': self.cover_letter,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<VacancyApplication {self.name} for {self.vacancy.title if self.vacancy else "Unknown"}>'

