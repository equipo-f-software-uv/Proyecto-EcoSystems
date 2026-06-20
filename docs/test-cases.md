# Casos de Prueba - Entidad Perfil de Cultivo (`perfil_cultivo`)

Este archivo contiene los casos de prueba para verificar manualmente el comportamiento de los endpoints `POST` y `PUT` asociados a la gestión de perfiles de cultivo y umbrales de riego de la plataforma **EcoSystems**.

Las pruebas aplican dos técnicas clásicas de diseño:
* **Clases de Equivalencia (CE)**: Agrupar valores en conjuntos válidos e inválidos.
* **Análisis de Valores Límite (VL)**: Probar los límites exactos de validez física y lógica de las variables.

---

## 1. POST /api/crop-profiles (Creación de Perfil)

**Restricciones de Validación:**
* `cropName`: String no vacío, obligatorio y único (no duplicado).
* `minHumidity`: Entero entre `0` y `100`. Obligatorio.
* `maxHumidity`: Entero entre `0` y `100`. Obligatorio.
* **Relación Lógica**: `minHumidity` debe ser estrictamente menor que `maxHumidity`.

### Clases de Eq| ID | Técnica | Descripción | Input JSON | HTTP esp. | Resultado real |
| :--- | :---: | :--- | :--- | :---: | :--- |
| P01 | CE | Todos los campos válidos | `{"cropName": "Arándanos", "minHumidity": 35, "maxHumidity": 75}` | 201 | **201 Created** (Perfil creado, ID: 1) |
| P02 | CE | Nombre de cultivo vacío | `{"cropName": "", "minHumidity": 35, "maxHumidity": 75}` | 400 | **400 Bad Request** (MISSING_FIELDS) |
| P03 | CE | Nombre de cultivo ausente | `{"minHumidity": 35, "maxHumidity": 75}` | 400 | **400 Bad Request** (MISSING_FIELDS) |
| P04 | CE | Nombre de cultivo duplicado | `{"cropName": "Arándanos", "minHumidity": 35, "maxHumidity": 75}` (si ya existe) | 409 | **409 Conflict** (PROFILE_ALREADY_EXISTS) |
| P05 | CE | Humedad mínima física negativa | `{"cropName": "Cerezas", "minHumidity": -15, "maxHumidity": 75}` | 400 | **400 Bad Request** (INVALID_RANGE) |
| P06 | CE | Humedad mínima física > 100 | `{"cropName": "Cerezas", "minHumidity": 105, "maxHumidity": 75}` | 400 | **400 Bad Request** (INVALID_RANGE) |
| P07 | CE | Humedad mínima no numérica | `{"cropName": "Cerezas", "minHumidity": "treinta", "maxHumidity": 75}` | 400 | **500 Internal Server Error** ❌ (Fallo de casteo en BD: invalid input syntax for type integer: "treinta") |
| P08 | CE | Humedad mínima nula (null) | `{"cropName": "Cerezas", "minHumidity": null, "maxHumidity": 75}` | 400 | **500 Internal Server Error** ❌ (Fallo de constraint en BD: null value violates not-null constraint) |
| P09 | CE | Humedad mínima mayor a máxima | `{"cropName": "Cerezas", "minHumidity": 80, "maxHumidity": 50}` | 400 | **400 Bad Request** (MIN_GREATER_THAN_MAX) |

### Análisis de Valores Límite (VL)

| ID | Técnica | Descripción | Input JSON | HTTP esp. | Resultado real |
| :--- | :---: | :--- | :--- | :---: | :--- |
| PL01 | VL | minHumidity = 0 (límite inferior válido) | `{"cropName": "Paltas", "minHumidity": 0, "maxHumidity": 80}` | 201 | **201 Created** (Perfil creado, ID: 3) |
| PL02 | VL | minHumidity = -1 (justo bajo mínimo válido) | `{"cropName": "Paltas", "minHumidity": -1, "maxHumidity": 80}` | 400 | **400 Bad Request** (INVALID_RANGE) |
| PL03 | VL | maxHumidity = 100 (límite superior válido) | `{"cropName": "Manzanos", "minHumidity": 40, "maxHumidity": 100}` | 201 | **201 Created** (Perfil creado, ID: 4) |
| PL04 | VL | maxHumidity = 101 (justo sobre máximo válido) | `{"cropName": "Manzanos", "minHumidity": 40, "maxHumidity": 101}` | 400 | **400 Bad Request** (INVALID_RANGE) |
| PL05 | VL | minHumidity = 79, maxHumidity = 80 (diferencia mínima lógica) | `{"cropName": "Nogales", "minHumidity": 79, "maxHumidity": 80}` | 201 | **201 Created** (Perfil creado, ID: 5) |
| PL06 | VL | minHumidity = 80, maxHumidity = 80 (límite de consistencia: iguales) | `{"cropName": "Nogales", "minHumidity": 80, "maxHumidity": 80}` | 400 | **400 Bad Request** (MIN_GREATER_THAN_MAX) |

