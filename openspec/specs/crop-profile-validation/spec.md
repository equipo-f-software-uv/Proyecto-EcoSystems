# crop-profile-validation Specification

## Purpose
TBD - created by archiving change fix-crop-profile-validation. Update Purpose after archive.
## Requirements
### Requirement: Validación de tipo entero para minHumidity y maxHumidity
El sistema SHALL validar que los campos `minHumidity` y `maxHumidity` en el payload de creación de perfil de cultivo (`POST /api/crop-profiles`) sean números enteros válidos. Si se provee un tipo de dato incorrecto (como texto), la API SHALL rechazar la petición inmediatamente con un código `400 Bad Request`.

#### Scenario: Creación de perfil con humedad no numérica
- **WHEN** un usuario envía una petición `POST /api/crop-profiles` con `minHumidity` como la cadena de texto `"treinta"`
- **THEN** el sistema responde con `400 Bad Request` y no inserta ningún registro en la base de datos

### Requirement: Validación de no nulidad en umbrales de humedad
El sistema SHALL validar que los campos `minHumidity` y `maxHumidity` en el payload de creación de perfil de cultivo (`POST /api/crop-profiles`) no contengan valores nulos (`null`). Si un valor es nulo, la API SHALL rechazar la petición inmediatamente con un código `400 Bad Request`.

#### Scenario: Creación de perfil con humedad nula
- **WHEN** un usuario envía una petición `POST /api/crop-profiles` con `minHumidity` como `null`
- **THEN** el sistema responde con `400 Bad Request` y no inserta ningún registro en la base de datos

