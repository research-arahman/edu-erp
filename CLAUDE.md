# Education ERP / CRM — Project Handoff & Context

**Company:** Advance Educonsultancy (Pvt) Ltd.
**Last updated:** End of session, June 22, 2026
**Repo:** `github.com/research-arahman/edu-erp` (branch `main`)
**Owner:** Abdur Rahman

> **Purpose of this file.** This is the single authoritative document to resume the project in a new conversation. It merges the project context (the old `CLAUDE.md`) with the full build-state handoff. Keep it in the repo root. Note: a separate, leaner `CLAUDE.md` also lives in the repo root because **Claude CLI reads `CLAUDE.md` automatically every session** — when the system changes, update both this file and `CLAUDE.md`.

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
| AI build tool | **Claude Code (Claude CLI)** | v2.1.185, Sonnet model, used for bulk code generation |
| Deployment (planned) | **Render** | backend web service + frontend static site — NOT deployed yet |
| Docs storage (planned) | **Google Drive API** (service account) | NOT integrated yet |

---

## 3. Folder / File Structure

```
edu-erp/
├── .gitignore                 # ignores venv, node_modules, .env, service-account.json, etc.
├── README.md
├── CLAUDE.md                  # context file Claude CLI reads every session (KEEP UPDATED)
├── EDU_ERP_HANDOFF.md         # this document (consider committing as HANDOFF.md at root)
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
│           ├── selector_education.py  # cascading selector (education chain)
│           ├── selector_employment.py # cascading selector (employment chain)
│           ├── admission_templates.py # templates + steps sub-resource
│           └── employers.py           # (in progress — being built next)
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
        │   └── Layout.jsx     # sidebar nav (Education/Employment/Data/Operations groups) + header + <Outlet/>
        └── pages/
            ├── Dashboard.jsx          # placeholder
            ├── Countries.jsx          # working (lists 39 countries)
            ├── Institutes.jsx         # working (full CRUD)
            ├── Programs.jsx           # working (CRUD + requirements + sessions)
            ├── AdmissionTemplates.jsx # working (templates + ordered steps)
            ├── Students.jsx           # placeholder
            ├── Applications.jsx       # placeholder
            ├── Candidates.jsx         # placeholder
            ├── Employers.jsx          # (being built next)
            ├── Jobs.jsx               # placeholder
            ├── JobApplications.jsx    # placeholder
            ├── Industries.jsx         # placeholder
            ├── Inquiries.jsx          # placeholder
            ├── Tasks.jsx              # placeholder
            └── Accounting.jsx         # placeholder
```

---

## 4. What's Built & Working So Far

### Backend (FastAPI)
- App skeleton with CORS; root `GET /` and `GET /health` (health checks Supabase by counting countries).
- **All routes mounted under `/api`** (e.g. `/api/countries`, `/api/programs`).
- Working routers: **countries** (CRUD), **institutes** (CRUD), **programs** (CRUD + sessions sub-resource), **education selector**, **employment selector**, **admission templates** (CRUD + steps sub-resource).
- **employers** router — being built in the immediate next step.

### Frontend (React + Vite + Tailwind)
- App shell: sidebar with grouped nav (Dashboard, Education, Employment, Data, Operations), header, routed content area.
- **Working pages:** Countries (lists 39), Institutes (full CRUD), Programs (CRUD + requirement dropdowns + sessions with labeled date fields), Admission Templates (create template by country+level, add ordered steps with free-text timeframes).
- API client (`api.js`) talks to `/api`; Vite proxy forwards `/api` → backend.
- Verified end-to-end: browser → API → Supabase → browser.

### Data entered so far
- **39 countries** seeded (authentic ISO codes + currencies).
- At least one real institute (**Yamaguchi University**), one program (**MOT / Master's**), and one admission template (**Japan Master's (Research)** with steps).

### Proven milestones
- Full create/read/update/delete cycle working through the UI.
- Reusable admission-template design proven end to end (country + study level → ordered steps + timeframes).

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
- `students` — rich profile (passport, income, supporter, academic/career, purpose, target_country/institute/program/session)
- `inquiries` — lead tracker (new → contacted → qualified → converted/lost)
- `applications` + `application_checklist` — 8-stage education pipeline
- `journey_stages` (8 seeded) + `student_journey` — visual roadmap
- `admission_templates` — **one row per (country_id INT + level_category text), UNIQUE on the pair**; reusable admission process
- `admission_steps` — ordered steps per template (step_order, title, description, **free-text** timeframe). **id and template_id are UUIDs.**

