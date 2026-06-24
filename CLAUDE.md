# Education ERP / CRM — Project Handoff & Context

**Company:** Advance Educonsultancy (Pvt) Ltd.
**Last updated:** End of session, June 24, 2026
**Repo:** `github.com/research-arahman/edu-erp` (branch `main`)
**Owner:** Abdur Rahman

> **Purpose of this file.** This is the single authoritative document to resume the project in a new conversation. It merges the project context with the full build-state handoff. Keep it in the repo root. **Claude CLI reads `CLAUDE.md` automatically every session** — when the system changes, update this file and `HANDOFF.md` together.

---

## 1. Project Overview & Goal

A centralized **CRM + ERP** for an education consultancy — **Advance Educonsultancy (Pvt) Ltd.** — guiding **Bangladeshi students and job-seekers** toward global destinations. The system runs **two parallel service tracks** sharing one unified, secured database:

- **Education track** — students applying to 30–40 global destinations (UK, Japan, US, Canada, Australia, Germany, Ireland, Turkey, Malaysia, and more) for Bachelor's, Master's, PhD, diploma, and language programs.
- **Employment track** — job-seekers (candidates) placed into work abroad, beginning with **Japan SSW (Specified Skilled Worker)** jobs, planned to expand to Europe and beyond.

It functions primarily as a CRM (inquiry → pipeline → placement) and also as an ERP (accounting, tasks, roles, reporting). Core features: inquiry tracker, application pipelines, document storage (planned Google Drive API), role-based access control, a **cascading destination selector** (the signature feature), reusable **admission-process templates**, a visual roadmap, accounting with a full chart of accounts, and task management.

---

## 2. Full Tech Stack & Versions

| Layer | Technology | Notes |
|---|---|---|
| Database + Auth | **Supabase** (Postgres + RLS + Auth + Storage) | Project ref `fhzjizgsxlowjxzocasj`, region Oceania (Sydney) |
| Supabase CLI | **2.106.0** | Installed via Homebrew |
| Backend | **FastAPI** (Python) | All routes mounted under `/api` prefix |
| Python | **3.11** (conda `base` / mambaforge `py311`) | venv lives in `backend/venv` |
| Key Python pkgs | `fastapi`, `uvicorn[standard]`, `supabase`, `python-dotenv`, `google-api-python-client`, `google-auth`, `pydantic` | frozen in `backend/requirements.txt` |
| Frontend | **React + Vite** | Vite v8.x; dev server on `localhost:5173` |
| Styling | **Tailwind CSS** | configured for Vite |
| Routing | **react-router-dom** | React Router owns all non-`/api` paths |
| Source control | **Git / GitHub** | `research-arahman/edu-erp` |
| AI build tool | **Claude Code (Claude CLI)** | Sonnet model, used for bulk code generation |
| Deployment (planned) | **Render** | backend web service + frontend static site — NOT deployed yet |
| Docs storage (planned) | **Google Drive API** (service account) | NOT integrated yet |

---

## 3. Folder / File Structure

