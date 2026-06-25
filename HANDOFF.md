# Education ERP / CRM — Project Handoff Document

> **Purpose of this file:** Paste this into a new conversation to continue building the Education ERP / CRM without losing context. It captures the project goal, full stack, what's built, the database state, exact terminal commands, remaining work, and the agreed conventions. Self-contained — assume the new assistant knows nothing else.

**Owner:** Mohd Abdur Rahman
**GitHub:** `research-arahman/edu-erp` (branch `main`)
**Local path:** `~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`
**Last updated:** End of session, June 25, 2026
**Working style:** One small task at a time. Wait for "done" before moving on. SQL goes in the editor, never pasted into the terminal. Commit after each working chunk.

---

## 1. Project Overview & Goal

A centralized **Education ERP that works primarily as a CRM**, for an education + job-placement consultancy ("Advance Educonsultancy Pvt. Ltd.") serving **Bangladeshi students and job-seekers** applying to **30–40 global destinations** (UK, Japan, US, Canada, Australia, Germany, Ireland, Turkey, Malaysia, and more).

The system runs **two parallel service tracks** that share infrastructure (staff profiles, documents, tasks, accounting, audit log):

1. **Education track** — students applying for Bachelor's, Master's, PhD, Diploma, and language programs (JLPT, English, TOPIK).
2. **Employment track** — job-seekers ("candidates"), especially **Japan SSW** (Specified Skilled Worker), expanding later to Europe and beyond.

**Signature feature:** a data-driven **cascading selector** (Country → type → level → institute/employer → program/job → session), showing only data that actually exists — never generic options. **Fully built and working.**

**Other core modules:** inquiry tracker, application pipelines, document storage (Google Drive API, planned), role-based access control, interactive visual roadmaps with per-record progress tracking, an institute/employer database with fees, an accounting module (full chart of accounts), referral partner + service-fee tracking, task management, and a student/candidate portal (planned).

