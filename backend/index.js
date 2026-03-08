const express = require("express")
const cron = require("node-cron")
const cors = require("cors")
const crypto = require("crypto")
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
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production"
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 12)
const DEFAULT_INITIAL_PASSWORD = process.env.DEFAULT_INITIAL_PASSWORD || "ChangeMe123!"
const AUTH_ROLES = ["employee", "team_leader", "manager"]

function base64UrlEncode(value) {
    return Buffer.from(value)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
}

function base64UrlDecode(value) {
    const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/")
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
}

function signJwt(payload, expiresInSeconds = JWT_EXPIRES_IN_SECONDS) {
    const header = { alg: "HS256", typ: "JWT" }
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + expiresInSeconds
    const body = { ...payload, iat, exp }

    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedPayload = base64UrlEncode(JSON.stringify(body))
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(signingInput)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")

    return `${signingInput}.${signature}`
}

function verifyJwt(token) {
    const [headerPart, payloadPart, signaturePart] = String(token || "").split(".")
    if (!headerPart || !payloadPart || !signaturePart) {
        throw new Error("Invalid token format")
    }

    const signingInput = `${headerPart}.${payloadPart}`
    const expectedSignature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(signingInput)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")

    const expectedBuffer = Buffer.from(expectedSignature)
    const providedBuffer = Buffer.from(signaturePart)

    if (expectedBuffer.length !== providedBuffer.length) {
        throw new Error("Invalid token signature")
    }

    if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
        throw new Error("Invalid token signature")
    }

    const payload = JSON.parse(base64UrlDecode(payloadPart))
    const now = Math.floor(Date.now() / 1000)

    if (!payload.exp || payload.exp < now) {
        throw new Error("Token expired")
    }

    return payload
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = crypto.scryptSync(password, salt, 64).toString("hex")
    return `scrypt:${salt}:${hash}`
}

function verifyPassword(password, passwordHash) {
    if (!passwordHash || typeof passwordHash !== "string") return false

    const [algorithm, salt, hashValue] = passwordHash.split(":")
    if (algorithm !== "scrypt" || !salt || !hashValue) return false

    const derivedKey = crypto.scryptSync(password, salt, 64)
    const storedKey = Buffer.from(hashValue, "hex")
    if (storedKey.length !== derivedKey.length) return false

    return crypto.timingSafeEqual(storedKey, derivedKey)
}

function normalizeRole(role) {
    const normalized = String(role || "").trim().toLowerCase()
    if (AUTH_ROLES.includes(normalized)) return normalized
    return "employee"
}

function isAdminRole(role) {
    return role === "team_leader" || role === "manager"
}

function buildAuthUser(row) {
    return {
        id: Number(row.id),
        role: normalizeRole(row.role),
        must_change_password: Boolean(row.must_change_password),
        english_name: row.english_name || null,
        chinese_name: row.chinese_name || null,
        preferred_language: row.preferred_language || "en",
        email: row.email || null,
        phone: row.phone || null,
    }
}

function getBearerToken(req) {
    const authHeader = String(req.headers.authorization || "")
    if (!authHeader.toLowerCase().startsWith("bearer ")) return null
    return authHeader.slice(7).trim()
}

function requireAuth(req, res, next) {
    const token = getBearerToken(req)
    if (!token) {
        return res.status(401).json({ error: "Authentication required" })
    }

    try {
        const payload = verifyJwt(token)
        req.authUser = {
            id: Number(payload.sub),
            role: normalizeRole(payload.role),
        }
        next()
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" })
    }
}

function requireRoles(roles) {
    return (req, res, next) => {
        if (!req.authUser) {
            return res.status(401).json({ error: "Authentication required" })
        }

        if (!roles.includes(req.authUser.role)) {
            return res.status(403).json({ error: "Insufficient permissions" })
        }

        next()
    }
}

function canAccessEmployeeRecord(req, employeeId) {
    return isAdminRole(req.authUser.role) || Number(req.authUser.id) === Number(employeeId)
}

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

function isValidTimeString(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""))
}

