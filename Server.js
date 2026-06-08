const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Permisos abiertos de CORS para conectar con tu Netlify
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// CREDENCIALES DE 2WORKERS (AUVO) - DOMINIO OFICIAL CORRECTO
const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.me/v2'; // <-- VOLVIMOS AL .ME CORRECTO

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

        // Separamos en inglés para evitar la ñ en Linux
        const partes = fechaQuery.split('-');
        const currentYear = partes[0];
        const currentMonth = partes[1];
        const currentDay = partes[2];

        const formatoA = `${currentYear}-${currentMonth}-${currentDay}`; // "2026-06-09"
        const formatoB = `${currentDay}/${currentMonth}/${currentYear}`; // "09/06/2026"

        // Traemos el mes completo para asegurar la respuesta de Auvo
        const mesInt = parseInt(currentMonth);
        const ultimoDia = new Date(parseInt(currentYear), mesInt, 0).getDate();
        const startDate = `${currentYear}-${currentMonth}-01T00:00:00`;
        const endDate = `${currentYear}-${currentMonth}-${ultimoDia}T23:59:59`;

        // 1. Login contra el endpoint oficial
        const login = await axios.post(`${API_BASE}/login`, { apiKey: APP_KEY, apiToken: TOKEN });
        const token = login.data.result.accessToken;

        // 2. Pedido de items a Auvo
        const tareas = await axios.get(`${API_BASE}/tasks`, {
            params: { paramFilter: JSON.stringify({ startDate, endDate }) },
            headers: { Authorization: `Bearer ${token}` }
        });

        const itemsAuvo = tareas.data.result?.items || [];
        const mapaCuadrillas = {};

        // 3. Cruzamos los datos y agrupamos por cuadrilla
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