// Import necessary modules
require('dotenv').config(); // To read variables from the .env file
const mongoose = require('mongoose');

// Get MongoDB URI from the .env file
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pan-african-kicks';

// Function to connect to MongoDB
const connectToDatabase = async () => {
  try {
    // If no MONGO_URI is set, use local MongoDB (for development)
    if (!process.env.MONGO_URI) {
      console.log('⚠️  No MONGO_URI found. Using default: mongodb://localhost:27017/pan-african-kicks');
      console.log('💡 Set MONGO_URI in .env file for production');
    }
    
    await mongoose.connect(mongoURI);
    console.log("✅ Successfully connected to MongoDB");
    console.log(`📦 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    console.log('⚠️  Server will continue without database (using in-memory storage)');
    // Don't exit - allow fallback to in-memory storage
  }
};

// Export the function so it can be used in other files
module.exports = connectToDatabase;