async function findOrCreateShiftForTimeRange(client, {
    shiftName,
    startTime,
    endTime,
    isOvernight,
    breakMinutes,
    requiredRole,
    colorHex,
}) {
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

    if (existingShift.rowCount > 0) {
        return existingShift.rows[0].id
    }

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
            breakMinutes || 0,
            requiredRole || null,
            colorHex || null,
        ]
    )

    return createdShift.rows[0].id
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
    res.json({
        status: "ok",
        service: "employee-scheduler-api",
    })
})

app.post("/auth/login", async (req, res) => {
    const username = String(req.body?.username || "").trim()
    const password = String(req.body?.password || "")

    if (!username || !password) {
        return res.status(400).json({ error: "username and password are required" })
    }

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                email,
                phone,
                role,
                password_hash,
                must_change_password,
                english_name,
                chinese_name,
                preferred_language
            FROM employees
            WHERE LOWER(email) = LOWER($1)
               OR phone = $1
            LIMIT 1
            `,
            [username]
        )

        if (result.rowCount === 0) {
            return res.status(401).json({ error: "Invalid username or password" })
        }

        const employee = result.rows[0]
        const role = normalizeRole(employee.role)
        const hasPasswordHash = Boolean(employee.password_hash)
        const isPasswordValid = hasPasswordHash
            ? verifyPassword(password, employee.password_hash)
            : password === DEFAULT_INITIAL_PASSWORD

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username or password" })
        }

        if (!hasPasswordHash) {
            await pool.query(
                `
                UPDATE employees
                SET password_hash = $1, must_change_password = TRUE, updated_at = NOW()
                WHERE id = $2
                `,
                [hashPassword(DEFAULT_INITIAL_PASSWORD), employee.id]
            )
            employee.must_change_password = true
        }

        if (role !== employee.role) {
            await pool.query(
                `
                UPDATE employees
                SET role = $1, updated_at = NOW()
                WHERE id = $2
                `,
                [role, employee.id]
            )
            employee.role = role
        }

        const authUser = buildAuthUser(employee)
        const token = signJwt({ sub: authUser.id, role: authUser.role })

        res.json({ token, user: authUser })
    } catch (error) {
        console.error("Failed to login:", error)
        res.status(500).json({ error: "Failed to login" })
    }
})

app.get("/auth/me", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                role,
                must_change_password,
                english_name,
                chinese_name,
                preferred_language,
                email,
                phone
            FROM employees
            WHERE id = $1
            LIMIT 1
            `,
            [req.authUser.id]
        )

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found" })
        }

        res.json({ user: buildAuthUser(result.rows[0]) })
    } catch (error) {
        console.error("Failed to fetch auth user:", error)
        res.status(500).json({ error: "Failed to fetch auth user" })
    }
})

