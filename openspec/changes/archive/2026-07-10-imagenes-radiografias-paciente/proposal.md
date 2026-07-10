## Why

Los profesionales necesitan adjuntar radiografías, fotos intraorales y otros estudios de imagen a la ficha del paciente. Hoy no hay forma de almacenar ni consultar imágenes dentro del sistema — se manejan por fuera (carpetas en el disco, WhatsApp, email). Esto rompe el flujo clínico y dispersa la información del paciente. El módulo de historia clínica (C-14) ya tiene el campo `imagenes` en el resumen, pero siempre devuelve `null`. Es momento de darle contenido real.

## What Changes

- **Nuevos modelos**: `CarpetaPaciente` (carpetas por paciente), `Imagen` (metadatos de cada imagen), `ImagenContenido` (binario en PostgreSQL, temporal hasta migrar a Supabase Storage).
- **Abstracción de almacenamiento**: capa `AlmacenamientoArchivos` (ABC) que desacopla endpoints del storage concreto. Implementación `AlmacenamientoPostgres` hoy; intercambiable por `AlmacenamientoSupabase` mañana sin tocar lógica de negocio.
- **Compresión automática con Pillow**: toda imagen subida se normaliza a WebP. Radiografías (`es_radiografia=true`) en lossless para preservar detalle diagnóstico. Imágenes normales con quality=80 y resize a 2000px máximo.
- **CRUD de carpetas**: crear, listar, renombrar, eliminar (CASCADE: borra imágenes + binarios).
- **CRUD de imágenes**: subir (multipart + checkbox `es_radiografia`), listar metadatos, obtener binario, eliminar.
- **Actualización de resumen**: `GET /pacientes/{dni}/resumen` → campo `imagenes` devuelve conteo real en vez de `null`.
- **Nueva regla de negocio RN-19**: tipos de archivo permitidos, límite 10 MB sobre original, compresión WebP, eliminación cascada, no exponer datos en logs.

## Capabilities

### New Capabilities
- `imagenes-paciente`: Gestión de carpetas e imágenes/radiografías asociadas a un paciente. Incluye CRUD de carpetas, subida de imágenes con compresión WebP automática (lossless para radiografías, comprimida para normales), almacenamiento binario abstraído para futura migración a Supabase, y endpoint de descarga de contenido.

### Modified Capabilities
- `historia-clinica`: El endpoint `GET /pacientes/{dni}/resumen` modifica el campo `imagenes` de `Optional[int] = None` a `int` con conteo real de imágenes asociadas al paciente (contando a través de sus carpetas).

## Impact

- **Backend**: `models.py` (+3 tablas), `services/almacenamiento.py` (nuevo), `schemas/imagenes.py` (nuevo), `crud/imagenes.py` (nuevo), `routers/imagenes.py` (nuevo), `main.py` (registrar router), `crud/historia_clinica.py` (actualizar obtener_resumen), `schemas/historia_clinica.py` (cambiar tipo de imagenes).
- **Dependencia nueva**: `Pillow` (compresión WebP).
- **Tests**: `test_imagenes.py` — 5 tests de integración con DB real.
- **Knowledge base**: `04_modelo_de_datos.md` (+3 tablas), `05_reglas_de_negocio.md` (+RN-19).
- **Frontend**: sin cambios en este change. La UI de gestión de imágenes se implementará en frontend2 (C-13) o en un change futuro.
- **Breaking changes**: ninguno. El endpoint de resumen cambia el tipo de `imagenes` de `Optional[int]` a `int`, pero el valor `None` se convierte en `0` para pacientes sin imágenes — compatible hacia adelante.
