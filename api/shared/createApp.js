const express = require('express');
const cors = require('cors');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cors());
    return app;
}

module.exports = { createApp };
