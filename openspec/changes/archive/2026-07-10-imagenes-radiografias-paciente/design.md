## Context

El sistema OdontoGest ya tiene gestión completa de pacientes (C-02), autenticación JWT con roles (C-06), historia clínica con alertas y evoluciones (C-14), y un endpoint de resumen (`GET /pacientes/{dni}/resumen`) que devuelve `imagenes: null` como placeholder. Este change agrega el módulo de imágenes/radiografías, completando la ficha clínica del paciente.

Restricción: las imágenes se almacenan temporalmente en PostgreSQL (`LargeBinary`). Cuando se haga deploy real, se migrará a Supabase Storage. La arquitectura debe soportar ese swap sin reescribir lógica de negocio.

## Goals / Non-Goals

**Goals:**
- CRUD de carpetas por paciente (nombre libre, sin estructura fija).
- Subida de imágenes con compresión WebP automática vía Pillow.
- Modo lossless para radiografías (`es_radiografia=true`), comprimido para normales.
- Abstracción de almacenamiento que desacople endpoints del storage concreto.
- Actualizar `GET /pacientes/{dni}/resumen` para devolver conteo real de imágenes.
- Tests de integración con DB real cubriendo los 5 escenarios definidos.

**Non-Goals:**
- UI de gestión de imágenes (se implementará en C-13 frontend2 o change futuro).
- Implementación de `AlmacenamientoSupabase` (solo interfaz lista para el swap).
- Migración de imágenes existentes (no hay).
- Thumbnails o previsualizaciones (se sirve el WebP completo; el frontend puede escalar con CSS).
- Compresión selectiva por tipo de archivo original (todo va a WebP, sin excepciones).

## Decisions

### D-01: Tabla separada para binarios (`imagenes_contenido`)

**Decisión**: Los metadatos van en `imagenes`, el binario en `imagenes_contenido` (1:1, FK como PK).

**Alternativa considerada**: Columna `contenido: LargeBinary` en la misma tabla `imagenes`.

**Razón**: Las queries de listado (`GET .../imagenes`, `GET .../resumen`) no necesitan el binario. Tenerlo en tabla separada evita que SQLAlchemy cargue el `LargeBinary` en memoria al hacer `query(Imagen).all()`. Con `defer()` se podría evitar en misma tabla, pero la separación física es más explícita y permite en el futuro mover `imagenes_contenido` a otro tablespace o storage externo sin tocar metadatos.

### D-02: Eliminación de carpeta en CASCADE

**Decisión**: `DELETE /pacientes/{dni}/carpetas/{id}` elimina la carpeta, todas sus imágenes (metadatos) y todos los binarios asociados. Sin bloqueo.

**Alternativa considerada**: Bloquear el DELETE si la carpeta tiene imágenes, obligando a vaciarla primero.

**Razón**: El contexto es clínico, con usuarios admin/secretaria que entienden lo que hacen. Forzar un vaciado manual agrega fricción innecesaria. Además, la eliminación de una carpeta de radiografías completa (ej. "Radiografías 2025") es una operación semánticamente válida. El frontend mostrará confirmación con conteo de imágenes afectadas.

### D-03: Compresión en capa de almacenamiento, no en endpoint

**Decisión**: La lógica de compresión con Pillow reside en `AlmacenamientoArchivos.guardar()`, no en el router ni en el CRUD.

**Alternativa considerada**: Comprimir en el endpoint antes de llamar a `guardar()`.

**Razón**: La compresión es parte del contrato de almacenamiento. Si mañana cambiamos a `AlmacenamientoSupabase`, queremos que la misma compresión aplique sin duplicar lógica. El endpoint solo valida tipo MIME y tamaño del upload original; delega la transformación al storage layer.

### D-04: WebP universal, sin preservar formato original

**Decisión**: Toda imagen se convierte a WebP. `tipo_mime` siempre `"image/webp"`. El campo `nombre_original` preserva el nombre del archivo subido (incluyendo extensión original) para referencia.

**Alternativa considerada**: Preservar formato original, ofrecer WebP como opción.

**Razón**: WebP tiene soporte universal en navegadores modernos (>97% global), pesa 25-35% menos que JPEG, y unifica el formato de salida simplificando el serving (no hay que negociar Accept headers). Para el caso de uso odontológico (visualización en navegador, no intercambio DICOM), WebP es suficiente.

### D-05: Límite 10 MB sobre archivo original

**Decisión**: El límite de 10 MB se valida sobre el `Content-Length` del upload original, antes de comprimir. Sin segundo límite post-compresión.

**Alternativa considerada**: Límite post-compresión.

**Razón**: El propósito es evitar uploads accidentales de archivos enormes (ej. RAW de cámara de 40 MB). El WebP resultante siempre será menor que el original. Validar post-compresión requeriría procesar el archivo completo primero para luego rechazarlo, desperdiciando recursos.

### D-06: `es_radiografia` como booleano en metadatos

**Decisión**: Campo `es_radiografia: bool` en la tabla `imagenes`. Viene como campo de formulario en el multipart upload.

**Alternativa considerada**: Enum de tipos (`radiografia`, `foto_intraoral`, `otro`).

**Razón**: La distinción relevante para el sistema es solo binaria: ¿requiere calidad diagnóstica lossless o no? Un enum agrega complejidad sin valor funcional. Si en el futuro se necesita clasificar, se puede agregar sin romper el booleano existente.

## Risks / Trade-offs

- **[Riesgo] LargeBinary en PostgreSQL crece rápido** → Mitigación: no es storage definitivo. En deploy real se migra a Supabase Storage. Mientras tanto, el límite de 10 MB por archivo y la compresión WebP mantienen el crecimiento controlado. Una clínica típica con 1000 imágenes/año a ~500 KB c/u = ~500 MB/año, manejable.
- **[Riesgo] Compresión lossless puede generar archivos grandes** → Mitigación: fallback a quality=95 si el lossless >15 MB. Esto cubre el caso borde de radiografías con mucho detalle que comprimen mal en lossless.
- **[Riesgo] Sin UI en este change** → Mitigación aceptada: los endpoints son testeables vía HTTP (curl, Postman, Swagger). La UI llega en C-13 o change dedicado. Los endpoints están diseñados para consumo directo desde frontend.
- **[Trade-off] No hay thumbnails** → El frontend recibe el WebP completo. Para una galería de 20 imágenes de ~300 KB c/u, son 6 MB de descarga — aceptable en broadband. Si se necesita optimizar, se puede agregar un endpoint de thumbnail después sin cambiar el modelo de datos.

## Open Questions

- Ninguna. Todas las decisiones fueron resueltas en fase de plan con el usuario.
