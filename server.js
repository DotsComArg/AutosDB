// server.js - API para conectar con MongoDB
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de MongoDB
const MONGODB_URI = "mongodb+srv://admin:admin@cluster0.5deof2h.mongodb.net/hubsautos";
const DATABASE_NAME = "hubsautos";
const COLLECTION_NAME = "formAutos";

let db;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración adicional de CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Conectar a MongoDB
async function connectToMongo() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DATABASE_NAME);
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
}

// ==========================================
// ENDPOINTS PARA EL FORMULARIO DE AUTOS
// ==========================================

// Endpoint para obtener todas las marcas únicas
app.get('/api/brands', async (req, res) => {
    try {
        // Obtener todas las marcas únicas
        const brands = await db.collection(COLLECTION_NAME).distinct('Marca');
        
        // Limpiar y ordenar las marcas
        const cleanBrands = brands
            .filter(brand => brand && brand.trim()) // Eliminar vacíos
            .map(brand => ({ name: brand.trim() })) // Formato esperado por el frontend
            .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente

        res.json({
            success: true,
            data: cleanBrands,
            count: cleanBrands.length
        });

    } catch (error) {
        console.error('Error obteniendo marcas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para obtener todos los modelos únicos de una marca específica
// GET /api/models?brand=AUDI
app.get('/api/models', async (req, res) => {
    try {
        const { brand } = req.query;
        
        if (!brand) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parámetro brand es requerido' 
            });
        }

        // Buscar todos los modelos únicos de la marca especificada
        const models = await db.collection(COLLECTION_NAME).distinct('Modelo', { 
            'Marca': { $regex: new RegExp(`^${brand}$`, 'i') }
        });

        // Ordenar alfabéticamente
        models.sort();

        res.json({
            success: true,
            data: models,
            count: models.length
        });

    } catch (error) {
        console.error('Error obteniendo modelos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para obtener todas las versiones (submodelos) de una marca y modelo específicos
// GET /api/versions?brand=AUDI&model=A1
app.get('/api/versions', async (req, res) => {
    try {
        const { brand, model } = req.query;
        
        if (!brand || !model) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parámetros brand y model son requeridos' 
            });
        }

        // Buscar todos los submodelos de la marca y modelo especificados
        const versions = await db.collection(COLLECTION_NAME).distinct('Submodelo', { 
            'Marca': { $regex: new RegExp(`^${brand}$`, 'i') },
            'Modelo': { $regex: new RegExp(`^${model}$`, 'i') }
        });

        // Limpiar y ordenar las versiones
        const cleanVersions = versions
            .filter(version => version && version.trim()) // Eliminar vacíos
            .map(version => version.trim()) // Limpiar espacios
            .sort(); // Ordenar alfabéticamente

        res.json({
            success: true,
            data: cleanVersions,
            count: cleanVersions.length
        });

    } catch (error) {
        console.error('Error obteniendo versiones:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Endpoint para obtener información completa de un auto específico
// GET /api/auto-info?brand=AUDI&model=A1&version=1.4%20TFSi%20MT%20Attraction%20(122cv)
app.get('/api/auto-info', async (req, res) => {
    try {
        const { brand, model, version } = req.query;
        
        if (!brand || !model || !version) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parámetros brand, model y version son requeridos' 
            });
        }

        // Buscar el auto específico
        const auto = await db.collection(COLLECTION_NAME).findOne({
            'Marca': { $regex: new RegExp(`^${brand}$`, 'i') },
            'Modelo': { $regex: new RegExp(`^${model}$`, 'i') },
            'Submodelo': { $regex: new RegExp(`^${version}$`, 'i') }
        });

        if (!auto) {
            return res.status(404).json({ 
                success: false, 
                message: 'Auto no encontrado' 
            });
        }

        res.json({
            success: true,
            data: {
                marca: auto.Marca,
                modelo: auto.Modelo,
                version: auto.Submodelo,
                id: auto._id
            }
        });

    } catch (error) {
        console.error('Error obteniendo información del auto:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// Ruta para obtener modelos y versiones de una marca específica
app.get('/api/model-versions', async (req, res) => {
    try {
        const { brand } = req.query;
        
        if (!brand) {
            return res.status(400).json({
                success: false,
                error: 'Parámetro brand es requerido'
            });
        }

        const vehicles = await db.collection(COLLECTION_NAME)
            .find({ 'Marca': brand })
            .sort({ 'Modelo': 1, 'Submodelo': 1 })
            .toArray();

        const modelVersions = vehicles.map(vehicle => ({
            model: vehicle.Modelo,
            version: vehicle.Submodelo,
            combined: `${vehicle.Modelo} - ${vehicle.Submodelo}`
        }));

        res.json({
            success: true,
            data: modelVersions
        });
    } catch (error) {
        console.error('Error obteniendo modelos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'API de Autos - HubsAutos',
        version: '2.0.0',
        endpoints: {
            brands: '/api/brands',
            models: '/api/models?brand=MARCA',
            versions: '/api/versions?brand=MARCA&model=MODELO',
            autoInfo: '/api/auto-info?brand=MARCA&model=MODELO&version=VERSION',
            modelVersions: '/api/model-versions?brand=MARCA',
            health: '/health'
        },
        description: 'API para consultar marcas, modelos y versiones de autos desde MongoDB',
        examples: {
            brands: 'GET /api/brands',
            models: 'GET /api/models?brand=AUDI',
            versions: 'GET /api/versions?brand=AUDI&model=A1',
            autoInfo: 'GET /api/auto-info?brand=AUDI&model=A1&version=1.4%20TFSi%20MT'
        }
    });
});

// Ruta de salud
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
async function startServer() {
    await connectToMongo();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
}

startServer().catch(console.error);