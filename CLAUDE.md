# Education ERP / CRM — Project Handoff & Context

**Company:** Advance Educonsultancy (Pvt) Ltd.
**Last updated:** End of session, June 25, 2026
**Repo:** `github.com/research-arahman/edu-erp` (branch `main`)
**Owner:** Abdur Rahman

> **Purpose of this file.** This is the single authoritative document to resume the project in a new conversation. It merges the project context with the full build-state handoff. Keep it in the repo root. **Claude CLI reads `CLAUDE.md` automatically every session** — when the system changes, update this file and `HANDOFF.md` together.

---

## 1. Project Overview & Goal

A centralized **CRM + ERP** for an education consultancy — **Advance Educonsultancy (Pvt) Ltd.** — guiding **Bangladeshi students and job-seekers** toward global destinations. The system runs **two parallel service tracks** sharing one unified, secured database:

- **Education track** — students applying to 30–40 global destinations (UK, Japan, US, Canada, Australia, Germany, Ireland, Turkey, Malaysia, and more) for Bachelor's, Master's, PhD, diploma, and language programs.
- **Employment track** — job-seekers (candidates) placed into work abroad, beginning with **Japan SSW (Specified Skilled Worker)** jobs, planned to expand to Europe and beyond.

It functions primarily as a CRM (inquiry → pipeline → placement) and also as an ERP (accounting, tasks, roles, reporting). Core features: inquiry tracker, application pipelines, document storage (planned Google Drive API), role-based access control, a **cascading destination selector** (the signature feature), reusable **admission-process templates** and **placement-process templates**, interactive visual roadmaps with per-record progress tracking, accounting with a full chart of accounts, referral partner + service-fee tracking, and task management.

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
│       ├── *_add_program_requirements.sql
│       ├── *_create_student_step_progress.sql   # student_step_progress (per-step tracking)
│       ├── *_create_placement_templates.sql     # placement_templates + placement_steps
│       ├── *_create_candidate_step_progress.sql # candidate_step_progress (per-candidate tracking)
│       ├── *_create_referral_partners.sql       # referral_partners table
│       ├── *_add_referred_by_partner.sql        # referred_by_partner_id FK on inquiries/students/candidates
│       └── *_create_service_fees.sql            # service_fees table (finance-RLS-gated)
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
│           ├── students.py            # students CRUD (full enriched profile; auth fields omitted)
│           ├── candidates.py          # candidates CRUD (full enriched profile; auth fields omitted)
│           ├── student_progress.py    # GET /students/{id}/progress; PUT + DELETE per step
│           ├── placement_templates.py # placement templates CRUD + steps sub-resource
│           ├── selector_education.py  # cascading selector (education chain) — read-only
│           ├── selector_employment.py # cascading selector (employment chain) — read-only
│           ├── admission_templates.py # templates + steps sub-resource
│           ├── candidate_progress.py  # GET/PUT/DELETE /candidates/{id}/steps/{step_id}/progress
│           ├── inquiries.py           # inquiries CRUD + ?status= filter
│           ├── applications.py        # applications CRUD + enriched list + PATCH for stage
│           ├── job_applications.py    # job_applications CRUD + enriched list + PATCH for stage
│           ├── referral_partners.py   # referral_partners CRUD + ?type= & ?is_active= filters
│           └── service_fees.py        # service_fees CRUD + filters + enriched list (partner/student/candidate names)
└── frontend/
    ├── package.json
    ├── vite.config.js         # single /api proxy rule → http://127.0.0.1:8000
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx            # routes, wrapped in Layout
        ├── index.css          # Tailwind directives
        ├── lib/
        │   └── api.js         # fetch wrapper, base path '/api'; methods: get/post/patch/put/delete
        ├── components/
        │   ├── Layout.jsx             # sidebar nav + header + <Outlet/>; nav groups: Dashboard / Education / Employment / Data / Operations / PARTNERS
        │   ├── EducationSelector.jsx  # reusable cascading education selector (saves target_*)
        │   ├── EmploymentSelector.jsx # reusable cascading employment selector (saves target_*)
        │   ├── AdmissionRoadmap.jsx   # INTERACTIVE when given studentId prop (Pending/Current/Done); read-only without studentId
        │   └── PlacementRoadmap.jsx   # INTERACTIVE when given candidateId prop (Pending/Current/Done); read-only without candidateId
        └── pages/
            ├── Dashboard.jsx          # placeholder
            ├── Countries.jsx          # working (lists 39 countries)
            ├── Institutes.jsx         # working (full CRUD)
            ├── Programs.jsx           # working (CRUD + requirements + sessions)
            ├── AdmissionTemplates.jsx # working (templates + ordered steps)
            ├── PlacementTemplates.jsx # working (templates + ordered steps; mirrors AdmissionTemplates)
            ├── Industries.jsx         # working (full CRUD over industry_fields)
            ├── Employers.jsx          # working (full CRUD, country + industry dropdowns)
            ├── Jobs.jsx               # working (full CRUD, qual-type requirement dropdowns)
            ├── DestinationExplorer.jsx # working (standalone read-only cascading selector, both tracks)
            ├── Students.jsx           # working (full enriched profile + EducationSelector + interactive AdmissionRoadmap + partner picker)
            ├── Candidates.jsx         # working (full enriched profile + EmploymentSelector + interactive PlacementRoadmap + partner picker)
            ├── Applications.jsx       # working (Kanban: 8 cols = app_stage; drag-to-stage; create/edit drawer; student + program pickers)
            ├── JobApplications.jsx    # working (Kanban: 7 cols = job_stage; drag-to-stage; create/edit drawer; candidate + job pickers)
            ├── Inquiries.jsx          # working (table + colored status badges; filter buttons; add/edit drawer incl. partner picker)
            ├── ReferralPartners.jsx   # working (list + add/edit drawer; commission formatted; active/inactive badge)
            ├── ServiceFees.jsx        # working (list table; direction & status badges; filters; add/edit drawer with conditional payer link)
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
  - **students** (CRUD — full enriched profile including passport, financial, supporter, academic sections; `assigned_counselor` / `created_by` deliberately omitted until auth is wired)
  - **candidates** (CRUD — full enriched profile including passport, financial, work background, structured language/skills; same auth-field omission)
  - **student_progress** (`GET /students/{id}/progress`; `PUT /students/{id}/steps/{step_id}/progress` upsert; `DELETE /students/{id}/steps/{step_id}/progress` reset to pending)
  - **candidate_progress** (`GET /candidates/{id}/progress`; `PUT /candidates/{id}/steps/{step_id}/progress` upsert; `DELETE` reset to pending)
  - **placement_templates** (CRUD + `/{id}/steps` sub-resource + `DELETE /placement-steps/{id}`)
  - **selector_education** (read-only cascading chain)
  - **selector_employment** (read-only cascading chain)
  - **admission_templates** (CRUD + steps sub-resource)
  - **inquiries** (CRUD; `GET` supports `?status=` filter; `assigned_to`/`created_by`/`converted_student_id` omitted until auth)
  - **applications** (CRUD; `GET` list enriches each row with `student_name`, `program_name`, `program_level` via bulk lookups; `PATCH` for stage change on drag)
  - **job_applications** (CRUD; `GET` list enriches each row with `candidate_name`, `job_title`, `employer_name`; `PATCH` for stage change on drag)
  - **referral_partners** (CRUD; `GET` supports `?type=` & `?is_active=` filters)
  - **service_fees** (CRUD; `GET` supports `?status=&direction=&partner_id=&student_id=&candidate_id=` filters; list enriches rows with `partner_name` / `student_name` / `candidate_name` via bulk lookups)

