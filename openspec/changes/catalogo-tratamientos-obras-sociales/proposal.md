# CHANGE-011: Catálogo de Tratamientos y Obras Sociales

## Problema

Actualmente los tratamientos se ingresan como texto libre en el modal de cierre
de turno (`TurnoTratamiento.nombre`). No hay una lista centralizada de servicios
con precios base. La secretaria debe escribir el nombre y precio cada vez.

Además, el campo `obra_social` del paciente es texto libre sin validación,
lo que genera inconsistencias (ej: "OSDE", "osde", "Osde", "O.S.D.E.").

Para el portal de autogestión (CHANGE-007), el paciente necesita ver una lista
de tratamientos con nombres, precios y duración para elegir. Sin catálogo, no
hay portal.

## Solución

Dos nuevos modelos con CRUD completo:

1. **TratamientoCatalogo**: lista maestra de servicios odontológicos con
   precios base en ARS y USD, duración estimada y categoría.
2. **ObraSocial**: catálogo de mutuales y obras sociales para selectores.

Ambos se integran en:
- Modal de cierre de turno (dashboard interno): elegir del catálogo o "Manual"
- Portal de autogestión paso 1 (CHANGE-007): cards con tratamientos
- Perfil del paciente y formulario de registro: selector de obra social

## Capabilities

- `catalogo-tratamientos`: CRUD de tratamientos con precios ARS/USD
- `catalogo-obras-sociales`: CRUD de obras sociales
- `integracion-modal-turno`: modal de turno usa catálogo con precio editable
- `seed-obras-sociales`: datos iniciales de mutuales argentinas

## Impacto

### Backend — archivos nuevos
- `backend/schemas/catalogo.py`
- `backend/crud/catalogo.py`
- `backend/routers/catalogo.py`

### Backend — archivos modificados
- `backend/models.py` (+TratamientoCatalogo, +ObraSocial)
- `backend/main.py` (registrar router catalogo)
- `backend/seed.py` (seed de obras sociales)

### Frontend — archivos nuevos
- `frontend/src/pages/CatalogoPage.tsx`

### Frontend — archivos modificados
- `frontend/src/pages/AgendaPage.tsx` (modal de turno usa catálogo)
- `frontend/src/types/index.ts` (+tipos TratamientoCatalogo, ObraSocial)

## Depende de
- CHANGE-009 (auth para endpoints de escritura del catálogo)

## Riesgos

- **Migración**: modelos nuevos, sin migración de datos existentes.
- **Precios editables**: el catálogo define precios base, pero la secretaria
  puede modificarlos al cerrar turno (descuentos, recargos). El precio del
  catálogo es una sugerencia, no una restricción.
