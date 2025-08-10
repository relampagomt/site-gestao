import os
import bcrypt
from src.services.firebase_service import get_firestore_client

def hash_password(password):
    """Gera hash da senha usando bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    """Verifica se a senha corresponde ao hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user(username, email, password, role='supervisor', name=None):
    """Cria um novo usuário no Firestore"""
    db = get_firestore_client()
    
    # Verificar se o usuário já existe
    users_ref = db.collection('users')
    existing_user = users_ref.where('username', '==', username).limit(1).get()
    
    if existing_user:
        return None, "Usuário já existe"
    
    # Criar novo usuário
    user_data = {
        'username': username,
        'email': email,
        'password_hash': hash_password(password),
        'role': role,
        'name': name or username,
        'active': True
    }
    
    doc_ref = users_ref.add(user_data)
    user_data['id'] = doc_ref[1].id
    
    return user_data, None

def get_user_by_username(username):
    """Busca usuário por username"""
    db = get_firestore_client()
    users_ref = db.collection('users')
    
    users = users_ref.where('username', '==', username).limit(1).get()
    
    if not users:
        return None
    
    user_doc = users[0]
    user_data = user_doc.to_dict()
    user_data['id'] = user_doc.id
    
    return user_data

def get_user_by_id(user_id):
    """Busca usuário por ID"""
    db = get_firestore_client()
    user_doc = db.collection('users').document(user_id).get()
    
    if not user_doc.exists:
        return None
    
    user_data = user_doc.to_dict()
    user_data['id'] = user_doc.id
    
    return user_data

def authenticate_user(username, password):
    """Autentica usuário"""
    user = get_user_by_username(username)
    
    if not user or not user.get('active', True):
        return None
    
    if verify_password(password, user['password_hash']):
        # Remover hash da senha do retorno
        user_safe = {k: v for k, v in user.items() if k != 'password_hash'}
        return user_safe
    
    return None

def create_admin_user():
    """Cria usuário admin automaticamente se não existir"""
    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@relampago.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    admin_name = os.environ.get('ADMIN_NAME', 'Administrador')
    
    # Verificar se admin já existe
    existing_admin = get_user_by_username(admin_username)
    
    if not existing_admin:
        user, error = create_user(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            role='admin',
            name=admin_name
        )
        
        if user:
            print(f"Usuário admin criado: {admin_username}")
        else:
            print(f"Erro ao criar admin: {error}")
    else:
        print("Usuário admin já existe")

