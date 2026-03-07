const express = require("express")
const cron = require("node-cron")
const cors = require("cors")
const { Pool } = require("pg")
const app = express()

app.use(express.json())

const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : true

app.use(cors({
    origin: corsOrigin,
    credentials: true,
}))

const pool = new Pool({
    host: process.env.PGHOST || "postgres",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "scheduler",
    password: process.env.PGPASSWORD || "schedulerpass",
    database: process.env.PGDATABASE || "schedulerdb",
})

const FIXED_SCHEDULE_CRON = process.env.FIXED_SCHEDULE_CRON || "55 23 * * 0"
const FIXED_SCHEDULE_TIMEZONE = process.env.FIXED_SCHEDULE_TIMEZONE || "Asia/Taipei"

function extractTimeValue(value) {
    if (!value) return null
    const match = String(value).match(/(\d{2}):(\d{2})/)
    return match ? `${match[1]}:${match[2]}` : null
}

function extractRequestedChangeTimes(requestRow) {
    const startFromField = extractTimeValue(requestRow.requested_start)
    const endFromField = extractTimeValue(requestRow.requested_end)

    if (startFromField && endFromField) {
        return { startTime: startFromField, endTime: endFromField }
    }

    const reason = String(requestRow.reason || "")
    const reasonMatch = reason.match(/requested\s+change:\s*([0-2]\d:[0-5]\d)\s*-\s*([0-2]\d:[0-5]\d)/i)
    if (reasonMatch) {
        return { startTime: reasonMatch[1], endTime: reasonMatch[2] }
    }

    return null
}

function normalizePreferredLanguage(value) {
    const language = String(value || "").trim()

    if (language === "en") return "en"
    if (language === "zh-TW" || language.toLowerCase() === "zh-tw" || language.toLowerCase() === "zh") {
        return "zh-TW"
    }

    return null
}

function getMondayStart(date) {
    const dayOffset = (date.getDay() + 6) % 7
    const monday = new Date(date)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - dayOffset)
    return monday
}

function getNextWeekMonday(date = new Date()) {
    const monday = getMondayStart(date)
    monday.setDate(monday.getDate() + 7)
    return monday
}

function formatDateForSql(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function nextWeekDateFromDayOfWeek(nextWeekMonday, dayOfWeek) {
    const offset = (Number(dayOfWeek) + 6) % 7
    const date = new Date(nextWeekMonday)
    date.setDate(nextWeekMonday.getDate() + offset)
    return date
}

async function generateNextWeekFromFixedSchedules() {
    const nextWeekMonday = getNextWeekMonday()
    const weekStart = formatDateForSql(nextWeekMonday)

    const client = await pool.connect()
    let insertedRows = 0

    try {
        await client.query("BEGIN")

        const fixedScheduleRows = await client.query(
            `
            SELECT employee_id, day_of_week, shift_id
            FROM employee_fixed_schedule
            ORDER BY employee_id ASC, day_of_week ASC
            `
        )

        for (const row of fixedScheduleRows.rows) {
            const scheduleDate = formatDateForSql(
                nextWeekDateFromDayOfWeek(nextWeekMonday, row.day_of_week)
            )

            const insertResult = await client.query(
                `
                INSERT INTO schedules (
                    employee_id,
                    shift_id,
                    schedule_date,
                    status,
                    notes
                )
                SELECT $1, $2, $3, 'scheduled', 'Auto-generated from fixed schedule'
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM schedules s
                    WHERE s.employee_id = $1
                      AND s.schedule_date = $3
                )
                `,
                [row.employee_id, row.shift_id, scheduleDate]
            )

            insertedRows += insertResult.rowCount
        }

        await client.query("COMMIT")
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }

    return { weekStart, insertedRows }
}

function startFixedScheduleCronJob() {
    cron.schedule(
        FIXED_SCHEDULE_CRON,
        async () => {
            try {
                const result = await generateNextWeekFromFixedSchedules()
                console.log(
                    `[fixed-schedule-job] Generated next week (${result.weekStart}) schedules. Inserted rows: ${result.insertedRows}`
                )
            } catch (error) {
                console.error("[fixed-schedule-job] Failed to generate schedules:", error)
            }
        },
        { timezone: FIXED_SCHEDULE_TIMEZONE }
    )

    console.log(
        `[fixed-schedule-job] Cron scheduled (${FIXED_SCHEDULE_CRON}) timezone ${FIXED_SCHEDULE_TIMEZONE}`
    )
}

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

app.get("/employees/:id", async (req, res) => {
    const employeeId = Number(req.params.id)

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee id is required" })
    }

    try {
        const result = await pool.query("SELECT * FROM employees WHERE id = $1", [employeeId])

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Employee not found" })
        }

        res.json(result.rows[0])
    } catch (error) {
        console.error("Failed to fetch employee:", error)
        res.status(500).json({ error: "Failed to fetch employee" })
    }
})

