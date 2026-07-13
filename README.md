# 🌿 EcoSystems - Plataforma de Monitoreo e Ingesta IoT Agrícola

Este repositorio contiene la plataforma central de **EcoSystems**, una solución para la recepción, validación, persistencia asíncrona de telemetría IoT y control automatizado de válvulas de riego de baja latencia.

---

## 🎯 Requerimientos Críticos y SLA
*   **Ingesta Masiva**: Diseñado para soportar ráfagas de hasta **10.000 lecturas por segundo** sin pérdida de paquetes.
*   **Latencia Estricta (REF-01)**: El accionamiento de válvulas por reglas automáticas de humedad debe resolverse en **< 100ms**.
*   **Auditoría de Riego**: Registro exhaustivo de latencia y motivos de aperturas/cierres en la base de datos.
*   **Alta Disponibilidad**: Uso de colas RabbitMQ para evitar pérdida de datos ante saturaciones de la base de datos.

---

## 📂 Estructura del Proyecto

*   `api/`: Contiene los microservicios y adaptadores de hardware (Express.js, AMQP, SerialPort).
*   `database/`: Scripts de inicialización SQL (`01_schema.sql`) y datos semilla de telemetría e históricos (`02_seed.sql`).
*   `frontend/`: Dashboard interactivo para el agricultor desarrollado en Next.js 14 (TypeScript).
*   `docs/`: Documentación de pruebas, modelos de dominio y guías de arquitectura.

---

## 🚀 Instalación y Despliegue Rápido (Recomendado vía Docker)

La forma más rápida, segura y recomendada de desplegar la plataforma completa (Base de datos Postgres, RabbitMQ, Microservicios y Frontend) es a través de **Docker Compose**, lo que evita tener que instalar y configurar dependencias en el sistema operativo local.

