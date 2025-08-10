import os
import sys
from dotenv import load_dotenv

load_dotenv()

# garante que "src" (pasta) seja importável quando o Root Directory é "backend"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

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
    CORS(app, origins="*")
    JWTManager(app)

    # Imports tardios para evitar ciclos
    from src.routes.auth import auth_bp
    from src.routes.client import client_bp
    from src.routes.material import material_bp
    from src.routes.action import action_bp
    from src.routes.job_vacancy import job_vacancy_bp
    from src.routes.metrics import metrics_bp        # <— NOVO (gráfico real)
    from src.services.user_service import ensure_admin_seed  # <— corrige o import

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(material_bp, url_prefix="/api")
    app.register_blueprint(action_bp, url_prefix="/api")
    app.register_blueprint(job_vacancy_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api/metrics")  # <— NOVO

    @app.get("/healthcheck")
    def healthcheck():
        return jsonify({"status": "ok"}), 200

    # cria admin na subida (se não existir)
    with app.app_context():
        ensure_admin_seed()

    return app


# expõe um objeto app global (funciona com "src.main:app")
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
