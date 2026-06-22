# EcoSystems - Plataforma Central de Gestión Ambiental e IoT

EcoSystems es una solución de software y hardware orientada a la monitorización y automatización de zonas agrícolas mediante telemetría en terreno. El sistema centraliza la captura de datos ambientales de sensores IoT para optimizar recursos hídricos, analizar la eficiencia de riego, gestionar alertas operacionales y proyectar análisis financieros mediante almacenamiento especializado de series de tiempo.

---

## 🎯 Historias de Usuario del Proyecto (GitHub Backlog)

| IDENTIFICACIÓN | Nombre | Estado | GitHub Issue |
|----------------|--------|--------|--------------|
| **EE. UU.-02** | Almacenamiento histórico de lecturas de sensores en la Base de Datos | **Completado (Entregado)** | #2 |
| **EE. UU.-09** | Panel de gráficos históricos e interactivos de humedad y riego | **Completado (Entregado)** | #9 |
| **EE. UU.-03** | Control automático de riego según umbrales de humedad | En Desarrollo | #3 |
| **EE. UU.-04** | Gestión de perfiles de humedad por tipo de cultivo | En Desarrollo | #4 |
| **EE. UU.-01** | Reporte mensual de consumo de agua para análisis de costos | Backlog | #1 |
| **EE. UU.-05** | Registro de auditoría (log) para el control de válvulas | Backlog | #5 |
| **EE. UU.-06** | Panel de registro y monitoreo de errores del sistema (Logs) | Backlog | #6 |
| **EE. UU.-10** | Generación de recomendaciones de riego basadas en pronósticos climáticos e IA | Backlog | #10 |
| **EE. UU.-11** | Control manual de riego remoto mediante aplicación móvil | Backlog | #11 |
| **EE. UU.-19** | Panel de monitoreo técnico de ingesta y dispositivos | Backlog | #19 |

###  Alcance Implementado en esta Entrega (Flujo Completo)
* **Persistencia y Capa Backend (EE. UU.-02):** Ingesta masiva y persistencia de series de tiempo de telemetría (humedad, temperatura) directamente en tablas relacionales optimizadas en TimescaleDB, utilizando RabbitMQ para desacoplar el tráfico sin pérdida de paquetes[cite: 1].
* **Visualización e Interfaz (EE. UU.-09):** Dashboard analítico interactivo que permite al administrador consultar y visualizar gráficos históricos de las métricas hídricas registradas en los últimos 7 días.

---

##  Tecnologías Utilizadas y Caso de Uso

| Tecnología | Uso en el Sistema |
|------------|-------------------|
| **Node.js** | Entorno de ejecución principal para la API REST y microservicios. |
| **Express.js** | Framework para el desarrollo de las APIs de backend y lógica de consultas. |
| **Python** | Scripts especializados para capas bajas de recolección (`api_ingesta.py`, `api_perfiles.py`). |
| **PostgreSQL + TimescaleDB** | Base de datos relacional con extensión de series de tiempo optimizada para alta ingesta IoT. |
| **RabbitMQ (`amqplib`)** | Broker de mensajería asíncrona encargado de desacoplar la ingesta masiva de la persistencia de datos. |
| **Next.js / TypeScript** | Tecnología del lado de la Interfaz para la visualización interactiva y visualización de gráficos. |

---

##  Arquitectura y Requerimientos Críticos

Conforme a las evaluaciones de escalabilidad, el backend contempla las siguientes capacidades críticas:
* **Ingesta Masiva:** Diseñado para soportar estructuralmente picos de hasta 10.000 lecturas por segundo mediante colas de RabbitMQ sin pérdida de paquetes.
* **Latencia Estricta:** La evaluación de reglas operacionales para el accionamiento de válvulas se resuelve en `< 100ms`.
* **Aislamiento de Procesos:** Separación física del flujo transaccional pesado (históricos asíncronos en background) de las llamadas de control síncronas para evitar degradación.
* **Lecturas Optimizadas:** Consultas sobre TimescaleDB estructuradas para renderizar datos históricos de los últimos 7 días en menos de 2 segundos.

---

##  Estructura del Repositorio

