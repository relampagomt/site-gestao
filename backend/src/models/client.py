from src.services.firestore_service import firestore_service

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
        doc_id, _ = firestore_service.add_document("clients", client_data)
        return doc_id

    @staticmethod
    def get_all():
        return firestore_service.get_all_documents("clients")

    @staticmethod
    def get_by_id(client_id):
        client = firestore_service.get_document("clients", client_id)
        if client:
            client['id'] = client_id
            return client
        return None

    @staticmethod
    def update(client_id, client_data):
        return firestore_service.update_document("clients", client_id, client_data)

    @staticmethod
    def delete(client_id):
        return firestore_service.delete_document("clients", client_id)


