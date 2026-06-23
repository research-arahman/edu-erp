# Education ERP / CRM — Project Handoff Document

> **Purpose of this file:** Paste this into a new conversation to continue building the Education ERP / CRM without losing context. It captures the project goal, full stack, what's built, the database state, exact terminal commands, remaining work, and the agreed conventions. Self-contained — assume the new assistant knows nothing else.

**Owner:** Mohd Abdur Rahman
**GitHub:** `research-arahman/edu-erp` (branch `main`)
**Local path:** `~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`
**Working style:** One small task at a time. Wait for "done" before moving on. SQL goes in the editor, never pasted into the terminal. Commit after each working chunk.

---

## 1. Project Overview & Goal

A centralized **Education ERP that works primarily as a CRM**, for an education + job-placement consultancy ("Advance EduERP") serving **Bangladeshi students and job-seekers** applying to **30–40 global destinations** (UK, Japan, US, Canada, Australia, Germany, Ireland, Turkey, Malaysia, and more).

The system runs **two parallel service tracks** that share infrastructure (staff profiles, documents, tasks, accounting, audit log):

1. **Education track** — students applying for Bachelor's, Master's, PhD, Diploma, and language programs (JLPT, English, TOPIK).
2. **Employment track** — job-seekers ("candidates"), especially **Japan SSW** (Specified Skilled Worker), expanding later to Europe and beyond.

**Signature feature:** a data-driven **cascading selector** (Country → type → level → institute/employer → program/job → session), showing only data that actually exists — never generic options.

**Other core modules:** inquiry tracker, application pipelines, document storage (Google Drive API, planned), role-based access control, a visual roadmap of each applicant's journey, an institute/employer database with fees, an accounting module (full chart of accounts), task management, and a student/candidate portal (planned).

**Key architectural insight reached during the build:** the *admission process itself* (steps + timeframes) varies by **country × study level** — e.g. Japan Master's requires finding a professor first; Western Master's applies to a central committee. This is modeled as **reusable templates**, not per-program data.

---

## 2. Full Tech Stack & Versions

| Layer | Technology | Version / notes |
|---|---|---|
| Database + Auth | **Supabase** (Postgres + Row-Level Security + Storage) | CLI v2.106.0 (v2.107 available); project ref `fhzjizgsxlowjxzocasj`, region Oceania (Sydney) |
| Backend | **FastAPI** (Python) | fastapi 0.137.1, uvicorn 0.49.0, supabase-py 2.31.0, pydantic 2.13.4, python-dotenv 1.2.2, google-api-python-client 2.197.0 |
| Python | CPython | 3.11 (venv at `backend/venv`) |
| Frontend | **React + Vite + Tailwind** | Vite 8.0.16, react-router-dom 7.18.0 |
| Source control | **Git / GitHub** | repo `research-arahman/edu-erp` |
| Agentic coding | **Claude Code (CLI)** | v2.1.18x, used inside the repo for bulk code |
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
├── CLAUDE.md                      # context file Claude CLI reads every session (schema, roles, rules)
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
│       ├── config.py              # loads SUPABASE_* env vars via python-dotenv + os.environ
│       ├── database.py            # supabase client (service-role key)
│       ├── main.py                # FastAPI app; CORS; routers mounted under /api prefix
│       ├── schemas.py             # Pydantic models (Country, Institute, Program, ProgramSession,
│       │                          #   AdmissionTemplate, AdmissionStep, ...) — money fields = float, never Decimal
│       └── routers/
│           ├── __init__.py
│           ├── countries.py       # CRUD
│           ├── institutes.py      # CRUD + ?country_id=&type= filter
│           ├── programs.py        # CRUD + sessions sub-resource (program_sessions)
│           ├── admission_templates.py  # CRUD + steps sub-resource (admission_steps)
│           ├── selector_education.py   # read-only cascading selector endpoints
│           └── selector_employment.py  # read-only cascading selector endpoints
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
│       │   └── Layout.jsx         # sidebar (Education/Employment/Data/Operations groups) + header + <Outlet/>
│       └── pages/
│           ├── Dashboard.jsx      # placeholder
│           ├── Countries.jsx      # WORKING (list, from /api/countries)
│           ├── Institutes.jsx     # WORKING (full CRUD + drawer)
│           ├── Programs.jsx       # WORKING (full CRUD + sessions sub-panel)
│           ├── AdmissionTemplates.jsx  # WORKING (full CRUD + steps sub-panel)
│           ├── Students.jsx, Applications.jsx, Candidates.jsx, Employers.jsx,
│           ├── Jobs.jsx, JobApplications.jsx, Industries.jsx, Inquiries.jsx,
│           ├── Tasks.jsx, Accounting.jsx   # all PLACEHOLDERS ("coming soon")
│           └── Placeholder.jsx     # shared stub component
└── supabase/
    ├── config.toml
    └── migrations/                # ~16 timestamped .sql migrations (all pushed to cloud)
