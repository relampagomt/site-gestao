from src.services.firestore_service import firestore_service

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
        doc_id, _ = firestore_service.add_document("materials", material_data)
        return doc_id

    @staticmethod
    def get_all():
        return firestore_service.get_all_documents("materials")

    @staticmethod
    def get_by_id(material_id):
        material = firestore_service.get_document("materials", material_id)
        if material:
            material['id'] = material_id
            return material
        return None

    @staticmethod
    def update(material_id, material_data):
        return firestore_service.update_document("materials", material_id, material_data)

    @staticmethod
    def delete(material_id):
        return firestore_service.delete_document("materials", material_id)


