from src.services.firebase_service import get_firestore_client

class Action:
    def __init__(self, client_name, company_name, action_type, start_date, end_date, periods_of_day, material_quantity, material_photo_url, observations):
        self.client_name = client_name
        self.company_name = company_name
        self.action_type = action_type
        self.start_date = start_date
        self.end_date = end_date
        self.periods_of_day = periods_of_day
        self.material_quantity = material_quantity
        self.material_photo_url = material_photo_url
        self.observations = observations

    def to_dict(self):
        return {
            "client_name": self.client_name,
            "company_name": self.company_name,
            "action_type": self.action_type,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "periods_of_day": self.periods_of_day,
            "material_quantity": self.material_quantity,
            "material_photo_url": self.material_photo_url,
            "observations": self.observations
        }

    @staticmethod
    def from_dict(source):
        return Action(
            source["client_name"],
            source["company_name"],
            source["action_type"],
            source["start_date"],
            source["end_date"],
            source["periods_of_day"],
            source["material_quantity"],
            source["material_photo_url"],
            source["observations"]
        )

    @staticmethod
    def create(action_data):
        db = get_firestore_client()
        doc_ref = db.collection("actions").document()
        doc_ref.set(action_data)
        return doc_ref.id

    @staticmethod
    def get_all():
        db = get_firestore_client()
        actions_ref = db.collection("actions")
        return [{"id": doc.id, **doc.to_dict()} for doc in actions_ref.stream()]

    @staticmethod
    def get_by_id(action_id):
        db = get_firestore_client()
        doc_ref = db.collection("actions").document(action_id)
        doc = doc_ref.get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    @staticmethod
    def update(action_id, action_data):
        db = get_firestore_client()
        doc_ref = db.collection("actions").document(action_id)
        doc_ref.update(action_data)

    @staticmethod
    def delete(action_id):
        db = get_firestore_client()
        db.collection("actions").document(action_id).delete()


