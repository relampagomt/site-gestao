import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Garante que a pasta "src" (dentro de backend) seja importável.
# Adiciona o próprio diretório "backend" ao sys.path.
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager


def create_app():
    app = Flask(__name__)

    # Configs
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # token sem expirar

    # Extensões
    # Se precisar enviar cookies, troque para supports_credentials=True.
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)

    # Imports tardios para evitar ciclos
    from src.routes.auth import auth_bp
    from src.routes.client import client_bp
    from src.routes.material import material_bp
    from src.routes.action import action_bp
    from src.routes.job_vacancy import job_vacancy_bp
    from src.routes.metrics import metrics_bp
    from src.routes.upload import upload_bp  # rota de upload
    from src.services.user_service import ensure_admin_seed

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(material_bp, url_prefix="/api")
    app.register_blueprint(action_bp, url_prefix="/api")
    app.register_blueprint(job_vacancy_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api/metrics")
    app.register_blueprint(upload_bp, url_prefix="/api")  # POST /api/upload

    @app.get("/healthcheck")
    def healthcheck():
        return jsonify({"status": "ok"}), 200

    # cria admin na subida (se não existir)
    with app.app_context():
        ensure_admin_seed()

    return app


# expõe um objeto app global (funciona com "backend.main:app")
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