**Employment / SSW**
- `industry_fields` — Japan's 16 SSW fields seeded (country-scoped, is_ssw flag); INT id
- `qualification_types` — JLPT, JFT-Basic, SSW Skills Test seeded; has `levels[]` array; INT id
- `employers` — company database (UUID id, country_id INT, industry_field_id INT, is_ssw_registered, housing_support, contact fields)
- `jobs` — openings (structured requirements via `req_language_qual_id` + `req_language_level`, `req_skills_qual_id`; salary range; start_period; positions_available)
- `candidates` — job-seeker profile (work experience, structured language/skills proficiency, target chain)
- `job_applications` + `job_application_checklist` — employment pipeline (job_stage enum)

**Shared / ops**
- `profiles` — extends `auth.users`; role / position / team / team_leader_id; auto-created via trigger on signup
- `activity_log` — **immutable** audit trail (insert + select only; no update/delete, not even for managers)
- `accounts` — chart of accounts seeded **1000–6400** (assets, liabilities, equity, revenue, COGS, opex)
- `transactions` — gateway-ready (Stripe/PayPal fields nullable until registered)
- `investments`, `commissions` — consultant commission foundation
- `daily_task_templates`, `tasks`, `notifications` — task management

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

Data-driven dependent dropdowns that show **ONLY data that exists** (never generic/hardcoded options). Backend selector endpoints already exist for both tracks; the **UI** (C4) is not yet built.

**Education chain:**
```
Country → institute type (university / language_school / diploma)
  → University path: ownership → degree level → department → course → session
  → Language path:   level_category (jlpt/english/topik...) → level_label
                     (N5, IELTS Prep...) → school → session
```
Each completed selection feeds the student's `target_*` fields and the visual roadmap (visible to owner/manager/staff).

**Employment chain (parallel):**
```
Country → Industry/SSW field → Employer → Job position → start period
```
Feeds `candidate.target_*` fields and (later) a roadmap. Mirrors the education pattern exactly so neither track creates a mess for the other.

---

## 8. Admission Process Templates (reusable, per country + study level)

The admission **process** varies by country **and** study level (e.g. Japan Master's requires finding a professor first; Western Master's applies to a central admissions committee). Modeled as **reusable templates, NOT per-program**:

- `admission_templates` — one row per `(country_id + level_category)`, **UNIQUE** on the pair. `level_category` matches `programs.level_category` (bachelors/masters/phd/diploma/jlpt/english/...).
- `admission_steps` — ordered steps for a template (`step_order`, `title`, `description`, `timeframe`). **`timeframe` is FREE TEXT** (e.g. "3 months before deadline") — never assume a structured date.
- A program inherits the template matching its country + level_category. When a student is on a program, their roadmap surfaces that template's steps.
- Programs themselves hold **requirements** (`language_test_accepted`, `min_language_level`, `moi_accepted`), **not** the process steps.

**Level dropdown (templates & programs):** Bachelor's, Master's, PhD, Diploma, Foundation/Pathway, JLPT (Japanese), English, TOPIK (Korean), Other.

**Employment-track templates (to build later):** the employment side needs its **own parallel process-template concept keyed by country + industry/SSW field** (not study level) — built when doing the employment roadmap, kept separate.

---

## 9. Remaining Build Chunks

**C3 = data-entry forms so the cascading selectors light up with real data.**

- ✅ **C3 step 1 — Programs requirements + session fixes** — DONE (requirement dropdowns added; session 500 fixed; date fields labeled).
- ⏳ **C3 step 2 — Employers page** — IN PROGRESS (immediate next step; see §11).
- ⬜ **C3 step 3 — Jobs page** — openings at employers, with structured SSW language/skills requirements (dropdowns from `qualification_types`), salary range, start period. Same pattern as Programs.
- ⬜ **C3 step 4 — Industries management page** — simple CRUD over `industry_fields` (so new sectors/countries can be added beyond the seeded Japan 16).

**Then:**
- **C4 — Cascading selector UI** (both tracks): the dependent dropdowns wired to the existing selector endpoints (see §7).
- **C5 — Students & Candidates profiles + visual roadmap** — where admission templates finally surface as each person's live step-by-step roadmap (matched by country + level_category for students; by country + industry for candidates).
- **Later:** Inquiries UI, Applications/Job-Applications pipeline UI (Kanban), Tasks UI, Accounting UI, Dashboards, **then authentication/RBAC enforcement**, then Google Drive document integration, then Render deployment.

---

## 10. Key Decisions & Conventions (DO NOT VIOLATE)

