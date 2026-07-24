from typing import Generic, TypeVar, Type
from sqlalchemy.orm import Session
from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)

class CRUDBase(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model
    
    # === READ ===
    def get_by_id(self, db: Session, id: any):
        return db.query(self.model).filter(self.model.id == id).first()

    # === CREATE ===
    def create(self, db: Session, obj_in: dict):
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # === UPDATE ===
    # obj_in is the json that traveled over the internet and reached our server, converted into python dictionary by FastAPI and being passed into service layer.
    # db_obj is the current state of the database, Session() creates a connection between our services and database to access information. 
    def update(self, db: Session, db_obj: ModelType, obj_in: dict) -> ModelType:
        """Updates an existing row dynamically"""
        for field, value in obj_in.items():
            # Only update attributes that are actually present on the model
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # === DELETE ===
    def delete(self, db:Session, id:any) -> ModelType | None:
        """Delete a row by its Primary Key."""
        obj = db.query(self.model).filter(self.model.id == id).first()
        if obj:
            db.delete(obj)
            db.commit()
        return obj

    # === GET MULTI ===
    def get_multi(
        self, 
        db:Session,
        *,
        skip: int = 0,
        limit: int = 10,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        **filters                    # wraps all the extra query parameters into python dictionary
    ) -> list[ModelType]:
        """
        Fetches a paginated list of model instances.
        Supports dynamic sorting and filtering.
        
        Args:
            db: The database session.
            skip: Number of records to skip (pagination).
            limit: Maximum number of records to return.
            sort_by: Column name to sort by (default: 'id').
            sort_order: 'asc' or 'desc' (default: 'asc').
            **filters: Keyword arguments used as equality filters (e.g., status="pending").
        """

        # 1. Starting the query
        query = db.query(self.model)

        # 2. Applying Dynamic Filters
        for field, value in filters.items():
            if hasattr(self.model, field) and value is not None:
                query = query.filter(getattr(self.model, field) == value)

        # 3. Applying Dynamic Sorting
        if hasattr(self.model, sort_by):
            sort_column = getattr(self.model, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

        # 4. Pagination and execution
        return query.offset(skip).limit(limit).all()    