const { Pool } = require('pg');
const { DB_CONFIG } = require('./config');

const pool = new Pool(DB_CONFIG);

async function logSystemError(tipo, mensaje, detalle = null, nodoId = null) {
    try {
        const query = `
            INSERT INTO registro_error_sistema (tipo_error, mensaje_error, detalle_tecnico, nodo_id)
            VALUES ($1, $2, $3, $4)
        `;
        await pool.query(query, [tipo, mensaje, detalle, nodoId]);
        console.log(`[LOG-ERROR] ${tipo}: ${mensaje}`);
    } catch (e) {
        console.error("Error crítico: No se pudo guardar el log en la BD:", e.message);
    }
}

module.exports = { pool, logSystemError };
