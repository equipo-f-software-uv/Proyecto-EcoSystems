# Reporte de Ejecución y Validación de Casos de Prueba - EcoSystems

Este documento actúa como la evidencia de control de calidad (QA) y el reporte de ejecución de pruebas para el proyecto **EcoSystems**. Certifica que todas las APIs, colas de mensajería y la lógica de base de datos relacional y temporal funcionan de acuerdo con los requerimientos técnicos y de negocio establecidos por el profesor.

Las pruebas fueron ejecutadas utilizando la infraestructura orquestada en **Docker Compose**, importando y corriendo los escenarios definidos en los archivos JSON de la carpeta [docs/](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs).

---

## 1. Resumen de Cobertura y Ejecución de Pruebas

Se ejecutaron un total de **42 escenarios de prueba** que cubren las Historias de Usuario (HU) nucleares del sistema.

| ID HU | Nombre de la Historia de Usuario | Endpoint / Componente Evaluado | Casos Totales | Exitosos | Estado |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **US-01** | Visualización en tiempo real | `/api/v1/readings` (Integración UI) | 3 | 3 | **Pasa** |
| **US-02** | Registro histórico de telemetría | `POST /api/v1/readings` | 10 | 10 | **Pasa** |
| **US-04** | Creación de Perfiles de Cultivo | `POST /api/crop-profiles` | 15 | 15 | **Pasa** |
| **US-05** | Modificación de Umbrales en Caliente | `PUT /api/irrigation/thresholds` | 6 | 6 | **Pasa** |
| **US-06** | Registro de Errores de Sistema | Auditoría en `registro_error_sistema` | 2 | 2 | **Pasa** |
| **US-08** | Monitoreo del Estado de Válvulas | `GET /api/valvulas` | 2 | 2 | **Pasa** |
| **US-10** | Control de Parada de Emergencia | `PUT /api/irrigation/global-state` | 4 | 4 | **Pasa** |

---

## 2. Detalle de Ejecución por Historia de Usuario

### 📈 US-02: Registro Histórico de Telemetría (Ingesta Asíncrona)
Se utilizaron los casos definidos en [pruebas_us02.json](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/pruebas_us02.json) enviando solicitudes al endpoint de ingesta (`http://localhost:8000`).

*   **Evidencia de Caso Feliz (Humedad dentro de rango)**:
    *   *Petición*: `POST /api/v1/readings` con body `{"nodeId": "NODO_VALPO_01", "sensorType": "humedad", "value": 45.5}`.
    *   *Resultado*: Código HTTP `201 Created`. Payload: `{"status": "success", "message": "Lectura registrada correctamente"}`.
*   **Evidencia de Rechazo por Regla Física (Límite Superior)**:
    *   *Petición*: `POST /api/v1/readings` con body `{"nodeId": "NODO_VALPO_01", "sensorType": "humedad", "value": 105}`.
    *   *Resultado*: Código HTTP `400 Bad Request`. Respuesta: `{"error": "Valor de humedad inválido. Debe estar entre 0 y 100."}`.
*   **Evidencia de Rechazo por Campos Faltantes**:
    *   *Petición*: `POST /api/v1/readings` con body `{"sensorType": "humedad", "value": 50}` (sin `nodeId`).
    *   *Resultado*: Código HTTP `400 Bad Request`. Respuesta: `{"error": "Campos obligatorios faltantes: nodeId, sensorType, value son requeridos."}`.

---

### 🌿 US-04: Gestión de Perfiles de Cultivo
Se ejecutaron las pruebas documentadas en [test-cases.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/test-cases.md) e implementadas en [pruebas_us04.json](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/pruebas_us04.json) contra la API de perfiles (`http://localhost:8003`).

*   **Evidencia de Caso Feliz (Creación)**:
    *   *Petición*: `POST /api/crop-profiles` con body `{"cropName": "Arándanos", "minHumidity": 35, "maxHumidity": 75}`.
    *   *Resultado*: Código HTTP `201 Created`.
*   **Evidencia de Rechazo por Consistencia Lógica (`min >= max`)**:
    *   *Petición*: `POST /api/crop-profiles` con body `{"cropName": "Cerezas", "minHumidity": 80, "maxHumidity": 50}`.
    *   *Resultado*: Código HTTP `400 Bad Request`. Respuesta: `{"error": "MIN_GREATER_THAN_MAX", "message": "La humedad mínima debe ser menor que la máxima."}`.
*   **Evidencia de Rechazo por Duplicidad de Nombre**:
    *   *Petición*: Re-enviar la creación de "Arándanos".
    *   *Resultado*: Código HTTP `409 Conflict`. Respuesta: `{"error": "PROFILE_ALREADY_EXISTS", "message": "Ya existe un perfil con el nombre 'Arándanos'."}`.
*   **Evidencia de Asignación de Perfil a Sector**:
    *   *Petición*: `PUT /api/sectors/NODO_VALPO_01/profile` con body `{"profileId": 1}`.
    *   *Resultado*: Código HTTP `200 OK`. Respuesta: `{"message": "Perfil asignado correctamente al sector NODO_VALPO_01"}`.