app.post("/auth/change-password", requireAuth, async (req, res) => {
    const currentPassword = String(req.body?.current_password || "")
    const newPassword = String(req.body?.new_password || "")

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "current_password and new_password are required" })
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: "new_password must be at least 8 characters" })
    }

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                role,
                password_hash,
                must_change_password,
                english_name,
                chinese_name,
                preferred_language,
                email,
                phone
            FROM employees
            WHERE id = $1
            LIMIT 1
            `,
            [req.authUser.id]
        )

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found" })
        }

        const employee = result.rows[0]
        const hasPasswordHash = Boolean(employee.password_hash)
        const isCurrentPasswordValid = hasPasswordHash
            ? verifyPassword(currentPassword, employee.password_hash)
            : currentPassword === DEFAULT_INITIAL_PASSWORD

        if (!isCurrentPasswordValid) {
            return res.status(401).json({ error: "Current password is incorrect" })
        }

        const nextPasswordHash = hashPassword(newPassword)
        const updateResult = await pool.query(
            `
            UPDATE employees
            SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
            WHERE id = $2
            RETURNING
                id,
                role,
                must_change_password,
                english_name,
                chinese_name,
                preferred_language,
                email,
                phone
            `,
            [nextPasswordHash, req.authUser.id]
        )

        const authUser = buildAuthUser(updateResult.rows[0])
        const token = signJwt({ sub: authUser.id, role: authUser.role })

        res.json({
            message: "Password updated successfully",
            token,
            user: authUser,
        })
    } catch (error) {
        console.error("Failed to change password:", error)
        res.status(500).json({ error: "Failed to change password" })
    }
})

app.get("/employees", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM employees ORDER BY id ASC")
        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch employees:", error)
        res.status(500).json({ error: "Failed to fetch employees" })
    }
})

app.get("/stats/dashboard", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
    const dashboardTimezone = process.env.DASHBOARD_TIMEZONE || FIXED_SCHEDULE_TIMEZONE || "Asia/Taipei"

    try {
        const result = await pool.query(
            `
            WITH local_now AS (
                SELECT (NOW() AT TIME ZONE $1)::date AS local_date
            ),
            local_week AS (
                SELECT
                    local_date,
                    (local_date - ((EXTRACT(ISODOW FROM local_date)::int) - 1))::date AS week_start
                FROM local_now
            )
            SELECT
                (SELECT COUNT(*)::INT FROM employees) AS total_employees,
                (
                    SELECT COUNT(*)::INT
                    FROM schedules
                    WHERE schedule_date = lw.local_date
                ) AS shifts_today,
                (
                    SELECT COUNT(*)::INT
                    FROM schedules
                    WHERE schedule_date BETWEEN lw.week_start AND (lw.week_start + INTERVAL '6 days')::date
                ) AS shifts_this_week,
                (
                    SELECT COUNT(*)::INT
                    FROM requests
                    WHERE status = 'pending'
                ) AS pending_requests
            FROM local_week lw
            `,
            [dashboardTimezone]
        )

        res.json(result.rows[0])
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
        res.status(500).json({ error: "Failed to fetch dashboard stats" })
    }
})

app.get("/stats/today-shifts", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
    const dashboardTimezone = process.env.DASHBOARD_TIMEZONE || FIXED_SCHEDULE_TIMEZONE || "Asia/Taipei"

    try {
        const result = await pool.query(
            `
            WITH local_day AS (
                SELECT (NOW() AT TIME ZONE $1)::date AS local_date
            )
            SELECT
                s.id AS schedule_id,
                s.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.english_name AS employee_english_name,
                e.chinese_name AS employee_chinese_name,
                e.role_title AS role,
                TO_CHAR(sh.start_time, 'HH24:MI') AS shift_start,
                TO_CHAR(sh.end_time, 'HH24:MI') AS shift_end
            FROM schedules s
            JOIN employees e ON e.id = s.employee_id
            JOIN shifts sh ON sh.id = s.shift_id
            JOIN local_day d ON d.local_date = s.schedule_date
            ORDER BY sh.start_time ASC, COALESCE(e.english_name, e.last_name) ASC, e.first_name ASC
            `,
            [dashboardTimezone]
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch today shifts:", error)
        res.status(500).json({ error: "Failed to fetch today shifts" })
    }
})

app.get("/employees/:id", requireAuth, async (req, res) => {
    const employeeId = Number(req.params.id)

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee id is required" })
    }

    if (!canAccessEmployeeRecord(req, employeeId)) {
        return res.status(403).json({ error: "Insufficient permissions" })
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

app.get("/employees/:id/tomorrow-shifts", requireAuth, async (req, res) => {
    const employeeId = Number(req.params.id)
    const dashboardTimezone = process.env.DASHBOARD_TIMEZONE || FIXED_SCHEDULE_TIMEZONE || "Asia/Taipei"

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee id is required" })
    }

    if (!canAccessEmployeeRecord(req, employeeId)) {
        return res.status(403).json({ error: "Insufficient permissions" })
    }

    try {
        const result = await pool.query(
            `
            WITH local_days AS (
                SELECT
                    (NOW() AT TIME ZONE $1)::date AS local_today,
                    ((NOW() AT TIME ZONE $1)::date + INTERVAL '1 day')::date AS local_tomorrow
            )
            SELECT
                s.id AS schedule_id,
                s.employee_id,
                s.schedule_date,
                s.status,
                s.notes,
                e.role_title AS role,
                sh.id AS shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                sh.is_overnight
            FROM schedules s
            JOIN employees e ON e.id = s.employee_id
            JOIN shifts sh ON sh.id = s.shift_id
            JOIN local_days d ON d.local_tomorrow = s.schedule_date
            WHERE s.employee_id = $2
            ORDER BY sh.start_time ASC, s.id ASC
            `,
            [dashboardTimezone, employeeId]
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch tomorrow shifts:", error)
        res.status(500).json({ error: "Failed to fetch tomorrow shifts" })
    }
})

app.get("/employees/:id/coworkers", requireAuth, async (req, res) => {
    const employeeId = Number(req.params.id)

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee id is required" })
    }

    if (!canAccessEmployeeRecord(req, employeeId)) {
        return res.status(403).json({ error: "Insufficient permissions" })
    }

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                first_name,
                last_name,
                english_name,
                chinese_name,
                role_title,
                employment_type,
                status
            FROM employees
            WHERE id <> $1
              AND status = 'active'
            ORDER BY COALESCE(english_name, last_name) ASC, first_name ASC
            `,
            [employeeId]
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch coworkers:", error)
        res.status(500).json({ error: "Failed to fetch coworkers" })
    }
})

