# backend/src/models/job_vacancy.py
from __future__ import annotations
from typing import Dict, Any, List, Optional
from src.services.firestore_service import firestore_service

class JobVacancy:
    COLLECTION = "job_vacancies"

    @staticmethod
    def _normalize(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Garante campos básicos e tipos consistentes para o frontend."""
        data = dict(doc)
        data.setdefault("name", "")
        data.setdefault("phone", "")
        data.setdefault("address", "")
        data.setdefault("age", None)
        data.setdefault("sex", "Outro")
        data.setdefault("department", "")
        data.setdefault("job_type", "")
        data.setdefault("status", "Aberta")
        data.setdefault("salary", 0)
        return data

    @classmethod
    def create(cls, payload: Dict[str, Any]) -> str:
        data = cls._normalize(payload)
        doc_id, _ = firestore_service.add_document(cls.COLLECTION, data)
        return doc_id

    @classmethod
    def get_all(cls) -> List[Dict[str, Any]]:
        docs = firestore_service.get_all_documents(cls.COLLECTION) or []
        return [cls._normalize(d) for d in docs]

    @classmethod
    def get_by_id(cls, job_vacancy_id: str) -> Optional[Dict[str, Any]]:
        doc = firestore_service.get_document(cls.COLLECTION, job_vacancy_id)
        return cls._normalize(doc) if doc else None

    @classmethod
    def update(cls, job_vacancy_id: str, payload: Dict[str, Any]) -> bool:
        data = cls._normalize(payload)
        return firestore_service.update_document(cls.COLLECTION, job_vacancy_id, data)

    @classmethod
    def delete(cls, job_vacancy_id: str) -> bool:
        return firestore_service.delete_document(cls.COLLECTION, job_vacancy_id)