### Frontend (React + Vite + Tailwind)
- App shell: sidebar with grouped nav (Dashboard, Education, Employment, Data, Operations, **PARTNERS**), header, routed content area.
- **Working pages:**
  - **Countries** — lists 39 countries
  - **Institutes** — full CRUD
  - **Programs** — full CRUD + requirement dropdowns + sessions
  - **Admission Templates** — full CRUD + ordered steps with free-text timeframes
  - **Placement Templates** — full CRUD + ordered steps with free-text timeframes (mirrors Admission Templates; nav link under Employment group)
  - **Industries** — full CRUD over `industry_fields`
  - **Employers** — full CRUD with country + industry dropdowns; SSW fields
  - **Jobs** — full CRUD with employer dropdown + structured SSW language/skills requirement dropdowns from `qualification_types`
  - **Destination Explorer** — standalone read-only cascading selector for both tracks, toggled via Education/Employment switch
  - **Students** — full enriched profile form (passport, financial, supporter, academic sections) + embedded `EducationSelector` saving `target_*` fields + **interactive** `AdmissionRoadmap` (Pending/Current/Done per step, persisted to `student_step_progress`) + optional "Referred By (Partner)" dropdown
  - **Candidates** — full enriched profile form (passport, financial, work background, structured language/skills dropdowns from `qualification_types`) + embedded `EmploymentSelector` saving `target_*` fields + **interactive** `PlacementRoadmap` (Pending/Current/Done per step, persisted to `candidate_step_progress`; read-only in ADD mode) + optional "Referred By (Partner)" dropdown
  - **Inquiries** — lead tracker table with colored status badges (new/contacted/qualified/converted/lost), status filter buttons, add/edit drawer (name, phone, email, source dropdown, interest_country_id, interest_level, status, follow_up_date, notes, **referred_by_partner_id** picker); `assigned_to`/`created_by`/`converted_student_id` omitted until auth
  - **Applications** — Kanban board with 8 columns = `app_stage` values (inquiry → profile_assessment → shortlisting → document_collection → application_submitted → offer_received → visa_processing → enrolled); native HTML5 drag-and-drop (no new npm dep); drag-to-change-stage persists via `PATCH`; create/edit drawer with student + program pickers, stage, status, decision_notes; `application_checklist` deferred
  - **Job Applications** — Kanban board with 7 columns = `job_stage` values (applied → screening → interview → offer → coe_processing → visa_processing → placed); same drag-and-drop pattern; create/edit drawer with candidate + job pickers; `job_application_checklist` deferred
  - **Referral Partners** — list table + add/edit drawer; commission displayed formatted (e.g. "15000 BDT (fixed)" / "10% (percentage)"); active/inactive badge; nav under **PARTNERS** group
  - **Service Fees** — list table showing Related To / Direction / Amount / Milestone / Status / Due Date; colored direction & status badges; status/direction filter buttons; add/edit drawer with payer_type selector (partner / student / other) and a **conditional link dropdown** that swaps by payer_type (partner→partner_id, student→student_id, other→candidate_id) and clears stale links on change using the explicit-null pattern; nav under **PARTNERS** group
