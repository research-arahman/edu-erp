# Education ERP / CRM — Project Handoff Document

> **Purpose:** Paste this into a new conversation to continue building without losing context. Exhaustive reference: full stack, complete file inventory, all table schemas, feature design details, build history, and conventions. Self-contained — assume the new assistant knows nothing else. For the lean orientation file Claude CLI loads automatically each session, see CLAUDE.md.

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
Note: new Supabase key format — **publishable = anon**, **secret = service_role**. The secret was rotated after accidental exposure.

---

## 3. Folder / File Structure (complete inventory)

```
edu-erp/
├── CLAUDE.md                          # lean context file Claude CLI reads every session
├── HANDOFF.md                         # this document — full reference, keep in sync
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
│       ├── database.py                # supabase client (service-role key — bypasses RLS)
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
│           ├── inquiries.py           # CRUD + ?status= filter + POST /{id}/convert (→student) + POST /{id}/convert-candidate (→candidate)
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
│       │   ├── api.js                 # fetch wrapper; methods: get/post/patch/put/delete
│       │   └── search.js              # matchesQuery(record, query) — shared client-side forgiving search helper
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
│           ├── Students.jsx                 # WORKING (full enriched profile + EducationSelector + interactive AdmissionRoadmap + partner picker + search box)
│           ├── Candidates.jsx               # WORKING (full enriched profile + EmploymentSelector + interactive PlacementRoadmap + partner picker + search box)
│           ├── Applications.jsx             # WORKING (Kanban 8 cols = app_stage; drag-to-stage; create/edit drawer)
│           ├── JobApplications.jsx          # WORKING (Kanban 7 cols = job_stage; drag-to-stage; create/edit drawer)
│           ├── Inquiries.jsx                # WORKING (table + badges; filters; drawer with interest_track, conditional interest_level, partner picker; convert-to-student + convert-to-candidate with confirm + banners; emerald indicator when already converted)
│           ├── ReferralPartners.jsx         # WORKING (list + add/edit drawer; formatted commission; active/inactive badge; PARTNERS nav group)
│           ├── ServiceFees.jsx              # WORKING (list table; direction & status badges; filters; add/edit drawer with conditional payer link)
│           ├── Tasks.jsx                    # placeholder
│           └── Accounting.jsx               # placeholder
└── supabase/
    ├── config.toml
    └── migrations/                    # all applied; push with `supabase db push`
        ├── *_create_enums.sql
        ├── *_create_countries_institutes.sql
        ├── *_create_programs.sql
        ├── *_create_students.sql
        ├── *_add_staff_roles.sql
        ├── *_create_profiles.sql
        ├── *_add_rls_policies.sql
        ├── *_create_inquiries.sql
        ├── *_create_applications.sql
        ├── *_create_activity_log.sql
        ├── *_create_journey.sql
        ├── *_create_accounting.sql
        ├── *_create_tasks.sql
        ├── *_create_ssw_reference.sql
        ├── *_create_employers.sql
        ├── *_create_jobs.sql
        ├── *_create_candidates.sql
        ├── *_create_job_applications.sql
        ├── *_create_admission_templates.sql
        ├── *_add_program_requirements.sql
        ├── *_create_student_step_progress.sql   # per-student per-step progress tracking
        ├── *_create_placement_templates.sql     # placement_templates + placement_steps
        ├── *_create_candidate_step_progress.sql # per-candidate per-step progress tracking
        ├── *_create_referral_partners.sql       # referral_partners table
        ├── *_add_referred_by_partner.sql        # referred_by_partner_id FK on inquiries/students/candidates
        ├── *_create_service_fees.sql            # service_fees table (finance-RLS-gated)
        ├── *_add_converted_candidate_id.sql     # converted_candidate_id (uuid FK → candidates) on inquiries
        └── *_add_interest_track.sql             # interest_track text CHECK ('education'|'employment') on inquiries
```

---

