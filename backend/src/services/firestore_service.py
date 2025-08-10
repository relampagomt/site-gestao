import uuid
from datetime import datetime
from firebase_admin import firestore
from src.services.firebase_service import get_firestore_client

class FirestoreService:
    def __init__(self):
        self.db = get_firestore_client()
    
    def collection(self, name):
        """Retorna uma coleção do Firestore ou MemoryDB dependendo da configuração."""
        return self.db.collection(name)
    
    def add_document(self, collection_name, data):
        """Adiciona um documento a uma coleção."""
        try:
            # Adicionar timestamp de criação
            data['created_at'] = datetime.now()
            data['updated_at'] = datetime.now()
            
            # Se for MemoryDB
            if hasattr(self.db, 'collections'):
                doc_id = str(uuid.uuid4())
                self.db.collections[collection_name][doc_id] = data
                return doc_id, data
            
            # Se for Firestore
            doc_ref = self.db.collection(collection_name).document()
            doc_ref.set(data)
            return doc_ref.id, data
        except Exception as e:
            print(f"Erro ao adicionar documento: {e}")
            raise e
    
    def get_document(self, collection_name, doc_id):
        """Obtém um documento específico."""
        try:
            # Se for MemoryDB
            if hasattr(self.db, 'collections'):
                if doc_id in self.db.collections[collection_name]:
                    return self.db.collections[collection_name][doc_id]
                return None
            
            # Se for Firestore
            doc_ref = self.db.collection(collection_name).document(doc_id)
            doc = doc_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            print(f"Erro ao obter documento: {e}")
            raise e
    
    def update_document(self, collection_name, doc_id, data):
        """Atualiza um documento."""
        try:
            # Adicionar timestamp de atualização
            data['updated_at'] = datetime.now()
            
            # Se for MemoryDB
            if hasattr(self.db, 'collections'):
                if doc_id in self.db.collections[collection_name]:
                    self.db.collections[collection_name][doc_id].update(data)
                    return True
                return False
            
            # Se for Firestore
            doc_ref = self.db.collection(collection_name).document(doc_id)
            doc_ref.update(data)
            return True
        except Exception as e:
            print(f"Erro ao atualizar documento: {e}")
            raise e
    
    def delete_document(self, collection_name, doc_id):
        """Deleta um documento."""
        try:
            # Se for MemoryDB
            if hasattr(self.db, 'collections'):
                if doc_id in self.db.collections[collection_name]:
                    del self.db.collections[collection_name][doc_id]
                    return True
                return False
            
            # Se for Firestore
            doc_ref = self.db.collection(collection_name).document(doc_id)
            doc_ref.delete()
            return True
        except Exception as e:
            print(f"Erro ao deletar documento: {e}")
            raise e
    
    def get_all_documents(self, collection_name):
        """Obtém todos os documentos de uma coleção."""
        try:
            # Se for MemoryDB
            if hasattr(self.db, 'collections'):
                documents = []
                for doc_id, doc_data in self.db.collections[collection_name].items():
                    doc_data['id'] = doc_id
                    documents.append(doc_data)
                return documents
            
            # Se for Firestore
            docs = self.db.collection(collection_name).stream()
            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                documents.append(doc_data)
            return documents
        except Exception as e:
            print(f"Erro ao obter documentos: {e}")
            raise e
    
    def query_documents(self, collection_name, field, operator, value):
        """Faz uma consulta em uma coleção."""
        try:
            # Se for MemoryDB
            if hasattr(self.db, 'collections'):
                documents = []
                for doc_id, doc_data in self.db.collections[collection_name].items():
                    if field in doc_data:
                        if operator == '==' and doc_data[field] == value:
                            doc_data['id'] = doc_id
                            documents.append(doc_data)
                return documents
            
            # Se for Firestore
            docs = self.db.collection(collection_name).where(field, operator, value).stream()
            documents = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                documents.append(doc_data)
            return documents
        except Exception as e:
            print(f"Erro ao consultar documentos: {e}")
            raise e

# Instância global do serviço
firestore_service = FirestoreService()

