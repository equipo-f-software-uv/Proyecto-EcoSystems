# EcoSystems - Plataforma Central de Gestión Ambiental e IoT

## Descripción del sistema
Este repositorio contiene el código fuente de la plataforma central del proyecto **EcoSystems**, encargada de la recepción de usuario, validación, almacenamiento de lecturas IoT y disponibilización de los datos para la interfaz de usuario.

### Objetivo
El objetivo principal de este módulo es centralizar la información proveniente de los sensores en terreno. Permite el almacenamiento histórico para realizar comparativas de eficiencia de riego, análisis financiero y sienta las bases de datos para el futuro entrenamiento de modelos predictivos de IA.

---

## Historia de usuario implementada
| ID    | Nombre                                                              | Issue |
|-------|---------------------------------------------------------------------|-------|
| US-02 | Almacenamiento histórico de lecturas de sensores en la Base de Datos | #2    |
| US-09 | Panel de gráficos históricos e interactivos de humedad y riego      | #9    |

> **Nota de Alcance:** El flujo implementado cubre de extremo a extremo (Frontend, Backend y Persistencia) una transacción compleja de ingesta masiva asíncrona mediante colas RabbitMQ hacia tablas optimizadas en TimescaleDB (US-02), junto con la búsqueda y filtrado de datos históricos de los últimos 7 días renderizados en la interfaz (US-09).

---

## Historias de Usuario en Backlog (Seguimiento del Proyecto)
| IDENTIFICACIÓN | Nombre | Estado | GitHub Issue |
|----------------|--------|--------|--------------|
| **US-03** | Control automático de riego según umbrales de humedad | En Desarrollo | #3 |
| **US-04** | Gestión de perfiles de humedad por tipo de cultivo | En Desarrollo | #4 |
| **US-01** | Reporte mensual de consumo de agua para análisis de costos | Backlog | #1 |
| **US-05** | Registro de auditoría (log) para el control de válvulas | Backlog | #5 |
| **US-06** | Panel de registro y monitoreo de errores del sistema (Logs) | Backlog | #6 |
| **US-10** | Generación de recomendaciones de riego basadas en pronósticos climáticos e IA | Backlog | #10 |
| **US-11** | Control manual de riego remoto mediante aplicación móvil | Backlog | #11 |
| **US-19** | Panel de monitoreo técnico de ingesta y dispositivos | Backlog | #19 |

---

## Artefactos del proyecto
| Artefacto                          | Ubicación / enlace          | Descripción |
|------------------------------------|-----------------------------|-------------|
| **Modelo de dominio** | `[./documentos/modelo_dominio.md](./documentos/modelo_dominio.md)` | Cubre las entidades, atributos y relaciones de la HU. |
| **Especificación de HU** | `[./documentos/US-02.md](./documentos/US-02.md)` y `[./documentos/US-09.md](./documentos/US-09.md)` | Incluye flujos, criterios de aceptación y especificaciones del sprint. |
| **Diagrama de despliegue, comp. y secuencia** | `[./documentos/Arquitectura.md](./documentos/Arquitectura.md)` | Infraestructura física, distribución de nodos, componentes y flujos de secuencia. |
| **Casos de prueba** | `[./documentos/test-cases.md](./documentos/test-cases.md)` | Matriz con casos detallados, acciones y salidas esperadas. |

---

## Tecnologías Utilizadas
* **Framework API:** Express.js (Node.js) - Arquitectura asíncrona impulsada por eventos, ideal para operaciones I/O intensivas (IoT).
* **Base de Datos:** PostgreSQL con TimescaleDB - Optimizado para alta ingesta y consultas de series de tiempo (IoT).
* **Communication asíncrona:** RabbitMQ (a través de `amqplib`) para desacoplar la ingesta de la persistencia.

---

## Arquitectura y Requerimientos Críticos
Conforme a las recientes evaluaciones de escalabilidad, el backend contempla las siguientes capacidades críticas:
* **Ingesta Masiva:** Diseñado y en evolución para soportar picos de hasta **10.000 lecturas por segundo** sin pérdida de paquetes.
* **Latencia estricta:** La toma de decisiones para el accionamiento de válvulas debe resolverse en **< 100ms**.
* **Aislamiento de Procesos:** Separación del flujo transaccional pesado (históricos asíncronos) del flujo de control en tiempo real para evitar la degradación del sistema.
* **Lecturas Optimizadas:** Soporte para la visualización de datos históricos de los últimos 7 días en menos de 2 segundos.

---

## Estructura del Directorio
* `/adaptadores/`: Microservicios que traducen protocolos específicos (ej. MQTT, LoRaWAN) al formato interno del sistema.
* `/api/`: Contiene las API REST públicas (ej. `api_ingesta.js` para recolección, `api_perfiles.js` para configuración).
* `/workers/`: Procesos en segundo plano (consumidores de colas) encargados del procesamiento diferido.
* `controlador_valvulas.js`: Microservicio crítico que evalúa reglas y se comunica con el hardware actuador.
* `/database/`: Scripts de inicialización, definición de tablas relacionales y esquemas de la base de datos (ej. `01_schema.sql`).

---

## 🚀 Configuración y Despliegue Rápido

1. **Base de Datos**:
   - Ejecuta el script `database/01_schema.sql` en tu gestor **PostgreSQL** para generar las tablas requeridas (`nodo_sensor`, `perfil_cultivo`, `medicion_historica`, `registro_valvula`).
2. **Entorno Node.js**:
   - Asegúrate de tener Node.js instalado (v18+).
   - Instalar dependencias para microservicios y adaptadores: 
     ```bash
     npm install
     ```
3. **Configuración de Credenciales**:
   - Asegúrate de tener RabbitMQ corriendo y actualiza `RABBITMQ_URL` dentro de `api/api_ingesta.js`.
4. **Ejecución de Microservicios (Terminales independientes)**:
   - **1. API Ingesta** (Puerto 8000): 
     ```bash
     npm run start:ingesta
     ```
   - **2. API Controlador de Válvulas** (Puerto 8001): 
     ```bash
     npm run start:valvulas
     ```
   - **3. API Históricos/Frontend** (Puerto 8002):
     ```bash
     npm run start:historicos
     ```
   - **4. API Perfiles de Cultivo** (Puerto 8003):
     ```bash
     npm run start:perfiles
     ```

---

## Responsabilidades del equipo

| Integrante | Rol(es) Oficial(es) | Ítems de la rúbrica a cargo | Responsabilidades Específicas |
|------------|---------------------|-----------------------------|-------------------------------|
| **Joaquín Molina** | Technical Lead / Arquitecto (Backend y Gestión de Datos) | Ítems 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 5.1 | Arquitectura del backend, pipeline de RabbitMQ/TimescaleDB, diagramas de diseño, instrucciones de despliegue y archivo `DeudaTecnica.md`. |
| **Jorge Bahamondes** | Scrum Master / Quality Assurance | Ítems 2.1, 2.2, 2.3, 2.4, 4.1 | Gestión del backlog, diagramas de análisis (Casos de uso/Estados), matriz `CasosDePrueba.md` y archivo `EspecificacionHU.md`. |
| **Bruno Díaz** | Developer (Interfaz y Frontend) | Ítems 1.1, 1.2, 1.3 | Construcción de componentes frontend, maquetación del dashboard interactivo y consumo integrado de las APIs en Next.js. |