## 4. What's Built & Working

**Database (Supabase cloud):** complete — all tables created, all RLS policies applied, all migrations pushed.

**Backend (FastAPI):** running locally, talks to Supabase. All endpoints under `/api`:
- `GET /` and `GET /health`
- **Countries** CRUD
- **Institutes** CRUD (+ filters)
- **Programs** CRUD + program sessions sub-resource
- **Admission Templates** CRUD + admission steps sub-resource
- **Placement Templates** CRUD + placement steps sub-resource (mirrors admission templates)
- **Industries** CRUD over `industry_fields` (+ `?country_id=` filter)
- **Employers** CRUD (+ `?country_id=&industry_field_id=` filters)
- **Jobs** CRUD (+ `?employer_id=` filter); `GET /qualification-types` (read-only list)
- **Students** CRUD — full enriched profile (passport, financial, supporter, academic sections); `assigned_counselor`/`created_by` deliberately omitted
- **Candidates** CRUD — full enriched profile (passport, financial, work background, structured language/skills); same omission
- **Student progress** — `GET /students/{id}/progress`; `PUT /students/{id}/steps/{step_id}/progress` (upsert); `DELETE` (reset to pending)
- **Candidate progress** — `GET /candidates/{id}/progress`; `PUT /candidates/{id}/steps/{step_id}/progress` (upsert); `DELETE` (reset to pending)
- **Inquiries** — CRUD; `GET` supports `?status=` filter; `POST /{id}/convert` creates a student, marks inquiry converted + sets `converted_student_id`; `POST /{id}/convert-candidate` creates a candidate, marks inquiry converted + sets `converted_candidate_id`; **convert-once guard** on both endpoints (HTTP 400 if already converted); `assigned_to`/`created_by` omitted until auth
- **Applications** — CRUD; `GET` list enriches each row with `student_name`, `program_name`, `program_level`; `PATCH` for stage change on drag
- **Job Applications** — CRUD; `GET` list enriches each row with `candidate_name`, `job_title`, `employer_name`; `PATCH` for stage change on drag
- **Referral Partners** — CRUD; `GET` supports `?type=` & `?is_active=` filters
- **Service Fees** — CRUD; `GET` supports `?status=&direction=&partner_id=&student_id=&candidate_id=` filters; list enriches rows with `partner_name` / `student_name` / `candidate_name`
- **Cascading selector endpoints** — education + employment chains (read-only)

