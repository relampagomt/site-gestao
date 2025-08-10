import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

db = None

def init_firebase():
    """Inicializa o Firebase Admin SDK"""
    global db
    
    if not firebase_admin._apps:
        # Obter credenciais do Firebase das variáveis de ambiente
        firebase_credentials_json = os.environ.get('FIREBASE_CREDENTIALS_JSON')
        
        if firebase_credentials_json:
            # Parse do JSON das credenciais
            cred_dict = json.loads(firebase_credentials_json)
            cred = credentials.Certificate(cred_dict)
        else:
            # Fallback para arquivo de credenciais (desenvolvimento)
            cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            else:
                # Usar credenciais padrão do ambiente
                cred = credentials.ApplicationDefault()
        
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    return db

def get_firestore_client():
    """Retorna o cliente Firestore"""
    global db
    if db is None:
        db = init_firebase()
    return db

