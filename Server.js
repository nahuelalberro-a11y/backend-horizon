const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Configuración abierta de CORS para conectar con Netlify sin bloqueos
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

// RUTA CORREGIDA: Ahora sí usa la fecha elegida en el calendario
app.get('/api/mis-tareas', async (req, res) => {
    try {
        // Capturamos la fecha que manda el HTML (ej: "2026-06-08"). Si no viene, usamos hoy.
        const fechaQuery = req.query.date; 
        let fechaFiltro = new Date();
        
        if (fechaQuery) {
            const partes = fechaQuery.split('-');
            // Creamos la fecha local para evitar desfasajes horariios
            fechaFiltro = new Date(partes[0], partes[1] - 1, partes[2]);
        }

        // Definimos el rango estricto: desde las 00:00:00 hasta las 23:59:59 de ESE día
        const año = fechaFiltro.getFullYear();
        const mes = String(fechaFiltro.getMonth() + 1).padStart(2, '0');
        const dia = String(fechaFiltro.getDate()).padStart(2, '0');
        
        const startDate = `${año}-${mes}-${dia}T00:00:00`;
        const endDate = `${año}-${mes}-${dia}T23:59:59`;

        console.log(`Buscando en Auvo tareas estrictas para el día: ${startDate} al ${endDate}`);

        // Login en Auvo
        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });
        const paseTemporal = loginResponse.data.result.accessToken;

        // Pedimos a Auvo SOLO las tareas de ese día específico
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

        // Agrupamos el resultado por cuadrilla (Tu lógica original intacta)
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
            return res.json(resultadoAgrupado);
        } else {
            return res.json([]);
        }

    } catch (error) {
        console.log("Error en el servidor:", error.message);
        res.status(500).json({ error: 'Hubo un problema al obtener las tareas de este día' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});