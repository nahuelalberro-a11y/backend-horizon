const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Permisos abiertos de CORS para conectar con tu Netlify
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// CREDENCIALES DE 2WORKERS (AUVO) - VERIFICADAS
const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.com/v2'; // <--- CORREGIDO: .com en lugar de .me

// CREDENCIALES DE TU PÁGINA WEB
const USUARIO_VALIDO = 'horizon_admin';
const CONTRASEÑA_VALIDA = 'Horizon2026*';

// RUTA 1: Login Web
app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;
    if (usuario === USUARIO_VALIDO && password === CONTRASEÑA_VALIDA) {
        return res.json({ exito: true });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Credenciales incorrectas' });
    }
});

// RUTA 2: Filtro dinámico mensual/diario inteligente
app.get('/api/mis-tareas', async (req, res) => {
    try {
        const fechaQuery = req.query.date; // Ej: "2026-06-09"
        if (!fechaQuery) return res.json([]);

        console.log(`[SERVER] Filtrando tareas para el día: ${fechaQuery}`);

        // Separamos las partes para construir formatos de coincidencia
        const [año, mes, dia] = fechaQuery.split('-');
        const formatoA = `${año}-${mes}-${dia}`; // "2026-06-09"
        const formatoB = `${dia}/${mes}/${año}`; // "09/06/2026"

        // Traemos el mes completo para burlar las restricciones de la API de Auvo
        const mesInt = parseInt(mes);
        const ultimoDia = new Date(año, mesInt, 0).getDate();
        const startDate = `${año}-${mes}-01T00:00:00`;
        const endDate = `${año}-${mes}-${ultimoDia}T23:59:59`;

        // 1. Login contra el endpoint oficial .com
        const login = await axios.post(`${API_BASE}/login`, { apiKey: APP_KEY, apiToken: TOKEN });
        const token = login.data.result.accessToken;

        // 2. Pedido de items a Auvo
        const tareas = await axios.get(`${API_BASE}/tasks`, {
            params: { paramFilter: JSON.stringify({ startDate, endDate }) },
            headers: { Authorization: `Bearer ${token}` }
        });

        const itemsAuvo = tareas.data.result?.items || [];
        const mapaCuadrillas = {};

        // 3. Cruzamos los datos y agrupamos por cuadrilla en tiempo real
        itemsAuvo.forEach(item => {
            const itemTexto = JSON.stringify(item);
            
            if (itemTexto.includes(formatoA) || itemTexto.includes(formatoB)) {
                const cuadrilla = item.crewName || "SIN CUADRILLA ASIGNADA";
                if (!mapaCuadrillas[cuadrilla]) mapaCuadrillas[cuadrilla] = { crewName: cuadrilla, tasks: [] };

                mapaCuadrillas[cuadrilla].tasks.push({
                    customerDescription: item.customerDescription || "Sin Cliente",
                    orientation: item.orientation || "Sin Descripción",
                    address: item.address || "Sin Dirección",
                    taskStatus: item.taskStatus,
                    finished: item.finished
                });
            }
        });

        res.json(Object.values(mapaCuadrillas));

    } catch (error) {
        console.error("Error crítico en backend:", error.message);
        res.status(500).json({ error: 'Falla al conectar con la API de Auvo' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Horizon enlazado correctamente con Auvo`);
});