## 1. Setup

- [x] 1.1 Agregar `Pillow` a `backend/requirements.txt`
- [x] 1.2 Crear archivo `backend/services/almacenamiento.py` (esqueleto: imports, clase ABC, placeholder factory)

## 2. Modelos de datos

- [x] 2.1 Agregar `CarpetaPaciente` a `backend/models.py` (tabla `carpetas`: id PK, dni_paciente FK, nombre String, creado_por_id FK, creado_en DateTime)
- [x] 2.2 Agregar `Imagen` a `backend/models.py` (tabla `imagenes`: id PK, id_carpeta FK, nombre_original, tipo_mime, tamano_bytes Integer, es_radiografia Boolean, creado_por_id FK, creado_en DateTime)
- [x] 2.3 Agregar `ImagenContenido` a `backend/models.py` (tabla `imagenes_contenido`: id_imagen FK/PK, contenido LargeBinary)

## 3. Abstracción de almacenamiento

- [x] 3.1 Implementar clase ABC `AlmacenamientoArchivos` con métodos abstractos `guardar(id_imagen, bytes, es_radiografia) → int`, `obtener(id_imagen) → bytes`, `eliminar(id_imagen)`
- [x] 3.2 Implementar `AlmacenamientoPostgres(AlmacenamientoArchivos)` que lee/escribe en tabla `imagenes_contenido`
- [x] 3.3 Implementar lógica de compresión WebP en `guardar()`: lossless si `es_radiografia=true` (fallback quality=95 si >15MB); quality=80 + resize a 2000px si `es_radiografia=false`
- [x] 3.4 Implementar factory `obtener_almacenamiento() → AlmacenamientoArchivos` que retorna instancia configurable

## 4. Schemas Pydantic

- [x] 4.1 Crear `backend/schemas/imagenes.py` con `CarpetaCreate` (nombre), `CarpetaResponse` (id, dni_paciente, nombre, creado_en), `CarpetaUpdate` (nombre)
- [x] 4.2 Agregar `ImagenResponse` (id, id_carpeta, nombre_original, tipo_mime, tamano_bytes, es_radiografia, creado_en) con `from_attributes=True`
- [x] 4.3 Modificar `backend/schemas/historia_clinica.py` → `ResumenPacienteResponse.imagenes` de `Optional[int]` a `int`

## 5. CRUD de carpetas e imágenes

- [x] 5.1 Crear `backend/crud/imagenes.py` con `crear_carpeta(db, dni, nombre, creado_por_id)`, `listar_carpetas(db, dni)`, `renombrar_carpeta(db, id, nombre)`, `eliminar_carpeta(db, id)` (CASCADE: borra imágenes + binarios vía almacenamiento)
- [x] 5.2 Implementar `guardar_imagen(db, id_carpeta, archivo, es_radiografia, creado_por_id)` — valida MIME (jpg/png/webp), tamaño ≤10MB, llama a `almacenamiento.guardar()`, guarda metadatos en `imagenes`
- [x] 5.3 Implementar `listar_imagenes(db, id_carpeta)`, `obtener_imagen(db, id)`, `eliminar_imagen(db, id)` (borra metadatos + binario vía almacenamiento)
- [x] 5.4 Implementar `contar_imagenes_paciente(db, dni)` — cuenta imágenes en todas las carpetas del paciente

## 6. Endpoints

- [x] 6.1 Crear `backend/routers/imagenes.py` con prefijo `/pacientes` y dependencia `require_role(["admin", "secretaria"])`
- [x] 6.2 `POST /pacientes/{dni}/carpetas` → crear carpeta
- [x] 6.3 `GET /pacientes/{dni}/carpetas` → listar carpetas
- [x] 6.4 `PUT /pacientes/{dni}/carpetas/{id}` → renombrar carpeta
- [x] 6.5 `DELETE /pacientes/{dni}/carpetas/{id}` → eliminar carpeta (CASCADE)
- [x] 6.6 `POST /pacientes/{dni}/carpetas/{id}/imagenes` → subir imagen (multipart + `es_radiografia` bool)
- [x] 6.7 `GET /pacientes/{dni}/carpetas/{id}/imagenes` → listar metadatos de imágenes
- [x] 6.8 `GET /imagenes/{id}/contenido` → devolver binario (usar router separado o incluir en mismo router con ruta absoluta)
- [x] 6.9 `DELETE /imagenes/{id}` → eliminar imagen individual

## 7. Integración

- [x] 7.1 Registrar `imagenes.router` en `backend/main.py`
- [x] 7.2 Actualizar `backend/crud/historia_clinica.py` → `obtener_resumen()` llama a `contar_imagenes_paciente()` en vez de retornar `None`

## 8. Tests

- [x] 8.1 Crear `backend/tests/test_imagenes.py` con fixture de DB real (reutilizar conftest)
- [x] 8.2 `test_subir_radiografia_lossless` — verifica WebP lossless, peso final < original
- [x] 8.3 `test_subir_imagen_normal_comprimida` — verifica quality=80, resize si >2000px, peso final < original
- [x] 8.4 `test_subir_archivo_corrupto` — verifica error 400, sin datos guardados
- [x] 8.5 `test_subir_archivo_excede_10mb` — verifica error 413, sin datos guardados
- [x] 8.6 `test_eliminar_carpeta_cascada` — DELETE carpeta con imágenes → 0 metadatos, 0 binarios

## 9. Knowledge Base

- [x] 9.1 Agregar tablas `carpetas`, `imagenes`, `imagenes_contenido` a `knowledge-base/04_modelo_de_datos.md`
- [x] 9.2 Agregar RN-19 (gestión de imágenes y radiografías) a `knowledge-base/05_reglas_de_negocio.md`
