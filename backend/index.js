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

app.get("/schedule", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                s.id,
                s.schedule_date,
                s.status,
                s.notes,
                s.employee_id,
                e.first_name,
                e.last_name,
                e.role_title,
                s.shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                sh.is_overnight
            FROM schedules s
            JOIN employees e ON e.id = s.employee_id
            JOIN shifts sh ON sh.id = s.shift_id
            ORDER BY s.schedule_date ASC, sh.start_time ASC, e.last_name ASC, e.first_name ASC
        `)

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch schedule:", error)
        res.status(500).json({ error: "Failed to fetch schedule" })
    }
})

app.listen(4000, ()=>{
    console.log("Backend running on port 4000")
})
