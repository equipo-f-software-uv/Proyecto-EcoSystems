# 1. Descripción del cambio solicitado

## Cambio funcional:
Se requiere soportar múltiples tipos de sensores de distintos fabricantes para el monitoreo agrícola, cada uno operando bajo su propio protocolo de comunicación (MQTT, HTTP, LoRaWAN), garantizando que cada tipo de adaptador pueda actualizarse, modificarse o reemplazarse de forma independiente sin alterar el resto del sistema.

## Cambio no funcional:
El módulo de ingesta de datos debe ser capaz de procesar hasta **10.000 lecturas por segundo** en su punto de máxima carga (peak) sin degradar el tiempo de respuesta del sistema de control de válvulas, el cual tiene un límite estricto de actuación e instrucción de **menos de 100ms** ante eventos críticos de humedad.

## Tensión arquitectónica:
En la arquitectura original basada en capas, la ingesta masiva de datos y el lazo de control en tiempo real comparten el mismo stack tecnológico y flujo de ejecución. La abismal diferencia en volumen de datos (alta densidad) y requerimientos de latencia (tiempo real crítico) hace inviable optimizar ambos flujos simultáneamente dentro del mismo proceso sin aislarlos de forma independiente.

---

# 2. Nuevas historias de usuario

### US-09: Soporte de multiprotocolo para sensores
**Descripción:** Como desarrollador del sistema,  
quiero integrar una arquitectura de adaptadores para diversos protocolos (MQTT, HTTP, LoRaWAN),  
para permitir la incorporación de nuevos sensores de forma independiente y escalable.

**Criterios de Aceptación:**
* **CA1:** Dado que un sensor envía datos al sistema, cuando el Gateway los recibe, entonces el sistema debe exponer una interfaz estándar (puerto) para unificar la estructura del mensaje, abstrayendo el origen del fabricante.
* **CA2:** Dado que se requiere añadir un nuevo fabricante al mercado, cuando se implemente su protocolo, entonces se debe poder añadir un módulo adaptador limpio sin modificar ni detener la lógica de los protocolos preexistentes.
* **CA3:** Dado que un adaptador específico experimenta un fallo crítico o desconexión, cuando ocurre el error, entonces el sistema debe aislar el problema y no interrumpir bajo ningún caso el flujo de datos de los otros tipos de sensores activos.

### US-10: Ingesta de datos de alta intensidad
**Descripción:** Como administrador de la plataforma,  
quiero que el módulo de ingesta soporte 10.000 lecturas por segundo,  
para garantizar la integridad de la información ambiental durante periodos de máxima carga hídrica.

**Criterios de Aceptación:**
* **CA1:** Dado que el sistema entra en una fase de ráfaga de datos (peak), cuando alcanza las 10.000 req/s, entonces el módulo debe procesar la carga de forma estable, sin producir reinicios de servicio ni pérdida de paquetes de telemetría.
* **CA2:** Dado que entran lecturas masivas continuamente, cuando el sistema las procesa, entonces los datos deben persistirse de forma asíncrona para no bloquear el hilo de recepción de nuevas alertas del campo.
* **CA3:** Dado que el volumen de ingesta supera el límite operacional diseñado, cuando se detecta esta anomalía, entonces el sistema debe emitir inmediatamente una alerta técnica al panel de administración para activar políticas de escalado.

### US-11: Control de válvulas en tiempo real
**Descripción:** Como encargado del huerto,  
quiero que la activación y corte de válvulas se realice en menos de 100ms tras la detección de umbrales críticos,  
para asegurar una respuesta inmediata que mitigue el estrés hídrico o el desperdicio de agua.

**Criterios de Aceptación:**
* **CA1:** Dado que un sensor reporta un nivel de humedad crítico bajo el umbral, cuando el backend procesa la señal, entonces la latencia total desde la recepción del dato hasta el envío de la orden física de apertura a la válvula debe ser inferior a 100ms.
* **CA2:** Dado que el sistema se encuentra en su pico máximo de ingesta (10.000 req/s), cuando se genera una regla de negocio de riego, entonces el tiempo de respuesta del control de válvulas debe mantenerse invariable por debajo del límite estricto de 100ms.
* **CA3:** Dado que las condiciones de red o procesamiento degradan el lazo de control, cuando la activación supera un umbral de seguridad de 150ms, entonces el sistema debe registrar un evento de auditoría crítica con marca de tiempo.

### US-12: Aislamiento de procesos críticos
**Descripción:** Como arquitecto de software,  
quiero desacoplar el flujo de ingesta masiva del flujo de control de válvulas en tiempo real,  
para eliminar la contención de recursos computacionales y permitir optimizaciones independientes de infraestructura.

