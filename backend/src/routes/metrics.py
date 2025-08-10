# backend/src/routes/metrics.py
from collections import defaultdict
from flask import Blueprint, jsonify
from src.services.firestore_service import get_db

metrics_bp = Blueprint("metrics", __name__)

# Ajuste estes aliases conforme os valores reais que você grava no campo (service_type/type/category)
ALIASES = {
    "Panfletagem Residencial": {"residencial", "panfletagem", "panfletagem_residencial"},
    "Sinaleiros/Pedestres": {"sinaleiros", "pedestres", "sinaleiro"},
    "Eventos Estratégicos": {"eventos", "evento", "estrategicos", "eventos_estrategicos"},
    "Ações Promocionais": {"promocionais", "acao_promocional", "ações", "promocoes", "acoes_promocionais"},
}

DEFAULT_LABELS = [
    "Panfletagem Residencial",
    "Sinaleiros/Pedestres",
    "Eventos Estratégicos",
    "Ações Promocionais",
]

def _normalize(raw: str) -> str:
    if not raw:
        return "Outros"
    r = str(raw).strip().lower()
    for label, keys in ALIASES.items():
        if r in keys:
            return label
    return "Outros"

@metrics_bp.get("/services/distribution")
def services_distribution():
    """
    Retorna contagem por tipo de serviço.
    Busca documentos na coleção 'actions' (ajuste se o seu estiver em outra).
    Considera os campos: 'service_type' (preferência), senão 'type' ou 'category'.
    """
    db = get_db()

    # Altere 'actions' se sua coleção for outra (ex.: 'campaigns')
    col = db.collection("actions")

    # Suporte Firestore e memory_db
    docs = col.stream() if hasattr(col, "stream") else col.get()

    counts = defaultdict(int)
    for doc in docs:
        data = doc.to_dict() if hasattr(doc, "to_dict") else doc
        label = _normalize(data.get("service_type") or data.get("type") or data.get("category"))
        counts[label] += 1

    # Garante as labels principais
    for label in DEFAULT_LABELS:
        counts[label] += 0

    return jsonify(dict(counts))
