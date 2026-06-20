# Proyecto-EcoSystems: Optimización de Riego mediante IoT e IA

## Descripción del sistema 

Proyecto-EcoSystems nació de una necesidad bastante concreta: enfrentar la crisis hídrica en la Región de Valparaíso. En un escenario de escasez severa, los métodos de riego tradicionales resultan ineficientes, provocando un desperdicio crítico de recursos que pone en riesgo la sostenibilidad del agro regional.

Se propone el desarrollo de un sistema integral de Internet de las Cosas (IoT) y Análisis de Datos diseñado para optimizar el consumo hídrico en tiempo real. El sistema genera una automatización del riego, transformando la gestión del campo en una operación basada en datos recogidos en tiempo real.

Para materializar esta solución, el proyecto se divide en tres pilares esenciales:
1. **Hardware y Obtención de datos:** Implementación de una red de sensores basados en Arduino para la medición de humedad en el suelo, temperatura y flujo de agua en tiempo real.
2. **Gestión de Datos:** Centralización de la información en una base de datos, permitiendo el almacenamiento histórico para realizar comparativas de eficiencia entre distintos periodos de siembra.
3. **Inteligencia y Analítica:** Uso de IA para modelos predictivos del clima/suelo y un módulo de proyecciones financieras para la planificación presupuestaria eficiente del gasto hídrico.

## Instalación y Despliegue

### Requisitos Previos

Para ejecutar el proyecto, es necesario contar con las siguientes herramientas instaladas:

*   **Node.js** (Versión 18 o superior)
*   **Docker** y **Docker Compose**
*   **Arduino IDE** (para la carga de código en los sensores/actuadores)
*   **Git**

### 1. Clonar el Repositorio

Primero, clona el repositorio en tu máquina local:

```bash
git clone https://github.com/equipo-f-software-uv/Proyecto-EcoSystems.git
cd Proyecto-EcoSystems
```

### 2. Instalación de Dependencias

El proyecto se divide en módulos. Debes instalar las dependencias de Node.js en las carpetas correspondientes:

**Backend (API y Microservicios):**
```bash
cd backend/node-api
npm install
```

**Frontend Web:**
```bash
cd ../../frontend-web
npm install
```

### 3. Configuración de Infraestructura

Utilizamos Docker para levantar la base de datos (TimescaleDB), el broker MQTT (Mosquitto) y el sistema de colas (RabbitMQ).

```bash
cd ../backend
docker-compose up -d
```

### 4. Variables de Entorno

El sistema utiliza variables de entorno para la comunicación entre servicios. Por defecto, los valores están configurados para funcionar con Docker, pero puedes ajustarlos según sea necesario:

*   `RABBITMQ_URL`: URL de RabbitMQ (por defecto: `amqp://localhost`)
*   `MQTT_BROKER`: URL del broker MQTT (por defecto: `mqtt://localhost`)
*   `DB_HOST`: Host de la base de datos (por defecto: `127.0.0.1`)
*   `SERIAL_PORT`: Puerto serie del Arduino (por defecto: `COM3` en Windows, ej: `/dev/ttyUSB0` en Linux)

### 5. Ejecución en Desarrollo

#### Levantar el Backend
Cada servicio del backend puede iniciarse de forma independiente desde la carpeta `backend/node-api`:

```bash
npm run start:ingesta       # API de Ingesta (Puerto 8000)
npm run start:valvulas      # Controlador de Válvulas (Puerto 8001)
npm run start:historicos    # API de Históricos (Puerto 8002)
npm run start:perfiles      # API de Perfiles (Puerto 8003)
npm run start:worker        # Worker de procesamiento
npm run start:mqtt_adapter  # Adaptador MQTT a RabbitMQ
```

#### Levantar el Frontend
Desde la carpeta `frontend-web`:

