const express = require("express")
const { Pool } = require("pg")
const app = express()

app.use(express.json())

const pool = new Pool({
    host: process.env.PGHOST || "postgres",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "scheduler",
    password: process.env.PGPASSWORD || "schedulerpass",
    database: process.env.PGDATABASE || "schedulerdb",
})

app.get("/", (req,res)=>{
    res.send("Employee Scheduler API Running")
})

app.get("/employees", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM employees ORDER BY id ASC")
        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch employees:", error)
        res.status(500).json({ error: "Failed to fetch employees" })
    }
})

app.listen(4000, ()=>{
    console.log("Backend running on port 4000")
})
