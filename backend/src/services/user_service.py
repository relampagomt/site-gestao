# backend/src/services/user_service.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List

import bcrypt

# Import RELATIVO para evitar "Unresolved reference 'src'" no PyCharm
from .firestore_service import get_db

# Tenta usar SERVER_TIMESTAMP quando Firestore estiver disponível
try:
    from firebase_admin import firestore as _fs  # type: ignore
    _HAS_FS = True
except Exception:  # pacote ausente ou não inicializado
    _HAS_FS = False


# ---------------------------
# Helpers
# ---------------------------
def _server_ts():
    if _HAS_FS:
        try:
            return _fs.SERVER_TIMESTAMP
        except Exception:
            pass
    return datetime.now(timezone.utc)


def _doc_to_obj(doc) -> Dict[str, Any]:
    """Converte snapshot do Firestore em dict com 'id', ou retorna o próprio dict no memory_db."""
    if hasattr(doc, "to_dict") and hasattr(doc, "id"):
        data = doc.to_dict() or {}
        data["id"] = doc.id
        return data
    return dict(doc)


def _set_merge(doc_ref, data: dict):
    """set(..., merge=True) no Firestore; compat com memory_db."""
    try:
        doc_ref.set(data, merge=True)
    except TypeError:
        doc_ref.set(data)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def _users_ref():
    db = get_db()
    return db.collection("users")


# ---------------------------
# CRUD / Auth
# ---------------------------
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    snaps = _users_ref().where("username", "==", username).limit(1).get()
    if snaps:
        return _doc_to_obj(snaps[0])
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    snap = _users_ref().document(user_id).get()
    if getattr(snap, "exists", True):
        return _doc_to_obj(snap)
    return None


def list_users() -> List[Dict[str, Any]]:
    snaps = _users_ref().get()
    return [_doc_to_obj(s) for s in snaps] if snaps else []


def create_user(
    username: str,
    email: str,
    password: str,
    role: str = "supervisor",
    name: Optional[str] = None,
    active: bool = True,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Cria usuário garantindo unicidade de username."""
    if get_user_by_username(username):
        return None, "Usuário já existe"

    user_data = {
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "name": name or username,
        "active": active,
        "created_at": _server_ts(),
        "updated_at": _server_ts(),
    }

    # Compatível com Firestore e memory_db
    ref = _users_ref().document()
    ref.set(user_data)
    user_data["id"] = ref.id
    return user_data, None


def update_user(user_id: str, fields: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Atualiza campos; re-hash se vier 'password'; bloqueia username duplicado."""
    if "password" in fields and fields["password"]:
        fields["password_hash"] = hash_password(fields.pop("password"))

    if "username" in fields:
        new_u = fields["username"]
        existing = get_user_by_username(new_u)
        if existing and existing.get("id") != user_id:
            return None, "Username já em uso"

    fields["updated_at"] = _server_ts()

    ref = _users_ref().document(user_id)
    _set_merge(ref, fields)

    snap = ref.get()
    if getattr(snap, "exists", True):
        return _doc_to_obj(snap), None
    return None, "Usuário não encontrado"


def set_user_active(user_id: str, active: bool) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    return update_user(user_id, {"active": active})


def delete_user(user_id: str) -> Tuple[bool, Optional[str]]:
    ref = _users_ref().document(user_id)
    try:
        ref.delete()
        return True, None
    except Exception as e:
        return False, str(e)


def authenticate_user(username: str, password: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Autentica por username + password."""
    user = get_user_by_username(username)
    if not user:
        return None, "Usuário não encontrado"
    if not user.get("active", True):
        return None, "Usuário inativo"
    if not verify_password(password, user.get("password_hash", "")):
        return None, "Senha inválida"
    return user, None


# ---------------------------
# Seed opcional (admin padrão)
# ---------------------------
def ensure_admin_seed() -> None:
    """
    Cria um admin padrão se não existir.
    Usa envs:
      ADMIN_USERNAME=admin
      ADMIN_PASSWORD=admin123
      ADMIN_EMAIL=admin@relampago.com
      ADMIN_NAME=Administrador
    """
    import os

    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    email = os.getenv("ADMIN_EMAIL", "admin@relampago.com")
    name = os.getenv("ADMIN_NAME", "Administrador")

    if get_user_by_username(username):
        print("Usuário admin já existe")
        return

    user, err = create_user(
        username=username,
        email=email,
        password=password,
        role="admin",
        name=name,
        active=True,
    )
    if err:
        print("Falha ao criar admin:", err)
    else:
        print("Usuário admin criado:", user.get("username"))
