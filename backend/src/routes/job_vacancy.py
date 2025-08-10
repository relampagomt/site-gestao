from datetime import datetime
from flask import Blueprint, request, jsonify

from src.models import JobVacancy
from src.middleware.auth_middleware import require_admin, require_supervisor

job_vacancy_bp = Blueprint("job_vacancy_bp", __name__)

# -------------------------------------------------------------------
# CRUD de vagas
# -------------------------------------------------------------------

@job_vacancy_bp.route("/job-vacancies", methods=["POST"])
@require_supervisor()
def create_job_vacancy():
    data = request.get_json() or {}

    # defaults seguros
    candidates = data.get("candidates") or []
    data["candidates"] = candidates
    data["candidates_count"] = data.get("candidates_count")
    if data["candidates_count"] is None:
        data["candidates_count"] = len(candidates)

    job_vacancy_id = JobVacancy.create(data)
    return jsonify({"id": job_vacancy_id}), 201


@job_vacancy_bp.route("/job-vacancies", methods=["GET"])
@require_supervisor()
def get_all_job_vacancies():
    job_vacancies = JobVacancy.get_all() or []
    # garante campos esperados
    for v in job_vacancies:
        v.setdefault("candidates", [])
        v.setdefault("candidates_count", len(v["candidates"]))
    return jsonify(job_vacancies), 200


@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>", methods=["GET"])
@require_supervisor()
def get_job_vacancy_by_id(job_vacancy_id):
    job_vacancy = JobVacancy.get_by_id(job_vacancy_id)
    if not job_vacancy:
        return jsonify({"message": "Job Vacancy not found"}), 404
    job_vacancy.setdefault("candidates", [])
    job_vacancy.setdefault("candidates_count", len(job_vacancy["candidates"]))
    return jsonify(job_vacancy), 200


@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>", methods=["PUT"])
@require_admin()
def update_job_vacancy(job_vacancy_id):
    data = request.get_json() or {}
    # se vier lista de candidatos, mantenha o contador em sincronia
    if "candidates" in data and data.get("candidates") is not None:
        data["candidates_count"] = len(data["candidates"])
    JobVacancy.update(job_vacancy_id, data)
    return jsonify({"message": "Job Vacancy updated successfully"}), 200


@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>", methods=["DELETE"])
@require_admin()
def delete_job_vacancy(job_vacancy_id):
    JobVacancy.delete(job_vacancy_id)
    return jsonify({"message": "Job Vacancy deleted successfully"}), 200


# -------------------------------------------------------------------
# Candidatos
# -------------------------------------------------------------------

@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>/candidates", methods=["POST"])
@require_supervisor()
def add_candidate(job_vacancy_id):
    """Adiciona um candidato (name, phone, email) à vaga."""
    payload = request.get_json() or {}
    name = (payload.get("name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    email = (payload.get("email") or "").strip()

    if not name:
        return jsonify({"error": "name is required"}), 400

    vacancy = JobVacancy.get_by_id(job_vacancy_id)
    if not vacancy:
        return jsonify({"error": "Job Vacancy not found"}), 404

    candidates = vacancy.get("candidates") or []
    candidates.append({
        "name": name,
        "phone": phone,
        "email": email,
        "created_at": datetime.utcnow().isoformat()
    })

    JobVacancy.update(job_vacancy_id, {
        "candidates": candidates,
        "candidates_count": len(candidates)
    })

    return jsonify({"ok": True, "candidates_count": len(candidates)}), 200
