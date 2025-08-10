from flask import Blueprint, request, jsonify
from src.models import JobVacancy
from src.middleware.auth_middleware import require_admin, require_supervisor

job_vacancy_bp = Blueprint("job_vacancy_bp", __name__)

@job_vacancy_bp.route("/job_vacancies", methods=["POST"])
@require_supervisor()
def create_job_vacancy():
    data = request.json
    job_vacancy_id = JobVacancy.create(data)
    return jsonify({"id": job_vacancy_id}), 201

@job_vacancy_bp.route("/job_vacancies", methods=["GET"])
@require_supervisor()
def get_all_job_vacancies():
    job_vacancies = JobVacancy.get_all()
    return jsonify(job_vacancies), 200

@job_vacancy_bp.route("/job_vacancies/<job_vacancy_id>", methods=["GET"])
@require_supervisor()
def get_job_vacancy_by_id(job_vacancy_id):
    job_vacancy = JobVacancy.get_by_id(job_vacancy_id)
    if job_vacancy:
        return jsonify(job_vacancy), 200
    return jsonify({"message": "Job Vacancy not found"}), 404

@job_vacancy_bp.route("/job_vacancies/<job_vacancy_id>", methods=["PUT"])
@require_admin()
def update_job_vacancy(job_vacancy_id):
    data = request.json
    JobVacancy.update(job_vacancy_id, data)
    return jsonify({"message": "Job Vacancy updated successfully"}), 200

@job_vacancy_bp.route("/job_vacancies/<job_vacancy_id>", methods=["DELETE"])
@require_admin()
def delete_job_vacancy(job_vacancy_id):
    JobVacancy.delete(job_vacancy_id)
    return jsonify({"message": "Job Vacancy deleted successfully"}), 200


