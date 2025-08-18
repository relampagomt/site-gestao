from src.services.firestore_service import firestore_service

def _as_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        return [s.strip() for s in v.split(",") if s.strip()]
    return []

def _to_int(v, default=0):
    try:
        return int(v)
    except Exception:
        try:
            return int(float(v))
        except Exception:
            return default

def _status_default(status):
    s = (status or "aguardando").strip().lower()
    if s not in {"aguardando", "andamento", "concluido"}:
        s = "aguardando"
    return s

def _active_from_status(status):
    # ativo = não concluído
    return _status_default(status) != "concluido"

def _normalize_for_storage(data: dict) -> dict:
    """
    Recebe o JSON vindo do front (ou de payloads antigos) e
    devolve um dicionário pronto para persistir no Firestore,
    gravando chaves novas e mantendo compatibilidade com nomes legados.
    """
    data = data or {}

    client_name = data.get("client_name") or ""
    company_name = data.get("company_name") or ""

    # types (novo) + type (string) + action_type (legado)
    types_list = _as_list(data.get("types") if data.get("types") is not None else data.get("type"))
    if not types_list and isinstance(data.get("action_type"), str):
        types_list = _as_list(data.get("action_type"))
    type_str = ", ".join(types_list)

    # períodos do dia: day_periods (novo) + periods_of_day (legado)
    day_periods = _as_list(data.get("day_periods") if data.get("day_periods") is not None else data.get("periods_of_day"))

    # datas: suportamos date e datetime
    start_date = data.get("start_date") or None
    end_date = data.get("end_date") or None
    start_datetime = data.get("start_datetime") or None  # 'YYYY-MM-DDTHH:MM:SS'
    end_datetime = data.get("end_datetime") or None

    # material: material_qty (novo) + material_quantity (legado)
    material_qty = data.get("material_qty")
    if material_qty is None:
        material_qty = data.get("material_quantity")
    material_qty = _to_int(material_qty, 0)

    material_photo_url = data.get("material_photo_url") or ""

    # notes (novo) + observations (legado)
    notes = data.get("notes")
    if notes is None:
        notes = data.get("observations") or ""
    notes = str(notes)

    status = _status_default(data.get("status"))
    # se vier "active" no payload, respeita; senão deriva do status
    active = bool(data.get("active")) if "active" in data else _active_from_status(status)

    supervisor = (data.get("supervisor") or "").strip()
    team_members = _as_list(data.get("team_members"))

    # Monta o documento final, incluindo chaves novas e legadas para compatibilidade
    doc = {
        "client_name": client_name,
        "company_name": company_name,

        # novo
        "types": types_list,
        "type": type_str,

        # legado
        "action_type": type_str,

        # períodos
        "day_periods": day_periods,          # novo
        "periods_of_day": day_periods,       # legado

        # datas
        "start_date": start_date,
        "end_date": end_date,
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,

        # material
        "material_qty": material_qty,        # novo
        "material_quantity": material_qty,   # legado
        "material_photo_url": material_photo_url,

        # observações
        "notes": notes,                      # novo
        "observations": notes,               # legado

        # status/ativo
        "status": status,
        "active": active,

        # pessoas
        "supervisor": supervisor,
        "team_members": team_members,
    }

    # mantém quaisquer outros campos desconhecidos (não sobrescreve os oficiais)
    for k, v in data.items():
        if k not in doc:
            doc[k] = v

    return doc

def _present_for_front(doc: dict) -> dict:
    """
    Garante que qualquer documento vindo do Firestore (mesmo legado)
    seja apresentado com as chaves que o front novo espera.
    Mantém também as chaves antigas para não quebrar outras telas.
    """
    d = (doc or {}).copy()

    # types
    types_list = _as_list(d.get("types") if d.get("types") is not None else d.get("type"))
    if not types_list and isinstance(d.get("action_type"), str):
        types_list = _as_list(d.get("action_type"))
    d["types"] = types_list
    d["type"] = ", ".join(types_list)
    d["action_type"] = d["type"]

    # períodos
    day_periods = _as_list(d.get("day_periods") if d.get("day_periods") is not None else d.get("periods_of_day"))
    d["day_periods"] = day_periods
    d["periods_of_day"] = day_periods

    # datas
    d["start_date"] = d.get("start_date") or None
    d["end_date"] = d.get("end_date") or None
    d["start_datetime"] = d.get("start_datetime") or None
    d["end_datetime"] = d.get("end_datetime") or None

    # material
    qty = d.get("material_qty")
    if qty is None:
        qty = d.get("material_quantity")
    qty = _to_int(qty, 0)
    d["material_qty"] = qty
    d["material_quantity"] = qty
    d["material_photo_url"] = d.get("material_photo_url") or ""

    # observações
    notes = d.get("notes")
    if notes is None:
        notes = d.get("observations") or ""
    d["notes"] = str(notes)
    d["observations"] = d["notes"]

    # status/active
    status = _status_default(d.get("status"))
    d["status"] = status
    if "active" not in d:
        d["active"] = _active_from_status(status)

    # pessoas
    d["supervisor"] = (d.get("supervisor") or "").strip()
    d["team_members"] = _as_list(d.get("team_members"))

    # nomes básicos
    d["client_name"] = d.get("client_name") or ""
    d["company_name"] = d.get("company_name") or ""

    return d

class Action:
    """
    Modelo fino que normaliza payloads e apresenta documentos num formato
    compatível com o frontend do calendário + telas antigas.
    """

    # ==== CREATE ====
    @staticmethod
    def create(action_data):
        doc = _normalize_for_storage(action_data)
        doc_id, _ = firestore_service.add_document("actions", doc)
        return doc_id

    # ==== READ ALL ====
    @staticmethod
    def get_all():
        rows = firestore_service.get_all_documents("actions") or []
        # alguns serviços já retornam com 'id' dentro; se retornar separado, assumimos que já vem pronto
        return [_present_for_front(r) for r in rows]

    # ==== READ ONE ====
    @staticmethod
    def get_by_id(action_id):
        doc = firestore_service.get_document("actions", action_id)
        if doc:
            out = _present_for_front(doc)
            out["id"] = action_id
            return out
        return None

    # ==== UPDATE ====
    @staticmethod
    def update(action_id, action_data):
        doc = _normalize_for_storage(action_data)
        return firestore_service.update_document("actions", action_id, doc)

    # ==== DELETE ====
    @staticmethod
    def delete(action_id):
        return firestore_service.delete_document("actions", action_id)
