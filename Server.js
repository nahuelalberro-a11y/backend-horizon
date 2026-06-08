// RUTA CENTRAL: Obtiene y filtra las tareas de Auvo de manera inteligente
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

        // 2. Para asegurarnos de que Auvo no oculte nada, le pedimos un rango amplio (Todo el mes actual)
        const partes = fechaQuery.split('-');
        const año = partes[0];
        const mes = partes[1];
        
        const startDate = `${año}-${mes}-01T00:00:00`;
        const endDate = `${año}-${mes}-31T23:59:59`; // Amplio para agarrar todo el mes

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

            // 3. FILTRADO INTELIGENTE: Recorremos todo el mes pero SOLO guardamos las tareas que coincidan con el día del calendario
            respuestaAuvo.result.items.forEach(item => {
                
                // Extraemos la fecha de la tarea de Auvo (viene como "2026-06-08T14:30:00")
                // Nos quedamos solo con la parte "AAAA-MM-DD"
                const fechaTareaAuvo = item.taskDate ? item.taskDate.split('T')[0] : "";

                // ¡PROPIEDAD CLAVE! Solo pasa si la fecha de la tarea coincide exactamente con el calendario
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
            console.log(`[DEBUG] Tareas filtradas para el día ${fechaQuery}: ${resultadoAgrupado.length} cuadrillas encontradas.`);
            return res.json(resultadoAgrupado);
        } else {
            return res.json([]);
        }

    } catch (error) {
        console.error("[SERVER ERROR]:", error.message);
        res.status(500).json({ error: 'Error interno al procesar el filtro de cuadrillas' });
    }
});