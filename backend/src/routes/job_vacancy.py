# backend/src/routes/job_vacancy.py
from flask import Blueprint, request, jsonify
from src.models import JobVacancy
from src.middleware.auth_middleware import require_admin, require_supervisor, roles_allowed

job_vacancy_bp = Blueprint("job_vacancy_bp", __name__)

# CREATE
@job_vacancy_bp.route("/job-vacancies", methods=["POST"])
@roles_allowed('admin', 'supervisor')
def create_job_vacancy():
    data = request.json or {}
    job_vacancy_id = JobVacancy.create(data)
    return jsonify({"id": job_vacancy_id}), 201

# LIST
@job_vacancy_bp.route("/job-vacancies", methods=["GET"])
@roles_allowed('admin', 'supervisor')
def get_all_job_vacancies():
    job_vacancies = JobVacancy.get_all()
    return jsonify(job_vacancies), 200

# GET BY ID
@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>", methods=["GET"])
@roles_allowed('admin', 'supervisor')
def get_job_vacancy_by_id(job_vacancy_id):
    job_vacancy = JobVacancy.get_by_id(job_vacancy_id)
    if job_vacancy:
        return jsonify(job_vacancy), 200
    return jsonify({"message": "Job Vacancy not found"}), 404

# UPDATE
@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>", methods=["PUT"])
@roles_allowed('admin', 'supervisor')
def update_job_vacancy(job_vacancy_id):
    data = request.json or {}
    JobVacancy.update(job_vacancy_id, data)
    return jsonify({"message": "Job Vacancy updated successfully"}), 200

# DELETE
@job_vacancy_bp.route("/job-vacancies/<job_vacancy_id>", methods=["DELETE"])
@roles_allowed('admin')
def delete_job_vacancy(job_vacancy_id):
    JobVacancy.delete(job_vacancy_id)
    return jsonify({"message": "Job Vacancy deleted successfully"}), 200
