# Education ERP / CRM — Project Handoff Document

> **Purpose:** Paste this into a new conversation to continue building without losing context. Exhaustive reference: full stack, complete file inventory, all table schemas, feature design details, build history, and conventions. Self-contained — assume the new assistant knows nothing else. For the lean orientation file Claude CLI loads automatically each session, see CLAUDE.md.

**Owner:** Mohd Abdur Rahman
**GitHub:** `research-arahman/edu-erp` (branch `main`)
**Local path:** `~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`
**Last updated:** End of session, June 26, 2026
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
| Backend | **FastAPI** (Python) | fastapi 0.137.1, uvicorn 0.49.0, supabase-py 2.31.0, pydantic 2.13.4, python-dotenv 1.2.2, PyJWT[crypto] (ES256 JWT verification), google-api-python-client 2.197.0 |
| Python | CPython | 3.11 (venv at `backend/venv`) |
| Frontend | **React + Vite + Tailwind** | Vite 8.0.16, react-router-dom 7.18.0, @supabase/supabase-js |
| Source control | **Git / GitHub** | repo `research-arahman/edu-erp` |
| Agentic coding | **Claude Code (CLI)** | Sonnet model, used inside the repo for bulk code |
| Hosting (planned) | **Render** | not yet deployed |
| Documents (planned) | **Google Drive API** | service-account approach, not yet wired |
| Dev OS | macOS (zsh, conda `base` active, Homebrew) | — |

**Backend env** (`backend/.env`, gitignored):
```
SUPABASE_URL=https://fhzjizgsxlowjxzocasj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   (rotated; backend only — bypasses RLS)
SUPABASE_ANON_KEY=sb_publishable_...       (safe for frontend)
SUPABASE_JWT_SECRET=...                    (present; NOT used for token verification — JWKS/ES256 used instead)
```
Note: new Supabase key format — **publishable = anon**, **secret = service_role**. The secret was rotated after accidental exposure.

**Frontend env** (`frontend/.env`, gitignored, new):
```
VITE_SUPABASE_URL=https://fhzjizgsxlowjxzocasj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```
These must also be set as build-time env vars on Render when deploying.

---

## 3. Folder / File Structure (complete inventory)

```
edu-erp/
├── CLAUDE.md                          # lean context file Claude CLI reads every session
├── HANDOFF.md                         # this document — full reference, keep in sync
├── README.md
├── .gitignore                         # ignores .env, venv/, node_modules/, service-account.json
├── backend/
│   ├── .env                           # Supabase keys + SUPABASE_JWT_SECRET (gitignored)
│   ├── requirements.txt               # includes PyJWT[crypto] for ES256
│   ├── venv/                          # Python 3.11 virtualenv (gitignored)
│   ├── seeds/
│   │   └── seed_countries.py          # idempotent country seeder (already run → 39 countries)
│   └── app/
│       ├── __init__.py
│       ├── config.py                  # loads SUPABASE_* env vars (SUPABASE_JWT_SECRET present but unused for verification)
│       ├── auth.py                    # JWKS/ES256 JWT verification; get_current_user dep (extracts sub, loads profile,
│       │                              #   returns id+email+role+profile fields; role=None if no profile; 403 if is_active=False);
│       │                              #   get_current_user_optional; require_role(*roles) dependency factory
│       ├── database.py                # supabase client (service-role key — bypasses RLS)
│       ├── main.py                    # FastAPI app; CORS; all routers mounted under /api prefix
│       ├── schemas.py                 # Pydantic models — money fields = float, never Decimal;
│       │                              #   StaffCreate / StaffUpdate added for admin_users
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
│           ├── selector_employment.py # read-only cascading selector endpoints (employment chain)
│           ├── admin_users.py         # owner-only: GET /admin/users (list+resolve team_leader_name);
│           │                          #   POST /admin/users (create Supabase auth user via admin API + PATCH profile);
│           │                          #   PATCH /admin/users/{id} (edit profile; self-lockout guard)
│           └── tasks.py               # ALL endpoints Depends(get_current_user) — auth-gated;
│                                      #   POST /tasks (task_type='assigned'; assigned_by=current user;
│                                      #     assigned_to omitted = self-assign; validates assignee is_active);
│                                      #   GET /tasks/mine?status= (tasks assigned to me; enriched names);
│                                      #   GET /tasks/assigned?status= (tasks I can see/manage; enriched names);
│                                      #   PATCH /tasks/{id} (status='done'→sets completed_at; explicit-null for related_*;
│                                      #     re-checks scope on reassign);
│                                      #   DELETE /tasks/{id};
│                                      #   GET /tasks/assignable-users (scope-filtered per assignment rule B)
├── frontend/
│   ├── .env                           # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (gitignored)
│   ├── vite.config.js                 # proxy: '/api' → http://127.0.0.1:8000 (single clean rule)
│   ├── package.json                   # includes @supabase/supabase-js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                    # BrowserRouter + all routes; GATED: loading → Login → app (wrapped in AuthProvider)
│       ├── index.css                  # Tailwind
│       ├── lib/
│       │   ├── api.js                 # fetch wrapper; methods: get/post/patch/put/delete;
│       │   │                          #   all methods attach Authorization: Bearer <access_token> automatically
│       │   ├── supabase.js            # Supabase JS client; persists session in localStorage; auto-refreshes tokens
│       │   └── search.js              # matchesQuery(record, query) — shared client-side forgiving search helper
│       ├── context/
│       │   └── AuthContext.jsx        # useAuth hook; tracks session via getSession + onAuthStateChange;
│       │                              #   on session, calls GET /api/me to load profile as `user`;
│       │                              #   exposes: user, loading, login(email,password), logout()
│       ├── components/
│       │   ├── Layout.jsx                   # sidebar nav + header; groups: Dashboard / Education / Employment /
│       │   │                                #   Data / Operations / PARTNERS /
│       │   │                                #   TASKS (My Tasks always; Assign/Manage only for owner/manager/team_leader) /
│       │   │                                #   ADMIN (owner-only, shows Staff link);
│       │   │                                #   header: logged-in user name+role + Logout button
│       │   ├── EducationSelector.jsx        # reusable cascading education selector; saves target_* on student
│       │   ├── EmploymentSelector.jsx       # reusable cascading employment selector; saves target_* on candidate
│       │   ├── AdmissionRoadmap.jsx         # INTERACTIVE with studentId prop; read-only without
│       │   └── PlacementRoadmap.jsx         # INTERACTIVE with candidateId prop; read-only without
│       └── pages/
│           ├── Login.jsx                    # WORKING — email/password login; shown when no session
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
│           ├── Staff.jsx                    # WORKING — owner-only; list staff; add/edit/deactivate drawer;
│           │                                #   Role = permission-tier dropdown (owner/manager/counselor/team_leader/accountant/staff; no 'student');
│           │                                #   Position = job-title dropdown (Founder/MD, Operations Manager, Admissions & Visa Lead,
│           │                                #     Senior Education Counselor, Education/Visa Counselor, Operations/Lead Coordinator,
│           │                                #     Administrative/Data Assistant, + Other→free-text);
│           │                                #   Team = 9-dept dropdown; Reports To shows "Full Name (role)"; ADMIN nav group
│           ├── MyTasks.jsx                  # WORKING — every user; tasks assigned to me; todo→in_progress→done status workflow;
│           │                                #   "+ New Personal Task" (self-assign; optional related student/candidate link)
│           ├── ManageTasks.jsx              # WORKING — owner/manager/team_leader only; table of manageable tasks;
│           │                                #   "+ Assign Task" drawer: assignee dropdown from /tasks/assignable-users (scope-enforced);
│           │                                #   priority/due_date; Related To toggle None/Student/Candidate with conditional dropdown;
│           │                                #   edit/reassign/delete; status filter tabs; /manage-tasks route guarded
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
        ├── *_add_interest_track.sql             # interest_track text CHECK ('education'|'employment') on inquiries
        ├── *_fix_handle_new_user_search_path.sql # fixes SECURITY DEFINER trigger: SET search_path = public; schema-qualifies public.profiles
        └── *_add_task_related_links.sql         # related_student_id (uuid FK → students ON DELETE SET NULL)
                                                  # + related_candidate_id (uuid FK → candidates ON DELETE SET NULL) on tasks
```