1. **One step at a time.** Small, single-task chunks. Finish, confirm "done", then next. When the user says "done"/"next", assume the prior step worked.
2. **Terminal vs editor:** SQL and code go in the **VS Code editor**, never pasted into the terminal. Commands go in the terminal.
3. **UUID vs INT — the recurring trap.** Several tables use **UUID** primary keys (institutes, programs, employers, candidates, admission_templates, admission_steps, etc.); reference/lookup tables use **INT** (countries, industry_fields, qualification_types, accounts). Backend path params and schema FK types **must match** (UUID → `str`, INT → `int`). This bug bit `institute_id`, `template_id`, and `program_id`. Always check FK types.
4. **Money fields: use `float`, NEVER `Decimal`.** `Decimal` is not JSON-serializable and crashed the institutes POST. Store **amount + currency, default BDT, never hardcode FX rates**. All numeric/money fields are `float` in Pydantic schemas.
5. **API under `/api` prefix.** All backend routes are mounted under `/api`; the Vite proxy has a **single** `/api` rule. React Router owns all other paths. (This fixed page-vs-API URL collisions and makes refresh/direct-URL work.) New endpoints are auto-covered — no proxy edits needed.
6. **RLS pattern for every table:** select/insert/update for `authenticated`; **delete via `can_delete()`** (owner + manager only). Accounting tables restricted via `can_view_accounting()`. Activity log is immutable (insert + select only). Task management for others via `can_manage_tasks()`.
7. **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign), so the audit trail and manager/owner reports stay complete.
8. **Roles vs job titles.** Permission tiers live in the `user_role` enum (owner > manager > team_leader > staff/accountant > student). Job titles (Business Developer, Marketing Officer, Admission Officer, Application Officer, Counselor, Language Instructor) live in `profiles.position`; teams in `profiles.team`; reporting in `profiles.team_leader_id`. **team_leader CANNOT delete.**
9. **Reusable admission templates**, not per-program steps — keyed by (country + study level), with free-text timeframes (flexible across 40 countries; no assumed structured dates).
10. **Authentic data only.** Stable/verifiable reference data (country names, ISO codes, currencies, the 16 official SSW fields) may be seeded. **Volatile data — tuition, rankings, intake dates, real employer names, live jobs — is NEVER guessed/auto-seeded;** the user enters it from real sources.
11. **Keep the two tracks parallel and consistent** (routers, schemas, frontend components) so education and employment never tangle.
12. **`CLAUDE.md` is the source of truth** Claude CLI reads each session. Update it (and this file) whenever the system expands so generated code stays consistent.
13. **Commit after each working milestone** with a clear message, and push. Secrets stay out of Git (`.env`, `service-account.json` are gitignored).

---

## 11. Immediate Next Step

**Finish C3 step 2 — the Employers page** (the employment-track company database; same pattern as Institutes).

The Claude CLI build was kicked off at the end of the last session but **not yet confirmed working** — so the first thing to do on resume is verify whether it completed and can save a record. If it didn't, build/finish it:

1. Ensure all three terminals are running (§6). Health-check: `curl http://127.0.0.1:8000/api/countries`.
2. In Terminal 3, launch `claude` and have it build:
   - **Backend** `backend/app/routers/employers.py` — full CRUD: `GET /employers?country_id=&industry_field_id=`, `GET/POST/PATCH/DELETE /employers/{id}`. Mount under `/api` in `main.py`. Add `EmployerCreate` / `EmployerUpdate` to `schemas.py`. **Types:** `employers.id` UUID → `str`; `country_id` → `int`; `industry_field_id` → `Optional[int]`; numerics → `float`.
   - If a **list endpoint for `industry_fields`** doesn't exist yet (e.g. `GET /api/industries?country_id=`), add one so the employer form's industry dropdown can populate.
   - **Frontend** `frontend/src/pages/Employers.jsx` (replace placeholder) following `Institutes.jsx` exactly — list table (name, country, industry field, city, SSW registered) + add/edit drawer with all employer fields (name, country_id dropdown, industry_field_id dropdown, city, address, company_size small/medium/large, website, is_ssw_registered, accepts_foreign, housing_support, support_services, notes, contact_name/email/phone) + delete with confirm.
3. **Test:** add a real employer (e.g. Japan + an SSW industry like Nursing Care or Food Service). Confirm it saves, lists, and the industry dropdown populated.
4. **Commit:** `git add . && git commit -m "Add employers management (employment track)" && git push`

**After Employers:** C3 step 3 = **Jobs page** (openings with structured SSW requirement dropdowns from `qualification_types`), then C3 step 4 = Industries CRUD, then on to **C4 (cascading selector UI)** and **C5 (students/candidates + roadmap)**.

---

*Snapshot as of June 22, 2026. As building continues this will drift — regenerate it at the next milestone rather than relying on it weeks later. Remember to also keep `CLAUDE.md` in sync.*
