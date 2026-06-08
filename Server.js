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

// RUTA 2: Obtiene y filtra las tareas de Auvo de manera infalible
app.get('/api/mis-tareas', async (req, res) => {
    try {
        const fechaQuery = req.query.date; // Ej: "2026-06-09"
        if (!fechaQuery) return res.json([]);

        console.log(`[DEBUG] Buscando tareas para el día: ${fechaQuery}`);

        // 1. Nos logueamos en Auvo
        const loginResponse = await axios.post(`${API_BASE}/login`, {
            apiKey: APP_KEY,
            apiToken: TOKEN
        });
        const paseTemporal = loginResponse.data.result.accessToken;

        // 2. Calculamos el mes entero para que Auvo no esconda nada
        const partes = fechaQuery.split('-');
        const año = parseInt(partes[0]);
        const mes = parseInt(partes[1]);
        
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
            let contadorMapeo = 0;

            // 3. EL TRUCO INFALIBLE DE BÚSQUEDA
            respuestaAuvo.result.items.forEach(item => {
                // Convertimos el objeto entero a texto (así no nos importa cómo se llama la propiedad)
                const itemString = JSON.stringify(item);

                // Si la fecha que querés ver está escrita en ALGÚN LADO de esa tarea, entra.
                if (itemString.includes(fechaQuery)) {
                    contadorMapeo++;
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
            console.log(`[DEBUG] ÉXITO: Se encontraron ${contadorMapeo} tareas para el día ${fechaQuery}`);
            return res.json(resultadoAgrupado);
        } else {
            return res.json([]);
        }

    } catch (error) {
        console.error("[SERVER ERROR]:", error.message);
        res.status(500).json({ error: 'Error interno al procesar las cuadrillas' });
    }
});

// PUERTO Y ARRANQUE DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});