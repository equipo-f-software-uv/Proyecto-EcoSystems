const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8003;
const DB_CONFIG = {
    user: 'postgres', password: 'tu_password', database: 'ecosystems_db', host: process.env.DB_HOST || '127.0.0.1', port: 5432
};
const pool = new Pool(DB_CONFIG);

app.get('/api/perfiles', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM perfil_cultivo ORDER BY id_perfil ASC");
        res.json(rows);
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

app.post('/api/perfiles', async (req, res) => {
    const { nombre_cultivo, humedad_min_prc, humedad_max_prc } = req.body;
    try {
        const query = `
            INSERT INTO perfil_cultivo (nombre_cultivo, humedad_min_prc, humedad_max_prc)
            VALUES ($1, $2, $3) RETURNING id_perfil
        `;
        const { rows } = await pool.query(query, [nombre_cultivo, humedad_min_prc, humedad_max_prc]);
        res.json({ id_perfil: rows[0].id_perfil, nombre_cultivo, humedad_min_prc, humedad_max_prc });
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

app.delete('/api/perfiles/:id_perfil', async (req, res) => {
    const id_perfil = parseInt(req.params.id_perfil);
    try {
        const query = "DELETE FROM perfil_cultivo WHERE id_perfil = $1";
        const { rowCount } = await pool.query(query, [id_perfil]);
        
        if (rowCount === 0) return res.status(404).json({ detail: "Perfil no encontrado" });
        
        res.json({ status: "success", message: `Perfil ${id_perfil} eliminado` });
    } catch (e) {
        res.status(500).json({ detail: e.message });
    }
});

app.listen(PORT, () => console.log(`API Perfiles corriendo en puerto ${PORT}`));