app.patch("/employees/:id/language", async (req, res) => {
    const employeeId = Number(req.params.id)
    const preferredLanguage = normalizePreferredLanguage(req.body?.preferred_language)

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee id is required" })
    }

    if (!preferredLanguage) {
        return res.status(400).json({ error: "preferred_language must be en or zh-TW" })
    }

    try {
        const result = await pool.query(
            `
            UPDATE employees
            SET preferred_language = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, preferred_language, updated_at
            `,
            [preferredLanguage, employeeId]
        )

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Employee not found" })
        }

        res.json(result.rows[0])
    } catch (error) {
        console.error("Failed to update employee language:", error)
        res.status(500).json({ error: "Failed to update employee language" })
    }
})

async function getFixedSchedules(req, res) {
    try {
        const result = await pool.query(
            `
            SELECT
                fs.id,
                fs.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.english_name AS employee_english_name,
                e.chinese_name AS employee_chinese_name,
                fs.day_of_week,
                fs.shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                fs.created_at,
                fs.updated_at
            FROM employee_fixed_schedule fs
            JOIN employees e ON e.id = fs.employee_id
            JOIN shifts sh ON sh.id = fs.shift_id
            ORDER BY fs.day_of_week ASC, COALESCE(e.english_name, e.last_name) ASC, e.first_name ASC
            `
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch fixed schedules:", error)
        res.status(500).json({ error: "Failed to fetch fixed schedules" })
    }
}

async function upsertFixedSchedule(req, res) {
    const { employee_id, day_of_week, shift_id } = req.body
    const normalizedDayOfWeek = Number(day_of_week)

    if (!employee_id || !shift_id || Number.isNaN(normalizedDayOfWeek)) {
        return res.status(400).json({
            error: "employee_id, day_of_week, and shift_id are required",
        })
    }

    if (normalizedDayOfWeek < 0 || normalizedDayOfWeek > 6) {
        return res.status(400).json({ error: "day_of_week must be between 0 and 6" })
    }

    try {
        const result = await pool.query(
            `
            WITH upserted AS (
                INSERT INTO employee_fixed_schedule (employee_id, day_of_week, shift_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (employee_id, day_of_week)
                DO UPDATE SET shift_id = EXCLUDED.shift_id, updated_at = NOW()
                RETURNING *
            )
            SELECT
                u.id,
                u.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.english_name AS employee_english_name,
                e.chinese_name AS employee_chinese_name,
                u.day_of_week,
                u.shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                u.created_at,
                u.updated_at
            FROM upserted u
            JOIN employees e ON e.id = u.employee_id
            JOIN shifts sh ON sh.id = u.shift_id
            `,
            [employee_id, normalizedDayOfWeek, shift_id]
        )

        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Failed to save fixed schedule:", error)

        if (error.code === "23503") {
            return res.status(400).json({ error: "Invalid employee_id or shift_id" })
        }

        res.status(500).json({ error: "Failed to save fixed schedule" })
    }
}

app.get("/fixed-schedules", getFixedSchedules)
app.post("/fixed-schedules", upsertFixedSchedule)

// Backward-compatible aliases.
app.get("/fixed-schedule", getFixedSchedules)
app.post("/fixed-schedule", upsertFixedSchedule)

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
                e.english_name,
                e.chinese_name,
                e.role_title,
                s.shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                sh.is_overnight
            FROM schedules s
            JOIN employees e ON e.id = s.employee_id
            JOIN shifts sh ON sh.id = s.shift_id
            ORDER BY s.schedule_date ASC, sh.start_time ASC, COALESCE(e.english_name, e.last_name) ASC, e.first_name ASC
        `)

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch schedule:", error)
        res.status(500).json({ error: "Failed to fetch schedule" })
    }
})

app.post("/schedule", async (req, res) => {
    const { employee_id, shift_id, schedule_date, status, notes } = req.body

    if (!employee_id || !shift_id || !schedule_date) {
        return res.status(400).json({
            error: "employee_id, shift_id, and schedule_date are required",
        })
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO schedules (employee_id, shift_id, schedule_date, status, notes)
            VALUES ($1, $2, $3, COALESCE($4, 'scheduled'), $5)
            RETURNING *
            `,
            [employee_id, shift_id, schedule_date, status ?? null, notes ?? null]
        )

        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Failed to create schedule:", error)

        if (error.code === "23503") {
            return res.status(400).json({ error: "Invalid employee_id or shift_id" })
        }

        if (error.code === "23505") {
            return res.status(409).json({ error: "Schedule already exists for this employee, shift, and date" })
        }

        res.status(500).json({ error: "Failed to create schedule" })
    }
})