- **Reusable components:** `EducationSelector.jsx`, `EmploymentSelector.jsx`, `AdmissionRoadmap.jsx`, `PlacementRoadmap.jsx`
- API client (`api.js`) talks to `/api`; Vite proxy forwards `/api` → backend. **Has `get`, `post`, `patch`, `put`, and `delete` methods.**
- Verified end-to-end: browser → API → Supabase → browser.

### Data entered so far
- **39 countries** seeded (authentic ISO codes + currencies). Japan = id 1.
- At least one real institute (**Yamaguchi University**), one program (**MOT / Master's**), and one admission template (**Japan Master's (Research)** with steps).
- One seeded placement template: **Japan Nursing Care (SSW)** (country 1, industry 1) with steps.
- Sample referral partner: **Sakura Japanese Language Center** (type: language_center, fixed 15000 BDT commission).

### Proven milestones
- Full create/read/update/delete cycle working through the UI for all data-entry pages.
- Cascading Destination Explorer working for both tracks.
- Students: full enriched profiles saving; interactive roadmap progress (Pending → Current → Done) persisted per step per student.
- Candidates: full enriched profiles saving including structured language/skills dropdowns; interactive Placement Roadmap progress persisted per step.
- Placement Templates page fully working (CRUD + ordered steps), in parity with Admission Templates.
- Inquiries: lead pipeline table with status workflow, filtering, and partner picker, fully working.
- Applications: Kanban board (8 stages, native drag-and-drop) for the education pipeline, fully working.
- Job Applications: Kanban board (7 stages, native drag-and-drop) for the employment pipeline, fully working.
- **Referral Partners: entity management page fully working (CRUD, formatted commission display, active/inactive badge).**
- **Referral link: referred_by_partner_id picker added to Inquiries, Students, and Candidates forms; explicit-null clear pattern implemented to allow removing a link.**
- **Service Fees: standalone tracker fully working (two directions, conditional payer link by payer_type, status/direction filters).**

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
- `students` — full profile: passport (number, issue_date, expiry, country), financial (annual_income float, income_currency, income_source), supporter (name, relation, occupation, income float, currency), academic (highest_qualification, academic_summary, career_summary, purpose), target_country/institute/program/session, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status values: **active / archived / enrolled / dropped**. `assigned_counselor` and `created_by` FK to `auth.users` exist but are NOT sent from the API until auth is wired.
- `inquiries` — lead tracker (new → contacted → qualified → converted/lost); **referred_by_partner_id (uuid nullable FK → referral_partners)**
- `applications` + `application_checklist` — 8-stage education pipeline
- `journey_stages` (8 seeded) + `student_journey` — original visual roadmap tables (not currently in use; superseded by `student_step_progress`)
- `admission_templates` — **one row per (country_id INT + level_category text), UNIQUE on the pair**; reusable admission process
- `admission_steps` — ordered steps per template (step_order, title, description, **free-text** timeframe). **id and template_id are UUIDs.**
- `student_step_progress` — per-student progress on each admission step. Columns: `id` (uuid PK), `student_id` (uuid FK → students), `step_id` (uuid FK → admission_steps), `status` ('pending' | 'current' | 'done', default 'pending'), `note` (text), `updated_at`, `created_at`. **UNIQUE(student_id, step_id).** Upserted on each update; deleted (reset) on demand.
- `candidate_step_progress` — per-candidate progress on each placement step. Mirrors `student_step_progress`: `id` (uuid PK), `candidate_id` (uuid FK → candidates ON DELETE CASCADE), `step_id` (uuid FK → placement_steps ON DELETE CASCADE), `status` ('pending'|'current'|'done', default 'pending'), `note` (text), `updated_at`, `created_at`. **UNIQUE(candidate_id, step_id).**

