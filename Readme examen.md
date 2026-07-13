## 👑 1. ROL: Scrum Master (Gestión del Producto y Demostración)

### 🎯 Objetivo Clave:
Demostrar el valor del producto final para el cliente (el agricultor) a través del cumplimiento de las Historias de Usuario (HU), justificando la consistencia entre los casos de uso, las interfaces y el modelo de dominio.

### 🎙️ Qué decir (El Discurso):
> *"Como Scrum Master de EcoSystems, nuestro foco fue entregar un sistema modular que solucione el desperdicio de agua y mejore la toma de decisiones agrícolas. Guiados por metodologías ágiles, identificamos que el agricultor necesitaba visibilidad en tiempo real y automatización segura. Por ejemplo, en la **US-04 (Gestión de Perfiles de Cultivo)**, permitimos al usuario configurar rangos personalizados de humedad (como 55%-75% para Paltos). Este requerimiento de negocio se traduce directamente a nuestro **Modelo de Dominio**: la entidad `perfil_cultivo` define los límites lógicos, la cual se asocia con un `nodo_sensor` (sensor físico en terreno) y con una `valvula_control` (actuador). En la demo que verán a continuación, observaremos cómo la interfaz Next.js permite crear estos perfiles de forma interactiva y cómo se aplican de forma consistente en el comportamiento físico de las válvulas."*

### 💻 Qué mostrar en la pantalla:
1.  **El Frontend Next.js corriendo**:
    *   Muestra el Dashboard de visualización de sensores.
    *   Navega a la sección de **Perfiles de Cultivo** y crea un nuevo cultivo (ej: "Tomate", Mínima: 60%, Máxima: 80%).
    *   Asigna este perfil a un nodo/sector.
2.  **Consistencia de Dominio**:
    *   Muestra brevemente cómo en la base de datos se refleja esta asignación (`nodo_sensor.id_perfil` apunta al nuevo perfil).

### ⚠️ Preguntas Difíciles & Respuestas:
*   *Pregunta:* **¿Por qué hay discrepancias entre las Historias de Usuario documentadas y el modelo de base de datos?**
    *   *Respuesta:* *"Durante el desarrollo, priorizamos un MVP funcional enfocado en el núcleo IoT (telemetría y control de riego automático). Por ende, entidades de gestión administrativa como `Usuario` y `CampoCultivo` se manejan temporalmente en memoria o mockeadas en el frontend, mientras que la base de datos PostgreSQL/TimescaleDB se optimizó estrictamente para las entidades críticas en tiempo real: `perfil_cultivo`, `nodo_sensor`, `valvula_control` y el histórico de mediciones."*

---

## 🏗️ 2. ROL: Arquitectura (Diseño y Decisiones Técnicas)

### 🎯 Objetivo Clave:
Explicar el flujo de datos de extremo a extremo, justificar la elección de la pila tecnológica (Express, TimescaleDB, RabbitMQ, Next.js) y demostrar la coherencia mediante diagramas de Despliegue, Componentes y Secuencia.

### 🎙️ Qué decir (El Discurso):
> *"Nuestra arquitectura de software está diseñada bajo un modelo de 3 capas acoplado a un entorno IoT: Hardware (Simulado/Arduino), Lógica (Node.js Express + RabbitMQ) y Presentación (Next.js 14). Diseñamos el sistema para resolver dos requisitos de prioridad alta: **Ingesta masiva (10.000 lecturas/seg)** y **Latencia estricta (<100ms en el control de válvulas)**.*
>
> *Para lograr esto, desacoplamos la ingesta de la persistencia mediante **RabbitMQ**. Cuando llega una telemetría, `api-ingesta` solo valida el rango y la publica instantáneamente en un Exchange de tipo Topic. El mensaje viaja asíncronamente por dos canales:*
> 1. *Hacia `valvulas_queue` (consumido por `api-valvulas`), que evalúa en memoria (usando una caché optimizada) si la humedad bajó del mínimo para enviar la instrucción serial al Arduino en menos de 100ms.*
> 2. *Hacia `historicos_queue` (consumido por `worker-historicos`), que persiste los datos en **TimescaleDB** (una base de datos de series de tiempo basada en PostgreSQL que particiona los datos automáticamente en hypertables por fecha). Esto asegura consultas súper rápidas en el frontend para gráficos históricos sin degradar el control en tiempo real."*

### 💻 Qué mostrar en la pantalla:
1.  El diagrama de arquitectura en [docs/Arquitectura.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/Arquitectura.md).
2.  El archivo [docker-compose.yml](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docker-compose.yml), explicando cómo conviven los contenedores aislados de las APIs, Workers, base de datos y mensajería en red interna.

### ⚠️ Preguntas Difíciles & Respuestas:
*   *Pregunta:* **¿Por qué usar TimescaleDB en lugar de una base de datos relacional PostgreSQL común o una NoSQL como MongoDB?**
    *   *Respuesta:* *"TimescaleDB hereda toda la robustez relacional y ACID de PostgreSQL (necesario para gestionar perfiles y relaciones lógicas de válvulas), pero convierte el almacenamiento de lecturas en hypertables de series de tiempo. Esto permite insertar miles de lecturas por segundo indexadas por tiempo y consultarlas con SQL estándar de forma infinitamente más rápida que PostgreSQL tradicional o MongoDB, resolviendo el requisito de latencia en históricos de sensores."*

---