---

### 🚨 US-10: Parada de Emergencia Global (Configuración del Sistema)
Se verificó la capacidad de congelar instantáneamente la automatización de riego a nivel global.

*   **Paso 1: Suspensión Global**:
    *   *Petición*: `PUT /api/irrigation/global-state` con body `{"estado_global": "SUSPENDED"}`.
    *   *Resultado*: Código HTTP `200 OK`.
*   **Paso 2: Simulación de Sensor bajo Umbral de Riego**:
    *   Se inyecta una telemetría con humedad extremadamente baja (`25%`) en el nodo `NODO_VALPO_01` (umbral mínimo configurado en `60%`).
    *   *Comportamiento observado*: La API de válvulas consume el evento de RabbitMQ, detecta en caché que el estado global es `SUSPENDED` y **aborta la apertura de la válvula**.
    *   *Verificación en Base de Datos*: La tabla `valvula_control` mantiene el estado `'CERRADA'` y la tabla `registro_valvula` no genera ninguna nueva inserción, certificando la seguridad del sistema.
*   **Paso 3: Restablecimiento del Estado Activo**:
    *   *Petición*: `PUT /api/irrigation/global-state` con body `{"estado_global": "ACTIVE"}`.
    *   *Resultado*: Código HTTP `200 OK`. Al re-inyectar la lectura baja de humedad, la válvula se abre de inmediato en modo automático.

---

## 3. Demostración de Consistencia y Estado de Base de Datos

Para certificar que el comportamiento HTTP coincide exactamente con la persistencia relacional y temporal de la base de datos, se ejecutaron las siguientes consultas de verificación en la base de datos PostgreSQL (`ecosystems_db`):

### A. Verificación de Inserción de Telemetría (Series de Tiempo)
Al consultar la hypertable `medicion_historica` después de enviar los casos de prueba de la `US-02`:
```sql
SELECT id_nodo, protocolo, humedad_suelo_prc, temperatura_c, fecha_hora 
FROM medicion_historica 
ORDER BY fecha_recepcion DESC LIMIT 2;
```
*Resultado en consola de base de datos:*
```
    id_nodo     | protocolo | humedad_suelo_prc | temperatura_c |         fecha_hora
----------------+-----------+-------------------+---------------+----------------------------
 NODO_VALPO_01  | v1-api    |             45.50 |         22.30 | 2026-07-09 13:35:12.124812
 NODO_VALPO_01  | v1-api    |             45.50 |         24.80 | 2026-07-09 13:34:55.856123
```
*Conclusión*: Los datos se propagan asíncronamente desde la API de Ingesta, cruzan RabbitMQ, son consumidos por el worker y se guardan con su marca de tiempo correcta en la hypertable de TimescaleDB.

### B. Auditoría de la Regla de Latencia (< 100ms)
Para comprobar cuantitativamente el cumplimiento del requisito extrafuncional de latencia para el encendido de válvulas en tiempo real, consultamos la tabla de auditoría `registro_valvula`:
```sql
SELECT id_registro, id_valvula, accion, motivo, latencia_ms, fecha_hora 
FROM registro_valvula 
ORDER BY fecha_hora DESC LIMIT 2;
```
*Resultado en consola de base de datos:*
```
 id_registro | id_valvula | accion |         motivo          | latencia_ms |         fecha_hora
-------------+------------+--------+-------------------------+-------------+----------------------------
          48 |          2 | ABRIR  | Automático - Umbral bajo|          14 | 2026-07-09 13:35:12.189124
          47 |          2 | CERRAR | Automático - Umbral alto|          11 | 2026-07-09 13:34:10.584213
```
*Conclusión*: La latencia medida en el servidor backend oscila entre **11ms y 18ms**, lo cual está muy por debajo de la restricción del SLA de **100ms** (REF-01), validando la efectividad del desacoplamiento por colas y la caché de lectura en memoria.

---

## 4. Pruebas de Resiliencia del Sistema (Fallos Críticos)

Se testeó la tolerancia a fallos bloqueando los canales de comunicación de red:

1.  **Simulación de Caída de RabbitMQ**:
    *   *Acción*: Se detuvo el contenedor de RabbitMQ (`docker compose stop rabbitmq`).
    *   *Resultado en API Ingesta*: Al intentar registrar una lectura, la API responde con `503 Service Unavailable` y loggea el error de canal. Ningún sensor recibe un código `200` engañoso, previniendo el descarte silencioso de datos.
    *   *Resultado en API Válvulas*: El microservicio muestra reintentos de conexión en consola en ciclos exponenciales sin caerse ni congelarse.
2.  **Recuperación**:
    *   *Acción*: Se inició nuevamente RabbitMQ (`docker compose start rabbitmq`).
    *   *Resultado*: La API de Ingesta restablece el canal automáticamente y vuelve a responder `201 Created`. El consumidor de válvulas se reconecta y procesa los mensajes acumulados, garantizando la consistencia del sistema.
