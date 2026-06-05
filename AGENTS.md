Project: Employee Scheduling System

Stack:
- React
- TailwindCSS
- Vite
- Node.js / Express
- Postgres

Guidelines:
- Follow modular React component structure
- Use TailwindCSS for styling
- Maintain clean readable code
- Avoid unnecessary dependencies
- Follow SaaS dashboard UI patterns
- Keep this prototype lightweight and demo-friendly
- Do not add Keycloak, OAuth, external messaging, or heavy integrations unless explicitly requested
- Public demo frontend is served by Cloudflare Tunnel and should call same-origin API paths
- Vite proxies API calls to scheduler-backend:4000

Main Features:
- Employee scheduler
- Employee management
- Availability submission
- Weekly planning
- Daily timetable
- Team assignment and team leader selection
- Shift requests

Planning:
- Follow docs/PHASED_PROTOTYPE_PLAN.md
- Work one phase at a time and verify the listed smoke tests before moving on
