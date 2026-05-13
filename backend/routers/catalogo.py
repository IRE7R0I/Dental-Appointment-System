from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import get_db
from backend.dependencies import require_role
from backend.crud.catalogo import (
    listar_tratamientos,
    obtener_tratamiento,
    crear_tratamiento,
    actualizar_tratamiento,
    soft_delete_tratamiento,
    listar_obras_sociales,
    crear_obra_social,
    soft_delete_obra_social,
)
from backend.schemas.catalogo import (
    TratamientoCatalogoCreate,
    TratamientoCatalogoUpdate,
    TratamientoCatalogoResponse,
    ObraSocialCreate,
    ObraSocialResponse,
)

router = APIRouter(prefix="/catalogo", tags=["Catálogo"])


# ── Tratamientos (GET público, POST/PUT/DELETE autenticado) ──

@router.get("/tratamientos", response_model=list[TratamientoCatalogoResponse])
def get_tratamientos(categoria: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return listar_tratamientos(db, categoria)


@router.get("/tratamientos/{id}", response_model=TratamientoCatalogoResponse)
def get_tratamiento(id: int, db: Session = Depends(get_db)):
    obj = obtener_tratamiento(db, id)
    if not obj:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    return obj


@router.post("/tratamientos", response_model=TratamientoCatalogoResponse, status_code=201,
             dependencies=[Depends(require_role(["admin", "secretaria"]))])
def post_tratamiento(data: TratamientoCatalogoCreate, db: Session = Depends(get_db)):
    return crear_tratamiento(db, data)


@router.put("/tratamientos/{id}", response_model=TratamientoCatalogoResponse,
            dependencies=[Depends(require_role(["admin", "secretaria"]))])
def put_tratamiento(id: int, data: TratamientoCatalogoUpdate, db: Session = Depends(get_db)):
    obj = actualizar_tratamiento(db, id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    return obj


@router.delete("/tratamientos/{id}", response_model=TratamientoCatalogoResponse,
              dependencies=[Depends(require_role(["admin", "secretaria"]))])
def delete_tratamiento(id: int, db: Session = Depends(get_db)):
    obj = soft_delete_tratamiento(db, id)
    if not obj:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    return obj


# ── Obras Sociales ────────────────────────────────────────

@router.get("/obras-sociales", response_model=list[ObraSocialResponse])
def get_obras_sociales(db: Session = Depends(get_db)):
    return listar_obras_sociales(db)


@router.post("/obras-sociales", response_model=ObraSocialResponse, status_code=201,
             dependencies=[Depends(require_role(["admin", "secretaria"]))])
def post_obra_social(data: ObraSocialCreate, db: Session = Depends(get_db)):
    return crear_obra_social(db, data)


@router.delete("/obras-sociales/{id}", response_model=ObraSocialResponse,
              dependencies=[Depends(require_role(["admin", "secretaria"]))])
def delete_obra_social(id: int, db: Session = Depends(get_db)):
    obj = soft_delete_obra_social(db, id)
    if not obj:
        raise HTTPException(status_code=404, detail="Obra social no encontrada")
    return obj
