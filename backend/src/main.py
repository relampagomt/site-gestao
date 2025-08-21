# backend/src/main.py
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

# ------------------------------------------------------------------
# Ajuste de path para permitir "from src...." mesmo rodando via gunicorn
# ------------------------------------------------------------------
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BACKEND_DIR, "src")
for p in (BACKEND_DIR, SRC_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from flask import Flask, jsonify, redirect, request, make_response
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import RequestEntityTooLarge


def create_app():
    app = Flask(__name__)

    # ------------------------------------------------------------------
    # Configs básicas
    # ------------------------------------------------------------------
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "asdf#FGSgvasgf$5$WGT")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-string-change-in-production")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False  # sem expiração
    app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_CONTENT_LENGTH", 25 * 1024 * 1024))
    app.config["JSON_SORT_KEYS"] = False
    app.config["PROPAGATE_EXCEPTIONS"] = True

    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    log = logging.getLogger(__name__)

    # ------------------------------------------------------------------
    # CORS (liberado para seus domínios + localhost)
    # ------------------------------------------------------------------
    allowed_origins = [
        "https://www.panfletagemrelampago.com.br",
        "https://panfletagemrelampago.com.br",
        "https://site-gestao.onrender.com",
        "https://site-gestao-mu.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
        "*",  # mantenha se quiser aceitar qualquer origem; remova para endurecer
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

    # ------------------------------------------------------------------
    # Preflight genérico (garante 204 para qualquer OPTIONS em /api/*)
    # ------------------------------------------------------------------
    @app.route("/api/<path:_any>", methods=["OPTIONS"])
    def _preflight_any(_any):
        resp = make_response("", 204)
        return resp

    # ------------------------------------------------------------------
    # Blueprints (registro de rotas)
    # ------------------------------------------------------------------
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

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(material_bp, url_prefix="/api")
    app.register_blueprint(action_bp, url_prefix="/api")
    app.register_blueprint(job_vacancy_bp, url_prefix="/api")
    app.register_blueprint(metrics_bp, url_prefix="/api/metrics")
    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(finance_bp, url_prefix="/api")  # /api/contas-* e /api/transactions

    # ------------------------------------------------------------------
    # Healthchecks
    # ------------------------------------------------------------------
    @app.get("/healthcheck")
    def health_root():
        return jsonify({"status": "ok"}), 200

    @app.route("/api/healthcheck", methods=["GET", "HEAD"])
    def health_api():
        return jsonify({"status": "ok"}), 200

    # ------------------------------------------------------------------
    # Aliases de métricas (compat)
    # ------------------------------------------------------------------
    @app.route("/api/monthly-campaigns", methods=["GET", "POST", "HEAD", "OPTIONS"])
    def alias_monthly_campaigns():
        return redirect("/api/metrics/monthly-campaigns", code=307)

    @app.route("/api/service-distribution", methods=["GET", "HEAD", "OPTIONS"])
    def alias_service_distribution():
        return redirect("/api/metrics/service-distribution", code=307)

    # ------------------------------------------------------------------
    # Error handlers (CORS já é aplicado pelo flask-cors)
    # ------------------------------------------------------------------
    @app.errorhandler(404)
    def handle_404(e):
        return jsonify(error="not_found"), 404

    @app.errorhandler(RequestEntityTooLarge)
    def handle_413(e):
        return jsonify(error="file_too_large", max_bytes=app.config["MAX_CONTENT_LENGTH"]), 413

    @app.errorhandler(500)
    def handle_500(e):
        log.exception("Internal error on %s %s", request.method, request.path)
        return jsonify(error="internal_server_error"), 500

    # ------------------------------------------------------------------
    # Seed do admin
    # ------------------------------------------------------------------
    with app.app_context():
        try:
            ensure_admin_seed()
        except Exception as se:
            log.exception("ensure_admin_seed failed: %s", se)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
