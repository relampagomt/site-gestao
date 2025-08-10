import os
import sys
from dotenv import load_dotenv

load_dotenv()

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from src.routes.auth import auth_bp
from src.services.firebase_service import init_firebase
from src.services.user_service import create_admin_user

app = Flask(__name__)

# Configurações
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Token não expira

# Inicializar extensões
CORS(app, origins="*")  # Permitir todas as origens
jwt = JWTManager(app)

# Inicializar Firebase
init_firebase()

# Registrar blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')

@app.route("/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify({"status": "ok"}), 200

# Criar usuário admin automaticamente na inicialização
with app.app_context():
    create_admin_user()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)