**Employment / SSW**
- `industry_fields` — Japan's 16 SSW fields seeded (country-scoped, is_ssw flag); INT id
- `qualification_types` — JLPT, JFT-Basic, SSW Skills Test seeded; has `levels[]` array; INT id
- `employers` — company database (UUID id, country_id INT, industry_field_id INT, is_ssw_registered, housing_support, contact fields)
- `jobs` — openings (structured requirements via `req_language_qual_id` + `req_language_level`, `req_skills_qual_id`; salary range; start_period; positions_available)
- `candidates` — job-seeker profile: passport, financial, work background (current_occupation, total_experience_years int, highest_qualification, work_history), structured language proficiency (language_qual_id int FK → qualification_types, language_level text), structured skills proficiency (skills_qual_id int FK, skills_detail text), target chain, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status values: **active / archived / placed / dropped** (note: "placed", not "enrolled"). `assigned_counselor` and `created_by` FK to `auth.users` exist but are NOT sent from the API until auth is wired.
- `job_applications` + `job_application_checklist` — employment pipeline (job_stage enum)
- `placement_templates` — **one row per (country_id INT + industry_field_id INT), UNIQUE on the pair**; id uuid PK; name, description, is_active. Parallel to `admission_templates`.
- `placement_steps` — ordered steps per placement template (step_order, title, description, **free-text** timeframe). id uuid PK, template_id uuid FK → placement_templates ON DELETE CASCADE.

**Partners & fees**
- `referral_partners` — ongoing business relationships who send students/candidates. Columns: id (uuid PK), name (text NOT NULL), type (text CHECK IN ('firm','language_center','individual')), contact_person (text), phone (text), email (text), address (text), commission_basis (text CHECK IN ('percentage','fixed')), commission_rate (float), commission_currency (text default 'BDT'), notes (text), is_active (bool default true), created_at, updated_at.
- `service_fees` — standalone fee tracker for both directions. Columns: id (uuid PK), direction (text CHECK IN ('incoming','outgoing') default 'incoming'), payer_type (text CHECK IN ('partner','student','other')), partner_id (uuid nullable FK → referral_partners), student_id (uuid nullable FK → students), candidate_id (uuid nullable FK → candidates), amount (float NOT NULL ≥ 0), currency (text default 'BDT'), milestone (text CHECK IN ('on_referral','on_coe','on_visa','on_enrollment','on_placement','custom')), description (text), status (text CHECK IN ('pending','invoiced','paid','cancelled') default 'pending'), due_date (date), paid_date (date), notes (text), created_at, updated_at. **RLS: finance-sensitive — uses `can_view_accounting()` for select/insert/update (owner/manager/accountant); `can_delete()` for delete. Matches the accounting table pattern.**

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
- `can_view_accounting()` — `owner` + `manager` + `accountant` only (accounting + service_fees are restricted)
- `can_manage_tasks()` — `owner` + `manager` + `team_leader`

