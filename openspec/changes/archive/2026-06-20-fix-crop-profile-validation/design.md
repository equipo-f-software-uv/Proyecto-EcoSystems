## Context

En la implementación actual del microservicio `api_perfiles.js`, el validador en `POST /api/crop-profiles` verifica los rangos numéricos de `minHumidity` y `maxHumidity` pero asume implícitamente que los valores ya son números enteros y no nulos. Cuando se recibe una cadena de texto o un valor `null`, las condiciones de JavaScript no disparan el bloque de error de validación, permitiendo que la query SQL llegue a la base de datos PostgreSQL, la cual falla e interrumpe la ejecución del backend con un error `500 Internal Server Error`.

## Goals / Non-Goals

**Goals:**
* Detener peticiones malformadas (valores nulos, texto, etc.) en la capa de validación del backend Express.
* Asegurar respuestas HTTP `400 Bad Request` consistentes y con descripciones adecuadas.
* Proteger la base de datos de queries con tipos inválidos o nulos.

**Non-Goals:**
* Modificar la capa de almacenamiento físico (PostgreSQL).
* Alterar las reglas de negocio sobre la relación lógica entre umbral mínimo y máximo.

## Decisions

### Decisión: Uso de `Number.isInteger()` para validación de tipo
* **Opción elegida**: Verificar si los campos recibidos son números enteros utilizando `Number.isInteger()`.
* **Alternativas consideradas**:
  * `typeof value === 'number'`: Rechazado porque permitiría valores decimales (ej. `45.5`), que no son deseados para los umbrales de humedad definidos como enteros en el esquema.
  * Delegar la validación a la base de datos: Rechazado porque genera excepciones de código HTTP `500`.

## Risks / Trade-offs

* **[Riesgo]**: Rechazo de clientes legacy que envíen números formateados como strings (ej. `"45"`).
  * **Mitigación**: Los clientes del sistema (incluyendo actuadores y frontend) deben enviar números enteros serializados de forma nativa en JSON tal como se define en la especificación.