```
edu-erp/
├── .gitignore                 # ignores venv, node_modules, .env, service-account.json, etc.
├── README.md
├── CLAUDE.md                  # context file Claude CLI reads every session (KEEP UPDATED)
├── HANDOFF.md                 # standalone paste-in handoff doc (keep in sync with CLAUDE.md)
├── supabase/
│   ├── config.toml
│   └── migrations/            # all schema, applied in timestamp order
│       ├── *_create_enums.sql
│       ├── *_create_countries_institutes.sql
│       ├── *_create_programs.sql
│       ├── *_create_students.sql
│       ├── *_add_staff_roles.sql
│       ├── *_create_profiles.sql
│       ├── *_add_rls_policies.sql
│       ├── *_create_inquiries.sql
│       ├── *_create_applications.sql
│       ├── *_create_activity_log.sql
│       ├── *_create_journey.sql
│       ├── *_create_accounting.sql
│       ├── *_create_tasks.sql
│       ├── *_create_ssw_reference.sql
│       ├── *_create_employers.sql
│       ├── *_create_jobs.sql
│       ├── *_create_candidates.sql
│       ├── *_create_job_applications.sql
│       ├── *_create_admission_templates.sql
│       └── *_add_program_requirements.sql
├── backend/
│   ├── venv/                  # Python virtual environment (gitignored)
│   ├── requirements.txt
│   ├── .env                   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (gitignored)
│   ├── seeds/
│   │   └── seed_countries.py  # idempotent country seeder (already run)
│   └── app/
│       ├── __init__.py
│       ├── config.py          # loads env vars
│       ├── database.py        # Supabase client (service role key)
│       ├── main.py            # FastAPI app, CORS, mounts all routers under /api
│       ├── schemas.py         # Pydantic models (USE float, NEVER Decimal)
│       └── routers/
│           ├── __init__.py
│           ├── countries.py
│           ├── institutes.py
│           ├── programs.py            # programs + sessions sub-resource
│           ├── industries.py          # industry_fields CRUD + ?country_id= filter
│           ├── employers.py           # employers CRUD + ?country_id=&industry_field_id= filter
│           ├── jobs.py                # jobs CRUD + ?employer_id= filter; qual-types read-only list
│           ├── students.py            # students CRUD (core profile only; auth fields omitted)
│           ├── candidates.py          # candidates CRUD (core profile only; auth fields omitted)
│           ├── selector_education.py  # cascading selector (education chain) — read-only
│           ├── selector_employment.py # cascading selector (employment chain) — read-only
│           └── admission_templates.py # templates + steps sub-resource
└── frontend/
    ├── package.json
    ├── vite.config.js         # single /api proxy rule → http://127.0.0.1:8000
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx            # routes, wrapped in Layout
        ├── index.css          # Tailwind directives
        ├── lib/
        │   └── api.js         # fetch wrapper, base path '/api'
        ├── components/
        │   ├── Layout.jsx           # sidebar nav + header + <Outlet/> ("Destination Explorer" link added)
        │   ├── EducationSelector.jsx  # reusable cascading education selector (saves target_*)
        │   ├── EmploymentSelector.jsx # reusable cascading employment selector (saves target_*)
        │   └── AdmissionRoadmap.jsx   # read-only roadmap from admission template steps
        └── pages/
            ├── Dashboard.jsx          # placeholder
            ├── Countries.jsx          # working (lists 39 countries)
            ├── Institutes.jsx         # working (full CRUD)
            ├── Programs.jsx           # working (CRUD + requirements + sessions)
            ├── AdmissionTemplates.jsx # working (templates + ordered steps)
            ├── Industries.jsx         # working (full CRUD over industry_fields)
            ├── Employers.jsx          # working (full CRUD, country + industry dropdowns)
            ├── Jobs.jsx               # working (full CRUD, qual-type requirement dropdowns)
            ├── DestinationExplorer.jsx # working (standalone read-only cascading selector, both tracks)
            ├── Students.jsx           # working (core profile + embedded EducationSelector + AdmissionRoadmap)
            ├── Candidates.jsx         # working (core profile + embedded EmploymentSelector + Placement Roadmap placeholder)
            ├── Applications.jsx       # placeholder
            ├── JobApplications.jsx    # placeholder
            ├── Inquiries.jsx          # placeholder
            ├── Tasks.jsx              # placeholder
            └── Accounting.jsx         # placeholder
```

---

## 4. What's Built & Working So Far

### Backend (FastAPI)
- App skeleton with CORS; root `GET /` and `GET /health` (health checks Supabase by counting countries).
- **All routes mounted under `/api`** (e.g. `/api/countries`, `/api/programs`).
- Working routers:
  - **countries** (CRUD)
  - **institutes** (CRUD)
  - **programs** (CRUD + sessions sub-resource)
  - **industries** (CRUD over `industry_fields`, `?country_id=` filter)
  - **employers** (CRUD, `?country_id=&industry_field_id=` filter)
  - **jobs** (CRUD, `?employer_id=` filter; includes read-only `GET /qualification-types` for requirement dropdowns)
  - **students** (CRUD — core profile fields only; `assigned_counselor` / `created_by` deliberately omitted until auth is wired)
  - **candidates** (CRUD — core profile fields only; same auth-field omission)
  - **selector_education** (read-only cascading chain)
  - **selector_employment** (read-only cascading chain)
  - **admission_templates** (CRUD + steps sub-resource)

