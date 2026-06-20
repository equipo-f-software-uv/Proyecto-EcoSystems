## 1. Implementación de Validación en el Backend

- [x] 1.1 Incorporar validación de tipo entero y no nulo usando `Number.isInteger()` para `minHumidity` y `maxHumidity` en el endpoint `POST /api/crop-profiles` en `backend/node-api/api/api_perfiles.js`.
- [x] 1.2 Asegurar que se retorne un error `400 Bad Request` con código `INVALID_TYPE` o `MISSING_FIELDS` en caso de fallo de validación.

## 2. Verificación y Pruebas

- [x] 2.1 Ejecutar peticiones de prueba correspondientes a P07 y P08 con valores de humedad no numéricos y nulos.
- [x] 2.2 Actualizar el archivo de casos de prueba `docs/test-cases.md` con los resultados reales obtenidos.
