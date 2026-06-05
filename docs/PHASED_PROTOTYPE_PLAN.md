# Employee Scheduler Prototype Plan

This repo is being used for a lightweight demo of a workforce scheduling and team management system. Keep the build simple, responsive, and easy to test. Do not add heavyweight identity, notification, or enterprise integrations during this prototype phase.

Requirements reference:
https://docs.google.com/document/d/1D4VGChv2M2HAd4WpBsX5JmjMt6FVSze_98s1n4ZvJQo/edit?usp=sharing

Live demo target:
https://scheduler.fmtagency.online

## Demo Deployment Notes

- Frontend runs with Vite on internal port `5173`.
- Backend runs with Express on internal port `4000`.
- Cloudflare Tunnel points to `http://scheduler-frontend:5173`.
- Frontend API calls should use same-origin paths such as `/auth/login`, `/schedule`, and `/stats/dashboard`.
- Vite proxies API paths to `http://scheduler-backend:4000`.
- Do not call `scheduler.fmtagency.online:4000` from browser code.

## Demo Accounts

Use simple demo accounts unless the owner provides new credentials.

| Role | Username | Password |
| --- | --- | --- |
| Manager/Admin | `scheduler.admin@example.com` | `ChangeMe123!` |
| Employee | `scheduler.employee@example.com` | `ChangeMe123!` |

For the demo, keep these credentials stable. Do not force password changes unless explicitly requested.

## Phase 0: Stabilize Existing Demo

Goal: make the current app reliable enough for a walkthrough.

Tasks:
- Confirm `docker compose up -d` starts Postgres, backend, frontend, and workspace.
- Confirm frontend loads on Vite and public tunnel.
- Confirm these API routes work through the frontend domain:
  - `POST /auth/login`
  - `GET /auth/me`
  - `GET /stats/dashboard`
  - `GET /stats/today-shifts`
  - `GET /schedule`
  - `GET /requests`
- Seed or repair demo users.
- Add useful seed data for employees, shifts, schedules, availability, and requests.

Acceptance tests:
- Manager can log in and see dashboard stats.
- Weekly Schedule loads without API errors.
- Requests page loads.
- Employee demo login works.

## Phase 1: Responsive UI Refresh

Goal: make the prototype visually credible on phone, tablet, and desktop.

Tasks:
- Improve navigation so it works on narrow screens.
- Use card layouts for dashboard metrics.
- Make tables scroll horizontally on small screens instead of breaking.
- Use clear empty states.
- Use consistent button styles and status badges.
- Keep Tailwind only; avoid adding large UI frameworks unless necessary.

Acceptance tests:
- Login, Dashboard, Weekly Schedule, Employees, Requests, and Profile are usable at:
  - 390px mobile width
  - 768px tablet width
  - desktop width
- No overlapping text or clipped action buttons.

## Phase 2: Employee Profile and Directory

Goal: capture the worker identity requirements without overbuilding HR.

Fields to support:
- Employee ID/code
- Full name
- Alternate/local language name
- Gender
- Phone number
- Contact ID or messaging handle
- Email
- Work permit status/comment
- Boss/admin comments
- Employment type
- Status

Tasks:
- Improve employee list search and filtering.
- Add an employee detail view or edit panel.
- Keep phone/email uniqueness validation simple.

Acceptance tests:
- Manager can view all employees.
- Manager can create or edit basic employee profile data.
- Employee can view their own profile.

## Phase 3: Availability Submission

Goal: distinguish employee availability from manager-approved assignments.

Tasks:
- Employee can submit availability for a Monday-to-Sunday week.
- Availability cells should support one or more configured shifts per day.
- Prevent obviously conflicting shifts.
- Show clear validation messages.
- Manager can view submitted availability.

Shift examples from requirements:
- `06:20-10:30`
- `08:00-12:00`
- `13:00-17:00`

Department/category examples:
- Maintenance
- Farm Work
- Packaging
- Indoor
- Outdoor

Acceptance tests:
- Employee can submit availability for current week.
- Employee can update availability before manager planning.
- Manager can see employee availability in a weekly grid.

## Phase 4: Weekly Planning

Goal: let managers turn availability into a working weekly schedule.

Tasks:
- Weekly schedule is anchored to Monday.
- Display employees vertically and days horizontally.
- Show assigned shifts per employee/day.
- Show blank cells where no availability or assignment exists.
- Allow manager review and approval status.
- Keep prior/future week navigation.

Acceptance tests:
- Manager can open current, previous, and next week.
- Weekly view remains readable on tablet.
- Weekly view can be printed or exported simply.

## Phase 5: Daily Timetable and Team Planner

Goal: produce a practical daily operational plan from the weekly schedule.

Tasks:
- Generate/select a daily timetable for a date.
- Group by department/category and shift time.
- Support team assignment for a selected day/shift.
- Assign or change team leader/captain.
- Allow manager to adjust auto-generated teams.

Acceptance tests:
- Manager can open a daily timetable.
- Manager can group employees into teams.
- Manager can assign a team leader.
- Daily timetable can be printed.

## Phase 6: Reports and Print Views

Goal: produce simple operational reports.

Reports:
- Daily timetable
- Weekly schedule
- Employee directory
- Team assignments

Tasks:
- Add print-friendly CSS.
- Add buttons for print/export where useful.
- Keep report layout clean and readable.

Acceptance tests:
- Print preview is readable for daily and weekly reports.
- Report headers show date/week and report title.

## Phase 7: Lightweight Audit and Admin

Goal: show traceability without enterprise complexity.

Tasks:
- Record important changes in a simple audit table:
  - actor
  - action
  - entity type
  - entity id
  - timestamp
  - summary
- Add manager/admin list.
- Keep role options simple:
  - `employee`
  - `team_leader`
  - `manager`

Acceptance tests:
- Manager/admin changes are visible in a simple audit log.
- Manager can add or deactivate demo employees.

## Phase 8: Final Demo Hardening

Goal: make the prototype stable enough to show.

Tasks:
- Remove console errors.
- Add clear loading states.
- Add clear error messages.
- Ensure demo data is rich enough to show dashboard, schedules, teams, and requests.
- Confirm the public tunnel still works after restart.

Final smoke test:
- Login as manager.
- View dashboard.
- View weekly schedule.
- View daily timetable.
- Create or edit one assignment.
- Assign team leader.
- Print a schedule.
- Login as employee.
- Submit availability.
- View own schedule/profile.

## Out of Scope for This Prototype

- Keycloak/OAuth.
- Payroll integration.
- Messaging app integration.
- Complex notification delivery.
- Production-grade permissions.
- Advanced audit/compliance.
- Large UI framework migration.
- Multi-tenant hosting.
