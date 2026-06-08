const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: '*', // Permite que cualquier frontend (como tu Netlify) pueda conectarse
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Tus credenciales maestras de 2Workers
const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.me/v2';

// CREDENCIALES DE ACCESO PARA LA PÁGINA WEB (Cámbialas si lo deseas)
const USUARIO_VALIDO = 'admin';
const CONTRASEÑA_VALIDA = 'Hzn@2468';

// Función que formatea la fecha al estándar internacional
const formatearFechaHora = (fecha, esInicio) => {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hora = esInicio ? '00:00:00' : '23:59:59';
    return `${año}-${mes}-${dia}T${hora}`;
};

// NUEVA RUTA: Valida si el usuario inició sesión correctamente
app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;

    if (usuario === USUARIO_VALIDO && password === CONTRASEÑA_VALIDA) {
        return res.json({ exito: true, mensaje: 'Acceso concedido' });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
    }
});

// Ruta para obtener las tareas de Auvo
app.get('/api/mis-tareas', async (req, res) => {
    try {
        console.log("Intentando Login en Auvo...");
        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });

        const paseTemporal = loginResponse.data.result.accessToken;

        const hoy = new Date();
        const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

        const startDate = formatearFechaHora(primerDiaMes, true);
        const endDate = formatearFechaHora(ultimoDiaMes, false);

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
        
        res.json(tareasResponse.data);

    } catch (error) {
        console.log("Error en la API:", error.message);
        res.status(500).json({ error: 'Hubo un problema al obtener las tareas' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});