```

---

## 4. What's Built & Working So Far

**Database (Supabase cloud):** complete — all tables created, all RLS policies applied, all migrations pushed. (Full list in §5.)

**Backend (FastAPI):** running locally, talks to Supabase. Working endpoints, all under `/api`:
- `GET /` and `GET /health` (health check returns country count)
- Countries CRUD
- Institutes CRUD (+ filters)
- Programs CRUD + program sessions sub-resource
- Admission Templates CRUD + admission steps sub-resource
- Cascading selector endpoints (education + employment) — built, return `[]` until data exists

**Frontend (React):** running locally at `localhost:5173`, app shell with grouped sidebar nav and routing. Fully working pages:
- **Countries** — lists all 39
- **Institutes** — full add/edit/delete via slide-in drawer; one real record entered: **Yamaguchi University** (Japan, university, Yamaguchi, has dormitory)
- **Programs** — full CRUD + inline sessions; one real record: **MOT** (Master's, Faculty of Engineering, under Yamaguchi University)
- **Admission Templates** — full CRUD + ordered steps with free-text timeframes; one real template started: **Japan Masters** (Master's, with the "Find a Professor (Lab)" step and more being added)

All other sidebar pages are styled placeholders.

**Data entered so far (real):** 39 countries, 1 institute, 1 program, 1 admission template (+ steps).

**Source control:** everything committed and pushed to GitHub. Latest commits cover the `/api` prefix refactor and UUID fixes.

---

## 5. Database Schema / State

**Supabase project:** `edu-erp`, ref `fhzjizgsxlowjxzocasj`, region Oceania (Sydney). CLI linked locally.

**Enums:**
- `user_role`: owner, manager, counselor, student, team_leader, staff, accountant (legacy `instructor/hr/administrator` NOT used — job titles live in `profiles.position` instead)
- `prog_level`: bachelors, masters, phd, language
- `app_stage`: inquiry → profile_assessment → shortlisting → document_collection → application_submitted → offer_received → visa_processing → enrolled
- `job_stage`: applied → screening → interview → offer → coe_processing → visa_processing → placed

**Tables (all have RLS):**

*Education / core CRM:*
- `countries` (int PK) — **39 rows seeded** (stable data only: name, iso_code, region, currency). Japan = id 1.
- `institutes` (uuid PK) — type: university/language_school/diploma; ownership; living expense; dormitory; services
- `programs` (uuid PK) — `institute_id` (uuid FK), level_category, level_label, department, course_name, fees, currency, duration_months
- `program_sessions` (uuid PK) — intakes per program
- `admission_requirements` (uuid PK) — requirement checklist template per program
- `students` (uuid PK) — rich profile: passport, income, supporter/sponsor, academic/career, purpose, target_country/institute/program/session
- `inquiries` (uuid PK) — lead tracker: new → contacted → qualified → converted/lost
- `applications` + `application_checklist` (uuid PK) — 8-stage pipeline via `app_stage`
- `journey_stages` + `student_journey` (visual roadmap; 8 seeded stages)
- `admission_templates` (uuid PK) — **reusable per (country_id + level_category), UNIQUE on that pair**; name, description
- `admission_steps` (uuid PK) — ordered steps for a template: step_order, title, description, **timeframe (FREE TEXT)**

*Staff & access:*
- `profiles` (uuid PK, references `auth.users`) — role, **position** (job title), **team**, **team_leader_id** (self-ref). Trigger auto-creates a profile row on signup (default role `staff`).
- `activity_log` (immutable audit trail — insert+select only, NO update/delete policies)

*Employment / SSW track:*
- `industry_fields` — **Japan's 16 SSW fields seeded** (country-scoped, is_ssw flag)
- `qualification_types` — language & skills tests; **JLPT, JFT-Basic, SSW Skills Test seeded**; has `levels[]` array
- `employers` (uuid PK) — company DB; industry_field_id, is_ssw_registered, housing_support, contact person
- `jobs` (uuid PK) — openings; structured requirements (req_language_qual_id + req_language_level, req_skills_qual_id), salary, start_period
- `candidates` (uuid PK) — job-seeker profile (parallel to students) with structured language/skills proficiency + target chain
- `job_applications` + `job_application_checklist` — employment pipeline via `job_stage`

*Accounting (sensitive — owner/manager/accountant only via `can_view_accounting()`):*
- `accounts` (int code PK) — **full chart of accounts seeded, codes 1000–6400** (Assets/Liabilities/Equity/Revenue/COGS/OPEX)
- `transactions` — gateway-ready (Stripe/PayPal fields nullable until registered); debit/credit; links to student
- `investments` — capital tracking
- `commissions` — consultant commission foundation

*Task management:*
- `daily_task_templates`, `tasks` (daily + assigned; todo/in_progress/done; role labels), `notifications`

**RLS pattern (applies to almost every table):** authenticated users can SELECT/INSERT/UPDATE; DELETE only via `can_delete()` (owner or manager). Helper functions in DB: `current_user_role()`, `can_delete()`, `can_view_accounting()`, `can_manage_tasks()`.

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
Wait for the `localhost:5173` line. Leave running. **Restart this whenever `vite.config.js` changes** (proxy config is read only at startup).

**Terminal 3 — Working terminal** (git, supabase, Claude CLI):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp
```
Use for `git`, `supabase`, and launching `claude`.

