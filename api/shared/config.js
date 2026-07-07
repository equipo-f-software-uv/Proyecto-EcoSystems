require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'tu_password',
    database: process.env.DB_NAME || 'ecosystems_db',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432')
};

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "telemetry_exchange";

module.exports = { DB_CONFIG, RABBITMQ_URL, EXCHANGE_NAME };
