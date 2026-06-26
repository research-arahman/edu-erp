# Education ERP / CRM — CLAUDE.md

**Company:** Advance Educonsultancy (Pvt) Ltd.
**Last updated:** End of session, June 26, 2026
**Repo:** `github.com/research-arahman/edu-erp` (branch `main`)
**Owner:** Abdur Rahman

> **Claude CLI reads this file every session.** Keep it current when the system changes. For full table/column schemas, complete file inventory, cascading-selector and process-template details, and build-chunk history, see **HANDOFF.md**.

---

## 1. Project Overview

CRM + ERP for **Advance Educonsultancy (Pvt) Ltd.**, guiding Bangladeshi students and job-seekers toward global destinations across two parallel tracks: **Education** (students → Bachelor's/Master's/PhD/language programs, 30–40 destinations) and **Employment** (candidates → Japan SSW jobs, expanding to Europe). Core modules: inquiry tracker → application pipelines → placement, cascading destination selector (the signature feature), reusable admission/placement process templates with interactive per-record roadmaps, referral partner + service-fee tracking, accounting, tasks, and RBAC. Stack: Supabase + FastAPI + React/Vite/Tailwind.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| DB + Auth | **Supabase** (Postgres + RLS + Storage) | Project ref `fhzjizgsxlowjxzocasj`, Sydney |
| Backend | **FastAPI** (Python 3.11) | venv at `backend/venv`; all routes under `/api`; `PyJWT[crypto]` for ES256 JWT verification |
| Frontend | **React + Vite + Tailwind** | dev server `localhost:5173`; `@supabase/supabase-js` installed |
| Routing | **react-router-dom** | owns all non-`/api` paths |
| Deployment (planned) | **Render** | not yet deployed |
| Docs storage (planned) | **Google Drive API** | not yet integrated |

**Backend env** (`backend/.env`, gitignored): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (secret — bypasses RLS; backend only), `SUPABASE_ANON_KEY` (publishable), `SUPABASE_JWT_SECRET` (present; NOT used for token verification — JWKS/ES256 is used instead).

**Frontend env** (`frontend/.env`, gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the `sb_publishable_` key). These must also be set as build-time env vars on Render.

---

## 3. Running the Project

Three terminals. Project root: `~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`

**Terminal 1 — Backend:**
```bash
cd .../edu-erp/backend && source venv/bin/activate
uvicorn app.main:app --reload --reload-dir app
```
Wait for "Application startup complete." Leave running. Never run `npm` here.

**Terminal 2 — Frontend:**
```bash
cd .../edu-erp/frontend && npm run dev
```
Wait for `localhost:5173`. Leave running. Never run `uvicorn` here. Restart if `vite.config.js` changes.

**Terminal 3 — Working terminal** (git, supabase, claude): stay in `edu-erp/` root.

**Health check:** `curl http://127.0.0.1:8000/api/countries` → 39 countries; `localhost:5173` → login screen, then app.

**SQL/code in VS Code editor only — never paste into terminal.** If prompt shows `quote>` / `dquote>`, press Ctrl+C and run one line at a time.

---

## 4. DB Quick Reference (needed for code generation)

### Enums
- `user_role`: `owner`, `manager`, `counselor`, `student`, `team_leader`, `staff`, `accountant`
- `prog_level`: `bachelors`, `masters`, `phd`, `language`
- `app_stage`: `inquiry → profile_assessment → shortlisting → document_collection → application_submitted → offer_received → visa_processing → enrolled`
- `job_stage`: `applied → screening → interview → offer → coe_processing → visa_processing → placed`

### Target chain field types
- **Students:** `target_country_id` INT; `target_institute_id` / `target_program_id` / `target_session_id` UUID (str)
- **Candidates:** `target_country_id` INT; `target_industry_id` INT; `target_employer_id` / `target_job_id` UUID (str); `target_start_period` text

### RLS helper functions
- `current_user_role()` — reads role from profiles
- `can_delete()` — owner + manager only
- `can_view_accounting()` — owner + manager + accountant only
- `can_manage_tasks()` — owner + manager + team_leader

> Full table/column schemas are in HANDOFF.md §5.

---

## 5. Critical Conventions (DO NOT VIOLATE)