---

## 4. What's Built & Working

**Database (Supabase cloud):** complete — all tables created, all RLS policies applied, all migrations pushed.

**Backend (FastAPI):** running locally, talks to Supabase. All endpoints under `/api`:
- `GET /` and `GET /health`
- `GET /api/me` — returns current user's identity + profile fields (requires valid JWT)
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
- **Inquiries** — CRUD; `GET` supports `?status=` filter; `POST /{id}/convert` creates a student; `POST /{id}/convert-candidate` creates a candidate; **convert-once guard** on both (HTTP 400 if already converted); `assigned_to`/`created_by` omitted until feature routers are auth-gated
- **Applications** — CRUD; enriched list with student_name/program_name/program_level; `PATCH` for stage change on drag
- **Job Applications** — CRUD; enriched list with candidate_name/job_title/employer_name; `PATCH` for stage change on drag
- **Referral Partners** — CRUD; `GET` supports `?type=` & `?is_active=` filters
- **Service Fees** — CRUD; `GET` supports `?status=&direction=&partner_id=&student_id=&candidate_id=` filters; list enriches rows with partner/student/candidate names
- **Admin Users** (owner-only, `require_role("owner")` on all endpoints):
  - `GET /admin/users` — lists all profiles; resolves `team_leader_id` → `team_leader_name`
  - `POST /admin/users` — creates a Supabase auth user via `supabase.auth.admin.create_user` (email_confirm=True, user_metadata.full_name), then PATCHes the profile with role/team/position/phone/team_leader_id; validates role is a staff role (not 'student')
  - `PATCH /admin/users/{id}` — edits profile fields (NOT email/password); **self-lockout guard**: an owner cannot deactivate or demote their own account (HTTP 400)
  - No hard delete — deactivate via `is_active=false`
