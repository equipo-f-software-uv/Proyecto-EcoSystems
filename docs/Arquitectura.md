# Arquitectura de Software - EcoSystems

Este documento detalla el diseño arquitectónico de la plataforma **EcoSystems**, sus diferentes capas de componentes, la infraestructura de despliegue contenerizada y el flujo de datos. Adicionalmente, incluye la justificación y mitigación técnica frente a las preocupaciones del examen referentes a la latencia, la pérdida de datos y la exposición de múltiples puertos en red.

---

## 1. Diagrama de Arquitectura Multicapa (Software y Hardware)

El sistema utiliza un patrón de arquitectura física de **tres capas adaptada a IoT**, separando de forma estricta los dispositivos de terreno, la lógica de procesamiento asíncrono en el servidor y la interfaz visual del agricultor.

```mermaid
---
config:
  theme: forest
---
flowchart TD
    subgraph Capa_Presentacion ["Capa 3: Presentación (Frontend)"]
        UI["Interfaz Web <br> (Next.js 14 + TS)"]
    end

    subgraph Capa_Logica ["Capa 2: Lógica & Mensajería (Backend)"]
        direction TB
        API_I["API Ingesta <br> (Node.js Express)"]
        API_V["API Válvulas <br> (Node.js Express)"]
        API_H["API Históricos <br> (Node.js Express)"]
        API_P["API Perfiles <br> (Node.js Express)"]
        WK["Worker Históricos <br> (Node.js Consumidor)"]
        MQ["RabbitMQ Broker <br> (Colas asíncronas)"]
    end

    subgraph Capa_Datos ["Capa de Persistencia"]
        DB[(TimescaleDB <br> PostgreSQL + Series de Tiempo)]
    end

    subgraph Capa_Hardware ["Capa 1: Hardware & Captura (IoT)"]
        Arduino["Actuador Arduino <br> (Control Físico Válvula)"]
        Sensores["Módulo Sensores <br> (Humedad / Temp / Flujo)"]
    end

    %% Relaciones
    Sensores -- "HTTP/JSON" --> API_I
    API_I -- "Publicar Telemetría" --> MQ
    MQ -- "Suscribir telemetría.humidity" --> API_V
    MQ -- "Suscribir telemetría.humidity" --> WK
    API_V -- "Comando Serial" --> Arduino
    WK -- "Persistir Series de Tiempo" --> DB
    
    API_P -- "Consultar/Guardar Configuración" --> DB
    API_H -- "Consultar Históricos" --> DB
    
    UI -- "Configurar Perfil / Riego Manual" --> API_P
    UI -- "Ver Dashboards y Gráficos" --> API_H
    UI -- "Ver Estado Válvulas" --> API_V
```

---

## 2. Diagrama de Despliegue y Red (Entorno Docker)

Este diagrama detalla cómo se estructuran los servicios contenerizados mediante Docker Compose. Se destaca la separación entre puertos expuestos al exterior y la red interna privada del motor Docker, respondiendo directamente a la observación del profesor sobre los cuellos de botella de red.

```mermaid
---
config:
  theme: dark
---
graph TD
    subgraph Host_OS ["Sistema Operativo Host (Servidor / PC)"]
        direction TB
        
        %% Puertos Públicos Expuestos
        Port_3000["Puerto 3000 (HTTP)"]
        Port_80["Puerto 80/443 (HTTP/S)"]
        
        subgraph Docker_Network ["Red Interna Aislada (ecosystems_network)"]
            direction LR
            
            GW["API Gateway / Proxy <br> (Nginx en Producción)"]
            
            F["Frontend <br> (ecosystems_frontend:3000)"]
            
            subgraph APIs_Backend ["APIs Backend (Node.js Express)"]
                I["api-ingesta:8000"]
                V["api-valvulas:8001"]
                H["api-historicos:8002"]
                P["api-perfiles:8003"]
            end
            
            W["worker-historicos (Consumidor)"]
            
            RMQ[("rabbitmq:5672 / 15672")]
            
            TDB[("ecosystems_db:5432 <br> (TimescaleDB)")]
        end
    end

    %% Relaciones de Puertos Públicos
    Port_3000 --> F
    Port_80 --> GW
    
    %% Enrutamiento interno del Gateway
    GW --> I
    GW --> V
    GW --> H
    GW --> P
    
    %% Comunicaciones Internas (Sin exponer puertos al Host)
    I --> RMQ
    RMQ --> V
    RMQ --> W
    W --> TDB
    V --> TDB
    H --> TDB
    P --> TDB
```

---

## 3. Diagrama de Componentes e Interfaces de Software

Este diagrama detalla las dependencias físicas entre componentes de software y las interfaces o protocolos utilizados para la comunicación.