### 📋 Prerrequisitos
Asegúrate de tener instalados en tu sistema operativo:
*   [Docker](https://www.docker.com/get-started)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### 🛠️ Pasos para el Despliegue

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/equipo-f-software-uv/Proyecto-EcoSystems.git
    cd Proyecto-EcoSystems
    ```
2.  **Configurar Variables de Entorno**:
    Copia el archivo de plantilla a `.env` (los valores predeterminados ya están configurados para funcionar sin cambios en el entorno Docker):
    ```bash
    cp .env.example .env
    ```
3.  **Iniciar el Ecosistema completo**:
    Ejecuta el siguiente comando en la raíz del proyecto para descargar, compilar e iniciar todos los servicios:
    ```bash
    docker compose up --build
    ```
    > 💡 *Nota: Docker Compose ejecutará de forma automática los scripts [01_schema.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/01_schema.sql) y [02_seed.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/02_seed.sql) para crear las tablas e inyectar datos históricos semilla en PostgreSQL.*

---

## 🔗 Puertos e Interfaces Disponibles tras Iniciar Docker

Una vez que todos los contenedores muestren estado *healthy*, puedes acceder a los siguientes servicios desde tu navegador:

| Servicio | URL / Puerto | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:3000](http://localhost:3000) | Dashboard visual de sensores, históricos de humedad y CRUD de perfiles. |
| **API Ingesta** | [http://localhost:8000](http://localhost:8000) | Endpoint HTTP de sensores (`POST /api/v1/readings`). |
| **API Válvulas** | [http://localhost:8001](http://localhost:8001) | Endpoint para consultar y accionar válvulas manualmente. |
| **API Históricos** | [http://localhost:8002](http://localhost:8002) | APIs de reportes de mediciones. |
| **API Perfiles** | [http://localhost:8003](http://localhost:8003) | CRUD de perfiles de cultivo y asignación a sectores. |
| **RabbitMQ Console** | [http://localhost:15672](http://localhost:15672) | Panel de colas (Usuario: `guest` / Contraseña: `guest`). |

---

## 🛠️ Alternativa: Instalación Manual para Desarrollo Local

Si deseas correr los servicios de manera local e independiente para desarrollo, debes contar con las bases de datos de forma externa.

### 📋 Prerrequisitos Locales
*   **Node.js v18+** instalado.
*   **PostgreSQL 15** con la extensión **TimescaleDB** activa.
*   **RabbitMQ** corriendo localmente (puerto `5672`).

### 🔧 Configuración Manual

1.  **Configurar Base de Datos**:
    *   Crea una base de datos llamada `ecosystems_db` en tu gestor PostgreSQL.
    *   Ejecuta el script SQL [database/01_schema.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/01_schema.sql) para levantar el esquema e hypertables.
    *   Ejecuta opcionalmente [database/02_seed.sql](file:///home/br1/Documentos/Software/Proyecto-EcoSystems/database/02_seed.sql) para cargar datos de prueba.
2.  **Instalar Dependencias de Node**:
    En la raíz del proyecto, instala los módulos NPM:
    ```bash
    npm install
    ```
3.  **Iniciar Servicios Individuales**:
    Debes abrir terminales independientes para cada componente:
    *   **API Ingesta**: `npm run start:ingesta` (Puerto 8000)
    *   **API Válvulas**: `npm run start:valvulas` (Puerto 8001)
    *   **API Históricos**: `npm run start:historicos` (Puerto 8002)
    *   **API Perfiles**: `npm run start:perfiles` (Puerto 8003)
    *   **Worker Históricos**: `npm run start:worker` (Persistencia de colas)
    *   **Simulador de Sensores**: `npm run start:simulator` (Simula flujo continuo de telemetría)

---

## 👥 Responsabilidades del equipo

| Integrante | Rol(es) Oficial(es) | Ítems de la rúbrica a cargo | Responsabilidades Específicas |
|------------|---------------------|-----------------------------|-------------------------------|
| **Joaquín Molina** | Technical Lead / Arquitecto (Backend y Gestión de Datos) | Ítems 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 5.1 | Arquitectura del backend, pipeline de RabbitMQ/TimescaleDB, diagramas de diseño, instrucciones de despliegue y archivo `DeudaTecnica.md`. |
| **Jorge Bahamondes** | Scrum Master / Quality Assurance | Ítems 2.1, 2.2, 2.3, 2.4, 4.1 | Gestión del backlog, diagramas de análisis (Casos de uso/Estados), matriz `CasosDePrueba.md` y archivo `EspecificacionHU.md`. |
| **Bruno Díaz** | Developer (Interfaz y Frontend) | Ítems 1.1, 1.2, 1.3 | Construcción de componentes frontend, maquetación del dashboard interactivo y consumo integrado de las APIs en Next.js. |

---

## 📋 Historias de Usuario

### Historias de Usuario Implementadas
| ID    | Nombre                                                              | Issue |
|-------|---------------------------------------------------------------------|-------|
| US-02 | Almacenamiento histórico de lecturas de sensores en la Base de Datos | #2    |
| US-09 | Panel de gráficos históricos e interactivos de humedad y riego      | #9    |

### Historias de Usuario en Backlog (Seguimiento del Proyecto)
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

## 📦 Artefactos del proyecto
| Artefacto                          | Ubicación / enlace          | Descripción |
|------------------------------------|-----------------------------|-------------|
| **Modelo de dominio** | `[./docs/modelo_dominio.md](./docs/modelo_dominio.md)` | Cubre las entidades, atributos y relaciones de la HU. |
| **Diagrama de casos de uso** | `[./docs/](./docs/)` | Diagrama general que cubre la funcionalidad de los actores del proyecto. |
| **Especificación de HU** | `[./docs/US-02.md](./docs/US-02.md)` y `[./docs/US-09.md](./docs/US-09.md)` | Incluye flujos, criterios de aceptación y especificaciones del sprint. |
| **Diagrama de estados** | `[./docs/](./docs/)` | Representación lúdica del ciclo de vida de los estados de la entidad. |
| **Diagrama de despliegue y comp.** | `[./docs/Arquitectura.md](./docs/Arquitectura.md)` | Infraestructura física y distribución de nodos lógicos del backend. |
| **Diagrama de componentes** | `[./docs/Arquitectura.md](./docs/Arquitectura.md)` | Estructura detallada que muestra dependencias e interfaces del sistema. |
| **Diagrama de secuencia** | `[./docs/Arquitectura.md](./docs/Arquitectura.md)` | Flujos de llamadas y secuencia del procesamiento asíncrono implementado. |
| **Casos de prueba** | `[./docs/test-cases.md](./docs/test-cases.md)` | Matriz con casos detallados, acciones y salidas esperadas. |
| **Deuda técnica / code smells** | `[./docs/DeudaTecnica.md](./docs/DeudaTecnica.md)` | Identificación de oportunidades de refactorización y mejoras de diseño. |

---

**Equipo:** EcoSystems - Universidad de Valparaíso
