from src.services.firebase_service import get_firestore_client

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
        db = get_firestore_client()
        doc_ref = db.collection("job_vacancies").document()
        doc_ref.set(job_vacancy_data)
        return doc_ref.id

    @staticmethod
    def get_all():
        db = get_firestore_client()
        job_vacancies_ref = db.collection("job_vacancies")
        return [{"id": doc.id, **doc.to_dict()} for doc in job_vacancies_ref.stream()]

    @staticmethod
    def get_by_id(job_vacancy_id):
        db = get_firestore_client()
        doc_ref = db.collection("job_vacancies").document(job_vacancy_id)
        doc = doc_ref.get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    @staticmethod
    def update(job_vacancy_id, job_vacancy_data):
        db = get_firestore_client()
        doc_ref = db.collection("job_vacancies").document(job_vacancy_id)
        doc_ref.update(job_vacancy_data)

    @staticmethod
    def delete(job_vacancy_id):
        db = get_firestore_client()
        db.collection("job_vacancies").document(job_vacancy_id).delete()