### Frontend (React + Vite + Tailwind)
- App shell: sidebar with grouped nav (Dashboard, Education, Employment, Data, Operations), header, routed content area. "Destination Explorer" link added near the top.
- **Working pages:**
  - **Countries** — lists 39 countries
  - **Institutes** — full CRUD
  - **Programs** — full CRUD + requirement dropdowns + sessions
  - **Admission Templates** — full CRUD + ordered steps with free-text timeframes
  - **Industries** — full CRUD over `industry_fields`
  - **Employers** — full CRUD with country + industry dropdowns; SSW fields
  - **Jobs** — full CRUD with employer dropdown + structured SSW language/skills requirement dropdowns from `qualification_types`
  - **Destination Explorer** — standalone read-only cascading selector for both tracks, toggled via Education/Employment switch; wired to `/selector/education/*` and `/selector/employment/*`
  - **Students** — core profile form + embedded `EducationSelector` that saves `target_*` fields + read-only `AdmissionRoadmap`
  - **Candidates** — core profile form + embedded `EmploymentSelector` that saves `target_*` fields + "Placement Roadmap" placeholder
- **Reusable components:** `EducationSelector.jsx`, `EmploymentSelector.jsx`, `AdmissionRoadmap.jsx`
- API client (`api.js`) talks to `/api`; Vite proxy forwards `/api` → backend.
- Verified end-to-end: browser → API → Supabase → browser.

### Data entered so far
- **39 countries** seeded (authentic ISO codes + currencies).
- At least one real institute (**Yamaguchi University**), one program (**MOT / Master's**), and one admission template (**Japan Master's (Research)** with steps).

### Proven milestones
- Full create/read/update/delete cycle working through the UI for all C3 pages.
- Cascading Destination Explorer (C4) working for both tracks.
- Students and Candidates core profiles saving, with selectors writing `target_*` fields and the education roadmap displaying template steps.

---

## 5. Database Schema / State

**Supabase project:** `fhzjizgsxlowjxzocasj` (Oceania / Sydney). Linked via CLI. Migrations pushed with `supabase db push`. New API keys format in use: **publishable key** = `SUPABASE_ANON_KEY`, **secret key** = `SUPABASE_SERVICE_ROLE_KEY` (the secret was rotated after accidental exposure).

### Enums
- `user_role`: `owner`, `manager`, `counselor`, `student`, `team_leader`, `staff`, `accountant` (+ legacy values)
- `prog_level`: `bachelors`, `masters`, `phd`, `language`
- `app_stage`: `inquiry → profile_assessment → shortlisting → document_collection → application_submitted → offer_received → visa_processing → enrolled`
- `job_stage`: `applied → screening → interview → offer → coe_processing → visa_processing → placed`

### Tables (all have RLS enabled)

**Education / core**
- `countries` (39 rows) — name, iso_code, region, currency, is_active
- `institutes` — university / language_school / diploma; ownership; city; living-expense; dormitory; services (UUID id, country_id is INT)
- `programs` — level_category, level_label, department, course_name, costs, duration; **+ requirement fields: `language_test_accepted` (text), `min_language_level` (text), `moi_accepted` (bool)** (UUID id, institute_id is UUID)
- `program_sessions` — session_name, start_date, application_deadline, seats, is_open (5-field set)
- `admission_requirements` — per-program checklist template items
- `students` — full profile (passport, income, supporter, academic/career, purpose, target_country/institute/program/session, status). Status values: **active / archived / enrolled / dropped**. `assigned_counselor` and `created_by` FK to `auth.users` exist in the table but are NOT sent from the API until auth is wired.
- `inquiries` — lead tracker (new → contacted → qualified → converted/lost)
- `applications` + `application_checklist` — 8-stage education pipeline
- `journey_stages` (8 seeded) + `student_journey` — visual roadmap (progress tracking per student; NOT yet wired in the UI)
- `admission_templates` — **one row per (country_id INT + level_category text), UNIQUE on the pair**; reusable admission process
- `admission_steps` — ordered steps per template (step_order, title, description, **free-text** timeframe). **id and template_id are UUIDs.**