**Key architectural insight:** the *admission/placement process itself* (steps + timeframes) varies by context — Japan Master's vs. Western Master's; Japan Nursing Care SSW vs. other SSW fields. Modeled as **reusable process templates** (admission templates keyed by country × study level; placement templates keyed by country × industry field), not per-program/per-job data.

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
├── CLAUDE.md                          # context file Claude CLI reads every session (KEEP UPDATED)
├── HANDOFF.md                         # this document — keep in sync with CLAUDE.md
├── README.md
├── .gitignore                         # ignores .env, venv/, node_modules/, service-account.json
├── backend/
│   ├── .env                           # Supabase keys (gitignored)
│   ├── requirements.txt
│   ├── venv/                          # Python 3.11 virtualenv (gitignored)
│   ├── seeds/
│   │   └── seed_countries.py          # idempotent country seeder (already run → 39 countries)
│   └── app/
│       ├── __init__.py
│       ├── config.py                  # loads SUPABASE_* env vars
│       ├── database.py                # supabase client (service-role key)
│       ├── main.py                    # FastAPI app; CORS; all routers mounted under /api prefix
│       ├── schemas.py                 # Pydantic models — money fields = float, never Decimal
│       └── routers/
│           ├── __init__.py
│           ├── countries.py           # CRUD
│           ├── institutes.py          # CRUD + ?country_id=&type= filter
│           ├── programs.py            # CRUD + sessions sub-resource
│           ├── admission_templates.py # CRUD + steps sub-resource
│           ├── placement_templates.py # CRUD + steps sub-resource (mirrors admission_templates)
│           ├── industries.py          # CRUD over industry_fields + ?country_id= filter
│           ├── employers.py           # CRUD + ?country_id=&industry_field_id= filter
│           ├── jobs.py                # CRUD + ?employer_id=; GET /qualification-types read-only
│           ├── students.py            # CRUD — full enriched profile; auth fields omitted
│           ├── candidates.py          # CRUD — full enriched profile; auth fields omitted
│           ├── student_progress.py    # GET/PUT/DELETE /students/{id}/steps/{step_id}/progress
│           ├── candidate_progress.py  # GET/PUT/DELETE /candidates/{id}/steps/{step_id}/progress
│           ├── inquiries.py           # CRUD + ?status= filter
│           ├── applications.py        # CRUD + enriched list + PATCH for stage
│           ├── job_applications.py    # CRUD + enriched list + PATCH for stage
│           ├── referral_partners.py   # CRUD + ?type= & ?is_active= filters
│           ├── service_fees.py        # CRUD + multi-filter GET + enriched list (partner/student/candidate names)
│           ├── selector_education.py  # read-only cascading selector endpoints (education chain)
│           └── selector_employment.py # read-only cascading selector endpoints (employment chain)
├── frontend/
│   ├── vite.config.js                 # proxy: '/api' → http://127.0.0.1:8000 (single clean rule)
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                    # BrowserRouter + all routes, wrapped in <Layout>
│       ├── index.css                  # Tailwind
│       ├── lib/
│       │   └── api.js                 # fetch wrapper; methods: get/post/patch/put/delete
│       ├── components/
│       │   ├── Layout.jsx                   # sidebar nav + header; groups: Dashboard / Education / Employment / Data / Operations / PARTNERS
│       │   ├── EducationSelector.jsx        # reusable cascading education selector; saves target_* on student
│       │   ├── EmploymentSelector.jsx       # reusable cascading employment selector; saves target_* on candidate
│       │   ├── AdmissionRoadmap.jsx         # INTERACTIVE with studentId prop; read-only without
│       │   └── PlacementRoadmap.jsx         # INTERACTIVE with candidateId prop; read-only without
│       └── pages/
│           ├── Dashboard.jsx                # placeholder
│           ├── Countries.jsx                # WORKING (list)
│           ├── Institutes.jsx               # WORKING (full CRUD)
│           ├── Programs.jsx                 # WORKING (full CRUD + requirement dropdowns + sessions)
│           ├── AdmissionTemplates.jsx       # WORKING (full CRUD + ordered steps)
│           ├── PlacementTemplates.jsx       # WORKING (full CRUD + ordered steps; Employment nav group)
│           ├── Industries.jsx               # WORKING (full CRUD over industry_fields)
│           ├── Employers.jsx                # WORKING (full CRUD, country + industry dropdowns)
│           ├── Jobs.jsx                     # WORKING (full CRUD, qual-type requirement dropdowns)
│           ├── DestinationExplorer.jsx      # WORKING (standalone read-only cascading selector, both tracks)
│           ├── Students.jsx                 # WORKING (full enriched profile + EducationSelector + interactive AdmissionRoadmap + partner picker)
│           ├── Candidates.jsx               # WORKING (full enriched profile + EmploymentSelector + interactive PlacementRoadmap + partner picker)
│           ├── Applications.jsx             # WORKING (Kanban 8 cols = app_stage; drag-to-stage; create/edit drawer)
│           ├── JobApplications.jsx          # WORKING (Kanban 7 cols = job_stage; drag-to-stage; create/edit drawer)
│           ├── Inquiries.jsx                # WORKING (table + colored status badges; filter buttons; add/edit drawer incl. partner picker)
│           ├── ReferralPartners.jsx         # WORKING (list + add/edit drawer; formatted commission; active/inactive badge; PARTNERS nav group)
│           ├── ServiceFees.jsx              # WORKING (list table; direction & status badges; filters; add/edit drawer with conditional payer link)
│           ├── Tasks.jsx                    # placeholder
│           └── Accounting.jsx               # placeholder
└── supabase/
    ├── config.toml
    └── migrations/                    # ~25 timestamped .sql migrations (all pushed to cloud)
        ├── ...                        # (earlier migrations as before)
        ├── *_create_student_step_progress.sql   # per-student per-step progress tracking
        ├── *_create_placement_templates.sql     # placement_templates + placement_steps
        ├── *_create_candidate_step_progress.sql # per-candidate per-step progress tracking
        ├── *_create_referral_partners.sql       # referral_partners table
        ├── *_add_referred_by_partner.sql        # referred_by_partner_id FK on inquiries/students/candidates
        └── *_create_service_fees.sql            # service_fees table (finance-RLS-gated)
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
- **Placement Templates** CRUD + placement steps sub-resource
- **Industries** CRUD over `industry_fields` (+ `?country_id=` filter)
- **Employers** CRUD (+ `?country_id=&industry_field_id=` filters)
- **Jobs** CRUD (+ `?employer_id=` filter); `GET /qualification-types` (read-only list)
- **Students** CRUD — full enriched profile (passport, financial, supporter, academic sections); `assigned_counselor`/`created_by` deliberately omitted
- **Candidates** CRUD — full enriched profile (passport, financial, work background, structured language/skills); same omission
- **Student progress** — `GET /students/{id}/progress`; `PUT /students/{id}/steps/{step_id}/progress` (upsert); `DELETE` (reset to pending)
- **Candidate progress** — `GET /candidates/{id}/progress`; `PUT /candidates/{id}/steps/{step_id}/progress` (upsert); `DELETE` (reset to pending)
- **Inquiries** — CRUD; `GET` supports `?status=` filter; `assigned_to`/`created_by`/`converted_student_id` omitted until auth
- **Applications** — CRUD; `GET` list enriches each row with `student_name`, `program_name`, `program_level`; `PATCH` for stage change on drag
- **Job Applications** — CRUD; `GET` list enriches each row with `candidate_name`, `job_title`, `employer_name`; `PATCH` for stage change on drag
- **Referral Partners** — CRUD; `GET` supports `?type=` & `?is_active=` filters
- **Service Fees** — CRUD; `GET` supports `?status=&direction=&partner_id=&student_id=&candidate_id=` filters; list enriches rows with `partner_name` / `student_name` / `candidate_name` via bulk lookups
- **Cascading selector endpoints** — education + employment chains (read-only)

