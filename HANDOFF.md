# Education ERP / CRM — Project Handoff Document

> **Purpose of this file:** Paste this into a new conversation to continue building the Education ERP / CRM without losing context. It captures the project goal, full stack, what's built, the database state, exact terminal commands, remaining work, and the agreed conventions. Self-contained — assume the new assistant knows nothing else.

**Owner:** Mohd Abdur Rahman
**GitHub:** `research-arahman/edu-erp` (branch `main`)
**Local path:** `~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`
**Last updated:** End of session, June 24, 2026
**Working style:** One small task at a time. Wait for "done" before moving on. SQL goes in the editor, never pasted into the terminal. Commit after each working chunk.

---

## 1. Project Overview & Goal

A centralized **Education ERP that works primarily as a CRM**, for an education + job-placement consultancy ("Advance Educonsultancy Pvt. Ltd.") serving **Bangladeshi students and job-seekers** applying to **30–40 global destinations** (UK, Japan, US, Canada, Australia, Germany, Ireland, Turkey, Malaysia, and more).

The system runs **two parallel service tracks** that share infrastructure (staff profiles, documents, tasks, accounting, audit log):

1. **Education track** — students applying for Bachelor's, Master's, PhD, Diploma, and language programs (JLPT, English, TOPIK).
2. **Employment track** — job-seekers ("candidates"), especially **Japan SSW** (Specified Skilled Worker), expanding later to Europe and beyond.

**Signature feature:** a data-driven **cascading selector** (Country → type → level → institute/employer → program/job → session), showing only data that actually exists — never generic options. **This is fully built and working** (C4 complete).

**Other core modules:** inquiry tracker, application pipelines, document storage (Google Drive API, planned), role-based access control, a visual roadmap of each applicant's journey, an institute/employer database with fees, an accounting module (full chart of accounts), task management, and a student/candidate portal (planned).

**Key architectural insight:** the *admission process itself* (steps + timeframes) varies by **country × study level** — e.g. Japan Master's requires finding a professor first; Western Master's applies to a central committee. Modeled as **reusable templates**, not per-program data.

---

## 2. Full Tech Stack & Versions

| Layer | Technology | Version / notes |
|---|---|---|
| Database + Auth | **Supabase** (Postgres + Row-Level Security + Storage) | CLI v2.106.0; project ref `fhzjizgsxlowjxzocasj`, region Oceania (Sydney) |
| Backend | **FastAPI** (Python) | fastapi 0.137.1, uvicorn 0.49.0, supabase-py 2.31.0, pydantic 2.13.4, python-dotenv 1.2.2, google-api-python-client 2.197.0 |
| Python | CPython | 3.11 (venv at `backend/venv`) |
| Frontend | **React + Vite + Tailwind** | Vite 8.0.16, react-router-dom 7.18.0 |
| Source control | **Git / GitHub** | repo `research-arahman/edu-erp` |
| Agentic coding | **Claude Code (CLI)** | Sonnet model, used inside the repo for bulk code |
| Hosting (planned) | **Render** | not yet deployed |
| Documents (planned) | **Google Drive API** | service-account approach, not yet wired |
| Dev OS | macOS (zsh, conda `base` active, Homebrew) | — |

**Supabase keys** live in `backend/.env` (gitignored):
```
SUPABASE_URL=https://fhzjizgsxlowjxzocasj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   (rotated; backend only — bypasses RLS)
SUPABASE_ANON_KEY=sb_publishable_...       (safe for frontend)
```
Note: the new Supabase key format is **publishable = anon**, **secret = service_role**.

---

## 3. Folder / File Structure