app.get("/requests", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                r.id,
                r.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.english_name AS employee_english_name,
                e.chinese_name AS employee_chinese_name,
                r.request_type,
                r.status,
                r.schedule_id,
                s.schedule_date,
                sh.name AS shift_name,
                sh.name AS current_shift_name,
                sh.start_time AS current_shift_start,
                sh.end_time AS current_shift_end,
                r.target_employee_id,
                CASE
                    WHEN te.id IS NULL THEN NULL
                    ELSE CONCAT(te.first_name, ' ', te.last_name)
                END AS target_employee_name,
                te.english_name AS target_employee_english_name,
                te.chinese_name AS target_employee_chinese_name,
                r.requested_start,
                r.requested_end,
                r.reason,
                r.reviewer_id,
                CASE
                    WHEN rv.id IS NULL THEN NULL
                    ELSE CONCAT(rv.first_name, ' ', rv.last_name)
                END AS reviewer_name,
                rv.english_name AS reviewer_english_name,
                rv.chinese_name AS reviewer_chinese_name,
                r.reviewed_at,
                r.created_at,
                r.updated_at
            FROM requests r
            JOIN employees e ON e.id = r.employee_id
            LEFT JOIN employees te ON te.id = r.target_employee_id
            LEFT JOIN employees rv ON rv.id = r.reviewer_id
            LEFT JOIN schedules s ON s.id = r.schedule_id
            LEFT JOIN shifts sh ON sh.id = s.shift_id
            ORDER BY r.created_at DESC, r.id DESC
        `)

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch requests:", error)
        res.status(500).json({ error: "Failed to fetch requests" })
    }
})

app.post("/requests", async (req, res) => {
    const {
        employee_id,
        request_type,
        status,
        schedule_id,
        target_employee_id,
        requested_start,
        requested_end,
        reason,
    } = req.body
    const dbRequestType = request_type === "change" ? "availability_change" : request_type

    if (!employee_id || !request_type) {
        return res.status(400).json({
            error: "employee_id and request_type are required",
        })
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO requests (
                employee_id,
                request_type,
                status,
                schedule_id,
                target_employee_id,
                requested_start,
                requested_end,
                reason
            )
            VALUES (
                $1,
                $2,
                COALESCE($3, 'pending'),
                $4,
                $5,
                $6,
                $7,
                $8
            )
            RETURNING *
            `,
            [
                employee_id,
                dbRequestType,
                status ?? null,
                schedule_id ?? null,
                target_employee_id ?? null,
                requested_start ?? null,
                requested_end ?? null,
                reason ?? null,
            ]
        )

        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Failed to create request:", error)

        if (error.code === "23503") {
            return res.status(400).json({ error: "Invalid employee_id, schedule_id, target_employee_id, or reviewer_id" })
        }

        if (error.code === "23514") {
            return res.status(400).json({ error: "Invalid request data (type, status, or time range)" })
        }

        res.status(500).json({ error: "Failed to create request" })
    }
})

