# backend/src/main.py
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

# -----------------------
# Import path (garante "src" importável)
# -----------------------
backend_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(backend_dir, "src")
for p in (backend_dir, src_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

from flask import Flask, jsonify, redirect
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import RequestEntityTooLarge

def create_app():
    app = Flask(__name__)

    # -----------------------
    # Configs
    # -----------------------
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "asdf#FGSgvasgf$5$WGT")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-string-change-in-production")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False  # token sem expirar
    app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_CONTENT_LENGTH", 25 * 1024 * 1024))
    app.config["JSON_SORT_KEYS"] = False
    app.config["PROPAGATE_EXCEPTIONS"] = True

    # Logging
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # -----------------------
    # CORS
    # -----------------------
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://www.panfletagemrelampago.com.br",
    ]
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=False,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=86400,
    )
    JWTManager(app)

    # -----------------------
    # Imports tardios
    # -----------------------
    from src.routes.auth import auth_bp
    from src.routes.client import client_bp
    from src.routes.material import material_bp
    from src.routes.action import action_bp
    from src.routes.job_vacancy import job_vacancy_bp
    from src.routes.metrics import metrics_bp
    from src.routes.upload import upload_bp
    from src.routes.user import user_bp
    from src.routes.finance import finance_bp
    from src.services.user_service import ensure_admin_seed

    # >>> ADIÇÕES: novos módulos (Frota e Comercial)
    from src.routes.fleet import fleet_bp
    from src.routes.commercial import commercial_bp

    # -----------------------
    # Registrando blueprints
    # -----------------------
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(material_bp, url_prefix="/api")
    app.register_blueprint(action_bp, url_prefix="/api")
    app.register_blueprint(job_vacancy_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api/metrics")
    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(finance_bp, url_prefix="/api")  # /api/transactions

    # >>> ADIÇÕES: registros dos novos blueprints
    app.register_blueprint(fleet_bp, url_prefix="/api")       # /api/fleet/...
    app.register_blueprint(commercial_bp, url_prefix="/api")  # /api/commercial/...

    # -----------------------
    # Healthcheck
    # -----------------------
    @app.get("/healthcheck")
    def healthcheck_root():
        return jsonify({"status": "ok"}), 200

    @app.route("/api/healthcheck", methods=["GET", "HEAD", "OPTIONS"])
    def healthcheck_api():
        return jsonify({"status": "ok"}), 200

    # --- Alias para corrigir chamadas /api/api/* vindas do front (redireciona mantendo método) ---
    @app.route("/api/api/<path:rest>", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    def alias_double_api(rest):
        return redirect(f"/api/{rest}", code=307)

    # >>> aliases para compatibilizar chamadas do front <<<
    # mantém método com 307 (POST continua POST, GET continua GET)
    @app.route("/api/monthly-campaigns", methods=["GET", "POST", "OPTIONS", "HEAD"])
    def alias_monthly_campaigns():
        return redirect("/api/metrics/monthly-campaigns", code=307)

    @app.route("/api/service-distribution", methods=["GET", "OPTIONS", "HEAD"])
    def alias_service_distribution():
        return redirect("/api/metrics/service-distribution", code=307)

    # -----------------------
    # Preflight genérico para /api/*
    # -----------------------
    @app.route("/api/<path:any_path>", methods=["OPTIONS"])
    def api_preflight(any_path):
        return ("", 204)

    # -----------------------
    # Handlers de erro
    # -----------------------
    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(e):
        return jsonify(error="file_too_large", max_bytes=app.config["MAX_CONTENT_LENGTH"]), 413

    @app.errorhandler(500)
    def handle_500(e):
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

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