```
edu-erp/
├── CLAUDE.md                      # context file Claude CLI reads every session (KEEP UPDATED)
├── HANDOFF.md                     # this document — keep in sync with CLAUDE.md
├── README.md
├── .gitignore                     # ignores .env, venv/, node_modules/, service-account.json
├── backend/
│   ├── .env                       # Supabase keys (gitignored)
│   ├── requirements.txt
│   ├── venv/                      # Python 3.11 virtualenv (gitignored)
│   ├── seeds/
│   │   └── seed_countries.py      # idempotent country seeder (already run → 39 countries)
│   └── app/
│       ├── __init__.py
│       ├── config.py              # loads SUPABASE_* env vars
│       ├── database.py            # supabase client (service-role key)
│       ├── main.py                # FastAPI app; CORS; all routers mounted under /api prefix
│       ├── schemas.py             # Pydantic models — money fields = float, never Decimal
│       └── routers/
│           ├── __init__.py
│           ├── countries.py       # CRUD
│           ├── institutes.py      # CRUD + ?country_id=&type= filter
│           ├── programs.py        # CRUD + sessions sub-resource
│           ├── admission_templates.py  # CRUD + steps sub-resource
│           ├── industries.py      # CRUD over industry_fields + ?country_id= filter
│           ├── employers.py       # CRUD + ?country_id=&industry_field_id= filter
│           ├── jobs.py            # CRUD + ?employer_id=; GET /qualification-types read-only
│           ├── students.py        # CRUD — core profile; auth fields (assigned_counselor, created_by) omitted
│           ├── candidates.py      # CRUD — core profile; auth fields omitted
│           ├── selector_education.py   # read-only cascading selector endpoints (education chain)
│           └── selector_employment.py  # read-only cascading selector endpoints (employment chain)
├── frontend/
│   ├── vite.config.js             # proxy: '/api' → http://127.0.0.1:8000 (single clean rule)
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # BrowserRouter + all routes, wrapped in <Layout>
│       ├── index.css              # Tailwind
│       ├── lib/
│       │   └── api.js             # fetch wrapper; BASE_URL = (VITE_API_URL ?? '') + '/api'
│       ├── components/
│       │   ├── Layout.jsx               # sidebar nav (Education/Employment/Data/Operations + Destination Explorer) + header
│       │   ├── EducationSelector.jsx    # reusable cascading education selector; saves target_* on student
│       │   ├── EmploymentSelector.jsx   # reusable cascading employment selector; saves target_* on candidate
│       │   └── AdmissionRoadmap.jsx     # read-only display of admission template steps for a student
│       └── pages/
│           ├── Dashboard.jsx            # placeholder
│           ├── Countries.jsx            # WORKING (list)
│           ├── Institutes.jsx           # WORKING (full CRUD)
│           ├── Programs.jsx             # WORKING (full CRUD + requirement dropdowns + sessions)
│           ├── AdmissionTemplates.jsx   # WORKING (full CRUD + ordered steps)
│           ├── Industries.jsx           # WORKING (full CRUD over industry_fields)
│           ├── Employers.jsx            # WORKING (full CRUD, country + industry dropdowns)
│           ├── Jobs.jsx                 # WORKING (full CRUD, qual-type requirement dropdowns)
│           ├── DestinationExplorer.jsx  # WORKING (standalone read-only cascading selector, both tracks)
│           ├── Students.jsx             # WORKING (core profile + EducationSelector saving target_* + AdmissionRoadmap)
│           ├── Candidates.jsx           # WORKING (core profile + EmploymentSelector saving target_* + Placement Roadmap placeholder)
│           ├── Applications.jsx         # placeholder
│           ├── JobApplications.jsx      # placeholder
│           ├── Inquiries.jsx            # placeholder
│           ├── Tasks.jsx                # placeholder
│           └── Accounting.jsx           # placeholder
└── supabase/
    ├── config.toml
    └── migrations/                # ~20 timestamped .sql migrations (all pushed to cloud)
```

---

## 4. What's Built & Working So Far

**Database (Supabase cloud):** complete — all tables created, all RLS policies applied, all migrations pushed. (Full list in §5.)

**Backend (FastAPI):** running locally, talks to Supabase. All endpoints under `/api`:
- `GET /` and `GET /health`
- **Countries** CRUD
- **Institutes** CRUD (+ filters)
- **Programs** CRUD + program sessions sub-resource
- **Admission Templates** CRUD + admission steps sub-resource
- **Industries** CRUD over `industry_fields` (+ `?country_id=` filter)
- **Employers** CRUD (+ `?country_id=&industry_field_id=` filters)
- **Jobs** CRUD (+ `?employer_id=` filter); `GET /qualification-types` (read-only list)
- **Students** CRUD — core profile fields only (`assigned_counselor`/`created_by` deliberately omitted)
- **Candidates** CRUD — core profile fields only (same omission)
- **Cascading selector endpoints** — education + employment chains (read-only, return [] until data exists)

**Frontend (React):** running locally at `localhost:5173`. Fully working pages:
- **Countries** — lists all 39
- **Institutes** — full CRUD
- **Programs** — full CRUD + requirement dropdowns + sessions
- **Admission Templates** — full CRUD + ordered steps with free-text timeframes
- **Industries** — full CRUD over `industry_fields`
- **Employers** — full CRUD; country + industry field dropdowns
- **Jobs** — full CRUD; employer dropdown + structured SSW language/skills requirement dropdowns from `qualification_types`
- **Destination Explorer** — standalone read-only cascading selector for both tracks; Education/Employment toggle; wired to `/selector/education/*` and `/selector/employment/*`
- **Students** — core profile + embedded `EducationSelector` saving `target_*` + `AdmissionRoadmap` (read-only template steps)
- **Candidates** — core profile + embedded `EmploymentSelector` saving `target_*` + Placement Roadmap placeholder