---

## 2. PUT /api/irrigation/thresholds (Actualización de Umbrales)

**Restricciones de Validación:**
* `id_perfil`: Entero correspondiente a un perfil existente en BD. Obligatorio.
* `humedad_min_prc`: Entero entre `0` y `100`. Obligatorio.
* `humedad_max_prc`: Entero entre `0` y `100`. Obligatorio.
* **Relación Lógica**: `humedad_min_prc` debe ser estrictamente menor que `humedad_max_prc`.

### Clases de Equivalencia (CE)

| ID | Técnica | Descripción | Input JSON | HTTP esp. | Resultado real |
| :--- | :---: | :--- | :--- | :---: | :--- |
| U01 | CE | Todos los campos válidos y consistentes | `{"id_perfil": 1, "humedad_min_prc": 30, "humedad_max_prc": 80}` | 200 | **200 OK** (Umbrales actualizados) |
| U02 | CE | ID de perfil inexistente en base de datos | `{"id_perfil": 9999, "humedad_min_prc": 30, "humedad_max_prc": 80}` | 404 | **404 Not Found** (Perfil de cultivo no encontrado) |
| U03 | CE | Humedad mínima negativa | `{"id_perfil": 1, "humedad_min_prc": -5, "humedad_max_prc": 80}` | 400 | **400 Bad Request** (Los umbrales deben estar entre 0 y 100) |
| U04 | CE | Humedad mínima mayor a máxima | `{"id_perfil": 1, "humedad_min_prc": 85, "humedad_max_prc": 80}` | 400 | **400 Bad Request** (Datos inconsistentes) |

### Análisis de Valores Límite (VL)

| ID | Técnica | Descripción | Input JSON | HTTP esp. | Resultado real |
| :--- | :---: | :--- | :--- | :---: | :--- |
| UL01 | VL | humedad_min_prc = 0 (límite inferior válido) | `{"id_perfil": 1, "humedad_min_prc": 0, "humedad_max_prc": 70}` | 200 | **200 OK** (Umbrales actualizados) |
| UL02 | VL | humedad_min_prc = -1 (justo bajo mínimo válido) | `{"id_perfil": 1, "humedad_min_prc": -1, "humedad_max_prc": 70}` | 400 | **400 Bad Request** (Los umbrales deben estar entre 0 y 100) |
| UL03 | VL | humedad_max_prc = 100 (límite superior válido) | `{"id_perfil": 1, "humedad_min_prc": 20, "humedad_max_prc": 100}` | 200 | **200 OK** (Umbrales actualizados) |
| UL04 | VL | humedad_max_prc = 101 (justo sobre máximo válido) | `{"id_perfil": 1, "humedad_min_prc": 20, "humedad_max_prc": 101}` | 400 | **400 Bad Request** (Los umbrales deben estar entre 0 y 100) |

---

## 3. PUT /api/sectors/:sectorId/profile (Asignación de Perfil a Sector)

**Restricciones de Validación:**
* `sectorId` (en la URL): ID correspondiente a un sector (nodo_sensor) registrado en la BD. Obligatorio.
* `profileId` (en el body): ID correspondiente a un perfil de cultivo registrado en la BD. Obligatorio.

### Clases de Equivalencia (CE)

| ID | Técnica | Descripción | Parámetros y Body | HTTP esp. | Resultado real |
| :--- | :---: | :--- | :--- | :---: | :--- |
| S01 | CE | Asignación válida de perfil y sector | URL: `/api/sectors/NODO_VALPO_01/profile`<br>Body: `{"profileId": 1}` | 200 | **200 OK** (Asignación exitosa) |
| S02 | CE | Perfil inexistente en la BD | URL: `/api/sectors/NODO_VALPO_01/profile`<br>Body: `{"profileId": 9999}` | 404 | **404 Not Found** (PROFILE_NOT_FOUND) |
| S03 | CE | Sector (nodo) inexistente en la BD | URL: `/api/sectors/NODO_FANTASMA/profile`<br>Body: `{"profileId": 1}` | 404 | **404 Not Found** (SECTOR_NOT_FOUND) |
| S04 | CE | profileId ausente en el body | URL: `/api/sectors/NODO_VALPO_01/profile`<br>Body: `{}` | 400 | **400 Bad Request** (MISSING_PROFILE_ID) |
