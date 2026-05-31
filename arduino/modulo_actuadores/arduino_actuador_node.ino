#include <Arduino.h>
#include <ArduinoJson.h>

// --- DEFINICIÓN DE PINES ---
// Pin conectado al módulo de Relé que controla la electroválvula
const int PIN_VALVULA_1 = 8; 

void setup() {
  // Iniciar comunicación serial a alta velocidad
  Serial.begin(115200);

  // Configurar el pin del relé como salida
  pinMode(PIN_VALVULA_1, OUTPUT);

  // Por seguridad, siempre iniciamos con la válvula CERRADA para evitar inundaciones.
  // IMPORTANTE: La mayoría de los módulos relé para Arduino son "Activos en Bajo" (Active-Low).
  // Si tu relé se enciende con LOW, cambia este estado inicial a HIGH.
  digitalWrite(PIN_VALVULA_1, LOW); 

  Serial.println("--- Módulo Actuador EcoSystems Iniciado ---");
  Serial.println("Esperando comandos JSON...");
}

void loop() {
  // Revisar si el Backend (o el monitor serial) ha enviado un comando
  if (Serial.available()) {
    
    // 1. Crear el documento JSON para recibir los datos
    StaticJsonDocument<200> doc;

    // 2. Leer la cadena de texto entrante y tratar de convertirla a JSON
    DeserializationError error = deserializeJson(doc, Serial);

    // 3. Manejo de errores (por si llega texto basura o corrupto)
    if (error) {
      Serial.print("ERROR: Comando no reconocido o JSON inválido - ");
      Serial.println(error.c_str());
      
      // Limpiar el buffer serial para evitar bloqueos
      while(Serial.available() > 0) Serial.read(); 
      return; 
    }

    // 4. Extraer las instrucciones del JSON
    // Se espera que Joaquín envíe un JSON con esta estructura:
    // {"accion": "ABRIR", "id_valvula": "valvula_01"}
    String accion = doc["accion"];
    String id_valvula = doc["id_valvula"];

    // 5. Ejecutar la acción física
    if (id_valvula == "valvula_01") {
      
      if (accion == "ABRIR") {
        digitalWrite(PIN_VALVULA_1, HIGH); // Enviar voltaje al relé
        Serial.println("LOG: Válvula 1 ABIERTA con éxito.");
      } 
      else if (accion == "CERRAR") {
        digitalWrite(PIN_VALVULA_1, LOW); // Cortar voltaje al relé
        Serial.println("LOG: Válvula 1 CERRADA con éxito.");
      } 
      else {
        Serial.println("ERROR: Acción no válida. Use 'ABRIR' o 'CERRAR'.");
      }
      
    } else {
      Serial.println("ERROR: ID de válvula no encontrado en este nodo.");
    }
  }
}