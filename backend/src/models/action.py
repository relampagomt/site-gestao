from src.services.firestore_service import firestore_service

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
        doc_id, _ = firestore_service.add_document("actions", action_data)
        return doc_id

    @staticmethod
    def get_all():
        return firestore_service.get_all_documents("actions")

    @staticmethod
    def get_by_id(action_id):
        action = firestore_service.get_document("actions", action_id)
        if action:
            action['id'] = action_id
            return action
        return None

    @staticmethod
    def update(action_id, action_data):
        return firestore_service.update_document("actions", action_id, action_data)

    @staticmethod
    def delete(action_id):
        return firestore_service.delete_document("actions", action_id)


