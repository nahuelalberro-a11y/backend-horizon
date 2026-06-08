const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Configuración de CORS súper abierta para Netlify
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

// CREDENCIALES DE ACCESO PARA LA PÁGINA WEB
const USUARIO_VALIDO = 'horizon_admin';
const CONTRASEÑA_VALIDA = 'Horizon2026*';

// NUEVA RUTA: Valida el Login de la página web
app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;
    if (usuario === USUARIO_VALIDO && password === CONTRASEÑA_VALIDA) {
        return res.json({ exito: true, mensaje: 'Acceso concedido' });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
    }
});

// RUTA CENTRAL: Obtiene y filtra las tareas de Auvo
app.get('/api/mis-tareas', async (req, res) => {
    try {
        const fechaQuery = req.query.date; 
        let startDate, endDate;

        console.log(`[DEBUG] Parámetro 'date' recibido del frontend: "${fechaQuery}"`);

        if (fechaQuery && fechaQuery.includes('-')) {
            // Si viene el formato "AAAA-MM-DD" desde el frontend, armamos el rango estricto para ese día
            startDate = `${fechaQuery}T00:00:00`;
            endDate = `${fechaQuery}T23:59:59`;
        } else {
            // Si por alguna razón no viene el parámetro, calculamos el día de hoy de forma automática
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            
            startDate = `${año}-${mes}-${dia}T00:00:00`;
            endDate = `${año}-${mes}-${dia}T23:59:59`;
        }

        console.log(`[DEBUG] Enviando rango a Auvo: Desde ${startDate} Hasta ${endDate}`);

        // 1. Login en la API de Auvo
        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });
        const paseTemporal = loginResponse.data.result.accessToken;

        // 2. Petición de tareas filtradas por el rango de fecha calculado
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

        const respuestaAuvo = tareasResponse.data;

        // 3. Agrupación por cuadrilla
        if (respuestaAuvo && respuestaAuvo.result && Array.isArray(respuestaAuvo.result.items)) {
            const mapaCuadrillas = {};

            respuestaAuvo.result.items.forEach(item => {
                const nombreCuadrilla = item.crewName || "SIN CUADRILLA ASIGNADA";
                if (!mapaCuadrillas[nombreCuadrilla]) {
                    mapaCuadrillas[nombreCuadrilla] = {
                        crewName: nombreCuadrilla,
                        tasks: []
                    };
                }
                mapaCuadrillas[nombreCuadrilla].tasks.push({
                    customerDescription: item.customerDescription || "Sin Cliente",
                    orientation: item.orientation || "Sin Descripción",
                    address: item.address || "Sin Dirección",
                    taskStatus: item.taskStatus,
                    finished: item.finished
                });
            });

            const resultadoAgrupado = Object.values(mapaCuadrillas);
            console.log(`[DEBUG] Envío exitoso. Cuadrillas procesadas: ${resultadoAgrupado.length}`);
            return res.json(resultadoAgrupado);
        } else {
            console.log("[DEBUG] La API de Auvo respondió pero no se encontraron items.");
            return res.json([]);
        }

    } catch (error) {
        console.error("[SERVER ERROR]:", error.message);
        res.status(500).json({ error: 'Hubo un problema al obtener las tareas del servidor' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});