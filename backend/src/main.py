import os
import sys
from dotenv import load_dotenv
from flask_migrate import Migrate

load_dotenv()

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail

from src.models import db
from src.models.user import User
from src.models.client import Client
from src.models.action import Action
from src.models.action_report import ActionReport
from src.models.vacancy import Vacancy
from src.models.vacancy_application import VacancyApplication
from src.models.contact import Contact
from src.models.material import Material

from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.clients import clients_bp
from src.routes.actions import actions_bp
from src.routes.vacancies import vacancies_bp
from src.routes.contacts import contacts_bp
from src.routes.dashboard import dashboard_bp
from src.routes.materials import materials_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Configurações
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Token não expira
app.config['JWT_CSRF_IN_COOKIES'] = False  # Desabilitar CSRF para simplificar

# Configuração do banco de dados
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL").replace("postgres://", "postgresql+psycopg2://")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True, "pool_recycle": 280}

# Configuração do email
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME", "")
app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD", "")
app.config["MAIL_DEFAULT_SENDER"] = os.environ.get("MAIL_DEFAULT_SENDER", "noreply@relampago.com")

# Inicializar extensões
CORS(app, origins=os.environ.get("FRONTEND_URL", "*").split(","))
jwt = JWTManager(app)
mail = Mail(app)
db.init_app(app)
migrate = Migrate(app, db)
# Registrar blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(clients_bp, url_prefix='/api/clients')
app.register_blueprint(actions_bp, url_prefix='/api/actions')
app.register_blueprint(vacancies_bp, url_prefix='/api/vacancies')
app.register_blueprint(contacts_bp, url_prefix='/api/contacts')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(materials_bp, url_prefix='/api/materials')


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


@app.route("/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify({"status": "ok"}), 200


