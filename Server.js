const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const APP_KEY = 'slwiprG93kgakiA1z4iRJ7J8T14kVFB'; 
const TOKEN = 'slwiprG93kgrl3T2o8wS6LB5msLgXys';
const API_BASE = 'https://api.2workers.me/v2';

let tokenEnMemoria = null;
let ultimaAutenticacion = 0;
const TIEMPO_VIDA_TOKEN = 30 * 60 * 1000; 

const formatearFechaHora = (fecha, esInicio) => {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
};

async function obtenerTokenValido() {
    const ahora = Date.now();
    
    if (tokenEnMemoria && (ahora - ultimaAutenticacion < TIEMPO_VIDA_TOKEN)) {
        return tokenEnMemoria;
    }

    try {
        console.log("🔑 Generando nueva sesión en la API externa...");
        const loginResponse = await axios.post(`${API_BASE}/login`, 
            { apiKey: APP_KEY, APITOKEN: TOKEN },
            { timeout: 20000 } 
        );
        
        tokenEnMemoria = loginResponse.data.result.accessToken;
        ultimaAutenticacion = ahora;
        return tokenEnMemoria;
    } catch (error) {
        console.error("Error crítico de autenticación:", error.message);
        throw error;
    }
}

app.get('/api/mis-tareas', async (req, res) => {
    try {
        const paseTemporal = await obtenerTokenValido();

        let fechaObjetivo = new Date();
        if (req.query.date) {
            const partes = req.query.date.split('-');
            fechaObjetivo = new Date(partes[0], partes[1] - 1, partes[2]);
        }

        const fechaTexto = formatearFechaHora(fechaObjetivo, true);
        const startDate = `${fechaTexto}T00:00:00`;
        const endDate = `${fechaTexto}T23:59:59`;
        const paramFilterStr = JSON.stringify({ startDate, endDate });
        
        // 🟢 SOLUCIÓN DEFINITIVA: Bucle Paginador
        let todasLasTareas = [];
        let paginaActual = 1;
        let hayMasTareas = true;

        console.log(`\n📡 Buscando tareas para el día ${fechaTexto}...`);

        while (hayMasTareas) {
            const tareasResponse = await axios.get(`${API_BASE}/tasks`, {
                params: { 
                    paramFilter: paramFilterStr,
                    page: paginaActual,
                    pageSize: 50 // Un número seguro que la API acepta sin tirar error 400
                },
                headers: { 'Authorization': `Bearer ${paseTemporal}`, 'Content-Type': 'application/json' },
                timeout: 20000 
            });
            
            const tareasPagina = tareasResponse.data.result.entityList || [];
            todasLasTareas = todasLasTareas.concat(tareasPagina);
            
            console.log(`📥 Descargada página ${paginaActual} con ${tareasPagina.length} tareas...`);

            // Si la API nos mandó menos de 50 tareas, significa que ya no quedan más páginas por revisar
            if (tareasPagina.length < 50) {
                hayMasTareas = false;
            } else {
                paginaActual++; // Si vinieron 50, sumamos 1 a la página y el bucle vuelve a pedir
            }
        }
        
        console.log(`✅ EXCELENTE: Se agruparon un total de ${todasLasTareas.length} tareas de AUVO.\n`);
        
        const mapaCuadrillas = {};
        const total = todasLasTareas.length;

        for (let i = 0; i < total; i++) {
            const tarea = todasLasTareas[i];
            const nombreCuadrilla = tarea.userToName || 'SIN CUADRILLA ASIGNADA';
            
            if (!mapaCuadrillas[nombreCuadrilla]) {
                mapaCuadrillas[nombreCuadrilla] = { crewName: nombreCuadrilla, tasks: [] };
            }
            
            mapaCuadrillas[nombreCuadrilla].tasks.push({
                customerDescription: tarea.customerDescription || 'Sin Nombre',
                orientation: tarea.orientation || 'Sin detalles en el sistema',
                address: tarea.address || 'Sin ubicación registrada',
                taskStatus: tarea.taskStatus,
                finished: tarea.finished
            });
        }

        res.json(Object.values(mapaCuadrillas));
    } catch (error) {
        // Mejoramos el registro de errores para ver exactamente qué nos dice AUVO si vuelve a fallar
        console.error("❌ Error agrupando tareas:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error interno o retraso en la API externa' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT} (Con Paginación Activa)`));