1. **One step at a time.** Finish, confirm "done", then next. When user says "done"/"next", assume the prior step worked.
2. **Terminal vs editor.** SQL and code go in the VS Code editor, never pasted into the terminal.
3. **UUID vs INT — the recurring trap.** UUID PKs: institutes, programs, employers, candidates, students, jobs, admission_templates, admission_steps, placement_templates, placement_steps, referral_partners, service_fees, student_step_progress, candidate_step_progress. INT PKs: countries, industry_fields, qualification_types, accounts. Backend path params and schema FK types **must match** (UUID → `str`, INT → `int`). This bug has already hit `institute_id`, `template_id`, and `program_id`. Always check FK types before writing a new router or schema.
4. **Money fields: `float`, NEVER `Decimal`.** `Decimal` is not JSON-serializable (crashed the institutes POST). All numeric/money Pydantic fields are `float`. Store amount + currency; default BDT; never hardcode FX rates.
5. **API under `/api` prefix.** All backend routes mounted under `/api`; Vite proxy has a single `/api` rule. React Router owns everything else. New endpoints are auto-covered — no proxy edits needed.
6. **`api.js` has five HTTP methods:** `get`, `post`, `patch`, `put`, `delete`. The `put` method was missing until an earlier session and caused silent failures on PUT calls — always use `api.put(...)` for upserts, never fall back to `api.post(...)`. All five methods now automatically attach the Supabase JWT Bearer token to every request.
7. **`assigned_counselor` and `created_by` on students/candidates** FK to `auth.users`. Auth is now wired and `profiles` has a real owner account. However, these fields are **still omitted** from all feature router schemas and forms until those routers are explicitly auth-gated. When wiring a router for auth, populate `created_by`/`assigned_counselor` from `get_current_user().id`.
8. **Status values differ by track.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed", not "enrolled").
9. **Target chain field types must be respected.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing types silently fails.
10. **Explicit-null pattern for clearing optional FK fields.** When a user clears an optional FK (e.g. "Referred By Partner" → none), the frontend `buildPayload` must send the field as UUID string or JSON `null` — never omit it, never send empty string. The backend PATCH handler must use `model_dump(exclude_unset=True)` (NOT `exclude_none=True`) so that an explicitly-sent `null` clears the column. Currently applied to `referred_by_partner_id` on inquiries/students/candidates and to payer link fields on service_fees.
11. **`service_fees` is finance-RLS-gated.** Uses `can_view_accounting()` for select/insert/update, matching the accounting tables. Once auth is enforced on feature routers, only owner/manager/accountant can see or edit fee records.
12. **RLS pattern for every table.** select/insert/update for `authenticated`; delete via `can_delete()` (owner + manager only). Accounting tables and `service_fees` restricted via `can_view_accounting()`. Activity log is immutable (insert + select only). Task management via `can_manage_tasks()`.
13. **Roles vs job titles.** Permission tiers in `user_role` enum: owner > manager > team_leader > staff/accountant > student. Job titles in `profiles.position`; teams in `profiles.team`; reporting in `profiles.team_leader_id`. `team_leader` CANNOT delete.
14. **Both roadmap components are conditionally interactive.** `AdmissionRoadmap.jsx` renders Pending/Current/Done controls when given a `studentId` prop; read-only without it (Destination Explorer, ADD mode). `PlacementRoadmap.jsx` same with `candidateId` prop. No ID exists in ADD mode — this is intentional.
15. **Reusable process templates for both tracks.** Admission templates keyed by (country + study level); placement templates keyed by (country + industry_field). Both use free-text timeframes (never structured dates). Always follow the same DB + router + frontend pattern for both tracks.
16. **Authentic data only.** Never auto-seed volatile data (tuition, real employer names, live jobs, rankings). Only stable reference data (country names, ISO codes, SSW fields) may be seeded.
17. **Keep the two tracks parallel and consistent.** Routers, schemas, and pages must mirror each other so education and employment never tangle.
18. **Write significant actions to `activity_log`** (create/update/delete/stage_change/assign) for the audit trail.
19. **Client-side search lives in `lib/search.js`.** The shared `matchesQuery(record, query)` helper handles forgiving multi-field search. Name/email: case-insensitive substring. Phone: digit-strip then substring. Date of birth: normalize to YYYYMMDD/DDMMYYYY/MMDDYYYY plus raw YYYY/MM/DD fragments; match if query digits are a substring of any form. Import this helper — do NOT inline per page.
20. **Inquiry conversion is convert-once, one-destination.** Both `/convert` (→ student) and `/convert-candidate` (→ candidate) check: `status != 'converted'`, `converted_student_id IS NULL`, `converted_candidate_id IS NULL`. If any fails: HTTP 400 "Inquiry already converted." An inquiry converts to a student OR a candidate — never both, never twice.
21. **`interest_track` vs `interest_level` — do not conflate.** `interest_track` is a text column on `inquiries` ('education'|'employment'|null) — which service track the lead is pursuing, NOT a `prog_level` enum value. `interest_level` uses `prog_level` values (bachelors/masters/phd/language) and is education-track only. Render `interest_level` conditionally (only when `interest_track === 'education'`) and clear it when switching tracks.
22. **Commit after each working milestone,** with a clear message, and push. Secrets stay out of Git (`.env`, `service-account.json` are gitignored).
23. **Update both `CLAUDE.md` and `HANDOFF.md`** whenever a new concept, table, or component is added. These are the source of truth for future sessions.
24. **Auth conventions for new backend endpoints.** Use `Depends(get_current_user)` to require a logged-in user on any endpoint. Use `Depends(require_role("owner", "manager"))` to gate by role. Both are importable from `app.auth`. The DB connection always uses the service-role key server-side (RLS bypassed). The Supabase admin API (for user creation) is used only in `admin_users.py`.
25. **JWT verification uses JWKS/ES256, not the legacy HS256 secret.** Backend fetches public keys from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` via `PyJWKClient` at runtime. Do NOT use `SUPABASE_JWT_SECRET` for token verification — it is present in config but not used for this purpose. Audience must be `"authenticated"`.

---

## 6. What's Built (summary — see HANDOFF.md for full detail)

**Backend routers (all working, all under `/api`):**
`countries`, `institutes`, `programs` (+ sessions), `admission_templates` (+ steps), `placement_templates` (+ steps), `industries`, `employers`, `jobs` (+ qual-types), `students`, `candidates`, `student_progress`, `candidate_progress`, `inquiries` (+ convert + convert-candidate), `applications`, `job_applications`, `referral_partners`, `service_fees`, `selector_education`, `selector_employment`, `admin_users` (owner-only staff CRUD)

**Auth endpoint:** `GET /api/me` — current user identity + profile.

**Frontend pages (all working):**
Countries, Institutes, Programs, AdmissionTemplates, PlacementTemplates, Industries, Employers, Jobs, DestinationExplorer, Students, Candidates, Inquiries, Applications, JobApplications, ReferralPartners, ServiceFees, **Login**, **Staff** (owner-only).
Tasks and Accounting are placeholders.

**Auth & session:** `lib/supabase.js` (Supabase JS client; localStorage persistence), `context/AuthContext.jsx` (useAuth — session + `/api/me` user profile), `App.jsx` gated (loading → Login → app). `Layout.jsx` shows ADMIN nav group (owner-only; Staff link) and a Logout button with user name/role. All `api.js` requests automatically attach the JWT Bearer token.

**Reusable components:** `EducationSelector`, `EmploymentSelector`, `AdmissionRoadmap` (interactive with `studentId`; read-only without), `PlacementRoadmap` (interactive with `candidateId`; read-only without).

**Shared helper:** `lib/search.js` — `matchesQuery(record, query)` used on Students and Candidates.

**Data seeded:** 39 countries (Japan = id 1); 16 SSW industry fields; JLPT/JFT/SSW qual types; one real institute (Yamaguchi University); one admission template (Japan Master's Research); one placement template (Japan Nursing Care SSW, country 1 / industry 1); one referral partner (Sakura Japanese Language Center, fixed 15000 BDT). **Owner account:** `educonsultancy.admission@gmail.com` (role=`owner`; full_name currently the placeholder "Your Real Name" — needs update).

**Key milestones reached:** full CRUD all data pages; cascading selector both tracks; interactive roadmap progress tracking (students and candidates); Kanban pipelines (8-stage education, 7-stage employment); inquiry conversion (→student and →candidate, convert-once guard); referral partner + service fee tracking; forgiving client-side search; **authentication (JWKS/ES256, `get_current_user`, `require_role`); login + session persistence; owner-only staff management UI.**

---

## 7. Remaining Work (in order)

1. **API-level role enforcement** (NEXT) — apply `require_role` / `get_current_user` dependencies to existing feature routers. Currently only `/api/me` and `/api/admin/*` are auth-gated; all other feature routers are open (the frontend sends the JWT but the backend ignores it on those routes). Pattern: all endpoints → `Depends(get_current_user)`; deletes → `Depends(require_role("owner", "manager"))`.
2. **Wire `assigned_to` / `assigned_counselor` / `created_by`** back into feature routers now that real user profiles exist. Populate from `get_current_user().id` when creating or assigning records.
3. **Task Management system** — fixed (daily, role+dept-based) + assigned tasks, verification step, upward hierarchical visibility (via `team_leader_id` chain; owner sees all), time/calendar-driven flagging of missed tasks, escalation notifications. Full design in HANDOFF.md §10A. Requires: `departments` table; `profiles.department_id`, `profiles.tier`, `profiles.reports_to` extensions.
4. **Deferred checklists** — `application_checklist` and `job_application_checklist` tables exist in DB. Seed items from `admission_requirements` on application create; tick-off UI in Kanban drawers; mirror for job applications.
5. **Accounting UI, Dashboards.**
6. **Update owner profile full_name** from placeholder "Your Real Name" (`educonsultancy.admission@gmail.com` account, role=owner).
7. **Backend search endpoints** — add `?q=` to students/candidates GET if data grows large.
8. **Google Drive integration; Render deployment** — `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` as server env vars; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time vars.

---

## 8. Key File Paths (quick reference)

```
backend/app/
  main.py          — FastAPI app, CORS, all routers mounted under /api
  auth.py          — JWKS/ES256 JWT verification; get_current_user dep (loads profile, 403 if inactive);
                     get_current_user_optional; require_role(*roles) factory
  config.py        — loads SUPABASE_* env vars (SUPABASE_JWT_SECRET present but unused for verification)
  schemas.py       — Pydantic models (float not Decimal; omit assigned_counselor/created_by);
                     StaffCreate / StaffUpdate added
  database.py      — Supabase client (service-role key, bypasses RLS)
  routers/         — one file per resource (see §6 list above)
    admin_users.py — owner-only GET/POST/PATCH /admin/users; self-lockout guard on PATCH

frontend/src/
  App.jsx                           — all routes; gated: loading screen → Login → app
  lib/api.js                        — fetch wrapper; get/post/patch/put/delete; all token-aware (Bearer JWT)
  lib/supabase.js                   — Supabase JS client; session persistence in localStorage; auto token-refresh
  lib/search.js                     — matchesQuery() — shared client-side forgiving search
  context/AuthContext.jsx           — useAuth hook; tracks session via getSession + onAuthStateChange;
                                      loads /api/me as user; exposes user, loading, login(), logout()
  components/Layout.jsx             — sidebar nav: Dashboard/Education/Employment/Data/Operations/PARTNERS/
                                      ADMIN(owner-only); user name+role+Logout button in header
  components/AdmissionRoadmap.jsx   — interactive with studentId prop; read-only without
  components/PlacementRoadmap.jsx   — interactive with candidateId prop; read-only without
  components/EducationSelector.jsx  — cascading education selector (saves target_* on student)
  components/EmploymentSelector.jsx — cascading employment selector (saves target_* on candidate)
  pages/Login.jsx                   — email/password login page (shown when no session)
  pages/Staff.jsx                   — owner-only staff management (list + add/edit/deactivate drawer)
  pages/                            — one .jsx per page

supabase/migrations/  — ~28 timestamped .sql files; push with `supabase db push`
  (latest: *_fix_handle_new_user_search_path.sql — fixes SECURITY DEFINER trigger missing search_path)
```

---

*Snapshot as of June 26, 2026. Regenerate at the next milestone. Keep HANDOFF.md in sync.*