**Reusable components:** `EducationSelector.jsx`, `EmploymentSelector.jsx`, `AdmissionRoadmap.jsx`

**Source control:** everything committed and pushed to GitHub.

---

## 5. Database Schema / State

**Supabase project:** `edu-erp`, ref `fhzjizgsxlowjxzocasj`, region Oceania (Sydney). CLI linked locally.

**Enums:**
- `user_role`: owner, manager, counselor, student, team_leader, staff, accountant
- `prog_level`: bachelors, masters, phd, language
- `app_stage`: inquiry → profile_assessment → shortlisting → document_collection → application_submitted → offer_received → visa_processing → enrolled
- `job_stage`: applied → screening → interview → offer → coe_processing → visa_processing → placed

**Tables (all have RLS):**

*Education / core CRM:*
- `countries` (int PK) — **39 rows seeded** (name, iso_code, region, currency). Japan = id 1.
- `institutes` (uuid PK) — type: university/language_school/diploma; ownership; living expense; dormitory; services
- `programs` (uuid PK) — `institute_id` (uuid FK), level_category, level_label, department, course_name, fees, currency, duration_months; + requirement fields: `language_test_accepted` (text), `min_language_level` (text), `moi_accepted` (bool)
- `program_sessions` (uuid PK) — intakes per program
- `admission_requirements` (uuid PK) — requirement checklist per program
- `students` (uuid PK) — full profile: passport, income, supporter/sponsor, academic/career, purpose, target_country/institute/program/session (see target types in §8), status. Status values: **active / archived / enrolled / dropped**. `assigned_counselor` + `created_by` FK to `auth.users` — **deliberately omitted from API** until auth is wired.
- `inquiries` (uuid PK) — lead tracker: new → contacted → qualified → converted/lost
- `applications` + `application_checklist` (uuid PK) — 8-stage pipeline via `app_stage`
- `journey_stages` (8 seeded rows) + `student_journey` — visual roadmap; per-student progress tracking NOT yet wired in UI
- `admission_templates` (uuid PK) — **reusable per (country_id INT + level_category text), UNIQUE on pair**; name, description
- `admission_steps` (uuid PK) — ordered steps: step_order, title, description, **timeframe (FREE TEXT)**

*Staff & access:*
- `profiles` (uuid PK, references `auth.users`) — role, **position** (job title), **team**, **team_leader_id** (self-ref)
- `activity_log` — immutable audit trail (insert+select only, NO update/delete)

*Employment / SSW track:*
- `industry_fields` (int PK) — **Japan's 16 SSW fields seeded** (country-scoped, is_ssw flag)
- `qualification_types` (int PK) — **JLPT, JFT-Basic, SSW Skills Test seeded**; has `levels[]` array
- `employers` (uuid PK) — company DB; country_id (int), industry_field_id (int), is_ssw_registered, housing_support, contact person
- `jobs` (uuid PK) — openings; structured requirements (req_language_qual_id + req_language_level, req_skills_qual_id), salary, start_period, positions_available
- `candidates` (uuid PK) — job-seeker profile (parallel to students). Status values: **active / archived / placed / dropped** (note: "placed" not "enrolled"). `assigned_counselor` + `created_by` FK to `auth.users` — **deliberately omitted from API** until auth is wired.
- `job_applications` + `job_application_checklist` — employment pipeline via `job_stage`

*Accounting (sensitive — owner/manager/accountant only via `can_view_accounting()`):*
- `accounts` (int code PK) — **full chart of accounts seeded, codes 1000–6400**
- `transactions` — gateway-ready (Stripe/PayPal fields nullable); debit/credit
- `investments`, `commissions` — capital + consultant commission tracking

*Task management:*
- `daily_task_templates`, `tasks`, `notifications`

**RLS pattern:** authenticated users can SELECT/INSERT/UPDATE; DELETE only via `can_delete()` (owner or manager). Helper functions: `current_user_role()`, `can_delete()`, `can_view_accounting()`, `can_manage_tasks()`.

---

## 6. Exact Terminal Setup

Three terminals, each with one job. **Never run `npm` in the backend folder or `uvicorn` in the frontend folder.**

**Terminal 1 — Backend** (FastAPI):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp/backend
source venv/bin/activate
uvicorn app.main:app --reload --reload-dir app
```
Wait for "Application startup complete." Leave running. (`--reload-dir app` prevents it watching venv.)

**Terminal 2 — Frontend** (Vite):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp/frontend
npm run dev
```
Wait for the `localhost:5173` line. Leave running. **Restart this whenever `vite.config.js` changes.**

**Terminal 3 — Working terminal** (git, supabase, Claude CLI):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp
```

**Health check:** `curl http://127.0.0.1:8000/api/countries` → 39 countries; `http://localhost:5173` → app loads.

