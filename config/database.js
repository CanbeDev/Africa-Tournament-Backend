require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pan-african-kicks';

// MongoDB connection options
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
};

let connectionRetries = 0;
const MAX_RETRIES = 3;

const connectToDatabase = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.log('⚠️  No MONGO_URI found. Using default: mongodb://localhost:27017/pan-african-kicks');
            console.log('💡 Set MONGO_URI in .env file for production');
        }
        
        await mongoose.connect(mongoURI, mongoOptions);
        console.log("✅ Successfully connected to MongoDB");
        console.log(`📦 Database: ${mongoose.connection.name}`);
        
        // Reset connection retries on successful connection
        connectionRetries = 0;

        // Handle connection events
        mongoose.connection.on('disconnected', handleDisconnect);
        mongoose.connection.on('error', handleError);

        return true;
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error.message);
        
        if (connectionRetries < MAX_RETRIES) {
            connectionRetries++;
            console.log(`🔄 Retrying connection... Attempt ${connectionRetries}/${MAX_RETRIES}`);
            
            // Wait for 5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectToDatabase();
        } else {
            console.error('❌ Max connection retries reached. Falling back to in-memory storage');
            setupInMemoryFallback();
            return false;
        }
    }
};

const handleDisconnect = async () => {
    console.log('❌ MongoDB disconnected');
    
    if (connectionRetries < MAX_RETRIES) {
        connectionRetries++;
        console.log(`🔄 Attempting to reconnect... Attempt ${connectionRetries}/${MAX_RETRIES}`);
        await connectToDatabase();
    }
};

const handleError = (error) => {
    console.error('MongoDB connection error:', error);
};

const setupInMemoryFallback = () => {
    // Setup in-memory data structures
    global.inMemoryDB = {
        matches: new Map(),
        teams: new Map(),
        users: new Map(),
        tournament: {
            state: null,
            matches: []
        }
    };
    
    console.log('📝 In-memory storage initialized');
};

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
    }
});

module.exports = connectToDatabase;
