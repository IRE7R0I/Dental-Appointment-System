import pytest
from io import BytesIO
from PIL import Image

from backend import models


def _crear_carpeta(client, headers, dni="12345678", nombre="Test Carpeta"):
    """Helper: crea carpeta y retorna su ID."""
    resp = client.post(
        f"/api/pacientes/{dni}/carpetas",
        json={"nombre": nombre},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _generar_imagen_bytes(width=100, height=100, fmt="JPEG"):
    """Helper: genera imagen PNG/JPEG en memoria y retorna bytes."""
    img = Image.new("RGB", (width, height), color="red")
    buf = BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# ─── Tests de Carpetas ────────────────────────────────────────


def test_crear_carpeta(client, headers_admin, sample_paciente):
    resp = client.post(
        "/api/pacientes/12345678/carpetas",
        json={"nombre": "Radiografías 2026"},
        headers=headers_admin,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["nombre"] == "Radiografías 2026"
    assert data["dni_paciente"] == "12345678"
    assert "creado_en" in data


def test_listar_carpetas(client, headers_admin, sample_paciente):
    _crear_carpeta(client, headers_admin)
    resp = client.get("/api/pacientes/12345678/carpetas", headers=headers_admin)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["nombre"] == "Test Carpeta"


def test_renombrar_carpeta(client, headers_admin, sample_paciente):
    carpeta_id = _crear_carpeta(client, headers_admin)
    resp = client.put(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}",
        json={"nombre": "Nuevo nombre"},
        headers=headers_admin,
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Nuevo nombre"


def test_eliminar_carpeta_vacia(client, headers_admin, sample_paciente):
    carpeta_id = _crear_carpeta(client, headers_admin)
    resp = client.delete(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}",
        headers=headers_admin,
    )
    assert resp.status_code == 200
    resp = client.get("/api/pacientes/12345678/carpetas", headers=headers_admin)
    assert len(resp.json()) == 0


def test_eliminar_carpeta_cascada(client, headers_admin, sample_paciente, db):
    """DELETE carpeta con imágenes → 0 metadatos, 0 binarios."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    # Subir 2 imágenes
    for i in range(2):
        img_bytes = _generar_imagen_bytes()
        resp = client.post(
            f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
            files={"archivo": ("test.jpg", img_bytes, "image/jpeg")},
            data={"es_radiografia": "false"},
            headers=headers_admin,
        )
        assert resp.status_code == 201

    # Verificar que hay imágenes
    resp = client.get(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        headers=headers_admin,
    )
    assert len(resp.json()) == 2

    # Eliminar carpeta
    resp = client.delete(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}",
        headers=headers_admin,
    )
    assert resp.status_code == 200

    # Verificar 0 imágenes en DB
    count = db.query(models.Imagen).filter(
        models.Imagen.id_carpeta == carpeta_id
    ).count()
    assert count == 0

    # Verificar 0 binarios en DB
    count_contenido = db.query(models.ImagenContenido).count()
    assert count_contenido == 0


# ─── Tests de Imágenes ────────────────────────────────────────


def test_subir_radiografia_lossless(client, headers_admin, sample_paciente):
    """es_radiografia=true → WebP lossless, peso final < original."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    img_bytes = _generar_imagen_bytes(width=500, height=500, fmt="JPEG")
    original_size = len(img_bytes)

    resp = client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("radiografia.jpg", img_bytes, "image/jpeg")},
        data={"es_radiografia": "true"},
        headers=headers_admin,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["tipo_mime"] == "image/webp"
    assert data["es_radiografia"] is True
    assert data["tamano_bytes"] < original_size, (
        f"WebP ({data['tamano_bytes']} bytes) debería pesar menos que "
        f"original ({original_size} bytes)"
    )


