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

// RUTA 1: Valida el Login de la página web
app.post('/api/login-web', (req, res) => {
    const { usuario, password } = req.body;
    if (usuario === USUARIO_VALIDO && password === CONTRASEÑA_VALIDA) {
        return res.json({ exito: true, mensaje: 'Acceso concedido' });
    } else {
        return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
    }
});

// RUTA 2: Obtiene y filtra las tareas de Auvo de manera inteligente
app.get('/api/mis-tareas', async (req, res) => {
    try {
        const fechaQuery = req.query.date; // Viene "AAAA-MM-DD"
        if (!fechaQuery) return res.json([]);

        console.log(`[DEBUG] El usuario quiere ver las tareas del día: ${fechaQuery}`);

        // 1. Nos logueamos en Auvo
        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });
        const paseTemporal = loginResponse.data.result.accessToken;

        // 2. Calculamos inicio y fin del mes de forma exacta para evitar errores en Auvo
        const partes = fechaQuery.split('-');
        const año = parseInt(partes[0]);
        const mes = parseInt(partes[1]);
        
        // Obtenemos cuántos días tiene exactamente ese mes (ej: junio tiene 30)
        const ultimoDiaMes = new Date(año, mes, 0).getDate(); 
        const mesStr = String(mes).padStart(2, '0');
        
        const startDate = `${año}-${mesStr}-01T00:00:00`;
        const endDate = `${año}-${mesStr}-${ultimoDiaMes}T23:59:59`; 

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

        if (respuestaAuvo && respuestaAuvo.result && Array.isArray(respuestaAuvo.result.items)) {
            const mapaCuadrillas = {};

            // 3. FILTRADO INTELIGENTE: Recorremos el mes pero SOLO guardamos lo de hoy
            respuestaAuvo.result.items.forEach(item => {
                const fechaTareaAuvo = item.taskDate ? item.taskDate.split('T')[0] : "";

                if (fechaTareaAuvo === fechaQuery) {
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
                }
            });

            const resultadoAgrupado = Object.values(mapaCuadrillas);
            console.log(`[DEBUG] Tareas filtradas para ${fechaQuery}: ${resultadoAgrupado.length} cuadrillas encontradas.`);
            return res.json(resultadoAgrupado);
        } else {
            return res.json([]);
        }

    } catch (error) {
        console.error("[SERVER ERROR]:", error.message);
        res.status(500).json({ error: 'Error interno al procesar el filtro de cuadrillas' });
    }
});

// PUERTO Y ARRANQUE DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});