**Employment / SSW**
- `industry_fields` — Japan's 16 SSW fields seeded (country-scoped, is_ssw flag); INT id
- `qualification_types` — JLPT, JFT-Basic, SSW Skills Test seeded; has `levels[]` array; INT id
- `employers` — company database (UUID id, country_id INT, industry_field_id INT, is_ssw_registered, housing_support, contact fields)
- `jobs` — openings (structured requirements via `req_language_qual_id` + `req_language_level`, `req_skills_qual_id`; salary range; start_period; positions_available)
- `candidates` — job-seeker profile (work experience, structured language/skills proficiency, target chain, status). Status values: **active / archived / placed / dropped** (note: "placed", not "enrolled"). `assigned_counselor` and `created_by` FK to `auth.users` exist in the table but are NOT sent from the API until auth is wired.
- `job_applications` + `job_application_checklist` — employment pipeline (job_stage enum)

**Shared / ops**
- `profiles` — extends `auth.users`; role / position / team / team_leader_id; auto-created via trigger on signup
- `activity_log` — **immutable** audit trail (insert + select only; no update/delete, not even for managers)
- `accounts` — chart of accounts seeded **1000–6400** (assets, liabilities, equity, revenue, COGS, opex)
- `transactions` — gateway-ready (Stripe/PayPal fields nullable until registered)
- `investments`, `commissions` — consultant commission foundation
- `daily_task_templates`, `tasks`, `notifications` — task management

### Target chain field types
- **Students:** `target_country_id` → INT; `target_institute_id` / `target_program_id` / `target_session_id` → UUID (str)
- **Candidates:** `target_country_id` → INT; `target_industry_id` → INT; `target_employer_id` / `target_job_id` → UUID (str); `target_start_period` → text

### RLS helper functions
- `current_user_role()` — reads role from profiles
- `can_delete()` — true only for `owner` + `manager`
- `can_view_accounting()` — `owner` + `manager` + `accountant` only (accounting is restricted)
- `can_manage_tasks()` — `owner` + `manager` + `team_leader`

### Known security note (deferred)
Backend currently connects with the **service-role key**, which **bypasses RLS**. So the API does not yet enforce who can delete — the DB rules exist but the backend acts as admin. This is fine while solo; **JWT auth + routing deletes through role checks is a required step before real staff log in.**

---

## 6. Exact Terminal Setup

Three terminals, each with one job. **Project root:**
`~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`

**Terminal 1 — Backend** (from `backend/`, venv active):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp/backend
source venv/bin/activate
uvicorn app.main:app --reload --reload-dir app
```
Leave running. **Never run `npm` here.** Wait for "Application startup complete."

**Terminal 2 — Frontend** (from `frontend/`):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp/frontend
npm run dev
```
Leave running. **Never run `uvicorn` here.** Wait for the `localhost:5173` line.

**Terminal 3 — Working terminal** (from `edu-erp/` root): for `git`, `supabase`, and launching `claude`.

**Health check:** `curl http://127.0.0.1:8000/api/countries` should return 39 countries; `localhost:5173` should show the app.

**Important reload notes:**
- `vite.config.js` changes require restarting Vite (Ctrl+C, then `npm run dev`).
- `--reload-dir app` keeps uvicorn from watching `venv` (avoids constant restart spam).
- SQL/code goes in the **VS Code editor**, never pasted into the terminal. If a terminal prompt becomes `quote>`/`dquote>`, press Ctrl+C and run commands one line at a time.

---

## 7. The Signature Feature — Cascading Destination Selectors

Data-driven dependent dropdowns that show **ONLY data that exists** (never generic/hardcoded options). Backend selector endpoints exist for both tracks; the **UI (C4) is DONE** as `DestinationExplorer.jsx` and as embedded components in Students/Candidates.

