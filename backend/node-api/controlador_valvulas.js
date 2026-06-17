const express = require('express');
const amqplib = require('amqplib');
const { Pool } = require('pg');
const { SerialPort } = require('serialport');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "telemetry_queue";
const SERIAL_PORT = "COM3"; // Ajustar al puerto donde conectes el Arduino
const BAUD_RATE = 115200;

const DB_CONFIG = {
    user: 'postgres',
    password: 'tu_password',
    database: 'ecosystems_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: 5432
};
const pool = new Pool(DB_CONFIG);

let arduino;
try {
    arduino = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
    console.log(`[*] Conexión Serial con Arduino establecida en ${SERIAL_PORT}`);
} catch (e) {
    console.log(`[!] Aviso: Error abriendo puerto serial: ${e.message}`);
}

const UMBRAL_DEFAULT = 30.0;
const cache_umbrales = {};
const TIEMPO_CACHE_MS = 60000;

async function iniciarConsumidor() {
    try {
        const conn = await amqplib.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();
        await channel.prefetch(10);
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log("[*] Escuchando eventos para control de riego en tiempo real...");

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const tiempo_inicio = Date.now();
                const payload = JSON.parse(msg.content.toString());
                const { sensor_id, metrics } = payload;
                const humedad = metrics?.humedad_suelo_prc;
                
                let umbral_aplicar = UMBRAL_DEFAULT;

                // Evaluar caché / DB para obtener umbral del cultivo actual
                if (sensor_id) {
                    if (cache_umbrales[sensor_id] && (Date.now() - cache_umbrales[sensor_id].timestamp < TIEMPO_CACHE_MS)) {
                        umbral_aplicar = cache_umbrales[sensor_id].umbral;
                    } else {
                        const res = await pool.query(`
                            SELECT pc.humedad_min_prc 
                            FROM nodo_sensor ns
                            JOIN perfil_cultivo pc ON ns.id_perfil = pc.id_perfil
                            WHERE ns.id_nodo = $1
                        `, [sensor_id]);
                        
                        if (res.rows.length > 0) umbral_aplicar = parseFloat(res.rows[0].humedad_min_prc);
                        cache_umbrales[sensor_id] = { umbral: umbral_aplicar, timestamp: Date.now() };
                    }
                }

                // Activar riego si es necesario (< 100ms latencia)
                if (humedad !== undefined && humedad < umbral_aplicar) {
                    if (arduino && arduino.isOpen) {
                        const comando = { accion: "ABRIR", id_valvula: "valvula_01" };
                        arduino.write(JSON.stringify(comando) + '\n');
                        
                        const latencia_ms = Date.now() - tiempo_inicio;
                        console.log(`[⚡] ALERTA: Nodo ${sensor_id} | Humedad ${humedad}% < Umbral ${umbral_aplicar}%. Válvula ABIERTA. Latencia: ${latencia_ms}ms`);
                        
                        await pool.query(`
                            INSERT INTO registro_valvula (id_valvula, accion, motivo, latencia_ms)
                            VALUES (1, 'ABRIR', 'Automático - Umbral bajo', $1)
                        `, [latencia_ms]).catch(err => console.error("Error BD auditoría:", err));
                    }
                }
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error("Error en consumidor RabbitMQ:", error);
    }
}

app.post('/api/valvulas/:id_valvula/accionar', async (req, res) => {
    if (!arduino || !arduino.isOpen) return res.status(503).json({ detail: "Hardware Serial no disponible" });
    
    const tiempo_inicio = Date.now();
    const { accion, motivo = "Control Manual UI" } = req.body;
    const id_valvula = parseInt(req.params.id_valvula);

    try {
        const cmd_serial = { accion, id_valvula: `valvula_${id_valvula.toString().padStart(2, '0')}` };
        arduino.write(JSON.stringify(cmd_serial) + '\n');
        
        const latencia_ms = Date.now() - tiempo_inicio;
        await pool.query(`
            INSERT INTO registro_valvula (id_valvula, accion, motivo, latencia_ms)
            VALUES ($1, $2, $3, $4)
        `, [id_valvula, accion, motivo, latencia_ms]);
        
        res.json({ status: "success", accion, latencia_ms });
    } catch (e) { res.status(500).json({ detail: e.message }); }
});

app.listen(PORT, async () => {
    await iniciarConsumidor();
    console.log(`API Válvulas corriendo en puerto ${PORT}`);
});