### US-13: Visualización de históricos optimizada
**Descripción:** Como usuario final (agricultor),  
quiero consultar gráficos de consumo hídrico e históricos de humedad sin generar latencias en el sistema,  
para analizar el comportamiento de mi siembra sin degradar el rendimiento del riego automático.

**Criterios de Aceptación:**
* **CA1:** Dado que un usuario solicita reportes masivos de meses anteriores, cuando se ejecuta la consulta, entonces esta debe realizarse sobre una base de datos optimizada para lectura (ej. réplica de lectura o data store de series de tiempo) totalmente independiente del flujo transaccional.
* **CA2:** Dado que se renderizan gráficos de alto costo computacional en la UI, cuando el cliente interactúa con la pantalla, entonces la generación de gráficos no debe interferir con la recepción de señales de los sensores físicos en el Gateway de comunicación.
* **CA3:** Dado que el usuario solicita la visualización estándar, cuando se piden los gráficos de los últimos 7 días, entonces la interfaz debe renderizarlos en un tiempo inferior a 2 segundos.

---

# 3. Impacto en requisitos extrafuncionales

| REF ID | Descripción | Prioridad anterior | Prioridad nueva | Cambio / Motivo |
| :--- | :--- | :--- | :--- | :--- |
| **REF-01** | Latencia de control de válvulas | Alta | **Crítica** | Se fija un límite en tiempo real estricto (< 100ms) para salvaguardar el cultivo ante anomalías hidráulicas. |
| **REF-02** | Capacidad de ingesta de datos | Media | **Alta** | Requerimiento cuantitativo explícito de tolerar cargas masivas distribuidas de hasta 10.000 lecturas/seg. |
| **REF-03** | Modificabilidad de protocolos | Media | **Alta** | Exigencia de desacoplamiento total para añadir o actualizar protocolos (MQTT/HTTP/LoRa) sin alterar código base. |
| **REF-07** | Aislamiento de procesos | — | **Alta** | **Nuevo REF:** Se requiere aislar los recursos del lazo de control para que la ingesta masiva no degrade los hilos del riego automático. |
| **REF-08** | Escalabilidad horizontal | Baja | **Media** | Requerida para instanciar múltiples nodos del módulo de ingesta y adaptadores cuando se detecten peaks de carga. |

---

# 4. Impacto en entidades del dominio

https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/blob/main/Diagrama%20arquitectonico.md
---

# 5. Impacto en mockups

| Mockups afectados | Cambios necesarios |
| :--- | :--- |
| **Dashboard Principal (Control)** | Debe incorporar indicadores visuales de latencia de válvulas y el estado operativo de los adaptadores de protocolo (MQTT/HTTP/LoRa) para saber si algún fabricante cayó. |
| **Panel de Configuración de Hardware** | Se debe agregar una pantalla de administración de sensores donde se especifique dinámicamente qué protocolo y qué puerto mapea cada dispositivo nuevo integrado al campo. |
| **Módulo de Analítica e Históricos** | La sección de reportes históricos ahora consumirá datos de un repositorio optimizado para series de tiempo, por lo que se añaden barras de carga asíncronas para gráficos pesados sin congelar la interfaz táctil. |

---

# 6. Impacto en arquitectura

### 6.1 ¿Cambia el estilo arquitectónico?
**Sí.** El estilo arquitectónico original basado puramente en capas monolíticas es **completamente insuficiente** para abordar la tensión entre la alta tasa de transferencia de la ingesta (10k req/s) y la baja latencia del control (<100ms). Compartir recursos de memoria y procesador bajo el mismo proceso provocaría que la recolección de métricas bloqueara las órdenes de riego.

Por lo tanto, la arquitectura evoluciona hacia un **Estilo Dirigido por Eventos (Event-Driven Architecture) combinado con Microservicios**. 
* El flujo se desacopla mediante un **Broker de Mensajería de alta disponibilidad (como Apache Kafka o RabbitMQ)** que actúa como amortiguador (buffer) absorbiendo las 10.000 lecturas/s.
* Los adaptadores de protocolos pasan a ser microservicios independientes encargados únicamente de traducir datos al formato global del sistema.
* El módulo de control de válvulas corre en un microservicio aislado con recursos de CPU garantizados para asegurar respuestas en tiempo real, operando de manera asíncrona al almacenamiento en base de datos.

### 6.2 Relación REF (repriorizado) con decisiones de arquitectura