**Frontend (React):** running locally at `localhost:5173`. Fully working pages:
- **Countries** — lists all 39
- **Institutes** — full CRUD
- **Programs** — full CRUD + requirement dropdowns + sessions
- **Admission Templates** — full CRUD + ordered steps with free-text timeframes
- **Placement Templates** — full CRUD + ordered steps with free-text timeframes (mirrors Admission Templates; nav under Employment group)
- **Industries** — full CRUD over `industry_fields`
- **Employers** — full CRUD; country + industry field dropdowns
- **Jobs** — full CRUD; employer dropdown + structured SSW language/skills requirement dropdowns
- **Destination Explorer** — standalone read-only cascading selector for both tracks; Education/Employment toggle
- **Students** — full enriched profile (passport, financial, supporter/sponsor, academic/career sections grouped in drawer) + embedded `EducationSelector` saving `target_*` + **interactive** `AdmissionRoadmap` (Pending/Current/Done per step, persisted to `student_step_progress`; read-only in ADD mode) + optional "Referred By (Partner)" dropdown (explicit-null pattern on clear)
- **Candidates** — full enriched profile (passport, financial, work background, structured language/skills dropdowns from `qualification_types`) + embedded `EmploymentSelector` saving `target_*` + **interactive** `PlacementRoadmap` (Pending/Current/Done per step, persisted to `candidate_step_progress`; read-only in ADD mode) + optional "Referred By (Partner)" dropdown (explicit-null pattern on clear)
- **Inquiries** — lead tracker table with colored status badges (new/contacted/qualified/converted/lost), status filter buttons, add/edit drawer (name, phone, email, source dropdown, interest_country_id, interest_level, status, follow_up_date, notes, partner picker); `assigned_to`/`created_by`/`converted_student_id` omitted until auth
- **Applications** — Kanban board with 8 columns = `app_stage` values (inquiry → ... → enrolled); native HTML5 drag-and-drop (no new npm dep); drag-to-change-stage persists via `PATCH`; create/edit drawer with student + program pickers, stage, status, decision_notes; `application_checklist` deferred
- **Job Applications** — Kanban board with 7 columns = `job_stage` values (applied → ... → placed); same drag-and-drop pattern; create/edit drawer with candidate + job pickers; `job_application_checklist` deferred
- **Referral Partners** — list table + add/edit drawer; commission formatted (e.g. "15000 BDT (fixed)" / "10% (percentage)"); active/inactive badge; nav under **PARTNERS** group
- **Service Fees** — list table showing Related To / Direction / Amount / Milestone / Status / Due Date; colored direction & status badges; status/direction filter buttons; add/edit drawer with payer_type selector (partner / student / other) and a **conditional link dropdown** that swaps by payer_type (partner→partner_id, student→student_id, other→candidate_id) and clears stale links on change using the explicit-null pattern; nav under **PARTNERS** group

