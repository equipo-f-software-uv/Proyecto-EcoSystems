# Informe de Correcciones y Diagnóstico - Proyecto EcoSystems

Este documento contiene un análisis detallado del estado actual del proyecto **EcoSystems** respecto a los comentarios y rúbrica de evaluación entregada por el profesor para el examen. Su objetivo es clasificar las tareas listas, las brechas actuales y definir los entregables documentales requeridos para aprobar el ramo en la entrega final.

---

## 1. ¿Qué cosas ya tenemos listas? (Implementadas y Operativas)

El proyecto cuenta con una base tecnológica muy sólida y funcional. Las fortalezas del estado actual son:

*   **Orquestación de Contenedores Completa (`docker-compose.yml`)**: El proyecto está completamente contenerizado y listo para correr con un único comando. Levanta todos los servicios requeridos:
    *   `db`: PostgreSQL v15 habilitando la extensión **TimescaleDB** para telemetría.
    *   `rabbitmq`: Message broker para mensajería asíncrona.
    *   `api-ingesta`: Servicio en Node.js Express para recibir lecturas.
    *   `api-valvulas`: Lógica de automatización y control de flujo de agua.
    *   `api-historicos` y `api-perfiles`: APIs de consulta de reportes y configuración de cultivo.
    *   `worker-historicos`: Consumidor asíncrono que persiste datos de telemetría.
    *   `simulator`: Simulador de lecturas de sensores Arduino (humedad, temperatura, flujo).
    *   `frontend`: Aplicación web interactiva en Next.js 14 (TypeScript, App Router).
*   **Base de Datos Relacional y de Series de Tiempo (TimescaleDB)**:
    *   El script [01_schema.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/01_schema.sql) inicializa correctamente las tablas e implementa la conversión de `medicion_historica` a una *Hypertable* optimizada para IoT.
    *   El script [02_seed.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/02_seed.sql) precarga datos históricos coherentes de 6 días atrás para evitar gráficos vacíos durante la demostración en vivo.
*   **Arquitectura de Mensajería Asíncrona (RabbitMQ)**:
    *   Desacoplamiento exitoso de la ingesta de telemetría de alta frecuencia respecto a los procesos lentos de escritura en base de datos.
    *   Consumo estructurado usando tópicos de enrutamiento (`telemetry.humidity`, `telemetry.other`).
*   **Casos de Prueba (QA)**:
    *   El archivo [test-cases.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/test-cases.md) define excelentes casos de prueba manual utilizando metodologías estándar como **Clases de Equivalencia (CE)** y **Análisis de Valores Límite (VL)** para los umbrales de cultivo.
    *   Se encuentran presentes múltiples archivos JSON de prueba (ej: `pruebas_api.json`, `pruebas_us01.json`, etc.) listos para ser importados en herramientas como Postman.

---

## 2. ¿Qué cosas faltan? (Brechas y Errores del Feedback)

De acuerdo al feedback del profesor, existen varias inconsistencias técnicas e insuficiencias documentales que causaron la reprobación. A continuación se listan las brechas críticas detectadas:

### A. Brechas en el Repositorio y Despliegue
*   **Instrucciones de Instalación Incompletas e Incorrectas en el README**:
    *   El [README.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/README.md) principal indica al lector que asuma que tiene PostgreSQL instalado de manera local y ejecute comandos manuales de creación de bases de datos.
    *   **Impacto**: Oculta completamente el valor del `docker-compose.yml`. El profesor asumió que debía instalar Postgres manualmente en su máquina local porque las instrucciones de instalación de Docker no están documentadas en el README principal.

### B. Inconsistencias en el Modelo de Dominio
*   **Modelo de Dominio Desalineado de la Base de Datos**:
    *   El archivo [modelo_dominio.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/modelo_dominio.md) muestra entidades como `Usuario`, `CampoCultivo`, `ModeloIA_Predictivo` y `ProyeccionFinanciera` que **no existen en la base de datos real** (`01_schema.sql` y `02_seed.sql`).
    *   Al mismo tiempo, **omite entidades críticas** de la base de datos que sí están implementadas, como `perfil_cultivo` (crucial para los umbrales de humedad de las válvulas), `registro_valvula` (auditoría de latencia de riego), `registro_error_sistema` y `recomendacion_riego`.
    *   **Impacto**: El profesor notó de inmediato que el diagrama de dominio y el esquema físico SQL no son consistentes ("Falta diagrama correcto para una entidad").

### C. Inconsistencias en los Diagramas de Arquitectura
*   **Desalineación de Tecnologías**:
    *   El documento [Arquitectura.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/Arquitectura.md) menciona en su diagrama y justificación que el Backend está desarrollado sobre **NestJS** y menciona scripts en Python (como `api_ingesta.py`), cuando el código real de producción está programado en **Node.js/Express** con archivos `.js`.