## 💻 3. ROL: Developer (Estructura de Código y Deuda Técnica)

### 🎯 Objetivo Clave:
Explicar la organización del repositorio, la estrategia de desarrollo por ramas en Git y demostrar honestidad técnica identificando code smells activos y su plan de resolución.

### 🎙️ Qué decir (El Discurso):
> *"El repositorio se estructuró con una separación limpia de responsabilidades: `/frontend` contiene la UI interactiva, `/database` los esquemas y semillas SQL, y `/api` agrupa los microservicios y adaptadores en Node.js Express. En Git, utilizamos una estrategia basada en ramas de características (Feature Branches) como `integracion-de-docker` y `implementación-web`, consolidando cambios a través de Pull Requests supervisados hacia la rama principal.*
>
> *Como desarrollador, reconozco que un sistema en evolución genera deuda técnica. Hemos identificado tres 'code smells' críticos:*
> 1. *En [controlador_valvulas.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js) tenemos hardcodeado el fallback del puerto serial `COM3` (estilo Windows) que en producción Linux o Docker fallaría.*
> 2. *Duplicación de configuración de conexión de base de datos (múltiples pools de `pg`) en cada API, en lugar de un módulo común.*
> 3. *Uso de consultas SQL nativas directas en lugar de un query builder como Knex.js o un ORM ligero, dificultando la portabilidad del motor de BD.*
>
> *Nuestra propuesta en `DeudaTecnica.md` contempla parametrizar el puerto serial por variables de entorno (ya iniciado con `SERIAL_PORT` y `SIMULATE_ARDUINO`) y centralizar el pool de base de datos en un módulo común para reducir el consumo innecesario de sockets de red."*

### 💻 Qué mostrar en la pantalla:
1.  La terminal con el historial de Git: `git log --oneline --graph -n 10`.
2.  El archivo `docs/DeudaTecnica.md` (una vez creado) mostrando la tabla de smells identificados y la propuesta de remediación.
3.  Líneas específicas de código en [controlador_valvulas.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js#L17-L27) para justificar la honestidad del diagnóstico de deuda técnica.

### ⚠️ Preguntas Difíciles & Respuestas:
*   *Pregunta:* **¿Cómo se asegura que las APIs de ingesta y de válvulas no tengan problemas de concurrencia al consultar la base de datos?**
    *   *Respuesta:* *"Para evitar la sobrecarga y bloqueos en base de datos al evaluar las reglas de riego de alta frecuencia, implementamos una caché en memoria en `api-valvulas` (`cache_umbrales` y `cache_valvulas`). En lugar de consultar PostgreSQL con cada lectura entrante de RabbitMQ, el microservicio consulta la caché local. Los datos de la caché se invalidan automáticamente tras 60 segundos o al recibir una alerta de actualización, garantizando que el sistema sea escalable y libre de race conditions."*

---

## 🧪 4. ROL: Quality Assurance (Pruebas y Aseguramiento de Calidad)

### 🎯 Objetivo Clave:
Demostrar mediante evidencia que el sistema cumple estrictamente con las reglas de negocio y los límites físicos mediante pruebas manuales/automatizadas fundamentadas en CE y VL.

### 🎙️ Qué decir (El Discurso):
> *"Nuestra estrategia de QA se enfocó en garantizar que las decisiones del controlador de riego sean 100% predecibles para no ahogar los cultivos ni quemar válvulas por humedad errónea. Diseñamos casos de prueba detallados en [test-cases.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/test-cases.md) aplicando **Clases de Equivalencia (CE)** y **Análisis de Valores Límite (VL)** para validar la API de perfiles de cultivo.*
>
> *Probamos límites físicos estrictos de humedad (como `0%` y `100%`) y la lógica de negocio (que la humedad mínima sea estrictamente menor que la máxima). Para demostrar su cumplimiento, ejecutamos scripts JSON de pruebas HTTP que simulan tanto los escenarios felices (201 Created) como los de rechazo por rangos inválidos (400 Bad Request) o cultivos duplicados (409 Conflict). Adicionalmente, el sistema audita de manera automática cada acción física en la tabla `registro_valvula`, guardando la latencia en milisegundos para verificar el cumplimiento del requisito crítico de tiempo real (<100ms)."*

### 💻 Qué mostrar en la pantalla:
1.  El archivo de documentación de pruebas [test-cases.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/test-cases.md).
2.  Las tablas del esquema en [01_schema.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/01_schema.sql) donde se ve la tabla `registro_valvula` (líneas 63-72) y su atributo `latencia_ms` que demuestra la preocupación por validar los requisitos extrafuncionales cuantitativamente.

### ⚠️ Preguntas Difíciles & Respuestas:
*   *Pregunta:* **¿Qué pasa si el sistema de colas (RabbitMQ) se cae? ¿Cómo responde el módulo de control de válvulas según las pruebas de QA?**
    *   *Respuesta:* *"En las pruebas de resiliencia de la API de ingesta (`api_ingesta.js`), validamos que si `mqChannel` no está disponible, el sistema devuelve inmediatamente un código HTTP `503 Service Unavailable` al emisor para no perder lecturas en el aire de forma silenciosa. Por el lado del consumidor de válvulas (`api-valvulas`), cuenta con lógica de reconexión con reintentos exponenciales (`connectWithRetry`) que intenta restablecer el canal de control automáticamente sin forzar la caída del microservicio."*
