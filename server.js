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

// Ruta para obtener todas las marcas únicas
app.get('/api/brands', async (req, res) => {
    try {
        const brands = await db.collection(COLLECTION_NAME)
            .distinct('Marca');
        
        // Ordenar alfabéticamente
        brands.sort();
        
        res.json({
            success: true,
            data: brands.map(brand => ({ name: brand }))
        });
    } catch (error) {
        console.error('Error obteniendo marcas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
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
        version: '1.0.0',
        endpoints: {
            brands: '/api/brands',
            modelVersions: '/api/model-versions',
            health: '/health'
        },
        description: 'API para consultar marcas, modelos y versiones de autos desde MongoDB'
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