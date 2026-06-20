## Why

Durante las pruebas manuales de la API de creación de perfiles de cultivo (`POST /api/crop-profiles`), se identificaron fallos críticos de validación. El sistema no valida si los campos `minHumidity` y `maxHumidity` son de tipo entero o si contienen valores nulos (`null`). Esto permite que los payloads con tipos de datos incorrectos o valores nulos superen el middleware de validación del backend Express e intenten insertarse directamente en la base de datos PostgreSQL, provocando excepciones de tipo `500 Internal Server Error` debido a fallos de sintaxis SQL e incumplimiento de restricciones not-null, en lugar de retornar el código HTTP `400 Bad Request` esperado.

## What Changes

* **Validación de tipo numérico entero**: Modificar la validación en el endpoint `POST /api/crop-profiles` para asegurar que `minHumidity` y `maxHumidity` sean enteros válidos utilizando `Number.isInteger()`.
* **Validación de campos no nulos**: Asegurar que ninguno de los umbrales de humedad sea `null` o `undefined`.
* **Respuesta de error robusta**: Retornar un código de estado `400 Bad Request` con un mensaje descriptivo cuando los tipos de datos o valores no cumplan con los criterios de validación, previniendo excepciones no controladas de la base de datos.

## Capabilities

### New Capabilities
- `crop-profile-validation`: Validación robusta de tipos de datos y nulabilidad para la creación de perfiles de cultivo y umbrales de riego.

### Modified Capabilities
<!-- Ninguna preexistente -->

## Impact

* **Código afectado**: [backend/node-api/api/api_perfiles.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/backend/node-api/api/api_perfiles.js) en la lógica de validación de `POST /api/crop-profiles`.
* **Casos de prueba afectados**: Casos `P07` y `P08` en [docs/test-cases.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/test-cases.md).