* **`/.Géminis/`**: Documentación complementaria y configuración de endpoints de APIs.
* **`/API/`**: Código fuente de los microservicios públicos, procesos distribuidos y workers.
* **`/Arduino/`**: Firmware embebido desarrollado para el hardware del nodo sensor en terreno.
* **`/base de datos/`**: Scripts de inicialización, definición de esquemas y tablas relacionales (`01_schema.sql`).
* **`/documentos/`**: Modelos de análisis, diseño, pruebas de software y evidencias de ejecución[cite: 1].
* **`/Interfaz/`**: Código frontend desarrollado en Next.js con soporte completo para TypeScript.
* **`/especificación abierta/`**: Directorio técnico de diseño guiado por especificaciones (*Spec-driven development*)[cite: 1].

---

##  Puntos Finales Principales (Endpoints de la API)

| Método | Punto Final | Descripción |
|--------|-------------|-------------|
| **POST** | `/api/ingesta` | Recibe cargas de telemetría desde los nodos sensores y las publica en RabbitMQ. |
| **GET** | `/api/historicos` | Recupera métricas ambientales optimizadas de los últimos 7 días desde TimescaleDB. |
| **POST** | `/api/valvulas` | Evalúa reglas de negocio en tiempo real y comanda el hardware actuador. |
| **PUT** | `/api/perfiles/:id` | Actualiza los límites operacionales de humedad y temperatura por cultivo. |

---

##  Artefactos de la Entrega

| Artefacto | Archivo / Ubicación | Descripción |
|-----------|---------------------|-------------|
| **Código Fuente Backend** | `/API/` | Lógica centralizada de microservicios, ingesta y workers. |
| **Base de Datos** | `/base de datos/01_schema.sql` | Esquemas relacionales (`nodo_sensor`, `perfil_cultivo`, `medicion_historica`, `registro_valvula`). |
| **Interfaz de Usuario** | `/Interfaz/` | Dashboard web interactivo desarrollado en Next.js. |
| **Especificación de HU** | `/documentos/` | Criterios de aceptación y Definition of Done de la historia de usuario[cite: 1]. |
| **Casos de Prueba** | `/documentos/` | Matriz de validación con los escenarios de pruebas funcionales ejecutados[cite: 1]. |
| **Deuda Técnica** | `/documentos/` | Registro formal de *code smells*, impacto y mejoras arquitectónicas futuras[cite: 1]. |
| **Diagramas de Análisis** | `/documentos/` | Contiene el Modelo de Dominio, Diagrama de Casos de Uso y Diagrama de Estados[cite: 1]. |
| **Diagramas de Diseño** | `/documentos/` | Contiene los Diagramas de Secuencia, Componentes e Infraestructura de Despliegue[cite: 1]. |
| **Evidencias de Ejecución**| `/documentos/` | Capturas de funcionamiento de las APIs y payloads validados en las herramientas de pruebas. |

---

##  Configuración y Despliegue Rápido

### 1. Requisitos Previos
* Node.js v18+ instalado localmente.
* Instancia de PostgreSQL activa con la extensión de TimescaleDB instalada.
* Servidor en ejecución de RabbitMQ Broker.

### 2. Variables de Entorno
Crea un archivo `.env` en el directorio de ejecución tomando como referencia el archivo `.env.ejemplo` con las siguientes configuraciones:
* `DATABASE_URL=postgres://user:password@localhost:5432/ecosystems_db`
* `RABBITMQ_URL=amqp://localhost`
* `PORT_INGESTA=8000`

### 3. Instalación y Ejecución Local (Sin Docker)
```bash
# 1. Levantar el esquema de base de datos
# Ejecutar el script SQL /base de datos/01_schema.sql en PostgreSQL

# 2. Instalar dependencias en el proyecto
npm install

# 3. Ejecutar los servicios en terminales independientes de forma simultánea
npm run start:ingesta     # Puerto 8000 (API Ingesta)
npm run start:valvulas    # Puerto 8001 (Controlador de Válvulas)
npm run start:historicos  # Puerto 8002 (API Históricos)
npm run start:perfiles    # Puerto 8003 (Perfiles de Cultivo)
