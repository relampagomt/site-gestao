from src.services.firebase_service import get_firestore_client

class Material:
    def __init__(self, date, quantity, client_id, client_name, material_sample_url, protocol_sample_url, responsible):
        self.date = date
        self.quantity = quantity
        self.client_id = client_id
        self.client_name = client_name
        self.material_sample_url = material_sample_url
        self.protocol_sample_url = protocol_sample_url
        self.responsible = responsible

    def to_dict(self):
        return {
            "date": self.date,
            "quantity": self.quantity,
            "client_id": self.client_id,
            "client_name": self.client_name,
            "material_sample_url": self.material_sample_url,
            "protocol_sample_url": self.protocol_sample_url,
            "responsible": self.responsible
        }

    @staticmethod
    def from_dict(source):
        return Material(
            source["date"],
            source["quantity"],
            source["client_id"],
            source["client_name"],
            source["material_sample_url"],
            source["protocol_sample_url"],
            source["responsible"]
        )

    @staticmethod
    def create(material_data):
        db = get_firestore_client()
        doc_ref = db.collection("materials").document()
        doc_ref.set(material_data)
        return doc_ref.id

    @staticmethod
    def get_all():
        db = get_firestore_client()
        materials_ref = db.collection("materials")
        return [{"id": doc.id, **doc.to_dict()} for doc in materials_ref.stream()]

    @staticmethod
    def get_by_id(material_id):
        db = get_firestore_client()
        doc_ref = db.collection("materials").document(material_id)
        doc = doc_ref.get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None

    @staticmethod
    def update(material_id, material_data):
        db = get_firestore_client()
        doc_ref = db.collection("materials").document(material_id)
        doc_ref.update(material_data)

    @staticmethod
    def delete(material_id):
        db = get_firestore_client()
        db.collection("materials").document(material_id).delete()


