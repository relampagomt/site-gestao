import uuid
from datetime import datetime

class MemoryDB:
    def __init__(self):
        self.collections = {
            'users': {},
            'clients': {},
            'materials': {},
            'actions': {},
            'job_vacancies': {}
        }
    
    def collection(self, name):
        return MemoryCollection(self.collections[name])

class MemoryCollection:
    def __init__(self, data):
        self.data = data
    
    def document(self, doc_id=None):
        if doc_id is None:
            doc_id = str(uuid.uuid4())
        return MemoryDocument(self.data, doc_id)
    
    def where(self, field, operator, value):
        return MemoryQuery(self.data, field, operator, value)
    
    def stream(self):
        for doc_id, doc_data in self.data.items():
            yield MemoryDocumentSnapshot(doc_id, doc_data)
    
    def add(self, data):
        doc_id = str(uuid.uuid4())
        self.data[doc_id] = data
        return (None, MemoryDocumentSnapshot(doc_id, data))

class MemoryDocument:
    def __init__(self, collection_data, doc_id):
        self.collection_data = collection_data
        self.id = doc_id
    
    def set(self, data):
        self.collection_data[self.id] = data
    
    def get(self):
        if self.id in self.collection_data:
            return MemoryDocumentSnapshot(self.id, self.collection_data[self.id])
        return MemoryDocumentSnapshot(self.id, None)
    
    def update(self, data):
        if self.id in self.collection_data:
            self.collection_data[self.id].update(data)
    
    def delete(self):
        if self.id in self.collection_data:
            del self.collection_data[self.id]

class MemoryDocumentSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self.data = data
    
    @property
    def exists(self):
        return self.data is not None
    
    def to_dict(self):
        return self.data or {}

class MemoryQuery:
    def __init__(self, collection_data, field, operator, value):
        self.collection_data = collection_data
        self.field = field
        self.operator = operator
        self.value = value
    
    def limit(self, count):
        return self
    
    def get(self):
        results = []
        for doc_id, doc_data in self.collection_data.items():
            if self._matches(doc_data):
                results.append(MemoryDocumentSnapshot(doc_id, doc_data))
        return results
    
    def _matches(self, doc_data):
        if self.field not in doc_data:
            return False
        
        if self.operator == '==':
            return doc_data[self.field] == self.value
        # Adicionar outros operadores conforme necessário
        return False

# Instância global do banco em memória
memory_db = MemoryDB()