```mermaid
---
config:
  theme: default
---
classDiagram
    class Frontend_NextJS {
        <<Componente>>
        +Dashboard React
        +Perfiles de Cultivo Form
        +Consume APIs REST
    }

    class API_Ingesta {
        <<Componente Express>>
        +POST /api/v1/readings
        +Valida rangos físicos
        +Publish a RabbitMQ
    }

    class API_Valvulas {
        <<Componente Express>>
        +GET /api/valvulas
        +POST /api/valvulas/toggle
        +Consumidor AMQP (telemetry.humidity)
        +Caché de Umbrales en Memoria
    }

    class Worker_Historicos {
        <<Componente Node.js>>
        +Consumidor AMQP (telemetry.humidity)
        +Inserción masiva SQL
    }

    class Database_Timescale {
        <<Componente Base de Datos>>
        +Hypertable medicion_historica
        +Tabla perfil_cultivo
        +Tabla registro_valvula
    }

    Frontend_NextJS ..> API_Ingesta : HTTP / JSON
    Frontend_NextJS ..> API_Valvulas : HTTP / JSON
    API_Ingesta ..> API_Valvulas : AMQP (RabbitMQ)
    API_Ingesta ..> Worker_Historicos : AMQP (RabbitMQ)
    Worker_Historicos ..> Database_Timescale : pg Pool (SQL)
    API_Valvulas ..> Database_Timescale : pg Pool (SQL)
```

---

## 4. Mitigación de Pérdida de Datos y Latencia de Red

Durante el examen, se observó que la distribución del tráfico en múltiples puertos expuestos en Docker Compose (`8000`, `8001`, `8002`, `8003`) podría causar lentitud en los procesos y pérdida de datos debido al comportamiento de red de Docker. A continuación, se detalla la justificación técnica de nuestro diseño y cómo se mitiga este problema en producción.

### A. Diagnóstico de la Exposición de Puertos en Docker
En el entorno de desarrollo actual, cada microservicio tiene una directiva `ports` expuesta (ej: `"8000:8000"`). Esto levanta un proceso `docker-proxy` en el sistema operativo Host por cada puerto mapeado. 
*   **Problema**: El proxy de Docker redirige paquetes a través de la interfaz de red del Host. Bajo una carga extrema de telemetría, el proceso de traducción de red (NAT) y el overhead de múltiples proxies del Host pueden saturar los sockets de red, induciendo una latencia artificial o la pérdida de paquetes HTTP.

### B. Solución de Producción: API Gateway (Nginx) y Redes Aisladas
Para resolver esta brecha en el despliegue real:
1.  **Eliminación de la Exposición de Puertos de Backend**: En el entorno de producción, las directivas `ports` de `api-ingesta`, `api-valvulas`, `api-historicos` y `api-perfiles` se eliminan por completo del archivo `docker-compose.yml`. Las APIs ya no son accesibles directamente desde el exterior del servidor Host.
2.  **Uso de la Red Interna de Docker (`bridge`)**: Todos los microservicios, el broker RabbitMQ y la base de datos se comunican de forma nativa a través del DNS de Docker (ej. comunicándose a `http://api-ingesta:8000` o `amqp://guest:guest@rabbitmq/`). La red interna de Docker ejecuta ruteo directo a nivel de kernel, eliminando el proxy del Host y alcanzando velocidades de transmisión de red de milisegundos sin overhead.
3.  **Implementación de un API Gateway Único (Nginx)**: Se introduce un contenedor Nginx expuesto únicamente en el puerto `80` (o `443` con SSL). Este actúa como un proxy inverso de alto rendimiento que recibe todo el tráfico web y lo redirige de forma interna en la red de Docker:
    *   `http://ecosystems.cl/api/v1/readings` -> Deriva a `api-ingesta:8000`
    *   `http://ecosystems.cl/api/perfiles` -> Deriva a `api-perfiles:8003`

### C. Garantía de No Pérdida de Datos vía RabbitMQ
La arquitectura asíncrona de **RabbitMQ** es precisamente la salvaguarda contra la pérdida de datos. Si ocurre un pico de tráfico hídrico de sensores:
*   La API de Ingesta solo valida y encola el mensaje en RabbitMQ en un proceso que toma **< 2ms**, liberando el socket HTTP de inmediato.
*   Si el Worker de persistencia o la Base de Datos experimentan lentitud momentánea, RabbitMQ retiene las lecturas en memoria de forma segura en las colas persistentes (`durable: true`).
*   Los consumidores procesan los mensajes a su propio ritmo sin perder ni una sola lectura de sensor, estabilizando la carga del sistema.
*   En caso de fallo crítico en el backend, la cola almacena los datos hasta que el servicio se restablezca.

---

## 5. Justificación del Modelo de Tres Capas e IoT

1.  **Mantenibilidad**: Dado que los sensores en terreno pueden cambiar de tecnología (ej. pasar de simulación HTTP a protocolo LoRaWAN real), la separación física de la Capa de Hardware respecto a la Lógica del Backend permite que el equipo de desarrollo reemplace o agregue adaptadores (`adaptador_lorawan.js`) sin tener que reprogramar el frontend o la base de datos.
2.  **Portabilidad**: La capa de hardware corre de forma embebida, la capa de lógica está contenida en imágenes Docker listas para la nube (AWS/DigitalOcean) y la capa de presentación Next.js está optimizada para cargar de forma responsiva en computadores o teléfonos móviles de los agricultores.
3.  **Seguridad y Aislamiento**: Al bloquear la exposición pública de puertos de base de datos y de las colas, y centralizar el flujo de telemetría por un puerto de ingesta controlado, protegemos al actuador físico (válvula de riego) contra ataques externos que pretendan forzar la apertura de válvulas y desperdiciar recursos hídricos.