**Reusable components:** `EducationSelector.jsx`, `EmploymentSelector.jsx`, `AdmissionRoadmap.jsx`, `PlacementRoadmap.jsx`

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
- `students` (uuid PK) — full enriched profile: passport (number, issue_date, expiry, country), financial (annual_income float, income_currency, income_source), supporter/sponsor (name, relation, occupation, income float, currency), academic (highest_qualification, academic_summary, career_summary, purpose), target chain fields, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status: **active / archived / enrolled / dropped**. `assigned_counselor` + `created_by` — **deliberately omitted from API** until auth is wired.
- `inquiries` (uuid PK) — lead tracker: new → contacted → qualified → converted/lost; **referred_by_partner_id (uuid nullable FK → referral_partners)**
- `applications` + `application_checklist` (uuid PK) — 8-stage pipeline via `app_stage`
- `journey_stages` (8 seeded rows) + `student_journey` — original roadmap tables (not currently in use; superseded by `student_step_progress`)
- `admission_templates` (uuid PK) — **reusable per (country_id INT + level_category text), UNIQUE on pair**; name, description
- `admission_steps` (uuid PK) — ordered steps: step_order, title, description, **timeframe (FREE TEXT)**
- `student_step_progress` (uuid PK) — **per-student per-step progress state**. Columns: student_id (uuid FK → students), step_id (uuid FK → admission_steps), status ('pending'|'current'|'done', default 'pending'), note (text), updated_at, created_at. **UNIQUE(student_id, step_id).** Upserted on update; deleted on reset.
- `candidate_step_progress` (uuid PK) — **per-candidate per-step progress state**. Mirrors `student_step_progress`: candidate_id (uuid FK → candidates ON DELETE CASCADE), step_id (uuid FK → placement_steps ON DELETE CASCADE), status ('pending'|'current'|'done', default 'pending'), note (text), updated_at, created_at. **UNIQUE(candidate_id, step_id).**

*Staff & access:*
- `profiles` (uuid PK, references `auth.users`) — role, **position** (job title), **team**, **team_leader_id** (self-ref)
- `activity_log` — immutable audit trail (insert+select only, NO update/delete)

*Employment / SSW track:*
- `industry_fields` (int PK) — **Japan's 16 SSW fields seeded** (country-scoped, is_ssw flag)
- `qualification_types` (int PK) — **JLPT, JFT-Basic, SSW Skills Test seeded**; has `levels[]` array
- `employers` (uuid PK) — company DB; country_id (int), industry_field_id (int), is_ssw_registered, housing_support, contact person
- `jobs` (uuid PK) — openings; structured requirements (req_language_qual_id + req_language_level, req_skills_qual_id), salary, start_period, positions_available
- `candidates` (uuid PK) — full enriched profile: passport, financial, work background (current_occupation, total_experience_years int, highest_qualification, work_history), structured language proficiency (language_qual_id int FK → qualification_types, language_level text), structured skills proficiency (skills_qual_id int FK, skills_detail text), target chain, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status: **active / archived / placed / dropped** (note: "placed" not "enrolled"). `assigned_counselor` + `created_by` — **deliberately omitted from API** until auth is wired.
- `job_applications` + `job_application_checklist` — employment pipeline via `job_stage`
- `placement_templates` (uuid PK) — **reusable per (country_id INT + industry_field_id INT), UNIQUE on pair**; name, description, is_active. Parallel to `admission_templates`.
- `placement_steps` (uuid PK) — ordered steps per placement template: step_order, title, description, **timeframe (FREE TEXT)**. template_id (uuid FK → placement_templates ON DELETE CASCADE).

