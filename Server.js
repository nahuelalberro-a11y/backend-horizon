const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Necesario para que funcione el Login

// Tus credenciales maestras
const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.me/v2';

// --- NUEVA PUERTA DE SEGURIDAD ---
app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;
    if (usuario === 'horizon_admin' && password === 'Horizon2026*') {
        return res.json({ exito: true });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Credenciales incorrectas' });
    }
});

// Función original que formatea la fecha
const formatearFechaHora = (fecha, esInicio) => {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hora = esInicio ? '00:00:00' : '23:59:59';
    return `${año}-${mes}-${dia}T${hora}`;
};

// --- TU RUTA DE TAREAS ORIGINAL ---
app.get('/api/mis-tareas', async (req, res) => {
    try {
        console.log("Intentando Login en Auvo...");
        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });

        const paseTemporal = loginResponse.data.result.accessToken;
        
        // Tomamos el mes desde el calendario de la web
        const fechaQuery = req.query.date; 
        let hoy = new Date();
        if (fechaQuery) {
            const partes = fechaQuery.split('-');
            hoy = new Date(partes[0], partes[1] - 1, partes[2]);
        }

        // --- TU CALCULADORA DEL MES ACTUAL ---
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

        const startDate = formatearFechaHora(primerDiaMes, true);
        const endDate = formatearFechaHora(ultimoDiaMes, false);
        
        console.log(`Pidiendo lista de tareas a Auvo (Desde ${startDate} hasta ${endDate})...`);

        const tareasResponse = await axios.get(`${API_BASE}/tasks`, {
            params: {
                paramFilter: JSON.stringify({
                    startDate: startDate,
                    endDate: endDate
                })
            },
            headers: {
                'Authorization': `Bearer ${paseTemporal}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("¡Éxito! Tareas enviadas a la web de forma intacta.");
        // Devolvemos la data CRUDA de Auvo, como lo hacía tu código
        res.json(tareasResponse.data);

    } catch (error) {
        console.log("Error:", error.message);
        res.status(500).json({ error: 'Hubo un problema al obtener las tareas' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});