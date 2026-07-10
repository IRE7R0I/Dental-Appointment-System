"""
Capa de abstracción para almacenamiento de archivos.
Hoy: PostgreSQL (LargeBinary). Mañana: Supabase Storage.
La lógica de compresión WebP vive aquí para que migrar de storage
no requiera reescribir compresión.
"""
from abc import ABC, abstractmethod
from io import BytesIO

from PIL import Image
from sqlalchemy.orm import Session

from backend import models
from backend.database import SessionLocal


MAX_LADO_NORMAL = 2000
LOSSLESS_MAX_BYTES = 15 * 1024 * 1024


class AlmacenamientoArchivos(ABC):
    """Interfaz abstracta para almacenar/recuperar/eliminar archivos binarios."""

    @abstractmethod
    def guardar(self, id_imagen: int, data: bytes, es_radiografia: bool) -> int:
        ...

    @abstractmethod
    def obtener(self, id_imagen: int) -> bytes:
        ...

    @abstractmethod
    def eliminar(self, id_imagen: int) -> None:
        ...


class AlmacenamientoPostgres(AlmacenamientoArchivos):
    """Almacena binarios en tabla imagenes_contenido (PostgreSQL LargeBinary)."""

    def __init__(self, db: Session):
        self.db = db

    def guardar(self, id_imagen: int, data: bytes, es_radiografia: bool) -> int:
        try:
            img = Image.open(BytesIO(data))
        except Exception as exc:
            raise ValueError("El archivo no es una imagen válida o está corrupto") from exc

        output = BytesIO()

        if es_radiografia:
            img.save(output, format="WEBP", lossless=True)
            size = output.tell()
            if size > LOSSLESS_MAX_BYTES:
                output = BytesIO()
                img.save(output, format="WEBP", quality=95)
        else:
            if max(img.width, img.height) > MAX_LADO_NORMAL:
                ratio = MAX_LADO_NORMAL / max(img.width, img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.LANCZOS)
            img.save(output, format="WEBP", quality=80)

        webp_bytes = output.getvalue()
        webp_size = len(webp_bytes)

        existente = self.db.query(models.ImagenContenido).filter(
            models.ImagenContenido.id_imagen == id_imagen
        ).first()
        if existente:
            existente.contenido = webp_bytes
        else:
            contenido = models.ImagenContenido(id_imagen=id_imagen, contenido=webp_bytes)
            self.db.add(contenido)
        self.db.commit()

        return webp_size

    def obtener(self, id_imagen: int) -> bytes:
        contenido = self.db.query(models.ImagenContenido).filter(
            models.ImagenContenido.id_imagen == id_imagen
        ).first()
        if not contenido:
            raise ValueError("Contenido de imagen no encontrado")
        return contenido.contenido

    def eliminar(self, id_imagen: int) -> None:
        self.db.query(models.ImagenContenido).filter(
            models.ImagenContenido.id_imagen == id_imagen
        ).delete()
        self.db.commit()


def obtener_almacenamiento(db: Session) -> AlmacenamientoArchivos:
    return AlmacenamientoPostgres(db)
