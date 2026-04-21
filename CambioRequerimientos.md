US-09: Soporte de multiprotocolo para sensores:
Descripción:
Como desarrollador del sistema,
quiero integrar una arquitectura de adaptadores para diversos protocolos (MQTT, HTTP, LoRaWAN),
para permitir la incorporación de nuevos sensores de forma independiente y escalable.

Criterios de aceptación:
CA1: El sistema debe exponer una interfaz estándar (puerto) para la recepción de datos, sin importar el origen del sensor.
CA2: Se debe poder añadir un nuevo protocolo creando un nuevo módulo sin modificar la lógica de los protocolos existentes.
CA3: El fallo de un adaptador específico no debe interrumpir el flujo de datos de otros tipos de sensores.

=================================================================================================

US-10: Ingesta de datos de alta intensidad
Descripción:
Como administrador de la plataforma,
quiero que el módulo de ingesta soporte 10.000 lecturas por segundo,
para garantizar la integridad de la información durante periodos de máxima carga.

Criterios de aceptación:
CA1: El sistema debe procesar 10.000 req/s sin reinicios ni pérdida de paquetes.
CA2: Los datos deben persistirse de forma asíncrona para no bloquear la recepción de nuevas lecturas.
CA3: El sistema debe emitir una alerta técnica si el volumen de ingesta supera el límite de capacidad diseñado.

=================================================================================================

US-11: Control de válvulas en tiempo real
Descripción:
Como encargado del huerto,
quiero que la activación de válvulas se realice en menos de 100ms tras la detección,
para asegurar una respuesta inmediata ante cambios críticos en la humedad del suelo.

Criterios de aceptación:
CA1: La latencia desde la recepción del dato hasta el envío de la orden de control debe ser inferior a 100ms.
CA2: El tiempo de respuesta de control debe cumplirse incluso bajo el pico máximo de ingesta de datos.
CA3: El sistema debe registrar un evento de auditoría si la respuesta de activación supera los 150ms.

=================================================================================================
US-12: Aislamiento de procesos críticos
Descripción:
Como arquitecto de software,
quiero desacoplar el flujo de ingesta masiva del flujo de control de válvulas,
para eliminar la contención de recursos y permitir optimizaciones independientes.

US-13: Visualización de históricos optimizada
Descripción:
Como usuario final,
quiero consultar gráficos de consumo de agua y humedad sin afectar el sistema,
para analizar el comportamiento del huerto sin degradar el rendimiento del riego automático.

Criterios de aceptación:
CA1: La consulta de históricos debe realizarse sobre una base de datos optimizada para lectura e independiente del flujo de estado actual.
CA2: El tiempo de generación de los gráficos no debe interferir con la recepción de señales de los sensores en el Gateway.
CA3: Los gráficos de los últimos 7 días deben renderizarse en la interfaz en menos de 2 segundos.

==================================================================================================

US-13: Visualización de históricos optimizada
Descripción:
Como usuario final,
quiero consultar gráficos de consumo de agua y humedad sin afectar el sistema,
para analizar el comportamiento del huerto sin degradar el rendimiento del riego automático.

Criterios de aceptación:
CA1: La consulta de históricos debe realizarse sobre una base de datos optimizada para lectura e independiente del flujo de estado actual.
CA2: El tiempo de generación de los gráficos no debe interferir con la recepción de señales de los sensores en el Gateway.
CA3: Los gráficos de los últimos 7 días deben renderizarse en la interfaz en menos de 2 segundos.
