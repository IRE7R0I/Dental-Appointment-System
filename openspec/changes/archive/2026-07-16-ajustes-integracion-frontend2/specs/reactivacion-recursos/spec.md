# reactivacion-recursos

Endpoints PATCH para alternar estado `activo` en recursos con soft-delete.

## PATCH /doctores/{id}/activo

- **Auth**: admin
- **Request body**: `{"activo": bool}`
- **Response**: `200` con `DoctorResponse` completo. `404` si doctor no existe.
- **Behavior**: `activo=true` reactiva doctor existente, recupera horarios intactos (C-16).
  `activo=false` equivale a soft-delete (`desactivar_doctor` existente).

## PATCH /catalogo/tratamientos/{id}/activo

- **Auth**: admin, secretaria
- **Request body**: `{"activo": bool}`
- **Response**: `200` con `TratamientoCatalogoResponse`. `404` si no existe.
- **Behavior**: `activo=true` reactiva, `activo=false` delega en `soft_delete_tratamiento`.

## PATCH /catalogo/obras-sociales/{id}/activo

- **Auth**: admin, secretaria
- **Request body**: `{"activo": bool}`
- **Response**: `200` con `ObraSocialResponse`. `404` si no existe.
- **Behavior**: `activo=true` reactiva, `activo=false` delega en `soft_delete_obra_social`.

## PATCH /admin/usuarios/{user_id}/activo

- **Auth**: admin
- **Request body**: `{"activo": bool}`
- **Response**: `200` con `UserResponse`. `404` si no existe. `403` si admin intenta desactivarse a sí mismo.
- **Behavior**: `activo=true` reactiva con misma contraseña (hash intacto). `activo=false` desactiva.

## Schema compartido

```python
class ActivoUpdate(BaseModel):
    activo: bool
```