| RNF ID | Prioridad nueva | Decisión de arquitectura que lo aborda |
| :--- | :--- | :--- |
| **REF-01** | Crítica | Aislamiento del módulo de control de válvulas en un proceso prioritario e independiente, comunicándose por colas dedicadas de baja latencia sin pasar por bloqueos de base de datos relacional. |
| **REF-02** | Alta | Implementación de un Message Broker intermedio (Kafka/RabbitMQ) para balancear la carga e ingesta asíncrona, evitando la degradación del backend. |
| **REF-03** | Alta | Adopción del patrón de diseño **Adapter (Adaptadores)** estructurado como microservicios independientes para cada protocolo, permitiendo despliegues y apagados aislados. |

---

# 7. Impacto en módulos

| Módulo | Tipo de impacto | Responsabilidad actualizada | Ofrece a otros (actualizado) |
| :--- | :--- | :--- | :--- |
| **Módulo Ingesta Core** | Modificado | Recibir las tramas estandarizadas desde los adaptadores y publicarlas inmediatamente en el bus de eventos de forma asíncrona. | Eventos crudos de telemetría en el Bus. |
| **Adaptadores de Protocolo (MQTT/HTTP/LoRa)** | **Nuevo** | Traducir los payloads específicos de cada fabricante a un formato JSON común/global definido por el sistema. | Interfaz de red adaptada por protocolo. |
| **Controlador de Riego y Válvulas** | Modificado | Escuchar eventos críticos de humedad directamente del Bus y gatillar órdenes de hardware en menos de 100ms. | API de estado actual de válvulas. |
| **Módulo Histórico y Reportes** | **Nuevo** | Procesar de forma diferida los datos del bus para persistirlos en un Data Store optimizado para analítica sin tocar la lógica transaccional. | Query API para generación de gráficos en la UI. |

**Fundamentación de cambios modulares:** La separación en módulos independientes (Adaptadores y Procesador de Históricos) se justifica para cumplir con la modificabilidad extrema solicitada (REF-03). Si un fabricante cambia su API HTTP o su trama LoRaWAN, solo se redespliega su adaptador específico sin apagar el motor de decisiones de riego ni el almacenamiento de datos general.

---

# 8. Nuevas decisiones de diseño

* **Decisión 1:** Incorporación de un Broker de Mensajería distribuido para manejar la ingesta de 10.000 req/s de forma asíncrona.
  * *Motivación:* Evitar la contención y pérdida de paquetes que ocurriría si los sensores golpearan directamente una base de datos relacional tradicional (REF-02).
  * *Opciones evaluadas:* Conexiones HTTP directas (Descartado por bloqueos de hilos) vs. Arquitectura de Colas orientada a eventos (Seleccionada).
* **Decisión 2:** Implementación del patrón arquitectónico CQRS (*Command Query Responsibility Segregation*) para separar la escritura veloz de sensores de la lectura pesada de gráficos.
  * *Motivación:* Asegurar que las consultas de históricos (US-13) no interfieran bajo ningún motivo con los hilos de procesamiento y control hidráulico (REF-07).

---

# 9. Trazabilidad actualizada

| Historia | REF relacionado | Módulo | Mockup |
| :--- | :--- | :--- | :--- |
| **US-09** | REF-03 (Modificabilidad) | Adaptadores de Protocolo | Panel de Configuración de Hardware |
| **US-10** | REF-02 (Ingesta) / REF-08 | Ingesta Core / Message Broker | Dashboard Principal (Métricas técnicas) |
| **US-11** | REF-01 (Latencia Válvulas) | Controlador de Riego y Válvulas | Dashboard Principal (Control de Riego) |
| **US-13** | REF-07 (Aislamiento) | Módulo Histórico y Reportes | Módulo de Analítica e Históricos |

---

# 10. Justificación global y trade-offs

La solución de diseño propuesta —migrar de un monolito clásico por capas a una Arquitectura Dirigida por Eventos con Microservicios de Ingesta y Adaptación— responde directamente a las altas demandas de rendimiento, latencia y modificabilidad impuestas por los nuevos requerimientos. La incorporación de un bus de eventos descentraliza la carga masiva y blinda el lazo de control de riego para garantizar que actúe en tiempo real (< 100ms), logrando un aislamiento físico y lógico de los procesos.

### Trade-offs asumidos:
* **Complejidad Operacional e Infraestructura vs. Latencia Crítica:** Implementar un Message Broker y microservicios para los protocolos eleva los costos de infraestructura, la dificultad de monitoreo y despliegue del sistema. Sin embargo, es el costo necesario para blindar el canal de las válvulas (REF-01) frente a peaks de 10.000 req/s.
* **Consistencia Eventual vs. Disponibilidad de Ingesta:** Al guardar los datos históricos de manera asíncrona y separada, el dashboard del agricultor podría experimentar un desfase insignificante de pocos segundos en reflejar un dato histórico. Se asume este trade-off para priorizar que el hilo de entrada nunca se bloquee y no se pierdan paquetes ambientales (REF-02).
