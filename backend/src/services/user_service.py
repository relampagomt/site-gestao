# backend/src/services/user_service.py
from __future__ import annotations

import bcrypt
from typing import Optional, Dict, Any

from .firestore_service import (
    get_db,
    get_document,
    get_all_documents,
    add_document,
    update_document,
)

# ---------------------------
# Helpers
# ---------------------------

def _doc_to_obj(doc) -> Dict[str, Any]:
    """
    Converte um DocumentSnapshot (Firestore) para dict com 'id'.
    No memory_db, já é dict.
    """
    if hasattr(doc, "to_dict") and hasattr(doc, "id"):
        data = doc.to_dict() or {}
        data["id"] = doc.id
        return data
    return dict(doc)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False

# ---------------------------
# CRUD básico de usuário
# ---------------------------

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtém usuário pelo ID do documento (compatível com Firestore e memory_db).
    """
    return get_document("users", user_id)

def find_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """
    Busca usuário por username.
    Tenta query Firestore; se indisponível (memory_db), faz filtro em Python.
    IMPORTANTE: tudo dentro do try para não chamar db.collection() fora do Firestore.
    """
    try:
        db = get_db()
        col = db.collection("users")
        results = col.where("username", "==", username).limit(1).get()
        for snap in results:
            return _doc_to_obj(snap)
        return None
    except Exception:
        # Fallback (memory_db): varre todos e filtra
        for u in get_all_documents("users"):
            if u.get("username") == username:
                return u
        return None

def create_user(username: str, password: str, role: str = "supervisor", name: str = "") -> Dict[str, Any]:
    """
    Cria usuário novo. Garante unicidade por username.
    Retorna o objeto salvo (sem expor o hash).
    """
    existing = find_user_by_username(username)
    if existing:
        raise ValueError("Username já existe")

    data = {
        "username": username,
        "password_hash": hash_password(password),
        "role": role,
        "name": name or username,
        "active": True,
    }
    user_id, _ = add_document("users", data)
    created = get_user_by_id(user_id) or {}
    created.pop("password_hash", None)
    return created

def update_user(user_id: str, payload: Dict[str, Any]) -> bool:
    """
    Atualiza campos do usuário. Se vier 'password', converte para 'password_hash'.
    """
    data = dict(payload)
    if data.get("password"):
        data["password_hash"] = hash_password(data.pop("password"))
    # Nunca escreva o campo em claro
    data.pop("password", None)
    return update_document("users", user_id, data)

# ---------------------------
# Autenticação
# ---------------------------

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Retorna o usuário (sem password_hash) se credenciais forem válidas; senão, None.
    """
    user = find_user_by_username(username)
    if not user:
        return None

    password_hash = user.get("password_hash", "")
    if not password_hash or not verify_password(password, password_hash):
        return None

    user = dict(user)
    user.pop("password_hash", None)
    return user

# ---------------------------
# Seed opcional (admin)
# ---------------------------

def ensure_admin_seed():
    """
    Garante que exista um usuário admin padrão (apenas se ainda não existir).
    username: 'admin' | senha: 'admin' (trocar em produção!)
    """
    admin = find_user_by_username("admin")
    if admin:
        print("Usuário admin já existe")
        return

    create_user(username="admin", password="admin", role="admin", name="Administrador")
    print("Usuário admin criado: admin")

# --- Compat: main.py importa create_admin_user ---
def create_admin_user():
    """Wrapper de compatibilidade: cria o admin padrão se não existir."""
    ensure_admin_seed()

__all__ = [
    "get_user_by_id",
    "find_user_by_username",
    "create_user",
    "update_user",
    "authenticate_user",
    "ensure_admin_seed",
    "create_admin_user",   # importante pro main.py
    "verify_password",
]


def get_all_users() -> list[Dict[str, Any]]:
    """
    Retorna todos os usuários cadastrados (sem password_hash).
    """
    users = get_all_documents("users")
    for user in users:
        user.pop("password_hash", None)
    return users

def delete_user(user_id: str) -> bool:
    """
    Deleta um usuário pelo ID.
    """
    return delete_document("users", user_id)



