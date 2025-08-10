from src.services.firestore_service import firestore_service

class JobVacancy:
    def __init__(self, name, phone, email, others=None):
        self.name = name
        self.phone = phone
        self.email = email
        self.others = others

    def to_dict(self):
        return {
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "others": self.others
        }

    @staticmethod
    def from_dict(source):
        return JobVacancy(
            source["name"],
            source["phone"],
            source["email"],
            source.get("others")
        )

    @staticmethod
    def create(job_vacancy_data):
        doc_id, _ = firestore_service.add_document("job_vacancies", job_vacancy_data)
        return doc_id

    @staticmethod
    def get_all():
        return firestore_service.get_all_documents("job_vacancies")

    @staticmethod
    def get_by_id(job_vacancy_id):
        job_vacancy = firestore_service.get_document("job_vacancies", job_vacancy_id)
        if job_vacancy:
            job_vacancy['id'] = job_vacancy_id
            return job_vacancy
        return None

    @staticmethod
    def update(job_vacancy_id, job_vacancy_data):
        return firestore_service.update_document("job_vacancies", job_vacancy_id, job_vacancy_data)

    @staticmethod
    def delete(job_vacancy_id):
        return firestore_service.delete_document("job_vacancies", job_vacancy_id)