### Known security note (deferred)
Backend currently connects with the **service-role key**, which **bypasses RLS**. So the API does not yet enforce who can delete or who can view finance data — the DB rules exist but the backend acts as admin. This is fine while solo; **JWT auth + routing deletes through role checks is a required step before real staff log in.** Note: `service_fees` and the accounting tables already have finance-RLS policies in place — they will enforce correctly once auth is wired.

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
Each completed selection feeds the student's `target_*` fields and the interactive roadmap (via `AdmissionRoadmap.jsx`).

**Employment chain (parallel):**
```
Country → Industry/SSW field → Employer → Job position → start period
```
Feeds `candidate.target_*` fields and the **interactive** `PlacementRoadmap.jsx` (Pending/Current/Done per step, persisted to `candidate_step_progress`).

**Selector re-fetch behavior (important):** On edit, the selectors must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.

---

## 8. Process Templates (admission + placement)

Both tracks have **reusable process templates** that define the step-by-step journey for a given context. They follow the same pattern.

### Admission Templates (Education track)
Keyed by **(country_id + level_category)**, UNIQUE on the pair. `level_category` matches `programs.level_category`.
- `admission_templates` / `admission_steps` — steps have step_order, title, description, free-text timeframe.
- `AdmissionRoadmap.jsx` — **interactive** when given a `studentId` prop: renders each step with Pending/Current/Done controls that upsert to `student_step_progress`. **Read-only** when no `studentId` (Destination Explorer, Students ADD mode).
- `student_step_progress` — the per-student state store for admission step progress.

### Placement Templates (Employment track)
Keyed by **(country_id + industry_field_id)**, UNIQUE on the pair. Parallel to admission templates but for employment.
- `placement_templates` / `placement_steps` — same structure as admission side.
- `PlacementRoadmap.jsx` — **interactive** when given a `candidateId` prop: renders each step with Pending/Current/Done controls that upsert to `candidate_step_progress`. **Read-only** when no `candidateId` (Destination Explorer, Candidates ADD mode). Mirrors `AdmissionRoadmap.jsx` exactly.
- `candidate_step_progress` — the per-candidate state store for placement step progress.
- One template seeded: **Japan Nursing Care (SSW)** (country 1, industry 1).

**Level dropdown (admission templates & programs):** Bachelor's, Master's, PhD, Diploma, Foundation/Pathway, JLPT (Japanese), English, TOPIK (Korean), Other.

---

## 9. Remaining Build Chunks