def test_subir_imagen_normal_comprimida(client, headers_admin, sample_paciente):
    """es_radiografia=false → WebP quality=80, resize si >2000px, peso final < original."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    # Imagen de 2500x2000 → debe redimensionarse a 2000x1600 (lado mayor ≤2000)
    img_bytes = _generar_imagen_bytes(width=2500, height=2000, fmt="PNG")
    original_size = len(img_bytes)

    resp = client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("foto.png", img_bytes, "image/png")},
        data={"es_radiografia": "false"},
        headers=headers_admin,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["tipo_mime"] == "image/webp"
    assert data["es_radiografia"] is False
    assert data["tamano_bytes"] < original_size, (
        f"WebP ({data['tamano_bytes']} bytes) debería pesar menos que "
        f"original ({original_size} bytes)"
    )


def test_subir_archivo_corrupto(client, headers_admin, sample_paciente):
    """Archivo corrupto → error 400, sin datos guardados."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    # Bytes que no forman una imagen válida
    resp = client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("fake.jpg", b"not-an-image-binary-data", "image/jpeg")},
        data={"es_radiografia": "false"},
        headers=headers_admin,
    )
    assert resp.status_code == 400
    assert "no es una imagen válida" in resp.json()["detail"].lower()


def test_subir_archivo_excede_10mb(client, headers_admin, sample_paciente):
    """Archivo > 10MB → error, sin datos guardados."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    # Generar bytes que excedan 10MB
    big_data = b"x" * (10 * 1024 * 1024 + 1)
    resp = client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("big.jpg", big_data, "image/jpeg")},
        data={"es_radiografia": "false"},
        headers=headers_admin,
    )
    assert resp.status_code == 400
    assert "10 MB" in resp.json()["detail"]


def test_listar_imagenes_solo_metadatos(client, headers_admin, sample_paciente):
    """Listar imágenes retorna metadatos, no binario."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    img_bytes = _generar_imagen_bytes()
    client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("test.jpg", img_bytes, "image/jpeg")},
        data={"es_radiografia": "false"},
        headers=headers_admin,
    )
    resp = client.get(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        headers=headers_admin,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    # Verificar que NO contiene binario (campo contenido no existe en response)
    assert "contenido" not in data[0]
    # Verificar metadatos presentes
    assert "nombre_original" in data[0]
    assert "tipo_mime" in data[0]
    assert "tamano_bytes" in data[0]
    assert "es_radiografia" in data[0]


def test_obtener_contenido_imagen(client, headers_admin, sample_paciente):
    """GET /imagenes/{id}/contenido retorna binario WebP."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    img_bytes = _generar_imagen_bytes()
    resp = client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("test.jpg", img_bytes, "image/jpeg")},
        data={"es_radiografia": "false"},
        headers=headers_admin,
    )
    img_id = resp.json()["id"]

    resp = client.get(f"/api/imagenes/{img_id}/contenido", headers=headers_admin)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/webp"
    assert len(resp.content) > 0


def test_eliminar_imagen_individual(client, headers_admin, sample_paciente, db):
    """DELETE /imagenes/{id} elimina metadatos + binario."""
    carpeta_id = _crear_carpeta(client, headers_admin)
    img_bytes = _generar_imagen_bytes()
    resp = client.post(
        f"/api/pacientes/12345678/carpetas/{carpeta_id}/imagenes",
        files={"archivo": ("test.jpg", img_bytes, "image/jpeg")},
        data={"es_radiografia": "false"},
        headers=headers_admin,
    )
    img_id = resp.json()["id"]

    resp = client.delete(f"/api/imagenes/{img_id}", headers=headers_admin)
    assert resp.status_code == 200

    # Verificar metadato eliminado
    assert db.query(models.Imagen).filter(models.Imagen.id == img_id).count() == 0
    # Verificar binario eliminado
    assert db.query(models.ImagenContenido).filter(
        models.ImagenContenido.id_imagen == img_id
    ).count() == 0


# ─── Tests de autenticación ───────────────────────────────────


def test_no_auth_returns_401(client):
    """Endpoints sin token deben retornar 401."""
    endpoints = [
        ("GET", "/api/pacientes/12345678/carpetas"),
        ("POST", "/api/pacientes/12345678/carpetas"),
        ("GET", "/api/pacientes/12345678/carpetas/1/imagenes"),
    ]
    for method, url in endpoints:
        if method == "GET":
            response = client.get(url)
        elif method == "POST":
            response = client.post(url, json={})
        assert response.status_code == 401, f"{method} {url} should return 401"
