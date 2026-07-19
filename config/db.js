const mongoose = require("mongoose");
require("dotenv").config();
const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);
let isConnected = false;
async function dbConnect(){
    if(isConnected){
        console.log(" DB already connected, resuing existing one...");
        return mongoose.connection;
    }
    const uri= process.env.MONGO_URI;

    if(!uri){
        throw new Error("MONGO_URL not defined");
    }
    try {
        await mongoose.connect(uri);
        isConnected=true;
        console.log("MongoDB connected successfully");
        return mongoose.connection;
    } catch (error) {
        console.log("Error while connecting MongoDB");
        throw error;
    }
}

module.exports = dbConnect;