- **Tasks** (all endpoints `Depends(get_current_user)` — the first fully auth-gated feature router):
  - `POST /tasks` — create/assign; `task_type='assigned'`; `assigned_by=current_user.id`; omitting `assigned_to` = self-assign; validates assignee is active; optional `related_student_id` / `related_candidate_id`
  - `GET /tasks/mine?status=` — tasks assigned to the current user; enriched with `assigned_by_name`, `related_student_name`, `related_candidate_name`
  - `GET /tasks/assigned?status=` — tasks the current user can see/manage (owner+manager: all; team_leader: assigned by them + their team's; others: assigned by them); enriched with `assigned_to_name`, `assigned_by_name`, related names
  - `PATCH /tasks/{id}` — update; setting `status='done'` sets `completed_at`; clearing it nulls `completed_at`; explicit-null pattern for `related_*`; re-checks scope if reassigning
  - `DELETE /tasks/{id}` — scope-checked
  - `GET /tasks/assignable-users` — returns users the caller may assign to per scope rule B (used by frontend assignee dropdown; non-owners don't need `/admin/users`)
- **Cascading selector endpoints** — education + employment chains (read-only)

**Auth foundation:**
- `backend/app/auth.py` — JWKS/ES256 JWT verification using `PyJWKClient` fetching from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, `algorithms=["ES256"]`, `audience="authenticated"`. Provides: `get_current_user` FastAPI dependency (verifies token, extracts `sub`, loads profile row, returns id+email+role+profile fields; returns `role=None` if no profile row yet; raises 403 if `is_active=False`); `get_current_user_optional`; `require_role(*roles)` factory.
- **Auth-gated routers (all feature routers — security enforcement complete):** Every router under `/api` now requires `Depends(get_current_user)` at the router level — anonymous requests return 401. DELETEs additionally require `require_role("owner","manager")`. `service_fees` is further restricted: all its endpoints require `require_role("owner","manager","accountant")` (finance gate); deletes still require owner/manager only. `/api/admin/*` requires `require_role("owner")`. Verified: anonymous GET /students → 401; owner → 200; owner DELETE → 200; anon DELETE → 401; counselor GET /service-fees → 403; owner GET /service-fees → 200.
- Supabase project configured: Email auth enabled, Confirm-email OFF, JWT signing uses new asymmetric ES256 keys (not legacy HS256 secret).
- **Bug fixed:** `handle_new_user()` profile-creation trigger failed on signup ("relation profiles does not exist") because the `SECURITY DEFINER` function lacked a `search_path`. Fixed via migration `*_fix_handle_new_user_search_path.sql`: recreated with `SET search_path = public` and schema-qualified `public.profiles`. New users now auto-create their profile row on signup.
- **Owner account created:** `educonsultancy.admission@gmail.com`, role=`owner`. full_name is currently the placeholder "Your Real Name" — update it.

**Frontend (React):** running locally at `localhost:5173`. Auth gating: App.jsx shows a loading screen while resolving auth, then Login page if no session, then the full app.

- **Login.jsx** — email/password login page using `useAuth().login()`
- **lib/supabase.js** — Supabase JS client; persists session in localStorage; auto-refreshes tokens
- **lib/api.js** — all five methods (get/post/patch/put/delete) now attach `Authorization: Bearer <access_token>` automatically (from `supabase.auth.getSession()`)
- **context/AuthContext.jsx** — `useAuth()` hook; tracks session via `getSession` + `onAuthStateChange`; on session, calls `GET /api/me` to load the profile as `user`; exposes `user`, `loading`, `login(email,password)`, `logout()`
- **Layout.jsx** — ADMIN sidebar group (owner-only, shows Staff link); header shows logged-in user name/role + Logout button
- **Staff.jsx** — owner-only staff management; list table of profiles; add-staff and edit/deactivate drawers. Dropdowns are now fully typed: Role = permission-tier dropdown (owner/manager/team_leader/counselor/accountant/staff; 'student' excluded; plain-English labels with hint that owner+manager inherit lower abilities incl. finance); Position = job-title dropdown (Founder/MD, Operations Manager, Admissions & Visa Lead, Senior Education Counselor, Education/Visa Counselor, Operations/Lead Coordinator, Administrative/Data Assistant, + Other→free-text; stored as free text); Team = 9-department dropdown; Reports To = "Full Name (role)" display. `/staff` route guarded (redirects non-owners).
- **MyTasks.jsx** — every logged-in user; shows tasks assigned to the current user; status workflow todo → in_progress → done; "+ New Personal Task" creates a self-assigned task with optional related student or candidate link.
- **ManageTasks.jsx** — owner/manager/team_leader only; table of all tasks the current user can manage; "+ Assign Task" drawer with assignee dropdown populated from `GET /tasks/assignable-users` (scope-enforced so team_leader only sees their team), priority, due_date, Related To toggle (None/Student/Candidate with conditional searchable dropdown); edit, reassign, delete; status filter tabs. `/manage-tasks` route guarded.

Fully working feature pages: Countries, Institutes, Programs, AdmissionTemplates, PlacementTemplates, Industries, Employers, Jobs, DestinationExplorer, Students, Candidates, Inquiries, Applications, JobApplications, ReferralPartners, ServiceFees, Login, Staff, MyTasks, ManageTasks.
Placeholders: Accounting, Dashboard. (Tasks.jsx old placeholder removed; replaced by MyTasks.jsx + ManageTasks.jsx.)

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
- `students` (uuid PK) — full enriched profile: passport (number, issue_date, expiry, country), financial (annual_income float, income_currency, income_source), supporter/sponsor (name, relation, occupation, income float, currency), academic (highest_qualification, academic_summary, career_summary, purpose), target chain fields, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status: **active / archived / enrolled / dropped**. `assigned_counselor` + `created_by` FK to `auth.users` — **deliberately omitted from API** until feature routers are auth-gated.
- `inquiries` (uuid PK) — lead tracker: new → contacted → qualified → converted/lost; **referred_by_partner_id (uuid nullable FK → referral_partners)**; **converted_student_id (uuid nullable FK → students)**; **converted_candidate_id (uuid nullable FK → candidates)**; **interest_track (text nullable CHECK IN ('education','employment'))**; **interest_level (text, prog_level values)** — education-track only. **Convert-once guard:** both `/convert` and `/convert-candidate` reject HTTP 400 if `status='converted'` OR `converted_student_id IS NOT NULL` OR `converted_candidate_id IS NOT NULL`.
- `applications` (uuid PK) + `application_checklist` (uuid PK) — 8-stage education pipeline via `app_stage`
- `journey_stages` (8 seeded rows) + `student_journey` — original roadmap tables (not currently in use; superseded by `student_step_progress`)
- `admission_templates` (uuid PK) — **reusable per (country_id INT + level_category text), UNIQUE on pair**; name, description
- `admission_steps` (uuid PK) — ordered steps: step_order, title, description, **timeframe (FREE TEXT, never structured date)**
- `student_step_progress` (uuid PK) — **per-student per-step progress state**. student_id (uuid FK → students), step_id (uuid FK → admission_steps), status ('pending'|'current'|'done', default 'pending'), note (text), updated_at, created_at. **UNIQUE(student_id, step_id).** Upserted on update; deleted on reset.
- `candidate_step_progress` (uuid PK) — **per-candidate per-step progress state**. Mirrors `student_step_progress`: candidate_id (uuid FK → candidates ON DELETE CASCADE), step_id (uuid FK → placement_steps ON DELETE CASCADE), status, note, updated_at, created_at. **UNIQUE(candidate_id, step_id).**

**Staff & access:**
- `profiles` (uuid PK, references `auth.users`) — `id` (uuid, FK auth.users), `full_name` (text), `email` (text), `role` (`user_role` enum), **`position`** (job title free text), **`team`** (text, one of 9 departments), **`team_leader_id`** (self-ref uuid FK → profiles), **`phone`** (text), **`is_active`** (bool default true — used to deactivate leavers without deleting audit trail), created_at, updated_at. Auto-created via `handle_new_user()` trigger on signup (search_path bug fixed). **Currently has one real account:** `educonsultancy.admission@gmail.com` (role=`owner`; full_name = "Abdur Rahman"). `department_id`, `tier`, `reports_to` extensions are **not yet added** — needed for Task Management later phases (see §10A).
- `activity_log` — **immutable** audit trail (insert + select only, NO update/delete, not even for managers)

**Employment / SSW track:**
- `industry_fields` (int PK) — **Japan's 16 SSW fields seeded** (country-scoped, is_ssw flag)
- `qualification_types` (int PK) — **JLPT, JFT-Basic, SSW Skills Test seeded**; has `levels[]` array
- `employers` (uuid PK) — company DB; country_id (int FK), industry_field_id (int FK), is_ssw_registered, housing_support, contact person/phone/email
- `jobs` (uuid PK) — openings; structured requirements (req_language_qual_id int FK + req_language_level text, req_skills_qual_id int FK), salary_min/max float, currency, start_period text, positions_available int
- `candidates` (uuid PK) — full enriched profile: passport, financial, work background (current_occupation, total_experience_years int, highest_qualification, work_history), structured language proficiency (language_qual_id int FK → qualification_types, language_level text), structured skills proficiency (skills_qual_id int FK, skills_detail text), target chain, **referred_by_partner_id (uuid nullable FK → referral_partners)**, status. Status: **active / archived / placed / dropped** (note: "placed" not "enrolled"). `assigned_counselor` + `created_by` — **deliberately omitted from API** until feature routers are auth-gated.
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
- `daily_task_templates` — fixed/daily task templates (not yet populated or used; needs `department_id` column added)
- `tasks` — `id` (uuid PK), `title`, `description`, `task_type` (text; 'assigned' for assigned tasks), `assigned_to` (uuid FK → profiles), `assigned_by` (uuid FK → profiles), `priority` (text), `status` (text: 'todo'|'in_progress'|'done'), `due_date` (date), `completed_at` (timestamptz; set when status→done; cleared when un-done), **`related_student_id`** (uuid nullable FK → students ON DELETE SET NULL), **`related_candidate_id`** (uuid nullable FK → candidates ON DELETE SET NULL), `created_at`, `updated_at`
- `notifications` — `recipient_id`, `type`, `related_task_id`, `is_read`; foundation for escalation (not yet triggered)

### Target chain field types
- **Students:** `target_country_id` INT; `target_institute_id` / `target_program_id` / `target_session_id` UUID (str)
- **Candidates:** `target_country_id` INT; `target_industry_id` INT; `target_employer_id` / `target_job_id` UUID (str); `target_start_period` text

### RLS helper functions
- `current_user_role()` — reads role from profiles
- `can_delete()` — true only for `owner` + `manager`
- `can_view_accounting()` — `owner` + `manager` + `accountant` only
- `can_manage_tasks()` — `owner` + `manager` + `team_leader`

### Security note (current state)
Backend connects with the **service-role key** for all DB operations, which bypasses RLS. Auth is enforced at the **API (Python) layer** — every feature router under `/api` now requires `Depends(get_current_user)` at the router level. Anonymous requests return 401 across the board. DELETEs require `require_role("owner","manager")`. `service_fees` goes further: all its endpoints require `require_role("owner","manager","accountant")`, with deletes still requiring owner/manager. `/api/admin/*` requires `require_role("owner")` only. **Per-row visibility** ("only my students") is still deferred — needs `assigned_counselor` wiring. RLS policies remain as defense-in-depth.

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
- ✅ **C11 — Authentication + User Management:**
  - **Auth foundation:** `backend/app/auth.py` with JWKS/ES256 JWT verification (`PyJWKClient`, `algorithms=["ES256"]`, `audience="authenticated"`); `get_current_user` dependency (verifies token, extracts `sub`, loads profile, returns id+email+role+profile fields; `role=None` if no profile yet; 403 if `is_active=False`); `get_current_user_optional`; `require_role(*roles)` factory. `GET /api/me` endpoint returns current user identity + profile.
  - **Handle_new_user trigger bugfix:** `handle_new_user()` SECURITY DEFINER function was missing `SET search_path = public`, causing "relation profiles does not exist" on signup. Fixed via `*_fix_handle_new_user_search_path.sql` migration — recreated with correct search_path and schema-qualified `public.profiles`. New signups now auto-create their profile row.
  - **Supabase config:** Email auth enabled; Confirm-email OFF; JWT signing uses new asymmetric ES256 keys (JWKS, not legacy HS256 secret). `SUPABASE_JWT_SECRET` added to `backend/.env` (present but not used for verification — JWKS is authoritative).
  - **Frontend login + session:** `@supabase/supabase-js` installed. `lib/supabase.js` exports Supabase client (localStorage session, auto token refresh). `lib/api.js` all five methods now attach `Authorization: Bearer <access_token>` automatically. `context/AuthContext.jsx` tracks session via `getSession + onAuthStateChange`; on session calls `GET /api/me` to load profile as `user`; exposes `user`, `loading`, `login()`, `logout()`. `App.jsx` gated: loading screen → Login page → full app. `Layout.jsx` updated: ADMIN nav group (owner-only), user name/role + Logout button in header.
  - **Admin Users router:** `backend/app/routers/admin_users.py` — all endpoints `require_role("owner")`. GET lists profiles + resolves team_leader names. POST creates auth user via `supabase.auth.admin.create_user` (email_confirm=True) + PATCHes profile. PATCH edits profile fields with self-lockout guard (owner cannot deactivate or demote themselves). No hard delete.
  - **Staff.jsx:** owner-only staff management page. List table of all profiles. Add-staff drawer (email, password, full_name, role, team, position, phone, team_leader). Edit drawer (all profile fields + deactivate toggle). `/staff` route guarded to owner only.
  - **StaffCreate / StaffUpdate** Pydantic schemas added to `schemas.py`.
  - **Owner account created and configured:** `educonsultancy.admission@gmail.com`, role=`owner`, full_name = "Abdur Rahman".
  - `frontend/.env` created (gitignored) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- ✅ **C11a — Staff page role/position/team refinements:**
  - **Role dropdown** shows only staff permission tiers (owner/manager/team_leader/counselor/accountant/staff — no 'student'). Plain-English labels with hint: "Owner & Manager inherit all lower-role abilities including finance."
  - **Position dropdown** (job title) lists 7 presets (Founder/MD, Operations Manager, Admissions & Visa Lead, Senior Education Counselor, Education/Visa Counselor, Operations/Lead Coordinator, Administrative/Data Assistant) + "Other" → free-text box. Edit-mode preselects known title or falls back to Other+text. Stored as free text in `profiles.position` — deliberately independent of the role enum.
  - **Team dropdown** uses the 9-department list with display labels (marking which value is stored).
  - **Reports To** column and dropdown display "Full Name (role)" for clarity.
  - **Owner full_name** updated from placeholder "Your Real Name" → "Abdur Rahman".
- ✅ **C12 — Assigned Tasks — phase 1:**
  - **Migration** `*_add_task_related_links.sql`: `related_student_id` (uuid FK → students ON DELETE SET NULL) + `related_candidate_id` (uuid FK → candidates ON DELETE SET NULL) added to `tasks`.
  - **`TaskCreate` / `TaskUpdate`** Pydantic schemas in `schemas.py`.
  - **`tasks.py` router** — all endpoints `Depends(get_current_user)`; the first feature router built auth-first. Assignment scope rule B: owner+manager → any active staff; team_leader → same-team staff + self; everyone can self-assign. `GET /tasks/assignable-users` returns scope-filtered list so non-owners never need `/admin/users`. PATCH: status→'done' sets `completed_at`; clearing nulls it; `exclude_unset=True` for explicit-null on `related_*`; scope re-checked on reassign.
  - **`MyTasks.jsx`** — every user: tasks assigned to me; todo→in_progress→done; "+ New Personal Task" with optional student/candidate link.
  - **`ManageTasks.jsx`** — owner/manager/team_leader: table of manageable tasks; "+ Assign Task" drawer (scope-filtered assignee, priority, due_date, Related To: None/Student/Candidate conditional dropdown); edit/delete/status-filter tabs. Route guarded.
  - **`Layout.jsx`** updated: TASKS nav group added (My Tasks always; Assign/Manage Tasks only for owner/manager/team_leader).
- ✅ **C13 — Security: API-level role enforcement (all feature routers):**
  - **Pass 1:** Added router-level `Depends(get_current_user)` to every remaining feature router: `countries`, `qualification_types`, `industries`, `institutes`, `programs`, `employers`, `jobs`, `selector_education`, `selector_employment`, `students`, `candidates`, `student_progress`, `candidate_progress`, `admission_templates`, `placement_templates`, `inquiries`, `applications`, `job_applications`, `referral_partners`, `service_fees`. DELETE endpoints across all these routers additionally require `require_role("owner","manager")`. Verified: anonymous GETs return 401; owner token returns 200; owner DELETE returns 200; anonymous DELETE returns 401.
  - **Pass 2:** `service_fees.py` further restricted — all its endpoints require `require_role("owner","manager","accountant")` (finance gate); deletes still require owner/manager only. Verified with real negative test: counselor account → 403 on `/service-fees`, 200 on `/students`; owner → 200 on both.
  - Security enforcement model is now complete at the API layer. The pattern for new routers: every endpoint → `Depends(get_current_user)`; deletes → `Depends(require_role("owner","manager"))`; finance endpoints → `require_role("owner","manager","accountant")`.

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

**Health check:** `curl http://127.0.0.1:8000/api/countries` → 39 countries; `http://localhost:5173` → login screen, then app.

**Database migration workflow:**
```bash
supabase migration new <descriptive_name>
code supabase/migrations/*_<name>.sql    # edit in VS Code, NEVER paste SQL in terminal
supabase db push                          # confirm with Y
git add supabase/migrations/ && git commit -m "..." && git push
```

---

## 10. Remaining Work (in order)

1. **Task Management — later phases** (NEXT) — assigned tasks (phase 1, C12) is done. Remaining phases:
   - `profiles` extensions needed: `department_id` INT FK → departments (need a `departments` table for the 9 departments), `tier` text CHECK IN ('manager','team_leader','team_member'), `reports_to` uuid nullable self-ref FK → profiles. Also: `department_id` column on `daily_task_templates`.
   - **Fixed/daily task generation** — lazy-on-login approach recommended: when staff logs in, generate today's task instances from matching `daily_task_templates` (by department_id + tier) if not already present for today.
   - **Verification step** — add `verified_at` timestamptz (or `is_verified` bool) to task instances; staff must explicitly verify; unverified ≠ done even after `end_time` passes.
   - **Time/calendar flagging** — after a fixed task's `end_time` window passes and it remains unverified, auto-flag as `missed`/`overdue` (lazy evaluation on next load, or Supabase Edge Function cron).
   - **Escalation notifications** — write to `notifications` table (recipient_id, type, related_task_id, is_read) escalating up `reports_to` chain: staff → team_leader → manager → owner.
   - Full design in §10A.

2. **Wire `assigned_counselor` / `created_by`** into feature routers and schemas. All feature routers are now auth-gated; `get_current_user()` is already available on every endpoint. When creating a student/candidate/inquiry/application: populate `created_by` from `get_current_user().id`. When assigning: populate `assigned_counselor` from chosen user's ID. FK columns already exist in DB but are omitted from all schemas and forms.

3. **Deferred checklists** — `application_checklist` and `job_application_checklist` tables already exist. Goals: (a) seed items from `admission_requirements` when a new application is created; (b) tick-off UI in Applications Kanban drawer; (c) mirror for job applications.

4. **Accounting UI, Dashboards** — see §13 for planned feature specs (PF-3: Accounting Core; PF-2: Service Fee paid→ledger posting).

5. **Backend search endpoints for Students/Candidates** — client-side search (`lib/search.js`) is fine for hundreds of records. If data grows large, add `?q=` to the GET endpoints.

6. **Google Drive document integration** (service-account), then **Render deployment**. Render server needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` as env vars; frontend build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time env vars.

---

## 10A. FEATURE REQUIREMENTS — Auth-Based Task Management
*(Auth foundation is now built — C11 done. This section covers what still needs to be built on top of it.)*

---

### What Was Implemented (C11)

The auth foundation is complete: Supabase ES256/JWKS JWT verification, `get_current_user` dependency, `require_role` factory, `GET /api/me`, frontend login + session persistence, and owner-only Staff management UI. The existing `profiles` table has `role`, `position`, `team`, `team_leader_id`, `phone`, and `is_active` — sufficient for auth and basic staff management.

**Not yet built (needed for Task Management):**
- `departments` table (the 9 departments listed below)
- `profiles.department_id` INT FK → departments
- `profiles.tier` text CHECK IN ('manager', 'team_leader', 'team_member') — for task routing
- `profiles.reports_to` uuid nullable self-ref FK → profiles — drives upward visibility chain

---

### Organisation Structure

**9 departments:**
1. Marketing
2. Application
3. Admission
4. Administration
5. HR
6. Accounting
7. Job Placement
8. Language Instruction
9. Business Development

**3 tiers (firm-wide — every department has all three):**
- `manager` — high authority within the department
- `team_leader` — mid authority; supervises team members
- `team_member` — standard staff

**Note on existing `user_role` enum vs. `tier`:** `user_role` is the permission enum (owner > manager > counselor > team_leader > staff > accountant). `tier` (to be added to profiles) is the task-management authority level within a department. These are related but separate — a counselor may be a `team_leader` tier in their dept. When building, decide whether to reuse `user_role` or add `tier` as a separate column.

---

### Task Types

**1. Fixed Tasks (daily, role- and position-based)**

Routine tasks auto-generated each working day based on the employee's `department_id` + `tier`. Admins have full CRUD over the templates (`daily_task_templates` table already exists; needs `department_id` added to it).

Each fixed task has a **time window** (`start_time` / `end_time` already on `daily_task_templates`). Tasks are presented as an ordered daily schedule.

**Generation approach (recommended):** lazy-on-login — when a staff member logs in, generate today's task instances from matching templates if not already present for that date. A cron/hybrid approach can be layered on later.

**2. Assigned Tasks (dynamic, one-off)**

Project or ad-hoc tasks assigned **downward** along the `reports_to` hierarchy:
- Owner / Admin → Managers → Team Leaders → Team Members

Staff can also create their own personal to-do items within this category — these count as self-assigned.

The existing `tasks` table already supports `assigned_to`, `assigned_by`, `priority`, `due_date`, and `status` — this is the foundation.

---

### Verification + Upward Visibility + Flagging (detailed requirements)

**Verification:**
A task is not simply "done" when its time window passes or its status is set. The staff member must explicitly **verify / confirm** completion. An unverified task is treated as incomplete even if its window has elapsed. Implementation: add a `verified_at` timestamp (or a `is_verified` boolean) to the task instance — distinct from `status='done'`.

**Upward visibility:**
Completion AND non-completion roll up the `reports_to` chain. Each person sees their own tasks plus everyone who reports to them (directly or transitively):
- Team Leader → sees their team members' tasks
- Manager → sees their team leaders' and all underlying members' tasks
- Owner → sees everyone's tasks across all departments

Both done states and not-done states are visible upward. Managers especially need visibility into what did NOT happen.

**Time/calendar-driven flagging:**
Fixed tasks operate on a time + calendar system. When a task's `end_time` window passes and the task instance is still unverified / incomplete, the system **auto-flags** it as `missed` / `overdue`. This requires a scheduled check (Supabase Edge Function cron or equivalent) or lazy evaluation on next page load.

**Escalation:**
A flagged (missed / unverified) task triggers notifications escalating up the `reports_to` chain:
1. The staff member themselves
2. Their direct Team Leader
3. Their Manager
4. The Owner

The existing `notifications` table already has `recipient_id`, `type`, `related_task_id`, `is_read` — this is the foundation. The escalation logic writes rows to this table.

**Owner's authority:**
The business owner has full, unfiltered visibility over all staff, all tasks, all flags, and all departments. No visibility restriction applies to the owner role.

---

### UI / UX (planned, not yet built)

**Per-user dashboard on login:**
- Greeting + date + department / tier badge
- **"Today's Fixed Tasks"** — ordered by time window (like a daily schedule); each task shows start/end time, title, description, and a **Verify / Complete** control
- **"Assigned Tasks"** — list with priority chips, due dates, who assigned; a **+ New Task** button creates a personal to-do (self-assigned)
- **"Assign to…"** affordance — only enabled for users who have direct reports (i.e., `profiles` rows with `reports_to` pointing to this user)

**Team view (for managers / team leaders):**
A secondary tab or page showing completion status and flags across all reports (direct + transitive) — table or card layout; sortable by department, tier, flag status, date.

**Notifications bell:**
Header bell icon with unread count; dropdown list of recent notifications (missed task escalations, new assignments). Clicking marks as read (`is_read = true`).

---

### Supporting Artefact

A spreadsheet template **`Fixed_Task_Definitions.xlsx`** was generated to capture each department × tier's daily fixed tasks. Columns map 1-to-1 into `daily_task_templates`:

| Spreadsheet column | DB column |
|---|---|
| Task Title | `title` |
| Description | `description` |
| Department | `department_id` |
| Tier | target tier (manager / team_leader / team_member) |
| Start Time | `start_time` |
| End Time | `end_time` |
| Priority | priority on the generated task instance |
| Active? | `is_active` |

This template is to be filled in **with department leads when staff are onboarded**. Not urgent while the system is run solo; building it out first is unnecessary.

---

### Recommended Build Sequence (when resumed)

~~1. Supabase Auth + basic profiles row per user.~~ ✅ **Done (C11)**

~~2. Owner creates accounts via a simple admin page.~~ ✅ **Done (C11 — Staff.jsx)**

~~2a. Staff page role/position/team dropdowns refined; owner full_name set.~~ ✅ **Done (C11a)**

~~3c. Assigned task delegation UI (downward assignment, personal to-dos; scope rule B).~~ ✅ **Done (C12 — MyTasks.jsx + ManageTasks.jsx + tasks.py)**

3. **`departments` table + `profiles` extensions** (`department_id`, `tier`, `reports_to`) + update Staff page to assign department + tier. (`is_active` already exists.)

~~4. **Enforce auth on remaining feature routers**~~ ✅ **Done (C13 — both security passes completed).** Wire `assigned_counselor`/`created_by` back in when creating records — still deferred (item 2 in §10).

5. **Task Management later phases** — in order:
   a. `daily_task_templates` gets `department_id`; admin CRUD for templates
   b. Lazy-on-login fixed-task generation (today's instances)
   d. Verification field + control per task instance
   e. Upward visibility query (transitive `reports_to` chain)
   f. Time/calendar flagging (auto-flag missed tasks after `end_time`)
   g. Escalation notifications (write to `notifications` table, bell in header)
   h. Per-user dashboard with both task sections (today's fixed + assigned)

---

## 11. Key Decisions & Conventions

- **One step at a time.** Finish, confirm "done", then next.
- **Terminal vs editor.** SQL and code go in the VS Code editor, never pasted into the terminal.
- **UUID vs INT — the recurring trap.** UUID PKs: institutes, programs, employers, candidates, students, jobs, admission_templates, admission_steps, placement_templates, placement_steps, referral_partners, service_fees, student_step_progress, candidate_step_progress. INT PKs: countries, industry_fields, qualification_types, accounts. FK types in routers/schemas must match. Always check before writing a new router.
- **Money fields: `float`, NEVER `Decimal`.** Decimal is not JSON-serializable (caused an early crash).
- **API under `/api` prefix.** All backend routes mounted under `/api`; Vite proxy has a single `/api` rule. React Router owns everything else.
- **`api.js` has five HTTP methods:** `get`, `post`, `patch`, `put`, `delete`. All now attach `Authorization: Bearer <access_token>` automatically. Always use `api.put(...)` for upserts, never fall back to `api.post(...)`.
- **Auth conventions for new backend endpoints.** Use `Depends(get_current_user)` (any logged-in user) or `Depends(require_role("owner", "manager"))` (role-gated), both from `app.auth`. The DB connection always uses the service-role key. Admin API calls (user creation) happen only in `admin_users.py`.
- **JWT verification uses JWKS/ES256.** Backend fetches public keys from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` at runtime. Do NOT use `SUPABASE_JWT_SECRET` for verification — it is present in config but not used. Audience = `"authenticated"`.
- **`assigned_counselor` and `created_by` on students/candidates** FK to `auth.users`. Auth is wired; profiles has a real owner account. These fields remain **omitted from all feature router schemas and forms** until those routers are auth-gated. Populate from `get_current_user().id` when wiring.
- **RLS pattern:** select/insert/update for `authenticated`; delete via `can_delete()` only (owner + manager). Accounting and `service_fees` restricted via `can_view_accounting()`. Activity log immutable. Backend bypasses RLS via service-role key; DB-level rules are defense-in-depth.
- **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign).
- **Roles vs job titles — deliberately decoupled:** `user_role` enum = permission tier (owner > manager > team_leader > staff/accountant; 'student' excluded from staff). Job titles live in `profiles.position` (free text). These are independent. Finance access = owner + manager + accountant; higher tiers inherit lower abilities; owner can do anything. `team_leader` CANNOT delete. Staff page: Role dropdown = permission tiers with plain-English labels; Position dropdown = job titles with "Other" free-text fallback. Never conflate these two fields.
- **Task assignment scope rule B:** Roles that may assign to others: owner, manager, team_leader. owner+manager → any active staff. team_leader → only staff whose `profile.team` matches the team_leader's own team (plus self). Everyone (incl. counselor/accountant/staff) can always self-assign. `GET /tasks/assignable-users` returns the scope-filtered list; PATCH/DELETE scope checks mirror assignment scope.
- **`/api/tasks/*` is auth-gated (pattern for future routers):** All tasks endpoints require `Depends(get_current_user)`. This is the first feature router built auth-first. When auth-gating remaining routers, every endpoint gets `Depends(get_current_user)`; deletes get `Depends(require_role("owner", "manager"))`.
- **Reusable process templates for both tracks.** Admission templates keyed by (country + study level); placement templates keyed by (country + industry_field). Both use free-text timeframes. Always follow the same DB + router + page pattern for both tracks.
- **Authentic data only.** Never auto-seed volatile data (tuition, employer names, live jobs). Only stable reference data is seeded.
- **Keep two tracks parallel** (routers, schemas, pages) so education and employment don't tangle.
- **Update `CLAUDE.md` and `HANDOFF.md`** whenever a new concept/table/component is added.
- **Commit after each working milestone.** Secrets stay out of Git.
- **Status values differ by track.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed" not "enrolled").
- **Target chain field types.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing types silently fails.
- **Selector re-fetch on edit.** On opening a student/candidate for edit, the selector must re-fetch and pre-select the deepest saved level. A session-restore bug was found and fixed in `EducationSelector.jsx`; `EmploymentSelector.jsx` was built correctly from the start.
- **Both roadmap components are conditionally interactive.** `AdmissionRoadmap.jsx` renders Pending/Current/Done controls (hitting `student_progress.py`) when given a `studentId` prop; stays read-only without it. `PlacementRoadmap.jsx` same with `candidateId` prop. Pattern is intentional — no ID exists in ADD mode.
- **Explicit-null pattern for clearing optional FK fields.** When a user clears an optional FK (e.g. "Referred By Partner" → "none"), the frontend `buildPayload` must **always** send the field as either the UUID string or JSON `null` — never omit it, never send an empty string. The backend PATCH handler must detect a sent-but-null value via `model_dump(exclude_unset=True)` and apply `None` to clear the column. The default `model_dump(exclude_none=True)` silently drops the key and leaves the old value. Currently applied to `referred_by_partner_id` on inquiries/students/candidates and to payer link fields on service_fees.
- **`service_fees` is finance-RLS-gated.** Uses `can_view_accounting()` for select/insert/update, matching the accounting tables. When auth is enforced on feature routers, only owner, manager, and accountant roles can see or edit fee records.
- **Client-side search lives in `lib/search.js`.** The shared `matchesQuery(record, query)` helper handles forgiving multi-field search. Name/email: case-insensitive substring. Phone: digit-strip then substring. Date of birth: normalize to YYYYMMDD/DDMMYYYY/MMDDYYYY plus raw YYYY/MM/DD fragments; match if query digits are a substring of any form. Import this helper — do NOT inline it per page.
- **Inquiry conversion is convert-once, one-destination.** Both `/convert` (→ student) and `/convert-candidate` (→ candidate) check: `status != 'converted'`, `converted_student_id IS NULL`, and `converted_candidate_id IS NULL`. If any fails: HTTP 400 "Inquiry already converted." An inquiry converts to a student OR a candidate — never both, never twice.
- **`interest_track` vs `interest_level` — do not conflate.** `interest_track` is a separate text column on `inquiries` ('education'|'employment'|null) — which service track the lead is pursuing, deliberately NOT a `prog_level` enum value. `interest_level` uses `prog_level` values (bachelors/masters/phd/language) and is education-track only. Render `interest_level` conditionally (only when `interest_track === 'education'`) and clear it when switching to employment.

---

## 12. Immediate Next Step

**Task Management — later phases.** Assigned tasks (phase 1, C12) and API security enforcement (C13) are both done. Next is the fixed/daily task system, which requires schema extensions first.

**Step 1 — Schema extensions:**
- Create `departments` table (9 rows; id int PK, name text, label text)
- Add to `profiles`: `department_id` INT FK → departments, `tier` text CHECK IN ('manager','team_leader','team_member'), `reports_to` uuid nullable FK → profiles
- Add `department_id` to `daily_task_templates`
- Update Staff page to let owner assign `department_id` + `tier` when creating/editing staff

**Step 2 — Fixed task generation (lazy-on-login):**
- On login, query `daily_task_templates` WHERE `department_id` = current user's dept AND `tier` = current user's tier AND `is_active = true`
- Insert task instances for today if not already present (check by `assigned_to + template_id + date`)
- These show in the "Today's Fixed Tasks" section (planned dashboard widget)

**Step 3 — Verification, flagging, escalation** (see §10A for full spec).

> **Before starting:** ensure all three terminals are running; `curl http://127.0.0.1:8000/api/tasks/mine` (with a valid JWT) returns a list.

---

---

## 13. PLANNED FEATURES (not yet built)

Requirements captured only — no code written. Do NOT implement unless explicitly requested.

---

### PF-1: Apply-Tab Restructure (Profile vs. Application separation)

**Current state:** Student and Candidate profile drawers currently embed `EducationSelector` / `EmploymentSelector` (destination target chain) and `AdmissionRoadmap` / `PlacementRoadmap` (process progress) directly on the profile. `students`/`candidates` tables carry `target_*` fields; progress is tracked per student/candidate.

**Planned change:** Student and Candidate profiles should hold **pure demographic data only**. Destination selection, roadmap, and application detail belong in **Applications / Job Applications**, not on the profile.

**Requirements:**
- Add an **"Apply"** action/button on a Student profile that creates an Application for that student.
- Add an **"Apply"** action/button on a Candidate profile that creates a Job Application for that candidate.
- Move `EducationSelector` + `AdmissionRoadmap` **out of the Student profile drawer** and **into the Application record** (Applications Kanban drawer or dedicated application detail view).
- Move `EmploymentSelector` + `PlacementRoadmap` **out of the Candidate profile drawer** and **into the Job Application record**.
- The Application record (not the Student) carries the target selection (`target_*` fields) and tracks process progress.
- A student may have multiple applications (different destinations, different intakes); the application is the unit of work.

**Implications:**
- `target_*` fields may eventually move off `students`/`candidates` onto `applications`/`job_applications` — schema migration required.
- `student_step_progress` and `candidate_step_progress` may need to be re-keyed to `application_id` / `job_application_id` rather than `student_id` / `candidate_id`.
- Profile drawers become simpler (demographics only: name, DOB, passport, financial, academic background).
- Applications gain a richer detail view (selector + roadmap embedded there).

---

### PF-2: Service Fee "Paid" → Profile Indicator + Accounting Integration

**Trigger:** When a `service_fee` record's `status` transitions to `'paid'`.

**Requirements:**

**PF-2a — Profile indicator (independent):** Show a visible "paid" badge on the linked student's or candidate's profile card/drawer. Read-only display; no edit flow needed here.

**PF-2b — Accounting ledger posting (depends on PF-3):** Automatically post the paid amount as a transaction in the `transactions` table when status becomes `'paid'`. Logic lives in the `service_fees` PATCH endpoint.
- Direction: incoming (revenue) for standard service fees.
- Map to an appropriate revenue account in the existing chart of accounts (codes 1000–6400).

**Dependency:** PF-3 must be built before PF-2b can be implemented. PF-2a can be built independently.

---

### PF-3: Accounting Core

**Purpose:** A working accounting ledger — tracking income and expenses. Replaces the current `Accounting.jsx` placeholder page.

**Access:** Finance-gated — owner, manager, accountant only (same as `service_fees` and existing accounting tables).

**Requirements:**
- **Transactions list / ledger UI** — filterable by account code, date range, direction (incoming/outgoing), status.
- **Chart of accounts** already seeded (codes 1000–6400: assets, liabilities, equity, revenue, COGS, opex) — use as-is; display in a sidebar or filter dropdown.
- **Manual transaction entry** — debit/credit against a chart-of-accounts code; amount + currency; description; date; optional document reference.
- **Income sources:** paid service fees (auto-posted via PF-2b); manual revenue entries.
- **Expense sources:** marketing expenses, company expenses — manual entries.
- **`transactions` table** already exists in DB (gateway-ready with nullable Stripe/PayPal fields) — use it.
- **`investments` and `commissions` tables** also exist — surface when ready (can be phase 2 of this feature).
- The Accounting nav link in `Layout.jsx` already exists — replace the placeholder page with the real implementation.

---

*Snapshot as of June 26, 2026. As building continues this will drift — regenerate at the next milestone. Keep CLAUDE.md in sync.*