app.patch("/employees/:id/language", requireAuth, async (req, res) => {
    const employeeId = Number(req.params.id)
    const preferredLanguage = normalizePreferredLanguage(req.body?.preferred_language)

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee id is required" })
    }

    if (!canAccessEmployeeRecord(req, employeeId)) {
        return res.status(403).json({ error: "Insufficient permissions" })
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

app.get("/fixed-schedules", requireAuth, requireRoles(["team_leader", "manager"]), getFixedSchedules)
app.post("/fixed-schedules", requireAuth, requireRoles(["team_leader", "manager"]), upsertFixedSchedule)

// Backward-compatible aliases.
app.get("/fixed-schedule", requireAuth, requireRoles(["team_leader", "manager"]), getFixedSchedules)
app.post("/fixed-schedule", requireAuth, requireRoles(["team_leader", "manager"]), upsertFixedSchedule)

app.get("/schedule", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
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

app.get("/schedule/today", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
    const scheduleTimezone = process.env.DASHBOARD_TIMEZONE || FIXED_SCHEDULE_TIMEZONE || "Asia/Taipei"

    try {
        const result = await pool.query(
            `
            WITH local_day AS (
                SELECT (NOW() AT TIME ZONE $1)::date AS local_date
            )
            SELECT
                s.id AS schedule_id,
                s.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.english_name AS employee_english_name,
                e.chinese_name AS employee_chinese_name,
                e.role_title AS role,
                s.status,
                s.schedule_date,
                sh.id AS shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                (s.schedule_date::timestamp + sh.start_time) AS shift_start,
                (
                    s.schedule_date::timestamp
                    + sh.end_time
                    + CASE
                        WHEN sh.is_overnight OR sh.end_time <= sh.start_time THEN INTERVAL '1 day'
                        ELSE INTERVAL '0 day'
                    END
                ) AS shift_end
            FROM schedules s
            JOIN employees e ON e.id = s.employee_id
            JOIN shifts sh ON sh.id = s.shift_id
            JOIN local_day d ON d.local_date = s.schedule_date
            ORDER BY sh.start_time ASC, COALESCE(e.english_name, e.last_name) ASC, e.first_name ASC
            `,
            [scheduleTimezone]
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch today's schedule:", error)
        res.status(500).json({ error: "Failed to fetch today's schedule" })
    }
})

app.post("/schedule", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
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

app.patch("/schedule/:id", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
    const scheduleId = Number(req.params.id)
    const {
        start_time,
        end_time,
        status,
        notes,
        shift_name,
    } = req.body || {}

    if (!scheduleId || Number.isNaN(scheduleId)) {
        return res.status(400).json({ error: "Valid schedule id is required" })
    }

    const hasStartTime = start_time !== undefined && start_time !== null
    const hasEndTime = end_time !== undefined && end_time !== null
    const hasTimeUpdate = hasStartTime || hasEndTime

    if (hasStartTime !== hasEndTime) {
        return res.status(400).json({ error: "Both start_time and end_time are required when updating shift time" })
    }

    if (hasTimeUpdate && (!isValidTimeString(start_time) || !isValidTimeString(end_time))) {
        return res.status(400).json({ error: "start_time and end_time must be in HH:MM format" })
    }

    if (!hasTimeUpdate && status === undefined && notes === undefined) {
        return res.status(400).json({ error: "Provide start_time/end_time and/or status/notes to update schedule" })
    }

    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        const existingSchedule = await client.query(
            `
            SELECT
                s.id,
                s.shift_id,
                sh.name AS shift_name,
                sh.is_overnight,
                sh.break_minutes,
                sh.required_role,
                sh.color_hex
            FROM schedules s
            JOIN shifts sh ON sh.id = s.shift_id
            WHERE s.id = $1
            FOR UPDATE
            `,
            [scheduleId]
        )

        if (existingSchedule.rowCount === 0) {
            await client.query("ROLLBACK")
            return res.status(404).json({ error: "Schedule not found" })
        }

        const currentSchedule = existingSchedule.rows[0]
        let nextShiftId = currentSchedule.shift_id

        if (hasTimeUpdate) {
            const normalizedStart = String(start_time).slice(0, 5)
            const normalizedEnd = String(end_time).slice(0, 5)
            const nextIsOvernight = normalizedEnd <= normalizedStart
            const nextShiftName = String(shift_name || currentSchedule.shift_name || "Adjusted Shift").slice(0, 100)

            nextShiftId = await findOrCreateShiftForTimeRange(client, {
                shiftName: nextShiftName,
                startTime: normalizedStart,
                endTime: normalizedEnd,
                isOvernight: nextIsOvernight,
                breakMinutes: currentSchedule.break_minutes,
                requiredRole: currentSchedule.required_role,
                colorHex: currentSchedule.color_hex,
            })
        }

        await client.query(
            `
            UPDATE schedules
            SET
                shift_id = $1,
                status = COALESCE($2, status),
                notes = COALESCE($3, notes),
                updated_at = NOW()
            WHERE id = $4
            `,
            [nextShiftId, status ?? null, notes ?? null, scheduleId]
        )

        const updatedSchedule = await client.query(
            `
            SELECT
                s.id AS schedule_id,
                s.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.english_name AS employee_english_name,
                e.chinese_name AS employee_chinese_name,
                e.role_title AS role,
                s.status,
                s.schedule_date,
                sh.id AS shift_id,
                sh.name AS shift_name,
                sh.start_time,
                sh.end_time,
                (s.schedule_date::timestamp + sh.start_time) AS shift_start,
                (
                    s.schedule_date::timestamp
                    + sh.end_time
                    + CASE
                        WHEN sh.is_overnight OR sh.end_time <= sh.start_time THEN INTERVAL '1 day'
                        ELSE INTERVAL '0 day'
                    END
                ) AS shift_end
            FROM schedules s
            JOIN employees e ON e.id = s.employee_id
            JOIN shifts sh ON sh.id = s.shift_id
            WHERE s.id = $1
            `,
            [scheduleId]
        )

        await client.query("COMMIT")
        res.json(updatedSchedule.rows[0])
    } catch (error) {
        await client.query("ROLLBACK")
        console.error("Failed to update schedule:", error)
        res.status(500).json({ error: "Failed to update schedule" })
    } finally {
        client.release()
    }
})

app.get("/requests", requireAuth, async (req, res) => {
    try {
        const isAdmin = isAdminRole(req.authUser.role)
        const queryParams = []
        const whereClause = isAdmin ? "" : "WHERE r.employee_id = $1"

        if (!isAdmin) {
            queryParams.push(req.authUser.id)
        }

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
            ${whereClause}
            ORDER BY r.created_at DESC, r.id DESC
        `, queryParams)

        res.json(result.rows)
    } catch (error) {
        console.error("Failed to fetch requests:", error)
        res.status(500).json({ error: "Failed to fetch requests" })
    }
})

app.post("/requests", requireAuth, async (req, res) => {
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

    const employeeId = Number(employee_id)
    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee_id is required" })
    }

    if (!isAdminRole(req.authUser.role) && employeeId !== Number(req.authUser.id)) {
        return res.status(403).json({ error: "Employees can only create requests for themselves" })
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
                employeeId,
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

app.post("/requests/absence-replacement", requireAuth, async (req, res) => {
    const {
        employee_id,
        schedule_id,
        replacement_employee_id,
        reason,
    } = req.body || {}

    const employeeId = Number(employee_id)
    const scheduleId = Number(schedule_id)
    const replacementEmployeeId = Number(replacement_employee_id)
    const dashboardTimezone = process.env.DASHBOARD_TIMEZONE || FIXED_SCHEDULE_TIMEZONE || "Asia/Taipei"

    if (!employeeId || Number.isNaN(employeeId)) {
        return res.status(400).json({ error: "Valid employee_id is required" })
    }

    if (!isAdminRole(req.authUser.role) && employeeId !== Number(req.authUser.id)) {
        return res.status(403).json({ error: "Employees can only submit replacement requests for themselves" })
    }

    if (!scheduleId || Number.isNaN(scheduleId)) {
        return res.status(400).json({ error: "Valid schedule_id is required" })
    }

    if (!replacementEmployeeId || Number.isNaN(replacementEmployeeId)) {
        return res.status(400).json({ error: "Valid replacement_employee_id is required" })
    }

    if (!reason || !String(reason).trim()) {
        return res.status(400).json({ error: "reason is required" })
    }

    if (replacementEmployeeId === employeeId) {
        return res.status(400).json({ error: "replacement_employee_id must be different from employee_id" })
    }

    const client = await pool.connect()

    try {
        await client.query("BEGIN")

        const scheduleLookup = await client.query(
            `
            WITH local_days AS (
                SELECT ((NOW() AT TIME ZONE $1)::date + INTERVAL '1 day')::date AS local_tomorrow
            )
            SELECT
                s.id,
                s.employee_id,
                s.schedule_date
            FROM schedules s
            JOIN local_days d ON d.local_tomorrow = s.schedule_date
            WHERE s.id = $2
              AND s.employee_id = $3
            FOR UPDATE
            `,
            [dashboardTimezone, scheduleId, employeeId]
        )

        if (scheduleLookup.rowCount === 0) {
            await client.query("ROLLBACK")
            return res.status(400).json({
                error: "Schedule must belong to employee and be for tomorrow (day-prior requests only)",
            })
        }

        const replacementLookup = await client.query(
            `
            SELECT id
            FROM employees
            WHERE id = $1
            LIMIT 1
            `,
            [replacementEmployeeId]
        )

        if (replacementLookup.rowCount === 0) {
            await client.query("ROLLBACK")
            return res.status(400).json({ error: "Replacement employee not found" })
        }

        const duplicatePending = await client.query(
            `
            SELECT id
            FROM requests
            WHERE employee_id = $1
              AND schedule_id = $2
              AND request_type = 'shift_swap'
              AND status = 'pending'
            LIMIT 1
            `,
            [employeeId, scheduleId]
        )

        if (duplicatePending.rowCount > 0) {
            await client.query("ROLLBACK")
            return res.status(409).json({ error: "A pending replacement request already exists for this shift" })
        }

        const result = await client.query(
            `
            INSERT INTO requests (
                employee_id,
                request_type,
                status,
                schedule_id,
                target_employee_id,
                reason
            )
            VALUES (
                $1,
                'shift_swap',
                'pending',
                $2,
                $3,
                $4
            )
            RETURNING *
            `,
            [employeeId, scheduleId, replacementEmployeeId, String(reason).trim()]
        )

        await client.query("COMMIT")
        res.status(201).json(result.rows[0])
    } catch (error) {
        await client.query("ROLLBACK")
        console.error("Failed to create absence replacement request:", error)
        res.status(500).json({ error: "Failed to create absence replacement request" })
    } finally {
        client.release()
    }
})

async function patchRequestStatus(req, res) {
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
            SET
                status = $1,
                reviewer_id = $2,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [status, req.authUser.id, requestId]
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
}

app.patch("/requests/:id", requireAuth, requireRoles(["team_leader", "manager"]), patchRequestStatus)
app.patch("/requests/:id/status", requireAuth, requireRoles(["team_leader", "manager"]), patchRequestStatus)

app.post("/admin/generate-schedule", requireAuth, requireRoles(["team_leader", "manager"]), async (req, res) => {
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
