# alertas-en-ficha

Extensión de `GET /pacientes/{dni}` para incluir alertas médicas activas.

## PacienteFichaResponse

```python
class PacienteFichaResponse(PacienteResponse):
    alertas: list[AlertaMedicaResponse] = []

    class Config:
        from_attributes = True
```

## Endpoint

`GET /api/pacientes/{dni}` → `PacienteFichaResponse`

Composición en el router:
1. Obtener paciente con `obtener_paciente_por_dni(db, dni)`. `404` si no existe.
2. Obtener alertas activas con `crud.historia_clinica.listar_alertas(db, dni)`.
3. Construir response con datos del paciente + lista de alertas.

No se modifica `GET /pacientes/` (listado general) para evitar N+1 queries.
No se modifican `POST` ni `PUT` de pacientes.

## Reuso

`listar_alertas` (crud/historia_clinica.py:22-26) ya filtra:
- `AlertaMedica.activo == True`
- Ordenadas por `creado_en DESC`

Cero lógica nueva o duplicada.
