import os
import sys
import logging
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
from werkzeug.exceptions import RequestEntityTooLarge

def create_app():
    app = Flask(__name__)

    # -----------------------
    # Configs
    # -----------------------
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # token sem expirar
    # Limite de upload (padrão 25 MB) — pode ajustar via env MAX_CONTENT_LENGTH
    app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024))
    app.config['JSON_SORT_KEYS'] = False

    # Logging básico (ajuste via LOG_LEVEL=INFO|DEBUG|WARNING|ERROR)
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    # -----------------------
    # Extensões
    # -----------------------
    # CORS completo para /api/* (inclui Authorization e preflight)
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=86400,
    )
    JWTManager(app)

    # -----------------------
    # Imports tardios (evita ciclos)
    # -----------------------
    from src.routes.auth import auth_bp
    from src.routes.client import client_bp
    from src.routes.material import material_bp
    from src.routes.action import action_bp
    from src.routes.job_vacancy import job_vacancy_bp
    from src.routes.metrics import metrics_bp
    from src.routes.upload import upload_bp  # rota de upload
    from src.routes.user import user_bp # rota de gerenciamento de usuários
    from src.services.user_service import ensure_admin_seed

    # -----------------------
    # Blueprints
    # -----------------------
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(material_bp, url_prefix="/api")
    app.register_blueprint(action_bp, url_prefix="/api")
    app.register_blueprint(job_vacancy_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api/metrics")
    app.register_blueprint(upload_bp, url_prefix="/api")  # POST /api/upload
    app.register_blueprint(user_bp, url_prefix="/api") # Rotas de usuário

    # -----------------------
    # Healthcheck
    # -----------------------
    @app.get("/healthcheck")
    def healthcheck():
        return jsonify({"status": "ok"}), 200

    # -----------------------
    # Error Handlers úteis
    # -----------------------
    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(e):
        return jsonify(error="file_too_large", max_bytes=app.config['MAX_CONTENT_LENGTH']), 413

    @app.errorhandler(500)
    def handle_500(e):
        # resposta JSON consistente (detalhes ficam no log do servidor)
        return jsonify(error="internal_server_error"), 500

    # -----------------------
    # Seed do admin (se não existir)
    # -----------------------
    with app.app_context():
        try:
            ensure_admin_seed()
        except Exception as se:
            logging.getLogger(__name__).exception("ensure_admin_seed failed: %s", se)

    return app


# expõe um objeto app global (funciona com "backend.main:app")
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