app.patch("/requests/:id", async (req, res) => {
    const requestId = Number(req.params.id)
    const { status } = req.body

    if (!requestId || Number.isNaN(requestId)) {
        return res.status(400).json({ error: "Valid request id is required" })
    }

    if (!status) {
        return res.status(400).json({ error: "status is required" })
    }

    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "status must be approved or rejected" })
    }

    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        const requestLookup = await client.query(
            `
            SELECT
                r.*,
                s.shift_id,
                sh.name AS current_shift_name,
                sh.is_overnight,
                sh.break_minutes,
                sh.required_role,
                sh.color_hex
            FROM requests r
            LEFT JOIN schedules s ON s.id = r.schedule_id
            LEFT JOIN shifts sh ON sh.id = s.shift_id
            WHERE r.id = $1
            FOR UPDATE
            `,
            [requestId]
        )

        if (requestLookup.rowCount === 0) {
            await client.query("ROLLBACK")
            return res.status(404).json({ error: "Request not found" })
        }

        const requestRow = requestLookup.rows[0]

        if (status === "approved" && requestRow.schedule_id) {
            const requestedTimes = extractRequestedChangeTimes(requestRow)

            if (requestedTimes) {
                const { startTime, endTime } = requestedTimes
                const isOvernight = requestRow.is_overnight ?? endTime < startTime
                const shiftName = requestRow.current_shift_name || "Adjusted Shift"

                const existingShift = await client.query(
                    `
                    SELECT id
                    FROM shifts
                    WHERE name = $1
                      AND start_time = $2::time
                      AND end_time = $3::time
                      AND is_overnight = $4
                    LIMIT 1
                    `,
                    [shiftName, startTime, endTime, isOvernight]
                )

                let newShiftId = null

                if (existingShift.rowCount > 0) {
                    newShiftId = existingShift.rows[0].id
                } else {
                    const createdShift = await client.query(
                        `
                        INSERT INTO shifts (
                            name,
                            start_time,
                            end_time,
                            is_overnight,
                            break_minutes,
                            required_role,
                            color_hex
                        )
                        VALUES ($1, $2::time, $3::time, $4, $5, $6, $7)
                        RETURNING id
                        `,
                        [
                            shiftName,
                            startTime,
                            endTime,
                            isOvernight,
                            requestRow.break_minutes || 0,
                            requestRow.required_role,
                            requestRow.color_hex,
                        ]
                    )
                    newShiftId = createdShift.rows[0].id
                }

                await client.query(
                    `
                    UPDATE schedules
                    SET shift_id = $1, updated_at = NOW()
                    WHERE id = $2
                    `,
                    [newShiftId, requestRow.schedule_id]
                )
            }
        }

        const updatedRequest = await client.query(
            `
            UPDATE requests
            SET status = $1, reviewed_at = NOW(), updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [status, requestId]
        )

        await client.query("COMMIT")
        res.json(updatedRequest.rows[0])
    } catch (error) {
        await client.query("ROLLBACK")
        console.error("Failed to update request:", error)
        res.status(500).json({ error: "Failed to update request" })
    } finally {
        client.release()
    }
})

app.post("/admin/generate-schedule", async (req, res) => {
    try {
        const result = await generateNextWeekFromFixedSchedules()
        res.json({
            message: "Next week schedule generation completed",
            week_start: result.weekStart,
            inserted_rows: result.insertedRows,
        })
    } catch (error) {
        console.error("Manual schedule generation failed:", error)
        res.status(500).json({ error: "Failed to generate next week schedule" })
    }
})

startFixedScheduleCronJob()

app.listen(4000, "0.0.0.0", ()=>{
    console.log("Backend running on 0.0.0.0:4000")
})
