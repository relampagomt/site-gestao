from src.services.firebase_service import get_firestore_client

class Client:
    def __init__(self, name, company, phone, email, segment, status, others=None):
        self.name = name
        self.company = company
        self.phone = phone
        self.email = email
        self.segment = segment
        self.status = status
        self.others = others

    def to_dict(self):
        return {
            "name": self.name,
            "company": self.company,
            "phone": self.phone,
            "email": self.email,
            "segment": self.segment,
            "status": self.status,
            "others": self.others
        }

    @staticmethod
    def from_dict(source):
        return Client(
            source["name"],
            source["company"],
            source["phone"],
            source["email"],
            source["segment"],
            source["status"],
            source.get("others")
        )

    @staticmethod
    def create(client_data):
        db = get_firestore_client()
        doc_ref = db.collection("clients").document()
        doc_ref.set(client_data)
        return doc_ref.id

    @staticmethod
    def get_all():
        db = get_firestore_client()
        clients_ref = db.collection("clients")
        return [{"id": doc.id, **doc.to_dict()} for doc in clients_ref.stream()]

    @staticmethod
    def get_by_id(client_id):
        db = get_firestore_client()
        doc_ref = db.collection("clients").document(client_id)
        doc = doc_ref.get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    @staticmethod
    def update(client_id, client_data):
        db = get_firestore_client()
        doc_ref = db.collection("clients").document(client_id)
        doc_ref.update(client_data)

    @staticmethod
    def delete(client_id):
        db = get_firestore_client()
        db.collection("clients").document(client_id).delete()