**Education chain:**
```
Country → institute type (university / language_school / diploma)
  → University path: ownership → degree level → department → course → session
  → Language path:   level_category (jlpt/english/topik...) → level_label
                     (N5, IELTS Prep...) → school → session
```
Each completed selection feeds the student's `target_*` fields and the visual roadmap (via `AdmissionRoadmap.jsx`).

**Employment chain (parallel):**
```
Country → Industry/SSW field → Employer → Job position → start period
```
Feeds `candidate.target_*` fields and (later) a full Placement Roadmap. Mirrors the education pattern.

**Selector re-fetch behavior (important):** On edit, the selectors must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.

---

## 8. Admission Process Templates (reusable, per country + study level)

The admission **process** varies by country **and** study level (e.g. Japan Master's requires finding a professor first; Western Master's applies to a central admissions committee). Modeled as **reusable templates, NOT per-program**:

- `admission_templates` — one row per `(country_id + level_category)`, **UNIQUE** on the pair. `level_category` matches `programs.level_category` (bachelors/masters/phd/diploma/jlpt/english/...).
- `admission_steps` — ordered steps for a template (`step_order`, `title`, `description`, `timeframe`). **`timeframe` is FREE TEXT** (e.g. "3 months before deadline") — never assume a structured date.
- A program inherits the template matching its country + level_category. When a student is on a program, their roadmap (`AdmissionRoadmap.jsx`) surfaces that template's steps.
- Programs themselves hold **requirements** (`language_test_accepted`, `min_language_level`, `moi_accepted`), **not** the process steps.

**Level dropdown (templates & programs):** Bachelor's, Master's, PhD, Diploma, Foundation/Pathway, JLPT (Japanese), English, TOPIK (Korean), Other.

**Employment-track process templates (NOT yet built):** the employment side needs its **own parallel process-template concept keyed by country + industry/SSW field** (not study level). The candidate "Placement Roadmap" is currently a placeholder. Build when doing the employment roadmap.

---

## 9. Remaining Build Chunks

### Completed
- ✅ **C3 — All data-entry pages:** Institutes, Programs (requirements + sessions), Admission Templates, Industries, Employers, Jobs — all full CRUD and working.
- ✅ **C4 — Cascading Destination Explorer** (both tracks, standalone + embedded in Students/Candidates).
- ✅ **C5 core — Students & Candidates pages:** core profile forms + embedded selectors saving `target_*` + `AdmissionRoadmap` display for students; Placement Roadmap placeholder for candidates.

### Remaining (in order)

1. **Per-student roadmap progress tracking** — wire `student_journey` table to the `AdmissionRoadmap.jsx` component so each student can tick off/complete individual steps (currently the roadmap only displays the template read-only). User specifically wants this.

2. **Profile enrichment pass** — add the full set of profile fields to the forms:
   - Students: passport details, income/funding, supporter/sponsor, academic history, career goals, purpose statement
   - Candidates: passport details, income, work history, language proficiency (structured), skills proficiency (structured)

3. **Employment process templates + Candidate Placement Roadmap** — build the country + industry keyed process-template concept (parallel to admission_templates) and wire it into the Candidates page to replace the placeholder.

4. **Inquiries UI** — lead tracking page (new → contacted → qualified → converted/lost).

5. **Applications + Job Applications pipeline UI** — Kanban-style stage boards using `app_stage` / `job_stage` enums.

6. **Tasks UI, Accounting UI, Dashboards.**

7. **Authentication + RBAC enforcement** — currently backend uses the service key and bypasses RLS entirely; deletes are not role-gated at the API layer. Wire Supabase Auth, issue JWTs, and route the backend through authenticated sessions so RLS actually enforces per-user access. **Critical before any real staff log in.**

8. **Google Drive document integration** (service-account approach), then **Render deployment**.

---

## 10. Key Decisions & Conventions (DO NOT VIOLATE)