**Database migration workflow:**
```bash
supabase migration new <name>
code supabase/migrations/*_<name>.sql    # edit in VS Code, never paste SQL in terminal
supabase db push                          # confirm with Y
git add . && git commit -m "..." && git push
```

---

## 7. Remaining Work (in order)

1. **Per-student roadmap progress tracking** — wire `student_journey` table so each student can tick off steps in `AdmissionRoadmap.jsx`. Currently the roadmap only shows the template read-only. **User specifically wants this next.**

2. **Profile enrichment pass** — add the full profile fields to the forms:
   - Students: passport, income/funding, supporter/sponsor, academic history, career goals, purpose statement
   - Candidates: passport, income, work history, language proficiency (structured), skills proficiency (structured)

3. **Employment process templates + Candidate Placement Roadmap** — build the country + industry keyed process-template concept (parallel to `admission_templates`) and wire it into the Candidates page.

4. **Inquiries UI** — lead tracker (new → contacted → qualified → converted/lost).

5. **Applications + Job Applications pipeline UI** — Kanban-style stage boards using `app_stage` / `job_stage` enums.

6. **Tasks UI, Accounting UI, Dashboards.**

7. **Authentication + RBAC enforcement** — currently backend uses service key and bypasses RLS entirely. Wire Supabase Auth + JWT so RLS actually enforces per-user access. **Critical before any real staff log in.**

8. **Google Drive document integration** (service-account), then **Render deployment**.

---

## 8. Key Decisions & Conventions

- **One step at a time.** Finish, confirm "done", then next.
- **Terminal vs editor:** SQL and code go in the VS Code editor, never pasted into the terminal.
- **UUID vs INT — the recurring trap.** UUID PKs: institutes, programs, employers, candidates, students, jobs, admission_templates, admission_steps. INT PKs: countries, industry_fields, qualification_types, accounts. FK types in routers/schemas must match. This bug bit `institute_id`, `template_id`, `program_id` — always check before writing a new router.
- **Money fields: `float`, NEVER `Decimal`.** Decimal is not JSON-serializable (caused an early crash).
- **API under `/api` prefix.** All backend routes mounted under `/api`; Vite proxy has a single `/api` rule. React Router owns everything else.
- **RLS pattern:** select/insert/update for `authenticated`; delete via `can_delete()` only (owner + manager). Accounting restricted via `can_view_accounting()`. Activity log immutable.
- **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign).
- **Roles vs job titles:** `user_role` enum = permission tiers (owner > manager > team_leader > staff/accountant). Job titles live in `profiles.position`. `team_leader` CANNOT delete.
- **Reusable admission templates**, not per-program — keyed by (country + study level), free-text timeframes.
- **Authentic data only.** Never auto-seed volatile data (tuition, employer names, live jobs). Only stable reference data is seeded.
- **Keep two tracks parallel** (routers, schemas, pages) so education and employment don't tangle.
- **Update `CLAUDE.md` and this file** whenever a new concept/table/component is added.
- **Commit after each working milestone.** Secrets stay out of Git.
- **`assigned_counselor` and `created_by` on students/candidates** FK to `auth.users` (which is empty — we run solo via service key). These are **deliberately omitted** from create/update schemas and forms. Do NOT send them. Wire when auth is added.
- **Status values differ by track.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed" not "enrolled").
- **Target chain field types.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing types silently fails.
- **Selector re-fetch on edit.** On opening a student/candidate for edit, the selector must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.
- **Student/Candidate profiles are CORE ONLY so far.** Passport, income, academic, supporter (students) and passport, income, work history, language/skills (candidates) exist in the DB but are NOT yet in the forms. The profile enrichment pass (remaining chunk #2) adds them.

---

## 9. Immediate Next Step

**Remaining chunk #1 — Per-student progress tracking on the Admission Roadmap.**

The `student_journey` table and `journey_stages` (8 seeded rows) already exist. The `AdmissionRoadmap.jsx` component displays template steps read-only. Make each step checkable per student:

1. Backend: `GET /students/{id}/journey` and `POST /students/{id}/journey/{stage_id}` (or equivalent) reading/writing `student_journey`.
2. Frontend: update `AdmissionRoadmap.jsx` to fetch and render the student's journey state with checkboxes, persisting progress to the API.
3. Test: open a student, advance a step, confirm it saves and reloads.
4. Commit: `"Add per-student roadmap progress tracking (student_journey)"`

> **Before starting:** ensure all three terminals are running and `curl http://127.0.0.1:8000/api/countries` returns 39 rows.

---

*Snapshot as of June 24, 2026. As building continues this will drift — regenerate at the next milestone. Keep `CLAUDE.md` in sync.*