**Health check that everything is up:**
```bash
curl http://127.0.0.1:8000/api/countries     # should return 39 countries
```
Then open `http://localhost:5173` — the app should load.

**Database migration workflow (when schema changes are needed):**
```bash
supabase migration new <name>
code supabase/migrations/*_<name>.sql    # paste SQL in EDITOR, save (never paste SQL in terminal)
supabase db push                          # confirm with Y
git add . && git commit -m "..." && git push
```

**macOS gotchas seen:** the keychain prompt during `supabase db push` wants the **Mac login password**, not Supabase. PostHog telemetry TLS warnings on the university network are harmless. If a paste turns the prompt into `quote>`, press Ctrl+C and run lines one at a time.

---

## 7. Remaining C3 Chunks (Data-Entry Frontend)

We are mid **Phase C (frontend)**, sub-phase **C3 (data-entry forms)**. Done so far in C3: Institutes, Programs, Admission Templates. Remaining:

1. **C3 — Program requirement dropdowns** (small, do first):
   Add requirement fields to the Programs form/table: `language_test_accepted` (dropdown: TOEFL / IELTS / JLPT / Duolingo / etc.), `min_language_level` (text), `moi_accepted` (yes/no — Medium of Instruction letter accepted in lieu of a test). *Note: the `programs` table may need these columns added via a migration first — verify against the current schema before building the UI.*

2. **C3 — Employers management page** (employment track):
   Full CRUD page like Institutes, for the `employers` table. Country dropdown + industry_field dropdown (from `industry_fields`), SSW-registered, housing support, contact person.

3. **C3 — Jobs management page** (employment track):
   Full CRUD like Programs, for the `jobs` table. Employer dropdown, industry/SSW field, structured language requirement (qualification_type dropdown + level), structured skills requirement, salary range, start_period.

4. **C3 — Employment admission/process templates (parallel concept):**
   The employment track needs its **own** process-template concept, keyed by **country + industry/SSW field** (NOT study level), mirroring `admission_templates`. Build when doing the employment frontend so the two tracks stay clean and don't tangle.