### Completed
- ✅ **C3 — All data-entry pages:** Institutes, Programs (requirements + sessions), Admission Templates, Placement Templates, Industries, Employers, Jobs — all full CRUD and working.
- ✅ **C4 — Cascading Destination Explorer** (both tracks, standalone + embedded in Students/Candidates).
- ✅ **C5 core — Students & Candidates pages:** full enriched profile forms + embedded selectors saving `target_*` + interactive AdmissionRoadmap for students; read-only PlacementRoadmap for candidates.
- ✅ **C5a — Per-student roadmap progress tracking:** `student_step_progress` table + `student_progress.py` router + interactive `AdmissionRoadmap.jsx` with Pending/Current/Done controls persisted per step per student.
- ✅ **C5b — Student profile enrichment:** passport, financial, supporter/sponsor, academic/career sections added to `StudentCreate`/`StudentUpdate` schemas and the Students form.
- ✅ **C5c — Candidate profile enrichment:** passport, financial, work background, structured language/skills (dropdowns from `qualification_types`) added to `CandidateCreate`/`CandidateUpdate` schemas and the Candidates form.
- ✅ **C5d — Employment placement templates:** `placement_templates` + `placement_steps` tables, `placement_templates.py` router, `PlacementTemplates.jsx` page, `PlacementRoadmap.jsx` component (read-only).
- ✅ **C5e — Per-candidate placement progress tracking:** `candidate_step_progress` table + `candidate_progress.py` router + interactive `PlacementRoadmap.jsx` with Pending/Current/Done controls persisted per step per candidate. Employment track now at full parity with education.
- ✅ **C6 — Inquiries tracker:** `inquiries.py` router (CRUD + `?status=` filter) + `Inquiries.jsx` page (table, colored status badges, filter buttons, add/edit drawer). `assigned_to`/`created_by`/`converted_student_id` deferred until auth.
- ✅ **C7 — Applications Kanban (education pipeline):** `applications.py` router (CRUD + enriched list with student_name/program_name/program_level + PATCH for stage) + `Applications.jsx` page (8-column Kanban = `app_stage`, native HTML5 drag-and-drop, create/edit drawer). `application_checklist` deferred.
- ✅ **C8 — Job Applications Kanban (employment pipeline):** `job_applications.py` router (CRUD + enriched list with candidate_name/job_title/employer_name + PATCH for stage) + `JobApplications.jsx` page (7-column Kanban = `job_stage`, same drag-and-drop pattern, create/edit drawer). `job_application_checklist` deferred.
- ✅ **C9 — Referral Partners + Service Fees (3-step build):**
  - **Step 1:** `referral_partners` table migration + `referral_partners.py` router (CRUD, `?type=` & `?is_active=` filters) + `ReferralPartnerCreate`/`ReferralPartnerUpdate` schemas + `ReferralPartners.jsx` page (list + drawer, formatted commission, active/inactive badge) + PARTNERS nav group in `Layout.jsx`.
  - **Step 2:** `*_add_referred_by_partner.sql` migration adds `referred_by_partner_id` (uuid nullable FK → referral_partners, indexed) to `inquiries`, `students`, `candidates`; field added to all six schemas (`InquiryCreate/Update`, `StudentCreate/Update`, `CandidateCreate/Update`) and an optional "Referred By (Partner)" dropdown on all three forms. Explicit-null pattern implemented in `buildPayload` so clearing the link sends JSON `null` rather than omitting the key (see Convention #19).
  - **Step 3:** `service_fees` table migration (finance-RLS-gated via `can_view_accounting()`) + `service_fees.py` router (CRUD, multi-filter GET, enriched list with partner/student/candidate names) + `ServiceFeeCreate`/`ServiceFeeUpdate` schemas + `ServiceFees.jsx` page (list table, colored direction & status badges, status/direction filters, add/edit drawer with conditional payer link that swaps by payer_type and clears stale links on change). Covers both fee directions: incoming from a partner for students sent, incoming directly from a student for the Japan university application service; outgoing direction reserved for fees paid out to agents. Standalone tracker; accounting (transactions) tie-in is a LATER enhancement.

### Remaining (in order)

1. **Deferred checklists** (NEXT) — `application_checklist` (seed items from program `admission_requirements`, tick off per application) and `job_application_checklist`. Tables and DB structure already exist; no UI or endpoints yet.

2. **Inquiry → Student/Candidate one-click conversion** — set inquiry `status='converted'`, create the student/candidate record, store `converted_student_id` on the inquiry. (Field exists on `inquiries` table; deferred until auth is wired for `created_by`.)

3. **Tasks UI, Accounting UI (and optionally wire `service_fees` into `transactions`), Dashboards.**

4. **Authentication + RBAC enforcement** — backend still uses the service key and bypasses RLS entirely; deletes not yet role-gated at the API layer; `profiles` table is empty (that's why `assigned_to`/`created_by`/`assigned_counselor` are omitted everywhere). Note: `service_fees` and accounting tables already have finance-RLS policies — they will enforce correctly once auth is wired. Wire Supabase Auth, issue JWTs, route the backend through authenticated sessions so RLS actually enforces per-user access. **Critical before any real staff log in.**

5. **Google Drive document integration** (service-account approach), then **Render deployment**.

---

## 10. Key Decisions & Conventions (DO NOT VIOLATE)

1. **One step at a time.** Small, single-task chunks. Finish, confirm "done", then next. When the user says "done"/"next", assume the prior step worked.
2. **Terminal vs editor:** SQL and code go in the **VS Code editor**, never pasted into the terminal. Commands go in the terminal.
3. **UUID vs INT — the recurring trap.** Several tables use **UUID** primary keys (institutes, programs, employers, candidates, students, admission_templates, admission_steps, placement_templates, placement_steps, jobs, referral_partners, service_fees, student_step_progress, etc.); reference/lookup tables use **INT** (countries, industry_fields, qualification_types, accounts). Backend path params and schema FK types **must match** (UUID → `str`, INT → `int`). This bug bit `institute_id`, `template_id`, and `program_id`. Always check FK types before writing a new router or schema.
4. **Money fields: use `float`, NEVER `Decimal`.** `Decimal` is not JSON-serializable and crashed the institutes POST. Store **amount + currency, default BDT, never hardcode FX rates**. All numeric/money fields are `float` in Pydantic schemas.
5. **API under `/api` prefix.** All backend routes are mounted under `/api`; the Vite proxy has a **single** `/api` rule. React Router owns all other paths. New endpoints are auto-covered — no proxy edits needed.
6. **RLS pattern for every table:** select/insert/update for `authenticated`; **delete via `can_delete()`** (owner + manager only). Accounting tables and `service_fees` restricted via `can_view_accounting()`. Activity log is immutable (insert + select only). Task management for others via `can_manage_tasks()`.
7. **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign), so the audit trail and manager/owner reports stay complete.
8. **Roles vs job titles.** Permission tiers live in the `user_role` enum (owner > manager > team_leader > staff/accountant > student). Job titles (Business Developer, Marketing Officer, Admission Officer, Application Officer, Counselor, Language Instructor) live in `profiles.position`; teams in `profiles.team`; reporting in `profiles.team_leader_id`. **team_leader CANNOT delete.**
9. **Reusable process templates for both tracks.** Admission templates keyed by (country + study level); placement templates keyed by (country + industry_field). Both use free-text timeframes (never structured dates). Both follow the same DB + router + frontend pattern.
10. **Authentic data only.** Stable/verifiable reference data (country names, ISO codes, currencies, the 16 official SSW fields) may be seeded. **Volatile data — tuition, rankings, intake dates, real employer names, live jobs — is NEVER guessed/auto-seeded;** the user enters it from real sources.
11. **Keep the two tracks parallel and consistent** (routers, schemas, frontend components) so education and employment never tangle.
12. **`CLAUDE.md` is the source of truth** Claude CLI reads each session. Update it (and `HANDOFF.md`) whenever the system expands so generated code stays consistent.
13. **Commit after each working milestone** with a clear message, and push. Secrets stay out of Git (`.env`, `service-account.json` are gitignored).
14. **`assigned_counselor` and `created_by` on students/candidates FK to `auth.users`, which is EMPTY** (we run solo via service key). These fields are deliberately **omitted** from student and candidate create/update schemas and forms. Do not send them. They will be wired when authentication is added.
15. **Status values differ between tracks.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed", not "enrolled").
16. **Target chain field types must be respected.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing UUID and INT on these will silently fail.
17. **Both roadmap components are conditionally interactive.** `AdmissionRoadmap.jsx` renders Pending/Current/Done controls (hitting `student_progress.py`) when a `studentId` prop is passed; stays read-only without it (Destination Explorer, Students ADD mode). `PlacementRoadmap.jsx` renders the same interactive controls (hitting `candidate_progress.py`) when a `candidateId` prop is passed; stays read-only without it (Candidates ADD mode). This pattern is intentional — no ID exists in ADD mode.
18. **`api.js` now has all five HTTP methods:** `get`, `post`, `patch`, `put`, `delete`. The `put` method was missing until an earlier session and caused silent failures on PUT calls — always use `api.put(...)` for upserts, never fall back to `api.post(...)`.
19. **Explicit-null pattern for clearing optional FK fields.** When a user clears an optional FK link (e.g. "Referred By Partner" set back to "none"), the frontend `buildPayload` must **always** include the field as either the UUID string or JSON `null` — never omit it and never send an empty string. On the backend, the router's PATCH handler must detect a sent-but-null value via `model_dump(exclude_unset=True)` and apply `None` to clear the column. The default `model_dump(exclude_none=True)` would silently drop the key and leave the old value in place. This pattern is required wherever an optional FK can be cleared by the user. Currently applied to `referred_by_partner_id` on inquiries/students/candidates and to payer link fields on service_fees.
20. **`service_fees` is finance-RLS-gated.** The table uses `can_view_accounting()` for select/insert/update, matching the accounting tables. When auth is wired, only owner, manager, and accountant roles will be able to see or edit fee records.

---

## 11. Immediate Next Step

**Remaining chunk #1 — Deferred checklists.**

`application_checklist` and `job_application_checklist` tables already exist in the database. The goal is to: (a) seed checklist items from the program's `admission_requirements` when a new application is created; (b) provide a UI to tick off items per application inside the Applications Kanban drawer; (c) mirror the same flow for `job_application_checklist` inside the Job Applications drawer.

---

*Snapshot as of June 25, 2026. As building continues this will drift — regenerate it at the next milestone rather than relying on it weeks later. Remember to also keep `HANDOFF.md` in sync.*
