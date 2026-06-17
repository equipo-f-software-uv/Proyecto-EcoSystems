const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8002;
const DB_CONFIG = {
    user: 'postgres', password: 'tu_password', database: 'ecosystems_db', host: process.env.DB_HOST || '127.0.0.1', port: 5432
};
const pool = new Pool(DB_CONFIG);

app.get('/api/sensores/:id_nodo/historico', async (req, res) => {
    const { id_nodo } = req.params;
    const dias = parseInt(req.query.dias) || 7;
    
    try {
        const query = `
            SELECT fecha_hora, humedad_suelo_prc, temperatura_c, flujo_agua_lpm
            FROM medicion_historica
            WHERE id_nodo = $1 AND fecha_hora >= NOW() - INTERVAL '1 day' * $2
            ORDER BY fecha_hora ASC
        `;
        const { rows } = await pool.query(query, [id_nodo, dias]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

app.listen(PORT, () => console.log(`API Históricos corriendo en puerto ${PORT}`));