*Partners & fees:*
- `referral_partners` (uuid PK) — ongoing business relationships who send students/candidates. Columns: name (text NOT NULL), type (text CHECK IN ('firm','language_center','individual')), contact_person (text), phone (text), email (text), address (text), commission_basis (text CHECK IN ('percentage','fixed')), commission_rate (float), commission_currency (text default 'BDT'), notes (text), is_active (bool default true), created_at, updated_at.
- `service_fees` (uuid PK) — standalone fee tracker for both directions. Columns: direction (text CHECK IN ('incoming','outgoing') default 'incoming'), payer_type (text CHECK IN ('partner','student','other')), partner_id (uuid nullable FK → referral_partners), student_id (uuid nullable FK → students), candidate_id (uuid nullable FK → candidates), amount (float NOT NULL ≥ 0), currency (text default 'BDT'), milestone (text CHECK IN ('on_referral','on_coe','on_visa','on_enrollment','on_placement','custom')), description (text), status (text CHECK IN ('pending','invoiced','paid','cancelled') default 'pending'), due_date (date), paid_date (date), notes (text), created_at, updated_at. **Finance-RLS-gated: `can_view_accounting()` for select/insert/update; `can_delete()` for delete — matching the accounting tables.**

*Accounting (sensitive — owner/manager/accountant only via `can_view_accounting()`):*
- `accounts` (int code PK) — **full chart of accounts seeded, codes 1000–6400**
- `transactions` — gateway-ready (Stripe/PayPal fields nullable); debit/credit
- `investments`, `commissions` — capital + consultant commission tracking

*Task management:*
- `daily_task_templates`, `tasks`, `notifications`

**RLS pattern:** authenticated users can SELECT/INSERT/UPDATE; DELETE only via `can_delete()` (owner or manager). Finance tables (`accounts`, `transactions`, `investments`, `commissions`, `service_fees`) restricted via `can_view_accounting()`. Helper functions: `current_user_role()`, `can_delete()`, `can_view_accounting()`, `can_manage_tasks()`.

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

1. **Deferred checklists** (NEXT) — `application_checklist` (seed items from program `admission_requirements`, tick off per application) and `job_application_checklist`. Tables and DB structure already exist; no UI or endpoints yet.

2. **Inquiry → Student/Candidate one-click conversion** — set status='converted', create the record, store `converted_student_id`. (Field exists on `inquiries`; deferred until auth wired for `created_by`.)

3. **Tasks UI, Accounting UI (optionally wire `service_fees` into `transactions`), Dashboards.**

