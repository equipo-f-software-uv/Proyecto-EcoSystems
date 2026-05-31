#include <ArduinoJson.h>

// Definición de pines
const int PIN_HUMEDAD = A0;
const int PIN_TEMP = A1;
const int PIN_FLUJO = 2;

// --- VARIABLES DE TEMPORIZACIÓN (Reemplazo del delay) ---
unsigned long tiempoAnterior = 0;
const unsigned long INTERVALO_ENVIO = 5000; // Enviar datos cada 5 segundos

// --- VARIABLES PARA EL SENSOR DE FLUJO ---
// volatile indica que esta variable cambiará fuera del flujo normal del programa (en la interrupción)
volatile int contadorPulsos = 0; 
float caudalLitrosMinuto = 0.0;

// Función de interrupción: Se dispara sola cada vez que el agua mueve el sensor
void contarPulsos() {
  contadorPulsos++;
}

void setup() {
  Serial.begin(115200);

  pinMode(PIN_HUMEDAD, INPUT);
  pinMode(PIN_TEMP, INPUT);
  
  // Es vital usar INPUT_PULLUP para el sensor de flujo para evitar ruido eléctrico
  pinMode(PIN_FLUJO, INPUT_PULLUP);
  
  // Configuramos la interrupción en el pin 2
  attachInterrupt(digitalPinToInterrupt(PIN_FLUJO), contarPulsos, RISING);

  Serial.println("Inicializando nodo sensor EcoSystems...");
}

void loop() {
  // Estructura no bloqueante: Se ejecuta solo si ha pasado el INTERVALO_ENVIO
  if (millis() - tiempoAnterior >= INTERVALO_ENVIO) {
    tiempoAnterior = millis(); // Reiniciamos el cronómetro

    // 1. Leer y normalizar la Humedad (Ejemplo: Mapear 1023-0 a 0-100%)
    int lecturaCrudaHumedad = analogRead(PIN_HUMEDAD);
    // TODO: Ajustar estos valores 1023 y 0 tras calibrar el sensor en tierra real
    int humedadSuelo = map(lecturaCrudaHumedad, 1023, 0, 0, 100); 
    humedadSuelo = constrain(humedadSuelo, 0, 100); // Aseguramos que no pase de 100%

    // 2. Leer Temperatura
    float temperatura = leerTemperatura(PIN_TEMP);

    // 3. Calcular el Flujo de Agua
    // Desactivamos interrupciones un milisegundo para leer la variable sin errores
    noInterrupts();
    int pulsosActuales = contadorPulsos;
    contadorPulsos = 0; // Reiniciamos para el próximo ciclo
    interrupts();
    
    // TODO: Ajustar el factor "7.5" según el modelo exacto de tu caudalímetro (ej. YF-S201)
    caudalLitrosMinuto = (pulsosActuales / 7.5); 

    // 4. Estampa de tiempo
    String timestamp = obtenerTiempoActual();

    // 5. Crear y poblar el documento JSON
    JsonDocument doc;
    doc["sensor_id"] = "nodo_huerto_01";
    doc["protocol"] = "MQTT";
    doc["timestamp"] = timestamp;

    JsonObject metrics = doc["metrics"].to<JsonObject>();
    metrics["humedad_suelo_prc"] = humedadSuelo; // Agregamos _prc para indicar porcentaje
    metrics["temperatura_c"] = temperatura;
    metrics["flujo_agua_lpm"] = caudalLitrosMinuto;

    // 6. Serializar y Transmitir
    String payload;
    serializeJson(doc, payload);
    Serial.println(payload);
  }
  
  // Aquí el procesador queda libre para otras tareas críticas,
  // como mantener la conexión WiFi/MQTT activa.
}

// ================= FUNCIONES AUXILIARES =================

float leerTemperatura(int pin) {
  // TODO: Implementar lectura real
  return 22.5; 
}

String obtenerTiempoActual() {
  // TODO: Implementar sincronización NTP/RTC
  return "2026-05-31T14:30:00Z"; 
}