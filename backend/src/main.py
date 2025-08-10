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

    # Imports tardios para evitar ciclos durante o import da factory
    from src.services.firebase_service import init_firebase
    from src.routes.auth import auth_bp
    from src.services.user_service import create_admin_user

    # Firebase + blueprints
    init_firebase()
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    @app.get("/healthcheck")
    def healthcheck():
        return jsonify({"status": "ok"}), 200

    # cria admin na subida
    with app.app_context():
        create_admin_user()

    return app


# expõe um objeto app global (funciona com "src.main:app")
app = create_app()

if __name__ == '__main__':
    # apenas para rodar local
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
