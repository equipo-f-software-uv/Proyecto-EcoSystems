# Módulo de Hardware y Obtención de Datos (Arduino)

Este directorio contiene el código fuente para los microcontroladores (basados en la plataforma Arduino) encargados de la lectura de sensores y transmisión de datos hacia la plataforma central del proyecto **EcoSystems**.

## 🎯 Objetivo

El objetivo principal de este módulo es la recolección de datos críticos en terreno para optimizar el consumo hídrico en tiempo real y permitir la automatización del sistema de riego.

## 🌡️ Sensores Soportados

El sistema lee de manera continua métricas provenientes de los siguientes sensores:
- **Humedad de suelo (%)**: Para determinar el nivel hídrico actual de la tierra.
- **Temperatura (°C)**: Para análisis predictivos sobre la evaporación y condiciones climáticas.
- **Flujo de agua (L/min)**: Para medir el volumen de agua utilizado durante los periodos de riego activo.

## 📡 Conectividad y Protocolos

El sistema ha sido diseñado con una **arquitectura multiprotocolo** para soportar distintos fabricantes y tipos de conectividad en los nodos agrícolas. Los protocolos soportados para la ingesta de datos son:
- **HTTP/HTTPS**
- **MQTT**
- **LoRaWAN**

## 📦 Estructura del Payload (JSON)

Cualquiera sea el protocolo utilizado, el dispositivo debe armar y enviar un payload en formato JSON que cumpla con el siguiente esquema esperado por nuestra API de ingesta (`/api/mediciones`):

```json
{
  "sensor_id": "nodo_01",
  "protocol": "HTTP",
  "timestamp": "2023-11-15T14:30:00Z",
  "metrics": {
    "humedad_suelo_prc": 45,
    "temperatura_c": 22.5,
    "flujo_agua_lpm": 1.2
  }
}
```

*Nota: La latencia desde que se lee este dato hasta el control de válvulas debe ser estricta (<100ms) por lo que el código en el microcontrolador debe estar optimizado para no generar bloqueos de ejecución (`delay()`).*

## 🚀 Requisitos para el entorno de desarrollo

1. Instalar Arduino IDE (versión 2.x recomendada).
2. Configurar las tarjetas correspondientes (ESP32, ESP8266, Arduino Nano 33 IoT, etc.) desde el Gestor de Tarjetas.
3. Instalar las siguientes librerías desde el *Library Manager*:
   - `ArduinoJson` (Para la serialización del payload).
   - `PubSubClient` (Si se utiliza el protocolo MQTT).
   - Librerías específicas para los sensores de humedad y flujo (dependerá del hardware final).

## ⚙️ Configuración rápida

Antes de compilar y subir el código, asegúrate de configurar las credenciales en el archivo principal (o en un archivo `config.h` si aplica):

- Credenciales de WiFi o claves de aplicación LoRa (AppKey, DevEUI).
- IP / Dominio del servidor donde está desplegada la API.
- ID único del nodo (`sensor_id`).

---

**Responsable de Hardware:** Bruno Diaz
**Equipo:** EcoSystems - UV