1. **One step at a time.** Small, single-task chunks. Finish, confirm "done", then next. When the user says "done"/"next", assume the prior step worked.
2. **Terminal vs editor:** SQL and code go in the **VS Code editor**, never pasted into the terminal. Commands go in the terminal.
3. **UUID vs INT — the recurring trap.** Several tables use **UUID** primary keys (institutes, programs, employers, candidates, students, admission_templates, admission_steps, jobs, etc.); reference/lookup tables use **INT** (countries, industry_fields, qualification_types, accounts). Backend path params and schema FK types **must match** (UUID → `str`, INT → `int`). This bug bit `institute_id`, `template_id`, and `program_id`. Always check FK types before writing a new router or schema.
4. **Money fields: use `float`, NEVER `Decimal`.** `Decimal` is not JSON-serializable and crashed the institutes POST. Store **amount + currency, default BDT, never hardcode FX rates**. All numeric/money fields are `float` in Pydantic schemas.
5. **API under `/api` prefix.** All backend routes are mounted under `/api`; the Vite proxy has a **single** `/api` rule. React Router owns all other paths. New endpoints are auto-covered — no proxy edits needed.
6. **RLS pattern for every table:** select/insert/update for `authenticated`; **delete via `can_delete()`** (owner + manager only). Accounting tables restricted via `can_view_accounting()`. Activity log is immutable (insert + select only). Task management for others via `can_manage_tasks()`.
7. **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign), so the audit trail and manager/owner reports stay complete.
8. **Roles vs job titles.** Permission tiers live in the `user_role` enum (owner > manager > team_leader > staff/accountant > student). Job titles (Business Developer, Marketing Officer, Admission Officer, Application Officer, Counselor, Language Instructor) live in `profiles.position`; teams in `profiles.team`; reporting in `profiles.team_leader_id`. **team_leader CANNOT delete.**
9. **Reusable admission templates**, not per-program steps — keyed by (country + study level), with free-text timeframes (flexible across 40 countries; no assumed structured dates).
10. **Authentic data only.** Stable/verifiable reference data (country names, ISO codes, currencies, the 16 official SSW fields) may be seeded. **Volatile data — tuition, rankings, intake dates, real employer names, live jobs — is NEVER guessed/auto-seeded;** the user enters it from real sources.
11. **Keep the two tracks parallel and consistent** (routers, schemas, frontend components) so education and employment never tangle.
12. **`CLAUDE.md` is the source of truth** Claude CLI reads each session. Update it (and `HANDOFF.md`) whenever the system expands so generated code stays consistent.
13. **Commit after each working milestone** with a clear message, and push. Secrets stay out of Git (`.env`, `service-account.json` are gitignored).
14. **`assigned_counselor` and `created_by` on students/candidates FK to `auth.users`, which is EMPTY** (we run solo via service key). These fields are deliberately **omitted** from student and candidate create/update schemas and forms. Do not send them. They will be wired when authentication is added.
15. **Status values differ between tracks.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed", not "enrolled").
16. **Target chain field types must be respected.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing UUID and INT on these will silently fail.
17. **Student/Candidate profiles are CORE ONLY so far.** Passport, income, supporter/sponsor, academic fields (students) and passport, income, work history, language/skills proficiency (candidates) exist in the DB tables but are NOT yet in the forms. The enrichment pass (remaining chunk #2) adds them.

---

## 11. Immediate Next Step

**Remaining chunk #1 — Per-student progress tracking on the Admission Roadmap.**

The `student_journey` table and `journey_stages` (8 seeded rows) are already in the DB. The `AdmissionRoadmap.jsx` component currently displays the admission template steps read-only. The next task is to let each student tick off / mark steps complete:

1. Add a `GET /students/{id}/journey` endpoint and a `POST/PATCH /students/{id}/journey/{stage_id}` endpoint (or equivalent) that reads/writes `student_journey`.
2. Update `AdmissionRoadmap.jsx` to fetch the student's current journey state and render each step as checkable, persisting progress back to the API.
3. Test: open a student, advance a step, confirm it saves and reloads correctly.
4. Commit with message: `"Add per-student roadmap progress tracking (student_journey)"`

**After that:** Profile enrichment pass (remaining chunk #2), then employment process templates + Placement Roadmap (chunk #3).

---

*Snapshot as of June 24, 2026. As building continues this will drift — regenerate it at the next milestone rather than relying on it weeks later. Remember to also keep `HANDOFF.md` in sync.*