*   **Ausencia de Diagramas UML Críticos**:
    *   **Diagrama de Componentes**: Falta un diagrama que muestre detalladamente los componentes de software (APIs Express, Workers, Adaptores), así como sus dependencias físicas y lógicas.
    *   **Diagrama de Despliegue**: No está documentado cómo conviven los contenedores Docker, los volúmenes de datos, el hardware de simulación y el puerto serial del Arduino.
    *   **Interfaces y Dependencias**: No se documentan de forma explícita las firmas de las interfaces (ej: REST endpoints, el Exchange de RabbitMQ) ni cómo se comunican las APIs entre sí.
    *   **Diagrama de Secuencia**: Falta un diagrama de secuencia UML coherente que demuestre paso a paso el flujo de la Historia de Usuario implementada (el ciclo de telemetría de humedad e instrucciones de riego automático).

### D. Historias de Usuario (HUs) sin Contenido y Flujo de Aceptación
*   **Archivos de HUs Vacíos**:
    *   Los archivos `US-01.md` a `US-08.md` y `US-10.md` en la carpeta `docs` solo contienen imágenes adjuntas sin descripciones escritas.
    *   El archivo `US-09.md` está completamente vacío (1 byte).
    *   No se definen los criterios de aceptación en formato formal (ej. Gherkin `Dado / Cuando / Entonces`) ni se documenta la **Definition of Done (DoD)** del equipo.

### E. Ausencia de Gestión de Calidad de Código
*   **Falta de DeudaTecnica.md**:
    *   No se dispone de un reporte formal que identifique la deuda técnica acumulada, los "code smells" (malos olores de código) en el backend/frontend y las propuestas de refactorización.

---

## 3. Documentos que van faltando para la última entrega

Para asegurar la aprobación del ramal en el examen, se deben elaborar y actualizar los siguientes documentos dentro del repositorio:

1.  **[README.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/README.md) (Actualizado)**:
    *   Reescribir las instrucciones de instalación enfocándose exclusivamente en el despliegue automático con **Docker Compose** (`docker compose up --build`), detallando las variables de entorno del archivo `.env.example` y verificando que el profesor no deba configurar Postgres ni RabbitMQ de forma local.
2.  **`docs/DeudaTecnica.md` (Nuevo)**:
    *   Crear este documento listando code smells del proyecto, como:
        *   Hardcoding del puerto serial `COM3` (formato Windows) dentro de un entorno Docker basado en Linux en [controlador_valvulas.js](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/api/controlador_valvulas.js).
        *   Duplicación de la conexión a la base de datos (múltiples pools de `pg`) repartidos en las APIs de forma redundante en vez de tener una clase/módulo de conexión compartido.
        *   Uso de consultas SQL directas en lugar de un Query Builder u ORM básico para mayor mantenibilidad.
        *   Falta de tests unitarios y de integración automatizados (solo hay pruebas manuales/JSON).
        *   Propuesta técnica estructurada para resolver estos puntos.
3.  **[docs/modelo_dominio.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/modelo_dominio.md) (Corregido)**:
    *   Modificar el diagrama de clase de Mermaid para representar fielmente las entidades y relaciones de la base de datos física (`perfil_cultivo`, `nodo_sensor`, `medicion_historica`, `valvula_control`, `registro_valvula`, `registro_error_sistema`, `recomendacion_riego` y `configuracion_sistema`).
4.  **[docs/Arquitectura.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/Arquitectura.md) (Corregido y Ampliado)**:
    *   Corregir la referencia de NestJS/Python a Node.js/Express.
    *   Agregar un **Diagrama de Componentes** de Mermaid que ilustre los endpoints REST y flujos AMQP.
    *   Agregar un **Diagrama de Despliegue** de Mermaid reflejando los contenedores de Docker Compose.
    *   Agregar un **Diagrama de Secuencia** de Mermaid que ilustre cómo fluye una lectura de humedad desde el hardware simulado (`api-ingesta`), se publica en la cola (`rabbitmq`), es procesada por el controlador (`api-valvulas`), se audita en la base de datos y opcionalmente abre la válvula en <100ms.
5.  **[docs/US-01.md](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/docs/US-01.md) a `US-10.md` (Actualizados)**:
    *   Escribir en texto la descripción de cada Historia de Usuario y sus respectivos criterios de aceptación (formato Gherkin).
6.  **`docs/DefinitionOfDone.md` (Nuevo)**:
    *   Documentar el acuerdo de equipo sobre la definición de "Hecho" (DoD) que guio el desarrollo del proyecto (ej: pruebas manuales ejecutadas con éxito, código linterizado, Dockerfile probado localmente, documentación de arquitectura al día).
