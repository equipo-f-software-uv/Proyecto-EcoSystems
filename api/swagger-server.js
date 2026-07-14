const { createApp } = require('./shared/createApp');

const app = createApp();

const PORT = process.env.PORT || 3000;

// JSON de especificación OpenAPI 3.0
const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "EcoSystems API - Platform Documentation",
    version: "1.0.0",
    description: "Documentación interactiva y unificada para todas las APIs de la plataforma EcoSystems (Ingesta, Válvulas, Históricos, Perfiles y Adaptador LoRaWAN)."
  },
  servers: [
    {
      url: "http://localhost:8000",
      description: "API Ingesta (HTTP)"
    },
    {
      url: "http://localhost:8001",
      description: "Controlador de Válvulas"
    },
    {
      url: "http://localhost:8002",
      description: "API Históricos y Analíticas"
    },
    {
      url: "http://localhost:8003",
      description: "API Perfiles de Cultivo"
    },
    {
      url: "http://localhost:8004",
      description: "Adaptador LoRaWAN Webhook"
    }
  ],
  paths: {
    "/": {
      "get": {
        "summary": "Estado de la API de Ingesta",
        "description": "Retorna el estado de conexión e inicio del microservicio de ingesta.",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "example": "ok" },
                    "message": { "type": "string", "example": "API Ingesta EcoSystems en línea" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/readings": {
      "post": {
        "summary": "Registrar lectura de sensor (v1)",
        "description": "Envía una medición de sensor de humedad, temperatura o flujo al bus de eventos.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["nodeId", "sensorType", "value"],
                "properties": {
                  "nodeId": { "type": "string", "example": "NODO_VALPO_01" },
                  "sensorType": { "type": "string", "enum": ["humedad", "temperatura", "flujo"], "example": "humedad" },
                  "value": { "type": "number", "example": 45.5 }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Creado exitosamente",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "example": "success" },
                    "message": { "type": "string", "example": "Lectura registrada correctamente" }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Datos de entrada inválidos o faltantes"
          }
        }
      }
    },
    "/api/mediciones": {
      "post": {
        "summary": "Publicar lote de telemetría directo",
        "description": "Permite registrar un payload crudo estandarizado proveniente de microcontroladores.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["sensor_id", "metrics"],
                "properties": {
                  "sensor_id": { "type": "string", "example": "nodo_01" },
                  "protocol": { "type": "string", "example": "HTTP" },
                  "timestamp": { "type": "string", "format": "date-time" },
                  "metrics": {
                    "type": "object",
                    "properties": {
                      "humedad_suelo_prc": { "type": "number", "example": 45.0 },
                      "temperatura_c": { "type": "number", "example": 22.5 },
                      "flujo_agua_lpm": { "type": "number", "example": 1.2 }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Éxito",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "example": "success" },
                    "message": { "type": "string", "example": "Datos publicados en el exchange correctamente" }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Faltan datos obligatorios"
          }
        }
      }
    },
    "/api/v1/system/emergency-stop/activate": {
      "post": {
        "summary": "Activar Parada de Emergencia",
        "description": "Fuerza el apagado/cierre de todas las válvulas activas y congela aperturas automáticas.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["reason", "operatorId"],
                "properties": {
                  "reason": { "type": "string", "example": "Fuga crítica de agua detectada en Sector A" },
                  "operatorId": { "type": "string", "example": "OPER_02" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Parada de emergencia activada correctamente"
          },
          "409": {
            "description": "La parada de emergencia ya se encuentra activa"
          }
        }
      }
    },
    "/api/v1/system/emergency-stop/deactivate": {
      "post": {
        "summary": "Desactivar Parada de Emergencia",
        "description": "Libera el bloqueo global del sistema y restaura la operación automática de riego.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["operatorId"],
                "properties": {
                  "operatorId": { "type": "string", "example": "OPER_02" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Parada de emergencia desactivada"
          },
          "409": {
            "description": "El sistema ya opera en modo normal"
          }
        }
      }
    },
    "/api/v1/valves/{id}/status": {
      "get": {
        "summary": "Consultar estado de una válvula",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "integer" },
            "example": 1
          }
        ],
        "responses": {
          "200": {
            "description": "Estado actual de la válvula",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "valveId": { "type": "string", "example": "VALVE-01" },
                    "status": { "type": "string", "example": "CLOSED" },
                    "mode": { "type": "string", "example": "AUTOMATIC" },
                    "overrideActive": { "type": "boolean", "example": false }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Válvula no encontrada"
          }
        }
      }
    },
    "/api/v1/valves/{id}/override": {
      "post": {
        "summary": "Forzar control manual de válvula",
        "description": "Establece el estado de una válvula (ABRIR/CERRAR) de forma manual por sobre las decisiones automáticas.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "integer" },
            "example": 1
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["action", "operatorId"],
                "properties": {
                  "action": { "type": "string", "enum": ["ABRIR", "CERRAR"], "example": "ABRIR" },
                  "operatorId": { "type": "string", "example": "OPER_02" },
                  "simulateTimeout": { "type": "boolean", "example": false }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Orden manual ejecutada exitosamente"
          },
          "403": {
            "description": "Acción denegada (ej: el sistema está suspendido globalmente)"
          },
          "504": {
            "description": "Fallo de comunicación serial con el actuador"
          }
        }
      }
    },
    "/api/v1/valves/{id}/auto": {
      "post": {
        "summary": "Restaurar control automático de válvula",
        "description": "Remueve el bloqueo manual de la válvula devolviéndola al control automático basado en umbrales.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "integer" },
            "example": 1
          }
        ],
        "responses": {
          "200": {
            "description": "Válvula devuelta a control automático"
          }
        }
      }
    },
    "/api/v1/valve-logs": {
      "get": {
        "summary": "Consultar logs de auditoría de válvulas",
        "parameters": [
          {
            "name": "valveId",
            "in": "query",
            "required": true,
            "schema": { "type": "integer" },
            "example": 1
          }
        ],
        "responses": {
          "200": {
            "description": "Lista de logs de la válvula seleccionada"
          }
        }
      },
      "post": {
        "summary": "Registrar log de auditoría manual de válvula",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["valveId", "action", "reason"],
                "properties": {
                  "valveId": { "type": "integer", "example": 1 },
                  "action": { "type": "string", "enum": ["ABRIR", "CERRAR"], "example": "CERRAR" },
                  "reason": { "type": "string", "example": "Mantenimiento preventivo de boquillas" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Log creado exitosamente"
          }
        }
      }
    },
    "/api/irrigation/events": {
      "get": {
        "summary": "Consultar últimos eventos de riego",
        "description": "Retorna los últimos 50 eventos registrados de aperturas/cierres en la plataforma.",
        "responses": {
          "200": {
            "description": "Lista de eventos de riego"
          }
        }
      }
    },
    "/api/v1/system-errors": {
      "get": {
        "summary": "Obtener registros de errores del sistema",
        "description": "Requiere rol de Administrador en el header X-User-Role.",
        "parameters": [
          {
            "name": "X-User-Role",
            "in": "header",
            "required": true,
            "schema": { "type": "string" },
            "example": "Administrador"
          }
        ],
        "responses": {
          "200": {
            "description": "Lista de logs de error"
          },
          "403": {
            "description": "Acceso denegado (requiere rol Administrador)"
          }
        }
      }
    },
    "/api/v1/analytics": {
      "get": {
        "summary": "Consultar datos agregados del dashboard",
        "description": "Retorna promedios agregados de humedad del suelo y la relación de eventos de riego.",
        "parameters": [
          { "name": "nodeId", "in": "query", "required": true, "schema": { "type": "string" }, "example": "NODO_VALPO_01" },
          { "name": "from", "in": "query", "required": true, "schema": { "type": "string", "format": "date-time" }, "example": "2026-06-19T00:00:00Z" },
          { "name": "to", "in": "query", "required": true, "schema": { "type": "string", "format": "date-time" }, "example": "2026-06-20T23:59:59Z" },
          { "name": "granularity", "in": "query", "schema": { "type": "string", "enum": ["minute", "hour", "day"], "default": "hour" } }
        ],
        "responses": {
          "200": {
            "description": "Datos analíticos listos para graficar"
          }
        }
      }
    },
    "/api/reports/monthly": {
      "get": {
        "summary": "Obtener reporte mensual financiero y de agua",
        "parameters": [
          { "name": "month", "in": "query", "required": true, "schema": { "type": "string" }, "example": "06" },
          { "name": "year", "in": "query", "required": true, "schema": { "type": "string" }, "example": "2026" }
        ],
        "responses": {
          "200": {
            "description": "Reporte mensual calculado"
          }
        }
      }
    },
    "/api/sensores/{id_nodo}/historico": {
      "get": {
        "summary": "Consultar historial de telemetría de un sensor",
        "parameters": [
          { "name": "id_nodo", "in": "path", "required": true, "schema": { "type": "string" }, "example": "NODO_VALPO_01" },
          { "name": "dias", "in": "query", "schema": { "type": "integer", "default": 7 }, "example": 7 }
        ],
        "responses": {
          "200": {
            "description": "Listado temporal de telemetrías"
          }
        }
      }
    },
    "/api/estadisticas": {
      "get": {
        "summary": "Estadísticas globales agrupadas por día",
        "responses": {
          "200": {
            "description": "Estadísticas de consumo y humedad promedio"
          }
        }
      }
    },
    "/api/v1/recommendations": {
      "get": {
        "summary": "Obtener recomendación climática de riego",
        "description": "Consulta a la API meteorológica externa para decidir si se ajusta o postpone el riego del sector.",
        "parameters": [
          { "name": "sectorId", "in": "query", "required": true, "schema": { "type": "string" }, "example": "NODO_VALPO_01" },
          { "name": "simulateFailure", "in": "query", "schema": { "type": "boolean" }, "example": false }
        ],
        "responses": {
          "200": {
            "description": "Recomendación hídrica obtenida con éxito"
          }
        }
      }
    },
    "/api/perfiles": {
      "get": {
        "summary": "Listar todos los perfiles de cultivo",
        "responses": {
          "200": {
            "description": "Lista de perfiles con sus umbrales"
          }
        }
      }
    },
    "/api/crop-profiles": {
      "post": {
        "summary": "Crear un nuevo perfil de cultivo",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["cropName", "minHumidity", "maxHumidity"],
                "properties": {
                  "cropName": { "type": "string", "example": "Tomates Limachinos" },
                  "minHumidity": { "type": "integer", "example": 40 },
                  "maxHumidity": { "type": "integer", "example": 75 }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Perfil de cultivo creado exitosamente"
          },
          "409": {
            "description": "El perfil con ese nombre ya existe"
          }
        }
      }
    },
    "/api/sectors/{sectorId}/profile": {
      "put": {
        "summary": "Asignar un perfil de cultivo a un sector",
        "parameters": [
          { "name": "sectorId", "in": "path", "required": true, "schema": { "type": "string" }, "example": "NODO_VALPO_01" }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["profileId"],
                "properties": {
                  "profileId": { "type": "integer", "example": 1 }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Asignación exitosa"
          }
        }
      }
    },
    "/api/irrigation/thresholds": {
      "put": {
        "summary": "Actualizar umbrales de humedad de un perfil",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["id_perfil", "humedad_min_prc", "humedad_max_prc"],
                "properties": {
                  "id_perfil": { "type": "integer", "example": 1 },
                  "humedad_min_prc": { "type": "integer", "example": 35 },
                  "humedad_max_prc": { "type": "integer", "example": 80 }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Umbrales actualizados"
          }
        }
      }
    },
    "/api/v1/lorawan/webhook": {
      "post": {
        "summary": "Webhook de Ingesta LoRaWAN",
        "description": "Recibe tramas de telemetría de redes LoRaWAN (TTN, ChirpStack, etc.) y las puentea al bus de eventos.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "device_id": { "type": "string", "example": "nodo_01" },
                  "payload_raw": { "type": "string", "example": "eyJodW1lZGFkX3N1ZWxvX3ByYyI6IDQ1LCAidGVtcGVyYXR1cmFfYyI6IDIyLjUsICJmbHVqb19hZ3VhX2xwbSI6IDEuMn0=" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Lectura procesada con éxito"
          }
        }
      }
    }
  }
};

// Servir la especificación OpenAPI JSON
app.get('/swagger.json', (req, res) => {
  res.json(openApiSpec);
});

// HTML para Swagger UI cargando assets vía unpkg CDN
app.get('/docs', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>EcoSystems API - Swagger Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.11.0/favicon-16x16.png" sizes="16x16" />
  <style>
    html { box-sizing: border-box; overflow: -margin-top; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
  `);
});

// Redirigir la raíz a /docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

app.listen(PORT, () => {
  console.log(`Servidor de documentación Swagger UI activo en http://localhost:${PORT}/docs`);
});
