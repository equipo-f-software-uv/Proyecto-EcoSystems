function validateRequiredFields(body, fields) {
    const missing = fields.filter(f => body[f] === undefined || body[f] === null);
    if (missing.length > 0) {
        return `Campos obligatorios faltantes: ${missing.join(', ')}`;
    }
    return null;
}

function isHumidityInRange(value) {
    return typeof value === 'number' && value >= 0 && value <= 100;
}

function validateHumidityRange(min, max) {
    if (!isHumidityInRange(min) || !isHumidityInRange(max)) {
        return "Los valores de humedad deben estar entre 0 y 100.";
    }
    if (min >= max) {
        return "La humedad mínima debe ser menor que la máxima.";
    }
    return null;
}

module.exports = { validateRequiredFields, isHumidityInRange, validateHumidityRange };
