# Employee Scheduling System

A lightweight workforce scheduling and team management prototype built with React, Vite, TailwindCSS, Express, Postgres, and Docker.

## Current Demo Focus

- Dashboard for managers
- Employee profile and directory
- Availability submission
- Weekly planning view
- Daily timetable
- Team assignment and team leader selection
- Requests
- Printable operational reports

See [docs/PHASED_PROTOTYPE_PLAN.md](docs/PHASED_PROTOTYPE_PLAN.md) for the phased implementation and test plan.

## Tech Stack

Frontend:
- React
- Vite
- TailwindCSS

Backend:
- Node.js / Express
- Postgres

Infrastructure:
- Docker
- Cloudflare Tunnel for the demo domain

## Project Structure

```text
employee-scheduler
├── frontend
├── backend
├── docs
└── docker-compose.yml
```

## Demo Runtime Notes

The public demo tunnel points to the frontend container:

```text
https://scheduler.fmtagency.online -> http://scheduler-frontend:5173
```

The frontend uses same-origin API calls and Vite proxies API routes to:

```text
http://scheduler-backend:4000
```

Do not call `scheduler.fmtagency.online:4000` from browser code.

## Demo Accounts

| Role | Username | Password |
| --- | --- | --- |
| Manager/Admin | `scheduler.admin@example.com` | `ChangeMe123!` |
| Employee | `scheduler.employee@example.com` | `ChangeMe123!` |