```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

#### Carga en Hardware (Arduino)
1. Abre el Arduino IDE.
2. Carga los archivos `.ino` ubicados en `arduino/modulo_sensores` y `arduino/modulo_actuadores` en sus respectivas placas.
3. Asegúrate de configurar el puerto correcto en la variable `SERIAL_PORT` del backend si es necesario.

### Estructura y Tecnologías del Frontend

El frontend web cuenta con una arquitectura moderna y modular:
*   **Tecnologías:** React, TypeScript, Vite, Tailwind CSS v4 (Compilación integrada de estilos vía `@tailwindcss/vite`), Recharts (gráficos interactivos) y Lucide React (iconografía premium).
*   **Directorio principal (`frontend-web/src/app/`):**
    *   `App.tsx`: Layout del panel principal, barra lateral interactiva y consumo periódico de APIs del backend.
    *   `types.ts`: Interfaces e invariantes tipadas para el flujo de datos (`ValveEvent`, `ErrorLog`, `CropProfile`, etc.).
    *   `weather.ts`: Modelo analítico que determina recomendaciones hídricas basadas en temperatura, humedad, viento y probabilidad de lluvia.
    *   `components/`:
        *   `ControlView.tsx`: Monitoreo en tiempo real y activación manual/automática de riego.
        *   `CropProfilesView.tsx`: Panel interactivo para crear, editar, eliminar y asignar perfiles de humedad por cultivo a sectores.
        *   `NotificationsView.tsx`: Pestaña de alertas predictivas y auditoría del estado de válvulas con exportador de logs a CSV.
        *   `WeatherView.tsx`: Pronóstico meteorológico de 7 días con gráficos detallados de precipitación vía Recharts.
        *   `DiagnosticsView.tsx`: Centro de diagnósticos y salud de subsistemas con visor de errores técnicos, acciones de resolución/eliminación y simulador de fallas.

## Historias de Usuario e Implementación

| ID | Nombre | Estado | Detalles / Componente |
|------|------------------------------------------------|------------|------------------------|
| US-01 | Reporte mensual de consumo de agua para análisis e costos | Completado | Vista `StatisticsView.tsx` |
| US-02 | Almacenamiento histórico de lecturas de sensores en la base de datos | Completado | `backend/database/01_schema.sql` y `worker_historicos.js` |
| US-03 | Control automático de riego según umbrales de humedad | Completado | Vista `ControlView.tsx` y `controlador_valvulas.js` |
| US-04 | Gestión de perfiles de humedad por tipo de cultivo | Completado | Vista `CropProfilesView.tsx` (Gestión, Rangos y Asignación) |
| US-05 | Registro de auditoría (log) para el control de válvulas | Completado | Vista `NotificationsView.tsx` (Pestaña "Registro de Válvulas") |
| US-06 | Panel de registro y monitoreo de errores del sistema (Logs) | Completado | Vista `DiagnosticsView.tsx` (Alertas de Componentes, Filtros y Logs) |
| US-07 | Atributo que aplican al proyecto | Completado | Arquitectura y Documentación |
| US-08 | Dashboard de gráficos históricos e interactivos de humedad y riego | Completado | Vista `StatisticsView.tsx` |
| US-09 | Generación de recomendaciones de riego basadas en pronóstico climático e IA | Completado | Vista `WeatherView.tsx` (Recomendación Inteligente y Pronóstico de Lluvia) |
| US-10 | [DOC] Definición e Integración del Bosquejo de Arquitectura General | Completado | Archivo `docs/Arquitectura.md` |

## Requisitos Extrafuncionales 

Ver: [Reqextrafuncionales.md](./Reqextrafuncionales.md)

## Entidades del Dominio 

Ver: [modelo_dominio.md](./modelo_dominio.md)

## Mockups 
Enlace de figma: https://flick-vector-39224673.figma.site

| Mockup | Historia de usuario relacionada                                   |
|--------|-------------------------------------------------------------------|
|[Vista US-01](./US-01.md)|[#Issue 1](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/1)|
|[Vista US-02](./US-02.md)|[#Issue 2](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/2)|
|[Vista US-03](./US-03.md)|[#Issue 3](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/3)| 
|[Vista US-04](./US-04.md)|[#Issue 4](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/4)|
|[Vista US-05](./US-05.md)|[#Issue 5](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/5)|
|[Vista US-06](./US-06.md)|[#Issue 6](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/6)| 
|[Vista US-07](./US-07.md)|[#Issue 7](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/7)|
|[Vista US-08](./US-08.md)|[#Issue 8](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/8)| 
|[Vista US-09](./US-09.md)|[#Issue 9](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/9)| 
|[Vista US-10](./US-10.md)|[#Issue 10](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/10)| 

## Diseño Arquitectónico 

Ver: [Arquitectura.md](./Arquitectura.md)
 
## Responsabilidades del Equipo 

| Integrante      | Rol         | Ítems de la rúbrica a cargo| 
|----------------|-------------|----------------------------|
| Joaquin Molina | Backend Developer | Gestión de Datos, Base de Datos, API |
| Bruno Diaz | Hardware Developer | Obtención de Datos, Conectividad IoT, Sensores Arduino |
| Jorge Bahamondes | Frontend Developer | Interfaz de Gestión y Control, UI/UX Mockups |