4. **Authentication + RBAC enforcement** — backend still uses service key and bypasses RLS entirely; `profiles` table empty (that's why `assigned_to`/`created_by`/`assigned_counselor` are omitted everywhere). Note: `service_fees` and accounting tables already have finance-RLS policies — they enforce correctly once auth is wired. Wire Supabase Auth + JWT so RLS actually enforces per-user access. **Critical before any real staff log in.**

5. **Google Drive document integration** (service-account), then **Render deployment**.

---

## 8. Key Decisions & Conventions

- **One step at a time.** Finish, confirm "done", then next.
- **Terminal vs editor:** SQL and code go in the VS Code editor, never pasted into the terminal.
- **UUID vs INT — the recurring trap.** UUID PKs: institutes, programs, employers, candidates, students, jobs, admission_templates, admission_steps, placement_templates, placement_steps, referral_partners, service_fees, student_step_progress. INT PKs: countries, industry_fields, qualification_types, accounts. FK types in routers/schemas must match. Always check before writing a new router.
- **Money fields: `float`, NEVER `Decimal`.** Decimal is not JSON-serializable (caused an early crash).
- **API under `/api` prefix.** All backend routes mounted under `/api`; Vite proxy has a single `/api` rule. React Router owns everything else.
- **`api.js` has five HTTP methods:** `get`, `post`, `patch`, `put`, `delete`. The `put` method was missing until an earlier session — always use `api.put(...)` for upserts, never fall back to `api.post(...)`.
- **RLS pattern:** select/insert/update for `authenticated`; delete via `can_delete()` only (owner + manager). Accounting and `service_fees` restricted via `can_view_accounting()`. Activity log immutable.
- **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign).
- **Roles vs job titles:** `user_role` enum = permission tiers (owner > manager > team_leader > staff/accountant). Job titles live in `profiles.position`. `team_leader` CANNOT delete.
- **Reusable process templates for both tracks.** Admission templates keyed by (country + study level); placement templates keyed by (country + industry_field). Both use free-text timeframes. Always follow the same DB + router + page pattern for both tracks.
- **Authentic data only.** Never auto-seed volatile data (tuition, employer names, live jobs). Only stable reference data is seeded.
- **Keep two tracks parallel** (routers, schemas, pages) so education and employment don't tangle.
- **Update `CLAUDE.md` and this file** whenever a new concept/table/component is added.
- **Commit after each working milestone.** Secrets stay out of Git.
- **`assigned_counselor` and `created_by` on students/candidates** FK to `auth.users` (which is empty — we run solo via service key). These are **deliberately omitted** from create/update schemas and forms. Do NOT send them. Wire when auth is added.
- **Status values differ by track.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed" not "enrolled").
- **Target chain field types.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing types silently fails.
- **Selector re-fetch on edit.** On opening a student/candidate for edit, the selector must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.
- **Both roadmap components are conditionally interactive.** `AdmissionRoadmap.jsx` renders Pending/Current/Done controls (hitting `student_progress.py`) when given a `studentId` prop; stays read-only without it (Destination Explorer, Students ADD mode). `PlacementRoadmap.jsx` renders interactive controls (hitting `candidate_progress.py`) when given a `candidateId` prop; stays read-only without it (Candidates ADD mode). Pattern is intentional — no ID exists in ADD mode.
- **Explicit-null pattern for clearing optional FK fields.** When a user clears an optional FK (e.g. "Referred By Partner" → "none"), the frontend `buildPayload` must **always** send the field as either the UUID string or JSON `null` — never omit it, never send an empty string. The backend PATCH handler must detect a sent-but-null value via `model_dump(exclude_unset=True)` and apply `None` to clear the column. The default `model_dump(exclude_none=True)` silently drops the key and leaves the old value. Currently applied to `referred_by_partner_id` on inquiries/students/candidates and to payer link fields on service_fees.
- **`service_fees` is finance-RLS-gated.** Uses `can_view_accounting()` for select/insert/update, matching the accounting tables. When auth is wired, only owner, manager, and accountant roles can see or edit fee records.

---

## 9. Immediate Next Step

**Deferred checklists** — next build chunk.

`application_checklist` and `job_application_checklist` tables already exist in the database. Goals: (a) seed checklist items from the program's `admission_requirements` when a new application is created; (b) provide a UI to tick off items per application inside the Applications Kanban drawer; (c) mirror the same flow for `job_application_checklist` inside the Job Applications drawer.

> **Before starting:** ensure all three terminals are running and `curl http://127.0.0.1:8000/api/countries` returns 39 rows.

---

*Snapshot as of June 25, 2026. As building continues this will drift — regenerate at the next milestone. Keep `CLAUDE.md` in sync.*