**Frontend (React):** running locally at `localhost:5173`. Fully working pages:
- **Countries** — lists all 39
- **Institutes** — full CRUD
- **Programs** — full CRUD + requirement dropdowns + sessions
- **Admission Templates** — full CRUD + ordered steps with free-text timeframes
- **Placement Templates** — full CRUD + ordered steps (mirrors Admission Templates; nav under Employment group)
- **Industries** — full CRUD over `industry_fields`
- **Employers** — full CRUD; country + industry field dropdowns
- **Jobs** — full CRUD; employer dropdown + structured SSW language/skills requirement dropdowns
- **Destination Explorer** — standalone read-only cascading selector for both tracks; Education/Employment toggle
- **Students** — full enriched profile (passport, financial, supporter/sponsor, academic/career sections) + embedded `EducationSelector` saving `target_*` + **interactive** `AdmissionRoadmap` (Pending/Current/Done per step, persisted to `student_step_progress`; read-only in ADD mode) + optional "Referred By (Partner)" dropdown (explicit-null pattern on clear) + **search box** filtering loaded records via `matchesQuery`
- **Candidates** — full enriched profile (passport, financial, work background, structured language/skills dropdowns from `qualification_types`) + embedded `EmploymentSelector` saving `target_*` + **interactive** `PlacementRoadmap` (Pending/Current/Done per step, persisted to `candidate_step_progress`; read-only in ADD mode) + optional "Referred By (Partner)" dropdown + **search box** filtering loaded records via `matchesQuery`
- **Inquiries** — lead tracker table with colored status badges (new/contacted/qualified/converted/lost), status filter buttons, add/edit drawer with: name, phone, email, source dropdown, interest_country_id, **interest_track** (Education/Employment dropdown), **interest_level** (prog_level values, shown ONLY when interest_track==='education'), status, follow_up_date, notes, partner picker; **"Convert to Student"** and **"Convert to Candidate"** buttons with `window.confirm`, "Converting…" state, green success banner (auto-dismiss 5s), red error banner; buttons hidden when already converted, replaced by **emerald indicator strip** ("✓ Converted to student" / "✓ Converted to candidate"); page-level error banner reserved for initial load only
- **Applications** — Kanban board with 8 columns = `app_stage` values; native HTML5 drag-and-drop (no new npm dep); drag-to-change-stage persists via `PATCH`; create/edit drawer with student + program pickers, stage, status, decision_notes; `application_checklist` deferred
- **Job Applications** — Kanban board with 7 columns = `job_stage` values; same drag-and-drop pattern; create/edit drawer with candidate + job pickers; `job_application_checklist` deferred
- **Referral Partners** — list table + add/edit drawer; commission formatted (e.g. "15000 BDT (fixed)" / "10% (percentage)"); active/inactive badge; nav under **PARTNERS** group
- **Service Fees** — list table; colored direction & status badges; status/direction filter buttons; add/edit drawer with payer_type selector (partner / student / other) and a **conditional link dropdown** that swaps by payer_type and clears stale links using the explicit-null pattern; nav under **PARTNERS** group

**Reusable components:** `EducationSelector.jsx`, `EmploymentSelector.jsx`, `AdmissionRoadmap.jsx`, `PlacementRoadmap.jsx`

**Shared helper:** `lib/search.js` — `matchesQuery(record, query)` for client-side multi-field forgiving search.

