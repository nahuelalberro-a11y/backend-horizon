const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Tus credenciales maestras de 2Workers
const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.me/v2';

// CREDENCIALES WEB
const USUARIO_VALIDO = 'horizon_admin';
const CONTRASEÑA_VALIDA = 'Horizon2026*';

// LOGIN WEB
app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;
    if (usuario === USUARIO_VALIDO && password === CONTRASEÑA_VALIDA) {
        return res.json({ exito: true, mensaje: 'Acceso concedido' });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
    }
});

// TAREAS: Enlace directo y exacto con la fecha del calendario
app.get('/api/mis-tareas', async (req, res) => {
    try {
        const fechaQuery = req.query.date; // Ej: "2026-06-09"
        
        let fechaBase = new Date();
        if (fechaQuery) {
            const partes = fechaQuery.split('-');
            fechaBase = new Date(partes[0], partes[1] - 1, partes[2]);
        }

        const año = fechaBase.getFullYear();
        const mes = String(fechaBase.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaBase.getDate()).padStart(2, '0');

        // Rango del día exacto para que Auvo no mande basura de otros días
        const startDate = `${año}-${mes}-${dia}T00:00:00`;
        const endDate = `${año}-${mes}-${dia}T23:59:59`;

        console.log(`[SERVER] Pidiendo a Auvo tareas entre: ${startDate} y ${endDate}`);

        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });
        const paseTemporal = loginResponse.data.result.accessToken;

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

        // Pasamos la respuesta Pura y sin tocar al HTML para que él arme las carpetas
        console.log("[SERVER] Respuesta de Auvo recibida, enviando a la página web...");
        res.json(tareasResponse.data);

    } catch (error) {
        console.error("[SERVER ERROR]:", error.message);
        res.status(500).json({ error: 'Hubo un problema al conectar con Auvo' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});