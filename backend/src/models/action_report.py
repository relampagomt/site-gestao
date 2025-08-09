from src.models import db
from datetime import datetime

class ActionReport(db.Model):
    __tablename__ = 'action_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    action_id = db.Column(db.Integer, db.ForeignKey('actions.id'), nullable=False)
    report_date = db.Column(db.Date, nullable=False)
    materials_distributed = db.Column(db.Integer, nullable=True)
    areas_covered = db.Column(db.Text, nullable=True)
    team_members = db.Column(db.Text, nullable=True)
    gps_coordinates = db.Column(db.Text, nullable=True)
    photos = db.Column(db.Text, nullable=True)  # JSON string with photo URLs
    observations = db.Column(db.Text, nullable=True)
    weather_conditions = db.Column(db.String(100), nullable=True)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'action_id': self.action_id,
            'report_date': self.report_date.isoformat() if self.report_date else None,
            'materials_distributed': self.materials_distributed,
            'areas_covered': self.areas_covered,
            'team_members': self.team_members,
            'gps_coordinates': self.gps_coordinates,
            'photos': self.photos,
            'observations': self.observations,
            'weather_conditions': self.weather_conditions,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<ActionReport {self.id} for Action {self.action_id}>'