Then beyond C3:

5. **C4 — Cascading selector UI:** wire the dependent dropdowns to the existing `selector_education` / `selector_employment` endpoints. These light up once C3 data exists.

6. **C5 — Students & Candidates pages + the visual roadmap:** the rich profile forms, and where each admission/employment template **surfaces as the applicant's live roadmap** (look up template by the applicant's country + level/industry, render its ordered steps + timeframes).

7. **Later phases:** inquiries UI, application pipelines (Kanban), dashboards, **authentication/login** (critical — see §8), Google Drive document integration, accounting module UI, task management UI, then **Render deployment**.

---

## 8. Key Decisions & Conventions

- **Roles vs job titles:** `user_role` enum = *permission tiers* only (owner, manager, team_leader, staff, accountant, student). Job titles (Business Developer, Marketing Officer, Admission Officer, Application Officer, Counselor, Language Instructor) live in `profiles.position`. Teams in `profiles.team`, reporting line in `profiles.team_leader_id`.
- **Delete rule:** only **owner** and **manager** can delete (enforced in DB via `can_delete()` in every table's DELETE policy). team_leader and staff cannot delete.
- **Accounting is sensitive:** visible only to owner/manager/accountant (`can_view_accounting()`).
- **Audit log is immutable:** insert + select only; no update/delete, not even for managers.
- **Two tracks, shared infrastructure:** students (education) and candidates (employment) are parallel. Keep their code parallel and consistent (routers, schemas, pages) so neither creates a mess for the other.
- **Admission process = reusable templates** keyed by (country + study level), not per-program. Steps have **free-text timeframes** (handles 40-country variation; structured dates can be added later if ever needed).
- **Authentic data only:** never auto-seed volatile data (tuition, rankings, intake dates, employer names, live jobs). Only stable reference data is seeded (countries by ISO code/currency; Japan's official 16 SSW fields; standard test types; chart-of-accounts codes). Everything advisable to a real student is entered by hand from real sources.
- **Money fields:** Pydantic schemas use `float`, **never `Decimal`** (Decimal broke JSON serialization to Supabase — a recurring early bug).
- **IDs:** `countries` and `accounts` use **integer** PKs; **all other tables use UUID** PKs. Foreign keys referencing them must match type. *This caused two bugs: `institute_id` and `template_id` were wrongly typed `int` in schemas/routers — both fixed to `str`. Watch for this pattern on every new UUID foreign key.*
- **API routing:** all backend routes are mounted under **`/api`** so they never collide with React Router page paths. Frontend `api.js` prepends `/api`; Vite proxy forwards only `/api` to the backend. (Before this fix, typing a page URL like `/admission-templates` returned raw JSON.)
- **CORS:** dev uses the Vite proxy (same-origin), so no CORS issues. `allow_credentials=True` was removed (it conflicted with `allow_origins=["*"]`). For production, set `VITE_API_URL` to the deployed backend origin.
- **Claude CLI usage:** used for bulk code generation inside the repo; it reads `CLAUDE.md` each session. **Update `CLAUDE.md` whenever a new concept/table is added** so it stays consistent. Exit sessions with `/exit`. Don't let multiple stale Claude CLI sessions run server commands (causes port conflicts).
- **Build rhythm:** one small task at a time; commit after each working chunk; SQL in the editor, not the terminal.

---

## 9. Immediate Next Step

**Finish entering the Japan Master's admission template steps** (orders 2–7), then **commit** the current working state:

```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp
git add . && git commit -m "Add admission templates frontend + /api prefix + UUID fixes" && git push
```

**Then begin C3 step 1: Program requirement dropdowns.** First verify whether the `programs` table already has `language_test_accepted`, `min_language_level`, `moi_accepted` columns; if not, create a migration to add them, then build the dropdowns into `Programs.jsx`. Keep cost/number fields as typed inputs.

> Reminder for the new session: ensure all three terminals are running (§6) and confirm `curl http://127.0.0.1:8000/api/countries` returns 39 rows before building anything.