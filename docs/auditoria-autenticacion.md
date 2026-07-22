# Auditoría Puntual del Módulo de Autenticación — OdontoGest

Este documento detalla el comportamiento del contrato real de autenticación expuesto por el backend en FastAPI para facilitar su correcta integración con `frontend2`.

---

## 1. Tipo de Token Devuelto en Login
* **Endpoint:** `POST /auth/login` (Ruta real en backend, sin prefijo `/api` por defecto).
* **Comportamiento:** Devuelve un **par de tokens** (`access_token` y `refresh_token`), más un campo de tipo de token.
* **Shape Exacto de la Respuesta (Success):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer"
  }
  ```

---

## 2. Duración y Mecanismos de Renovación
* **Duración del `access_token`:** **30 minutos** (configurado mediante `ACCESS_TOKEN_EXPIRE_MINUTES` en `backend/core/config.py`).
* **Duración del `refresh_token`:** **7 días** (configurado mediante `REFRESH_TOKEN_EXPIRE_DAYS` en `backend/core/config.py`).
* **Endpoint de Renovación:** **Sí existe** el endpoint `POST /auth/refresh`.
  * **Request Body Shape:**
    ```json
    {
      "refresh_token": "string"
    }
    ```
  * **Response Shape:** Retorna un nuevo par de tokens con el mismo shape del login (`TokenResponse`).

---

## 3. Identificación del Rol (admin/secretaria)
* **Dentro del JWT:** El rol del usuario **sí viene codificado** en el payload (claims) del token de acceso (`access_token`) bajo el campo `"rol"`.
  * **Payload del JWT decodificado (Ejemplo):**
    ```json
    {
      "sub": "admin",
      "rol": "admin",
      "exp": 1784234567
    }
    ```
* **Endpoint Alternativo:** También se puede obtener/confirmar consultando el endpoint protegido `GET /auth/me` con la cabecera `Authorization: Bearer <access_token>`, el cual responde con la entidad del usuario actual:
  ```json
  {
    "id": 1,
    "username": "admin",
    "rol": "admin",
    "activo": true,
    "creado_en": "2026-07-10T15:30:00"
  }
  ```

---

## 4. Comportamiento y Respuestas de Error
FastAPI y la lógica de dependencias implementada devuelven los siguientes estados y estructuras JSON ante fallos de autenticación o autorización:

### A. Credenciales Inválidas
* **Ruta:** `POST /auth/login`
* **HTTP Status:** `401 Unauthorized`
* **Response Body Shape:**
  ```json
  {
    "detail": "Credenciales inválidas"
  }
  ```

### B. Token Expirado o Inválido (Ruta Protegida)
* **HTTP Status:** `401 Unauthorized`
* **Response Body Shape:**
  ```json
  {
    "detail": "Token inválido o expirado"
  }
  ```

### C. Cabecera Authorization Faltante (No Autenticado)
* **HTTP Status:** `401 Unauthorized` (generado por `OAuth2PasswordBearer` de FastAPI).
* **Response Body Shape:**
  ```json
  {
    "detail": "Not authenticated"
  }
  ```

### D. Permisos Insuficientes (Forbidden)
* **HTTP Status:** `403 Forbidden` (generado por la dependencia `require_role(["admin"])`).
* **Response Body Shape:**
  ```json
  {
    "detail": "No tiene permisos para realizar esta acción"
  }
  ```