**Data seeded:** 39 countries (Japan = id 1); 16 SSW industry fields; JLPT/JFT/SSW qual types; one real institute (Yamaguchi University); one admission template (Japan Master's Research); one placement template (Japan Nursing Care SSW, country 1, industry 1); one referral partner (Sakura Japanese Language Center, type: language_center, fixed 15000 BDT commission).

---

## 5. Database Schema / State

**Supabase project:** `edu-erp`, ref `fhzjizgsxlowjxzocasj`, region Oceania (Sydney). CLI linked locally. Migrations pushed with `supabase db push`.

### Enums
- `user_role`: owner, manager, counselor, student, team_leader, staff, accountant (+ legacy values)
- `prog_level`: bachelors, masters, phd, language
- `app_stage`: inquiry → profile_assessment → shortlisting → document_collection → application_submitted → offer_received → visa_processing → enrolled
- `job_stage`: applied → screening → interview → offer → coe_processing → visa_processing → placed

### Tables (all have RLS enabled)

**Education / core CRM:**
- `countries` (int PK) — **39 rows seeded** (name, iso_code, region, currency, is_active). Japan = id 1.
- `institutes` (uuid PK) — type: university/language_school/diploma; ownership; city; living-expense; dormitory; services. `country_id` is INT.
- `programs` (uuid PK) — `institute_id` (uuid FK), level_category, level_label, department, course_name, fees, currency, duration_months; + requirement fields: `language_test_accepted` (text), `min_language_level` (text), `moi_accepted` (bool)
- `program_sessions` (uuid PK) — session_name, start_date, application_deadline, seats, is_open (intakes per program)
- `admission_requirements` (uuid PK) — per-program checklist template items
- `students` (uuid PK) — full enriched profile: passport (number, issue_date, expiry, country), financial (annual_income float, income_currency, income_source), supporter/sponsor (name, relation, occupation, income float, currency), academic (highest_qualification, academic_summary, career_summary, purpose), target chain fields, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status: **active / archived / enrolled / dropped**. `assigned_counselor` + `created_by` FK to `auth.users` — **deliberately omitted from API** until auth is wired.
- `inquiries` (uuid PK) — lead tracker: new → contacted → qualified → converted/lost; **referred_by_partner_id (uuid nullable FK → referral_partners)**; **converted_student_id (uuid nullable FK → students)**; **converted_candidate_id (uuid nullable FK → candidates)**; **interest_track (text nullable CHECK IN ('education','employment'))** — which service track the lead is pursuing; **interest_level (text, prog_level values)** — education-track only, not a DB enum constraint, treated as education-specific in UI. **Convert-once guard:** both `/convert` and `/convert-candidate` reject HTTP 400 if `status='converted'` OR `converted_student_id IS NOT NULL` OR `converted_candidate_id IS NOT NULL`.
- `applications` (uuid PK) + `application_checklist` (uuid PK) — 8-stage education pipeline via `app_stage`
- `journey_stages` (8 seeded rows) + `student_journey` — original roadmap tables (not currently in use; superseded by `student_step_progress`)
- `admission_templates` (uuid PK) — **reusable per (country_id INT + level_category text), UNIQUE on pair**; name, description
- `admission_steps` (uuid PK) — ordered steps: step_order, title, description, **timeframe (FREE TEXT, never structured date)**
- `student_step_progress` (uuid PK) — **per-student per-step progress state**. student_id (uuid FK → students), step_id (uuid FK → admission_steps), status ('pending'|'current'|'done', default 'pending'), note (text), updated_at, created_at. **UNIQUE(student_id, step_id).** Upserted on update; deleted on reset.
- `candidate_step_progress` (uuid PK) — **per-candidate per-step progress state**. Mirrors `student_step_progress`: candidate_id (uuid FK → candidates ON DELETE CASCADE), step_id (uuid FK → placement_steps ON DELETE CASCADE), status ('pending'|'current'|'done', default 'pending'), note (text), updated_at, created_at. **UNIQUE(candidate_id, step_id).**

**Staff & access:**
- `profiles` (uuid PK, references `auth.users`) — role (`user_role` enum), **position** (job title text), **team** (text), **team_leader_id** (self-ref uuid FK → profiles); auto-created via trigger on signup. Currently **EMPTY** (running solo via service key — no real users).
- `activity_log` — **immutable** audit trail (insert + select only, NO update/delete, not even for managers)

**Employment / SSW track:**
- `industry_fields` (int PK) — **Japan's 16 SSW fields seeded** (country-scoped, is_ssw flag)
- `qualification_types` (int PK) — **JLPT, JFT-Basic, SSW Skills Test seeded**; has `levels[]` array
- `employers` (uuid PK) — company DB; country_id (int FK), industry_field_id (int FK), is_ssw_registered, housing_support, contact person/phone/email
- `jobs` (uuid PK) — openings; structured requirements (req_language_qual_id int FK + req_language_level text, req_skills_qual_id int FK), salary_min/max float, currency, start_period text, positions_available int
- `candidates` (uuid PK) — full enriched profile: passport, financial, work background (current_occupation, total_experience_years int, highest_qualification, work_history), structured language proficiency (language_qual_id int FK → qualification_types, language_level text), structured skills proficiency (skills_qual_id int FK, skills_detail text), target chain, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status: **active / archived / placed / dropped** (note: "placed" not "enrolled"). `assigned_counselor` + `created_by` — **deliberately omitted from API** until auth is wired.
- `job_applications` (uuid PK) + `job_application_checklist` (uuid PK) — employment pipeline via `job_stage`
- `placement_templates` (uuid PK) — **reusable per (country_id INT + industry_field_id INT), UNIQUE on pair**; name, description, is_active. Parallel to `admission_templates`.
- `placement_steps` (uuid PK) — ordered steps per placement template: step_order, title, description, **timeframe (FREE TEXT)**. template_id (uuid FK → placement_templates ON DELETE CASCADE).

**Partners & fees:**
- `referral_partners` (uuid PK) — name (text NOT NULL), type (text CHECK IN ('firm','language_center','individual')), contact_person (text), phone (text), email (text), address (text), commission_basis (text CHECK IN ('percentage','fixed')), commission_rate (float), commission_currency (text default 'BDT'), notes (text), is_active (bool default true), created_at, updated_at.
- `service_fees` (uuid PK) — direction (text CHECK IN ('incoming','outgoing') default 'incoming'), payer_type (text CHECK IN ('partner','student','other')), partner_id (uuid nullable FK → referral_partners), student_id (uuid nullable FK → students), candidate_id (uuid nullable FK → candidates), amount (float NOT NULL ≥ 0), currency (text default 'BDT'), milestone (text CHECK IN ('on_referral','on_coe','on_visa','on_enrollment','on_placement','custom')), description (text), status (text CHECK IN ('pending','invoiced','paid','cancelled') default 'pending'), due_date (date), paid_date (date), notes (text), created_at, updated_at. **Finance-RLS-gated: `can_view_accounting()` for select/insert/update; `can_delete()` for delete.**

**Accounting (finance-RLS-gated via `can_view_accounting()` — owner/manager/accountant only):**
- `accounts` (int code PK) — **full chart of accounts seeded, codes 1000–6400** (assets, liabilities, equity, revenue, COGS, opex)
- `transactions` — gateway-ready (Stripe/PayPal fields nullable until registered); debit/credit
- `investments`, `commissions` — capital + consultant commission tracking

**Task management:**
- `daily_task_templates`, `tasks`, `notifications`

### Target chain field types
- **Students:** `target_country_id` INT; `target_institute_id` / `target_program_id` / `target_session_id` UUID (str)
- **Candidates:** `target_country_id` INT; `target_industry_id` INT; `target_employer_id` / `target_job_id` UUID (str); `target_start_period` text

### RLS helper functions
- `current_user_role()` — reads role from profiles
- `can_delete()` — true only for `owner` + `manager`
- `can_view_accounting()` — `owner` + `manager` + `accountant` only
- `can_manage_tasks()` — `owner` + `manager` + `team_leader`

### Security note (deferred)
Backend currently connects with the **service-role key**, which **bypasses RLS**. API does not yet enforce who can delete or view finance data — the DB rules exist but the backend acts as admin. Fine while solo. `service_fees` and accounting tables already have finance-RLS policies in place — they will enforce correctly once auth is wired. **JWT auth is a required step before real staff log in.**

---

## 6. The Signature Feature — Cascading Destination Selectors

Data-driven dependent dropdowns that show **ONLY data that exists** (never generic/hardcoded options). Backend selector endpoints exist for both tracks; the UI is DONE as `DestinationExplorer.jsx` (standalone) and as embedded components (`EducationSelector.jsx`, `EmploymentSelector.jsx`) inside Students/Candidates.

**Education chain:**
```
Country → institute type (university / language_school / diploma)
  → University path: ownership → degree level → department → course → session
  → Language path:   level_category (jlpt/english/topik...) → level_label
                     (N5, IELTS Prep...) → school → session
```
Each completed selection feeds the student's `target_*` fields and drives the interactive `AdmissionRoadmap.jsx` (loads the admission template for that country × level).

**Employment chain (parallel):**
```
Country → Industry/SSW field → Employer → Job position → start period
```
Feeds `candidate.target_*` fields and drives the interactive `PlacementRoadmap.jsx` (loads the placement template for that country × industry).

**Selector re-fetch behavior (important):** On opening a student/candidate for edit, the selectors must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.

---

## 7. Process Templates (admission + placement)

Both tracks have **reusable process templates** defining the step-by-step journey for a given context. They follow the same pattern.

### Admission Templates (Education track)
Keyed by **(country_id INT + level_category text)**, UNIQUE on the pair. `level_category` matches `programs.level_category`.
- `admission_templates` / `admission_steps` — steps have step_order, title, description, free-text timeframe (never a structured date).
- `AdmissionRoadmap.jsx` — **interactive** when given a `studentId` prop: renders each step with Pending/Current/Done controls that upsert to `student_step_progress`. **Read-only** when no `studentId` (Destination Explorer, Students ADD mode).
- `student_step_progress` — the per-student state store for admission step progress. UNIQUE(student_id, step_id). Upserted on update; deleted (reset) on demand.

### Placement Templates (Employment track)
Keyed by **(country_id INT + industry_field_id INT)**, UNIQUE on the pair. Parallel to admission templates but for employment.
- `placement_templates` / `placement_steps` — same structure as admission side.
- `PlacementRoadmap.jsx` — **interactive** when given a `candidateId` prop; **read-only** without it (Destination Explorer, Candidates ADD mode). Mirrors `AdmissionRoadmap.jsx` exactly.
- `candidate_step_progress` — the per-candidate state store. UNIQUE(candidate_id, step_id). ON DELETE CASCADE for both FKs.
- One template seeded: **Japan Nursing Care (SSW)** (country 1, industry 1).

**Level dropdown values (admission templates & programs):** Bachelor's, Master's, PhD, Diploma, Foundation/Pathway, JLPT (Japanese), English, TOPIK (Korean), Other.

---

## 8. Build History (Completed Chunks)

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
  - **Step 2:** `*_add_referred_by_partner.sql` migration adds `referred_by_partner_id` (uuid nullable FK → referral_partners, indexed) to `inquiries`, `students`, `candidates`; field added to all six schemas; "Referred By (Partner)" dropdown on all three forms. Explicit-null pattern implemented in `buildPayload` so clearing the link sends JSON `null`.
  - **Step 3:** `service_fees` table migration (finance-RLS-gated via `can_view_accounting()`) + `service_fees.py` router (CRUD, multi-filter GET, enriched list) + `ServiceFeeCreate`/`ServiceFeeUpdate` schemas + `ServiceFees.jsx` page (list table, conditional payer link by payer_type that swaps and clears stale links on change). Standalone tracker; accounting (transactions) tie-in is a later enhancement.
- ✅ **C10 — Inquiry → Student + Candidate conversion + interest_track + search:**
  - **Conversion endpoints:** `POST /inquiries/{id}/convert` (→ student) and `POST /inquiries/{id}/convert-candidate` (→ candidate). Each carries over name/phone/email/interest_country_id→target_country_id/referred_by_partner_id; sets `status='active'`; marks inquiry `status='converted'` and sets `converted_student_id` or `converted_candidate_id`. Does NOT set `assigned_counselor`/`created_by`. Returns `{student/candidate, inquiry}`. **Convert-once guard:** HTTP 400 if `status='converted'` OR `converted_student_id IS NOT NULL` OR `converted_candidate_id IS NOT NULL`.
  - **Conversion UI:** "Convert to Student" and "Convert to Candidate" buttons in the edit drawer, each with `window.confirm`, "Converting…" state, green success banner (auto-dismiss 5s + ✕), red error banner. Both buttons hidden when already converted; replaced by an emerald indicator strip. Optimistic local state update + refetch so the table badge flips.
  - **interest_track field:** migration adds `interest_track text CHECK ('education'|'employment')` to `inquiries`; added to schemas. "Interest Track" dropdown in form; `interest_level` shows only when `interest_track==='education'` and is cleared on switch to employment.
  - **Client-side search:** `frontend/src/lib/search.js` exporting `matchesQuery(record, query)`. Matches: full_name/email (case-insensitive substring); phone (digits-only substring); date_of_birth (normalizes to YYYYMMDD/DDMMYYYY/MMDDYYYY plus raw YYYY/MM/DD fragments). Search box added to Students.jsx and Candidates.jsx.

---

## 9. Exact Terminal Setup

Three terminals. **Never run `npm` in the backend folder or `uvicorn` in the frontend folder.**

**Terminal 1 — Backend** (FastAPI):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp/backend
source venv/bin/activate
uvicorn app.main:app --reload --reload-dir app
```
Wait for "Application startup complete." Leave running. (`--reload-dir app` prevents watching venv.)

**Terminal 2 — Frontend** (Vite):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp/frontend
npm run dev
```
Wait for the `localhost:5173` line. Leave running. **Restart whenever `vite.config.js` changes.**

**Terminal 3 — Working terminal** (git, supabase, Claude CLI):
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp
```

**Health check:** `curl http://127.0.0.1:8000/api/countries` → 39 countries; `http://localhost:5173` → app loads.

**Database migration workflow:**
```bash
supabase migration new <descriptive_name>
code supabase/migrations/*_<name>.sql    # edit in VS Code, NEVER paste SQL in terminal
supabase db push                          # confirm with Y
git add supabase/migrations/ && git commit -m "..." && git push
```

---

## 10. Remaining Work (in order)

1. **Deferred checklists** (NEXT) — `application_checklist` and `job_application_checklist` tables already exist in the database. Goals: (a) seed checklist items from the program's `admission_requirements` when a new application is created; (b) provide a UI to tick off items per application inside the Applications Kanban drawer; (c) mirror the same flow for `job_application_checklist` inside the Job Applications drawer.

2. **Tasks UI, Accounting UI** (optionally wire `service_fees` into `transactions`); **Dashboards.**

3. **Authentication + RBAC enforcement** — backend still uses service key and bypasses RLS entirely; `profiles` table empty (that's why `assigned_to`/`created_by`/`assigned_counselor` are omitted everywhere). Note: `service_fees` and accounting tables already have finance-RLS policies — they enforce correctly once auth is wired. Wire Supabase Auth + JWT so RLS actually enforces per-user access. **Critical before any real staff log in.**

4. **Backend search endpoints for Students/Candidates** — current client-side search (`lib/search.js`) is fine for hundreds of records. If data grows large, add `?q=` query params to the GET endpoints to push filtering to the DB.

5. **Google Drive document integration** (service-account), then **Render deployment**.

---

## 11. Key Decisions & Conventions

- **One step at a time.** Finish, confirm "done", then next.
- **Terminal vs editor.** SQL and code go in the VS Code editor, never pasted into the terminal.
- **UUID vs INT — the recurring trap.** UUID PKs: institutes, programs, employers, candidates, students, jobs, admission_templates, admission_steps, placement_templates, placement_steps, referral_partners, service_fees, student_step_progress, candidate_step_progress. INT PKs: countries, industry_fields, qualification_types, accounts. FK types in routers/schemas must match. Always check before writing a new router.
- **Money fields: `float`, NEVER `Decimal`.** Decimal is not JSON-serializable (caused an early crash).
- **API under `/api` prefix.** All backend routes mounted under `/api`; Vite proxy has a single `/api` rule. React Router owns everything else.
- **`api.js` has five HTTP methods:** `get`, `post`, `patch`, `put`, `delete`. The `put` method was missing until an earlier session — always use `api.put(...)` for upserts, never fall back to `api.post(...)`.
- **RLS pattern:** select/insert/update for `authenticated`; delete via `can_delete()` only (owner + manager). Accounting and `service_fees` restricted via `can_view_accounting()`. Activity log immutable.
- **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign).
- **Roles vs job titles:** `user_role` enum = permission tiers (owner > manager > team_leader > staff/accountant). Job titles live in `profiles.position`. `team_leader` CANNOT delete.
- **Reusable process templates for both tracks.** Admission templates keyed by (country + study level); placement templates keyed by (country + industry_field). Both use free-text timeframes. Always follow the same DB + router + page pattern for both tracks.
- **Authentic data only.** Never auto-seed volatile data (tuition, employer names, live jobs). Only stable reference data is seeded.
- **Keep two tracks parallel** (routers, schemas, pages) so education and employment don't tangle.
- **Update `CLAUDE.md` and `HANDOFF.md`** whenever a new concept/table/component is added.
- **Commit after each working milestone.** Secrets stay out of Git.
- **`assigned_counselor` and `created_by` on students/candidates** FK to `auth.users` (which is empty — we run solo via service key). These are **deliberately omitted** from create/update schemas and forms. Do NOT send them. Wire when auth is added.
- **Status values differ by track.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed" not "enrolled").
- **Target chain field types.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing types silently fails.
- **Selector re-fetch on edit.** On opening a student/candidate for edit, the selector must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.
- **Both roadmap components are conditionally interactive.** `AdmissionRoadmap.jsx` renders Pending/Current/Done controls (hitting `student_progress.py`) when given a `studentId` prop; stays read-only without it (Destination Explorer, Students ADD mode). `PlacementRoadmap.jsx` same with `candidateId` prop. Pattern is intentional — no ID exists in ADD mode.
- **Explicit-null pattern for clearing optional FK fields.** When a user clears an optional FK (e.g. "Referred By Partner" → "none"), the frontend `buildPayload` must **always** send the field as either the UUID string or JSON `null` — never omit it, never send an empty string. The backend PATCH handler must detect a sent-but-null value via `model_dump(exclude_unset=True)` and apply `None` to clear the column. The default `model_dump(exclude_none=True)` silently drops the key and leaves the old value. Currently applied to `referred_by_partner_id` on inquiries/students/candidates and to payer link fields on service_fees.
- **`service_fees` is finance-RLS-gated.** Uses `can_view_accounting()` for select/insert/update, matching the accounting tables. When auth is wired, only owner, manager, and accountant roles can see or edit fee records.
- **Client-side search lives in `lib/search.js`.** The shared `matchesQuery(record, query)` helper handles forgiving multi-field search. Name/email: case-insensitive substring. Phone: digit-strip then substring. Date of birth: normalize to YYYYMMDD/DDMMYYYY/MMDDYYYY plus raw YYYY/MM/DD fragments; match if query digits are a substring of any form. Import this helper — do NOT inline it per page. If data grows large, add `?q=` server-side filtering and remove the client filter.
- **Inquiry conversion is convert-once, one-destination.** Both `/convert` (→ student) and `/convert-candidate` (→ candidate) check: `status != 'converted'`, `converted_student_id IS NULL`, and `converted_candidate_id IS NULL`. If any fails: HTTP 400 "Inquiry already converted." An inquiry converts to a student OR a candidate — never both, never twice. The frontend hides the buttons and shows an emerald indicator strip when already converted.
- **`interest_track` vs `interest_level` — do not conflate.** `interest_track` is a separate text column on `inquiries` ('education'|'employment'|null) — it marks which service track the lead is pursuing, deliberately NOT a `prog_level` enum value. `interest_level` uses `prog_level` values (bachelors/masters/phd/language) and is education-track only. In the UI, render `interest_level` conditionally (only when `interest_track === 'education'`) and clear it when switching to employment. Follow this conditional-render + clear-on-switch pattern for any future track-specific fields.

---

## 12. Immediate Next Step

**Deferred checklists** — next build chunk.

`application_checklist` and `job_application_checklist` tables already exist in the database. Goals: (a) seed checklist items from the program's `admission_requirements` when a new application is created; (b) provide a UI to tick off items per application inside the Applications Kanban drawer; (c) mirror the same flow for `job_application_checklist` inside the Job Applications drawer.

> **Before starting:** ensure all three terminals are running and `curl http://127.0.0.1:8000/api/countries` returns 39 rows.

---

*Snapshot as of June 25, 2026. As building continues this will drift — regenerate at the next milestone. Keep CLAUDE.md in sync.*
