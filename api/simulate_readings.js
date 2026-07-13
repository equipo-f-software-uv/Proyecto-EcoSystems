/**
 * EcoSystems - Simulador Dinámico de Lazo Cerrado (Feedback Loop)
 * Simula el comportamiento físico de los huertos/invernaderos:
 * - Si la válvula está ABIERTA, la humedad sube (riego activo).
 * - Si la válvula está CERRADA, la humedad baja lentamente (evaporación).
 * Envía las lecturas a la API de Ingesta (Puerto 8000) periódicamente.
 */

const INGESTA_URL = process.env.INGESTA_URL || 'http://localhost:8000';
const VALVULAS_URL = process.env.VALVULAS_URL || 'http://localhost:8001';

const NODOS = [
  { id: 1, name: 'Zona Norte',    nodeId: 'nodo_huerto_01', humidity: 50.0, temp: 22.5 },
  { id: 2, name: 'Zona Sur',      nodeId: 'NODO_VALPO_01',   humidity: 62.0, temp: 19.8 },
  { id: 3, name: 'Zona Este',     nodeId: 'nodo_huerto_03', humidity: 45.0, temp: 21.0 },
  { id: 4, name: 'Zona Oeste',    nodeId: 'nodo_huerto_04', humidity: 48.0, temp: 20.5 },
  { id: 5, name: 'Invernadero 1', nodeId: 'nodo_huerto_05', humidity: 55.0, temp: 26.2 },
  { id: 6, name: 'Invernadero 2', nodeId: 'nodo_huerto_06', humidity: 58.0, temp: 25.8 },
];

async function checkValveStatus(valveId) {
  try {
    const res = await fetch(`${VALVULAS_URL}/api/v1/valves/${valveId}/status`);
    if (!res.ok) return 'CLOSED';
    const data = await res.json();
    return data.status; // 'OPEN' o 'CLOSED'
  } catch (err) {
    // Si la API de válvulas no está lista todavía, asumimos cerrada
    return 'CLOSED';
  }
}

async function sendTelemetry(nodeId, humidity, temp, isWatering) {
  const payload = {
    sensor_id: nodeId,
    protocol: 'HTTP-SIM',
    timestamp: new Date().toISOString(),
    metrics: {
      humedad_suelo_prc: parseFloat(humidity.toFixed(2)),
      temperatura_c: parseFloat(temp.toFixed(2)),
      flujo_agua_lpm: isWatering ? parseFloat((10 + Math.random() * 5).toFixed(2)) : 0.0
    }
  };

  try {
    const res = await fetch(`${INGESTA_URL}/api/mediciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error(`[SIMULADOR] Error al enviar telemetría de ${nodeId}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[SIMULADOR] Error de conexión con API Ingesta: ${err.message}`);
  }
}

async function step() {
  console.log(`\n================ SIMULACION DE LECTURAS IoT (${new Date().toLocaleTimeString()}) ================`);
  
  for (const nodo of NODOS) {
    // 1. Preguntar a la API el estado de la válvula asociada
    const valveStatus = await checkValveStatus(nodo.id);
    const isWatering = valveStatus === 'OPEN';

    // 2. Modificar la humedad según el estado del riego
    if (isWatering) {
      // Sube la humedad rápidamente (+3% a +5% por paso)
      nodo.humidity += 3.0 + Math.random() * 2.0;
      if (nodo.humidity > 100.0) nodo.humidity = 100.0;
      console.log(`[💧 RIEGO ACTIVO] ${nodo.name} (${nodo.nodeId}): Válvula ABIERTA. Humedad sube a: ${nodo.humidity.toFixed(1)}%`);
    } else {
      // Baja la humedad lentamente (-0.5% a -1.5% por paso)
      nodo.humidity -= 0.5 + Math.random() * 1.0;
      if (nodo.humidity < 10.0) nodo.humidity = 10.0;
      console.log(`[☀️ EVAPORACIÓN]  ${nodo.name} (${nodo.nodeId}): Válvula CERRADA. Humedad baja a: ${nodo.humidity.toFixed(1)}%`);
    }

    // Variar temperatura levemente (+/- 0.2 grados)
    nodo.temp += (Math.random() - 0.5) * 0.4;
    if (nodo.temp < 10) nodo.temp = 10;
    if (nodo.temp > 35) nodo.temp = 35;

    // 3. Enviar datos a la API de Ingesta
    await sendTelemetry(nodo.nodeId, nodo.humidity, nodo.temp, isWatering);
  }
}

console.log("Iniciando simulador en 5 segundos (esperando arranque del sistema)...");
setTimeout(() => {
  step();
  setInterval(step, 4000); // Ejecutar cada 4 segundos
}, 5000);
