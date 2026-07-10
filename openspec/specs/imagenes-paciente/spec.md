# imagenes-paciente Specification

## Purpose
TBD - created by archiving change imagenes-radiografias-paciente. Update Purpose after archive.
## Requirements
### Requirement: Carpetas de imágenes por paciente
El sistema SHALL permitir crear carpetas personalizadas para organizar imágenes de un paciente. Cada carpeta DEBE tener un nombre definido por el usuario y estar asociada a un paciente. Solo usuarios con rol `admin` o `secretaria` PUEDEN crear, listar, renombrar o eliminar carpetas.

#### Scenario: Crear carpeta
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/carpetas` con `{"nombre": "Radiografías 2026"}`
- **THEN** el sistema crea la carpeta asociada al paciente y retorna 201 con `id`, `dni_paciente`, `nombre`, `creado_por_id` y `creado_en`

#### Scenario: Listar carpetas de un paciente
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/carpetas`
- **THEN** el sistema retorna lista de todas las carpetas del paciente, ordenadas por `creado_en` descendente

#### Scenario: Renombrar carpeta
- **WHEN** un usuario autenticado envía `PUT /pacientes/{dni}/carpetas/{id}` con `{"nombre": "Fotos intraorales 2026"}`
- **THEN** el sistema actualiza el nombre de la carpeta y retorna 200 con los datos actualizados

#### Scenario: Eliminar carpeta con imágenes (CASCADE)
- **WHEN** un usuario autenticado envía `DELETE /pacientes/{dni}/carpetas/{id}` para una carpeta que contiene 5 imágenes
- **THEN** el sistema elimina la carpeta, las 5 filas de metadatos en `imagenes` y los 5 binarios en `imagenes_contenido`, y retorna 200

#### Scenario: Eliminar carpeta vacía
- **WHEN** un usuario autenticado envía `DELETE /pacientes/{dni}/carpetas/{id}` para una carpeta sin imágenes
- **THEN** el sistema elimina la carpeta y retorna 200

#### Scenario: Carpeta de paciente no encontrado
- **WHEN** un usuario autenticado intenta crear una carpeta para un DNI que no existe
- **THEN** el sistema retorna 404 "Paciente no encontrado"

#### Scenario: Usuario no autenticado no puede gestionar carpetas
- **WHEN** un usuario sin token JWT intenta cualquier endpoint de carpetas
- **THEN** el sistema retorna 401 Unauthorized

### Requirement: Subida de imágenes con compresión WebP
El sistema SHALL permitir subir imágenes a una carpeta de paciente, aplicando compresión automática a WebP según el tipo de imagen. Las radiografías DEBEN comprimirse en modo lossless para preservar detalle diagnóstico. Las imágenes normales DEBEN comprimirse con quality=80 y redimensionarse si el lado mayor supera 2000px. El tipo MIME almacenado DEBE ser siempre `image/webp`. Solo usuarios con rol `admin` o `secretaria` PUEDEN subir imágenes.

#### Scenario: Subir radiografía en modo lossless
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/carpetas/{id}/imagenes` con un archivo JPEG de 4 MB y campo `es_radiografia=true`
- **THEN** el sistema convierte la imagen a WebP lossless, almacena el binario comprimido, guarda metadatos con `tipo_mime="image/webp"` y `es_radiografia=true`, y retorna 201. El `tamano_bytes` del WebP guardado DEBE ser menor que los 4 MB originales

#### Scenario: Subir imagen normal con compresión
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/carpetas/{id}/imagenes` con un archivo PNG de 8 MB de 3000x4000px y campo `es_radiografia=false`
- **THEN** el sistema redimensiona la imagen a 1500x2000px (manteniendo proporción, lado mayor ≤2000px), la convierte a WebP quality=80, y retorna 201. El `tamano_bytes` del WebP guardado DEBE ser menor que los 8 MB originales

#### Scenario: Archivo que excede límite de 10 MB
- **WHEN** un usuario intenta subir un archivo de 12 MB
- **THEN** el sistema retorna 413 con mensaje "El archivo excede el límite de 10 MB", sin procesar ni almacenar nada

#### Scenario: Archivo corrupto o no válido
- **WHEN** un usuario intenta subir un archivo que no es una imagen válida (ej. un PDF renombrado a .jpg)
- **THEN** el sistema retorna 400 con mensaje "El archivo no es una imagen válida o está corrupto", sin almacenar binario ni metadatos

#### Scenario: Tipo MIME no permitido
- **WHEN** un usuario intenta subir un archivo con Content-Type `application/pdf`
- **THEN** el sistema retorna 400 con mensaje indicando los tipos permitidos (image/jpeg, image/png, image/webp)

### Requirement: Listado y descarga de imágenes
El sistema SHALL permitir listar los metadatos de imágenes de una carpeta (sin incluir el binario) y descargar el contenido binario de una imagen individual. Solo usuarios con rol `admin` o `secretaria` PUEDEN acceder a estos endpoints.

#### Scenario: Listar imágenes de una carpeta (solo metadatos)
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/carpetas/{id}/imagenes`
- **THEN** el sistema retorna lista de imágenes con `id`, `nombre_original`, `tipo_mime`, `tamano_bytes`, `es_radiografia`, `creado_por_id`, `creado_en`. El binario NO DEBE incluirse en la respuesta

#### Scenario: Obtener contenido binario de una imagen
- **WHEN** un usuario autenticado solicita `GET /imagenes/{id}/contenido`
- **THEN** el sistema retorna el binario WebP con Content-Type `image/webp` y status 200

#### Scenario: Imagen no encontrada
- **WHEN** un usuario solicita contenido de una imagen con ID inexistente
- **THEN** el sistema retorna 404 "Imagen no encontrada"

### Requirement: Eliminación de imágenes
El sistema SHALL permitir eliminar una imagen individual, incluyendo sus metadatos y su contenido binario. Solo usuarios con rol `admin` o `secretaria` PUEDEN eliminar imágenes.

#### Scenario: Eliminar imagen individual
- **WHEN** un usuario autenticado envía `DELETE /imagenes/{id}`
- **THEN** el sistema elimina la fila en `imagenes` y la fila correspondiente en `imagenes_contenido`, y retorna 200

#### Scenario: Eliminar imagen inexistente
- **WHEN** un usuario intenta eliminar una imagen con ID que no existe
- **THEN** el sistema retorna 404 "Imagen no encontrada"

### Requirement: Abstracción de almacenamiento intercambiable
El sistema SHALL implementar una capa de abstracción para el almacenamiento de archivos que permita cambiar la implementación concreta sin modificar la lógica de negocio. La capa SHALL exponer los métodos `guardar(id_imagen, bytes, es_radiografia) → int`, `obtener(id_imagen) → bytes`, y `eliminar(id_imagen)`. La compresión WebP SHALL aplicarse dentro de esta capa, no en los endpoints.

#### Scenario: Cambio de implementación de almacenamiento
- **WHEN** se reemplaza `AlmacenamientoPostgres` por `AlmacenamientoSupabase` en la factory
- **THEN** los endpoints y el CRUD de imágenes DEBEN seguir funcionando sin modificaciones, ya que solo dependen de la interfaz `AlmacenamientoArchivos`

