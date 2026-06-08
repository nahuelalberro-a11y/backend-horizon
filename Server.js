const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Permisos abiertos para que Netlify nunca se bloquee
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// Credenciales de 2Workers
const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.me/v2';

// Credenciales de tu Web
const USUARIO_VALIDO = 'horizon_admin';
const CONTRASEÑA_VALIDA = 'Horizon2026*';

app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;
    if (usuario === USUARIO_VALIDO && password === CONTRASEÑA_VALIDA) {
        return res.json({ exito: true });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Credenciales incorrectas' });
    }
});

app.get('/api/mis-tareas', async (req, res) => {
    try {
        const fechaQuery = req.query.date; // Ej: "2026-06-09"
        if (!fechaQuery) return res.json([]);

        // Generamos los formatos para cazar la fecha venga como venga
        const [año, mes, dia] = fechaQuery.split('-');
        const formatoA = `${año}-${mes}-${dia}`; // "2026-06-09"
        const formatoB = `${dia}/${mes}/${año}`; // "09/06/2026"

        // TRUCO MAESTRO: Le pedimos a Auvo TODO EL MES para que no oculte nada
        const mesInt = parseInt(mes);
        const ultimoDia = new Date(año, mesInt, 0).getDate();
        const startDate = `${año}-${mes}-01T00:00:00`;
        const endDate = `${año}-${mes}-${ultimoDia}T23:59:59`;

        const login = await axios.post(`${API_BASE}/login`, { apiKey: APP_KEY, apiToken: TOKEN });
        const token = login.data.result.accessToken;

        const tareas = await axios.get(`${API_BASE}/tasks`, {
            params: { paramFilter: JSON.stringify({ startDate, endDate }) },
            headers: { Authorization: `Bearer ${token}` }
        });

        const itemsAuvo = tareas.data.result?.items || [];
        const mapaCuadrillas = {};

        // Filtramos y agrupamos nosotros mismos
        itemsAuvo.forEach(item => {
            const itemTexto = JSON.stringify(item);
            
            // Si la tarea tiene la fecha que elegimos en el calendario, la guardamos
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
        console.error("Error en servidor:", error.message);
        res.status(500).json({ error: 'Falla al procesar datos de Auvo' });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor de Horizon Activo`);
});