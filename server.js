const express = require("express");
const dbConnect = require("./config/db");
const cron = require("node-cron");
require("dotenv").config();
const app = express();
const routes = require("./routes/index");
const runAdvancePayoutJob = require("./jobs/advancePayoutJob");
app.use(express.json());
app.use("/api/v1", routes);
app.get("/", (req,res)=>{
    res.send("Running Payout Management System")
})

const PORT = process.env.PORT;

async function startServer(){
    try {
        await dbConnect();
        app.listen(PORT, ()=>{
            console.log(`listening at PORT ${PORT}`)
        })

        cron.schedule("0 0 * * *", ()=>{
            runAdvancePayoutJob().catch(err => console.log(` Cron Job Failed: `, err));
        });
        
    } catch (error) {
        console.log("Error while starting server", error.message);
        process.exit(1);
    }
}
startServer();