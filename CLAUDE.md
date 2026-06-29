# Education ERP / CRM — CLAUDE.md

**Company:** Advance Educonsultancy (Pvt) Ltd.
**Last updated:** End of session, June 29, 2026
**Repo:** `github.com/research-arahman/edu-erp` (branch `main`)
**Owner:** Abdur Rahman

> **Claude CLI reads this file every session.** Keep it current when the system changes. For full table/column schemas, complete file inventory, cascading-selector and process-template details, and build-chunk history, see **HANDOFF.md**.

---

## 1. Project Overview

CRM + ERP for **Advance Educonsultancy (Pvt) Ltd.**, guiding Bangladeshi students and job-seekers toward global destinations across **three tracks**: **Education** (students → Bachelor's/Master's/PhD/language programs abroad, 30–40 destinations), **Employment** (candidates → Japan SSW jobs, expanding to Europe), and **Language Course** (on-site test-prep courses — JLPT N5, JFT-Basic, IELTS — with its own course-student entity, multi-course enrollments, batches, contract instructors, installment payments, and convert-once conversion to Education/Employment tracks). Core modules: inquiry tracker → application pipelines → placement, cascading destination selector (the signature feature), reusable admission/placement process templates with interactive per-record roadmaps, referral partner + service-fee tracking, accounting, tasks, and RBAC. Stack: Supabase + FastAPI + React/Vite/Tailwind.

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

**Health check:** `curl http://127.0.0.1:8000/health` → `{"status":"ok"}`; `localhost:5173` → login screen, then app. (All `/api/*` routes now require auth — anonymous requests return 401.)

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
3. **UUID vs INT — the recurring trap.** UUID PKs: institutes, programs, employers, candidates, students, jobs, admission_templates, admission_steps, placement_templates, placement_steps, referral_partners, service_fees, student_step_progress, candidate_step_progress, **courses, course_students, course_enrollments, course_payments, batches, instructors, instructor_payments**. INT PKs: countries, industry_fields, qualification_types, accounts. Backend path params and schema FK types **must match** (UUID → `str`, INT → `int`). This bug has already hit `institute_id`, `template_id`, and `program_id`. Always check FK types before writing a new router or schema.
4. **Money fields: `float`, NEVER `Decimal`.** `Decimal` is not JSON-serializable (crashed the institutes POST). All numeric/money Pydantic fields are `float`. Store amount + currency; default BDT; never hardcode FX rates.
5. **API under `/api` prefix.** All backend routes mounted under `/api`; Vite proxy has a single `/api` rule. React Router owns everything else. New endpoints are auto-covered — no proxy edits needed.
6. **`api.js` has five HTTP methods:** `get`, `post`, `patch`, `put`, `delete`. The `put` method was missing until an earlier session and caused silent failures on PUT calls — always use `api.put(...)` for upserts, never fall back to `api.post(...)`. All five methods now automatically attach the Supabase JWT Bearer token to every request.
7. **`assigned_counselor` and `created_by` on students/candidates** FK to `auth.users`. Auth is now wired and `profiles` has a real owner account. However, these fields are **still omitted** from all feature router schemas and forms until those routers are explicitly auth-gated. When wiring a router for auth, populate `created_by`/`assigned_counselor` from `get_current_user().id`.
8. **Status values differ by track.** Students: `active / archived / enrolled / dropped`. Candidates: `active / archived / placed / dropped` (note: "placed", not "enrolled").
9. **Target chain field types must be respected.** Students: `target_country_id` INT, `target_institute_id` / `target_program_id` / `target_session_id` UUID. Candidates: `target_country_id` INT, `target_industry_id` INT, `target_employer_id` / `target_job_id` UUID, `target_start_period` text. Mixing types silently fails.
10. **Explicit-null pattern for clearing optional FK fields.** When a user clears an optional FK (e.g. "Referred By Partner" → none), the frontend `buildPayload` must send the field as UUID string or JSON `null` — never omit it, never send empty string. The backend PATCH handler must use `model_dump(exclude_unset=True)` (NOT `exclude_none=True`) so that an explicitly-sent `null` clears the column. Currently applied to `referred_by_partner_id` on inquiries/students/candidates and to payer link fields on service_fees.
11. **`service_fees` is finance-gated at the API layer.** `service_fees.py` requires `require_role("owner","manager","accountant")` on all its endpoints (delete still requires owner/manager only). `can_view_accounting()` RLS remains as defense-in-depth. Only owner/manager/accountant can see or edit fee records.
12. **RLS pattern for every table.** select/insert/update for `authenticated`; delete via `can_delete()` (owner + manager only). Accounting tables and `service_fees` restricted via `can_view_accounting()`. Activity log is immutable (insert + select only). Task management via `can_manage_tasks()`.
13. **Roles vs job titles — deliberately decoupled.** `user_role` enum = permission tier (owner > manager > team_leader > staff/accountant; `student` value exists but is not assigned to staff). Job titles live in `profiles.position` (free text, not the enum). Teams in `profiles.team`. Reporting in `profiles.team_leader_id`. Permission level is set by role, not job title. Finance access = owner + manager + accountant (can add team_leader later); higher tiers inherit lower abilities; owner can do anything. `team_leader` CANNOT delete. The Staff page enforces this: Role dropdown shows permission tiers with plain-English labels; Position dropdown shows job titles (Founder/MD, Operations Manager, etc.) with an "Other" free-text fallback.
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
26. **Task assignment scope rule B.** Roles that may assign to others: `owner`, `manager`, `team_leader`. Scope: owner + manager → any active staff; `team_leader` → only staff whose `profile.team` matches the team_leader's own team (plus self). Everyone (incl. counselor/accountant/staff) can always self-assign (`assigned_to == current_user.id`). `GET /tasks/assignable-users` returns only users the caller may assign to, respecting this scope. PATCH/DELETE permission checks mirror assignment scope (assigner, owner, manager, or team_leader within same team can manage; assignee can update their own status).
27. **ALL feature routers are now auth-gated — security enforcement is complete.** Every endpoint under `/api` requires `Depends(get_current_user)` at the router level (anonymous requests → 401). DELETEs require `require_role("owner","manager")` (insufficient role → 403). `service_fees` is further restricted: all its endpoints require `require_role("owner","manager","accountant")`; deletes still require owner/manager. `/api/admin/*` requires `require_role("owner")`. Verified: anonymous GET → 401; owner → 200; counselor on `/service-fees` → 403. Per-row visibility ("only my students") is still deferred — needs `assigned_counselor` wiring.
28. **Accounting model: single-posting, account-driven, refund-aware.** Users post to one account (revenue or expense/cogs only — asset/liability/equity and header accounts blocked with HTTP 400). Direction is auto-derived server-side (revenue → credit; expense/cogs → debit). `is_reversal=true` flips the derived direction and subtracts from the account-type's summary total (a refund on revenue reduces total_revenue; a reversal on an expense reduces total_expenses). Paid `service_fees` auto-post to account 4400 (`payer_type='partner'`) or 4200 (otherwise) via `_sync_fee_accounting()` in `service_fees.py`; the link is stored in `service_fees.posted_transaction_id` and prevents double-posting. Un-paying a fee deletes the linked transaction (reversal). All accounting endpoints require `require_role("owner","manager","accountant")`.
29. **Course payments auto-post to account 4300 (Test Prep Course Registration).** `POST /enrollments/{id}/payments` records a `course_payments` row, auto-posts a revenue transaction to account 4300, stores the link in `course_payments.posted_transaction_id`, then recomputes `enrollment.payment_status` (pending/partial/paid from total_paid vs agreed_fee). `DELETE /payments/{id}` reverses the linked transaction before deleting the payment row and recomputes status. This is the same `posted_transaction_id` idempotency pattern as `service_fees`. Payment endpoints are finance-gated (`require_role("owner","manager","accountant")`).
30. **Cascade reversal MUST be done in Python via the service-role client — NOT via DB triggers.** A DB trigger that tries to DELETE from `transactions` is silently filtered to 0 rows because RLS on `transactions` blocks the trigger's execution context even with `SECURITY DEFINER` / `owner=postgres`. Verified: the trigger approach was attempted and dropped. The canonical pattern is: the Python DELETE handler (e.g., `DELETE /course-students/{id}`, `DELETE /enrollments/{id}`, `DELETE /instructors/{id}`) fetches all descendant payment rows, deletes each linked `transactions` row via the service-role supabase client (which bypasses RLS), then lets the DB cascade the record deletes. Apply this pattern to ALL future payment entities.
31. **Instructor payments auto-post expense to account 5100 (Freelance/External Consultant Fees), direction DEBIT.** `POST /instructors/{id}/payments` records an `instructor_payments` row and auto-posts an expense transaction to account 5100 (reference `instructor_payment:{id}`, stores `posted_transaction_id`). `DELETE /instructor-payments/{payment_id}` (distinct path from course `/payments/{id}` to avoid routing collision) reverses the linked transaction before deleting. `DELETE /instructors/{id}` fetches ALL the instructor's payments and reverses each linked transaction via the service-role client BEFORE cascade delete — same Python-layer reversal rule as course_payments. All instructor payment endpoints are finance-gated (`require_role("owner","manager","accountant")`). Verified: payment posts expense to 5100; delete payment reverses; delete instructor reverses all — expenses and txn count return to 0.
32. **Batch course-scoping: a batch belongs to exactly ONE course.** When assigning `batch_id` to a course enrollment (POST or PATCH), validate that `batch.course_id == enrollment.course_id` (HTTP 400 if mismatch). The batch assignment dropdown in CourseStudents.jsx is filtered to only batches of that course. Finance-gated batch roster: `GET /batches/{id}` enriches each roster row with `total_paid` and `remaining` amounts only for finance roles (null for non-finance roles); `payment_status` label is always shown regardless of role.

---

## 6. What's Built (summary — see HANDOFF.md for full detail)

**Backend routers (all working, all under `/api`):**
`countries`, `institutes`, `programs` (+ sessions), `admission_templates` (+ steps), `placement_templates` (+ steps), `industries`, `employers`, `jobs` (+ qual-types), `students` (+ fees-summary), `candidates` (+ fees-summary), `student_progress`, `candidate_progress`, `inquiries` (+ convert + convert-candidate), `applications`, `job_applications`, `referral_partners`, `service_fees` (auto-posts to `transactions` on paid via `_sync_fee_accounting`), **`accounting`** (finance-gated; GET /accounting/accounts; GET/POST/PATCH/DELETE /accounting/transactions; GET /accounting/summary), `selector_education`, `selector_employment`, `admin_users` (owner-only staff CRUD), **`tasks`** (auth-gated; POST/GET mine/GET assigned/PATCH/DELETE + assignable-users), **`courses`** (all auth-gated; courses CRUD; course_students CRUD with enriched list incl. enrollments[]+course_count+partner_name; enrollments CRUD per course_student with agreed_fee defaulting from course + optional batch_id validated to same course; payments per enrollment finance-gated — GET list/summary, POST auto-posts revenue to 4300, DELETE reverses txn; recomputes payment_status; **batches** CRUD — GET /batches?course_id= enriched with student_count, GET /batches/{id} with full roster + headcount + finance-gated per-student amounts, PATCH /batches/{id} accepts instructor_id; convert-to-student + convert-to-candidate; cascade reversal in Python via service-role), **`instructors`** (auth-gated CRUD; GET enriched with payment_count + total_paid[finance-only] + assigned batches; DELETE reverses all linked instructor_payments txns before cascade; finance-gated payment endpoints — GET /instructors/{id}/payments + payment-summary, POST auto-posts expense txn to acct 5100 DEBIT, PATCH/DELETE /instructor-payments/{id} reverses txn), **`dashboard`** (finance-gated; GET /dashboard/finance?from_date=&to_date= → summary + income_breakdown + expense_breakdown + pending_in + counts)

**Auth endpoint:** `GET /api/me` — current user identity + profile.

**Fees-summary endpoints (finance-gated):** `GET /students/{id}/fees-summary` and `GET /candidates/{id}/fees-summary` return `{total_paid, total_pending, paid_count, pending_count, fees:[...]}` computed from `service_fees`.

**Frontend pages (all working):**
Countries, Institutes, Programs, AdmissionTemplates, PlacementTemplates, Industries, Employers, Jobs, DestinationExplorer, Students, Candidates, Inquiries, Applications, JobApplications, ReferralPartners, ServiceFees, **Login**, **Staff** (owner-only; role/position/team/Reports-To dropdowns), **MyTasks** (every user — tasks assigned to me, todo→in_progress→done, self-create personal tasks with optional student/candidate link), **ManageTasks** (owner/manager/team_leader — assign tasks, scope-enforced assignee dropdown, Related To student/candidate, edit/delete/status filters), **Accounting** (finance-gated /accounting; summary cards Revenue/Expenses/Net; date-range + account + direction filters; transactions ledger with Effect labels Income/Refund/Expense/Reversal; Add/Edit drawer with postable-account dropdown + is_reversal checkbox + optional student link; Chart of Accounts read-only tab; BDT ৳ formatting), **Courses** (course catalog CRUD; list + add/edit drawer; /courses), **CourseStudents** (registration list + add/edit drawer; enrollments section — add/edit/remove enrollment, course picker, agreed_fee override, batch assignment dropdown filtered to course; finance-gated payments panel per enrollment with Full/Paid/Remaining + payment history + Add/delete payment; Convert section — Convert to Student / Convert to Candidate with ✓ Converted indicators; /course-students), **Batches** (list + add/edit drawer with course/dates/status/notes/instructor dropdown; batch detail with headcount + per-student roster with payment_status badge + finance-gated amounts; /batches), **Instructors** (contract instructor list + add/edit drawer; finance-gated payments section — total paid, payment history, + Add Payment, delete payment; payments auto-post to accounting as expense to acct 5100; /instructors), **FinanceDashboard** (finance-gated /finance-dashboard; summary cards income/expenses/net/pending-in; counts row; income & expense breakdown panels by account; Pending Money In tables — unpaid service fees + outstanding course balances; BDT ৳ formatting). **LANGUAGE COURSES** nav group in Layout.jsx (Courses + Course Students + Batches + Instructors; all logged-in users). **FINANCE** nav group (Finance Dashboard; finance-gated).
Tasks.jsx (old placeholder) replaced by MyTasks.jsx + ManageTasks.jsx.

**Auth & session:** `lib/supabase.js` (Supabase JS client; localStorage persistence), `context/AuthContext.jsx` (useAuth — session + `/api/me` user profile), `App.jsx` gated (loading → Login → app). `Layout.jsx` shows TASKS nav group (My Tasks for everyone; Assign/Manage Tasks for owner/manager/team_leader only), LANGUAGE COURSES nav group (Courses + Course Students + Batches + Instructors; all logged-in users), FINANCE nav group (Finance Dashboard; finance-gated), and ADMIN nav group (owner-only; Staff link), plus Logout button with user name/role. All `api.js` requests automatically attach the JWT Bearer token.

**Reusable components:** `EducationSelector`, `EmploymentSelector`, `AdmissionRoadmap` (interactive with `studentId`; read-only without), `PlacementRoadmap` (interactive with `candidateId`; read-only without).

**Shared helper:** `lib/search.js` — `matchesQuery(record, query)` used on Students and Candidates.

**Data seeded:** 39 countries (Japan = id 1); 16 SSW industry fields; JLPT/JFT/SSW qual types; one real institute (Yamaguchi University); one admission template (Japan Master's Research); one placement template (Japan Nursing Care SSW, country 1 / industry 1); one referral partner (Sakura Japanese Language Center, fixed 15000 BDT). **Owner account:** `educonsultancy.admission@gmail.com` (role=`owner`; full_name = "Abdur Rahman").

**Key milestones reached:** full CRUD all data pages; cascading selector both tracks; interactive roadmap progress tracking (students and candidates); Kanban pipelines (8-stage education, 7-stage employment); inquiry conversion (→student and →candidate, convert-once guard); referral partner + service fee tracking; forgiving client-side search; **authentication (JWKS/ES256, `get_current_user`, `require_role`); login + session persistence; owner-only staff management UI** (role/position/team dropdowns, Reports To chain); **assigned tasks phase 1** (My Tasks + Assign/Manage views, scope-enforced assignment per rule B, student/candidate linking, auth-gated tasks router); **API security enforcement complete** (all feature routers auth-gated; service_fees finance-gated; anon → 401; counselor on /service-fees → 403); **Accounting Phase 1** (manual ledger — single-posting account-driven model, revenue/expense-only posting, is_reversal refund flag, refund-aware summary); **Accounting Phase 2** (service fees paid → auto-post to revenue 4200/4400 idempotently; un-pay reverses and deletes transaction; `posted_transaction_id` link prevents double-posting; fees-paid indicator on student/candidate profiles for finance roles); **Language Course Track** (courses + course_students + course_enrollments + course_payments tables; multi-course enrollment per student; installment payments auto-post to revenue 4300 idempotently via `posted_transaction_id`; cascade reversal done in Python service-role layer — DB trigger approach failed due to RLS; convert course-student → student or candidate with convert-once guard per track; Courses.jsx + CourseStudents.jsx + LANGUAGE COURSES nav group; browser-verified); **Batches** (batches table + course_enrollments.batch_id; batch CRUD + per-batch roster with headcount + per-student payment status; finance-gated fee amounts null for non-finance; Batches.jsx; batch assignment dropdown in CourseStudents.jsx filtered to course); **Contract Instructors + Instructor Payments** (instructors + instructor_payments tables + batches.instructor_id; instructor CRUD + finance-gated payment endpoints; payments auto-post expense to account 5100 DEBIT idempotently; cascade reversal in Python before instructor delete — same RLS-on-transactions pattern; Instructors.jsx; instructor dropdown on Batches add/edit form; verified: payment posts expense, delete reverses, delete instructor reverses all); **Owner Finance Dashboard** (GET /dashboard/finance — income/expense summary + income/expense breakdowns by account + pending_in: unpaid service fees + outstanding course balances + total; counts: active course students/batches/instructors; FinanceDashboard.jsx finance-gated at /finance-dashboard; FINANCE nav group; verified).

---

## 7. Remaining Work (in order)

1. **Task Management — later phases** — assigned tasks (phase 1) is done. Remaining: fixed/daily task generation (lazy-on-login from `daily_task_templates`; needs `department_id` added to templates table and `profiles.department_id` + `profiles.tier` + `profiles.reports_to` extensions); verification step (staff explicitly confirm completion; unverified ≠ done); time/calendar flagging of missed tasks (auto-flag after `end_time` window); escalation notifications up the `reports_to` chain via `notifications` table. Full design in HANDOFF.md §10A.
2. **Language Course Track** — foundation + payments + conversion + batches + contract instructors + finance dashboard are **DONE**. Remaining in order: **(a) Course Lead Funnel** (extend `inquiries.interest_track` CHECK to add `'language_course'`; new `POST /inquiries/{id}/convert-course-student` endpoint; show course-specific fields in inquiry form when track = language_course); **(b) Japan Language-School Roadmap Template** (4-phase workflow preserved verbatim in HANDOFF.md §14 Component 8 — map onto process-template pattern after lead funnel is done). Full spec in HANDOFF.md §14.
3. **Wire `assigned_counselor` / `created_by`** into feature routers now that all are auth-gated. `get_current_user()` is already available on every endpoint. Populate `created_by` from `get_current_user().id` when creating students/candidates/inquiries/applications; populate `assigned_counselor` when assigning. FK columns exist in DB but are omitted from all schemas and forms.
4. **Deferred checklists** — `application_checklist` and `job_application_checklist` tables exist in DB. Seed items from `admission_requirements` on application create; tick-off UI in Kanban drawers; mirror for job applications.
5. **Marketing + company expense pages** — manual expense entries auto-post to accounting ledger. Company expense page needs file uploads (receipts) → requires pluggable file storage (Supabase Storage or Google Drive).
6. **Apply-tab restructure** (PF-1) — move `EducationSelector` + `AdmissionRoadmap` from Student profile into Application record; same for Employment track. Full spec in HANDOFF.md §13.
7. **Backend search endpoints** — add `?q=` to students/candidates GET if data grows large.
8. **Security hardening pass** before go-live — per-row visibility for counselors (`assigned_counselor` filter), rate limiting, input sanitization audit.
9. **Google Drive integration; Render deployment** — `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` as server env vars; `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time vars.

---

## 8. Key File Paths (quick reference)

```
backend/app/
  main.py          — FastAPI app, CORS, all routers mounted under /api
  auth.py          — JWKS/ES256 JWT verification; get_current_user dep (loads profile, 403 if inactive);
                     get_current_user_optional; require_role(*roles) factory
  config.py        — loads SUPABASE_* env vars (SUPABASE_JWT_SECRET present but unused for verification)
  schemas.py       — Pydantic models (float not Decimal; omit assigned_counselor/created_by);
                     StaffCreate / StaffUpdate / TaskCreate / TaskUpdate added
  database.py      — Supabase client (service-role key, bypasses RLS)
  routers/         — one file per resource (see §6 list above)
    accounting.py  — ALL endpoints require_role("owner","manager","accountant");
                     GET /accounting/accounts; GET /accounting/transactions?filters (enriched);
                     POST (direction auto-derived; non-postable accounts → 400; is_reversal flips dir);
                     PATCH + DELETE /accounting/transactions/{id};
                     GET /accounting/summary (refund-aware totals)
    admin_users.py — owner-only GET/POST/PATCH /admin/users; self-lockout guard on PATCH
    tasks.py       — ALL endpoints auth-gated (Depends(get_current_user));
                     POST /tasks (create/assign; assigned_by=current; validates assignee active);
                     GET /tasks/mine?status= (tasks assigned to me; enriched names);
                     GET /tasks/assigned?status= (tasks I can manage; enriched names);
                     PATCH /tasks/{id} (status='done' sets completed_at; explicit-null for related_*);
                     DELETE /tasks/{id};
                     GET /tasks/assignable-users (scope-filtered per rule B)
    courses.py     — ALL endpoints auth-gated; deletes require owner/manager;
                     courses CRUD (GET/POST/PATCH/DELETE /courses);
                     course_students CRUD (GET list enriched+enrollments[]; GET {id} full; POST/PATCH;
                       DELETE fetches+reverses descendant payment txns via service-role before cascade);
                     POST /course-students/{id}/enrollments (agreed_fee defaults from course.default_fee;
                       optional batch_id validated to same course as enrollment, HTTP 400 if mismatch);
                     PATCH /enrollments/{id} (course_id, agreed_fee, status, payment_status, batch_id, date, notes);
                     DELETE /enrollments/{id} (explicit txn reversal before cascade);
                     FINANCE-GATED (owner/manager/accountant):
                       GET /enrollments/{id}/payments;
                       GET /enrollments/{id}/payment-summary (full_amount, total_paid, remaining, count);
                       POST /enrollments/{id}/payments (auto-posts revenue txn to acct 4300;
                         recomputes enrollment.payment_status: pending/partial/paid);
                       PATCH /payments/{id}; DELETE /payments/{id} (reverses linked txn, recomputes);
                     GET /batches?course_id= (enriched + student_count); GET /batches/{id} (roster +
                       headcount; finance-gated per-student amounts); POST/PATCH/DELETE /batches;
                     POST /course-students/{id}/convert-to-student; POST /{id}/convert-to-candidate
    instructors.py — ALL endpoints auth-gated; deletes require owner/manager;
                     GET/POST/PATCH/DELETE /instructors (GET enriched: payment_count, total_paid[finance-only],
                       assigned batches; DELETE reverses all linked instructor_payments txns via service-role before cascade);
                     FINANCE-GATED: GET /instructors/{id}/payments + payment-summary;
                       POST /instructors/{id}/payments (auto-posts EXPENSE txn to acct 5100 DEBIT, idempotent);
                       PATCH/DELETE /instructor-payments/{id} (DELETE reverses linked txn)
    dashboard.py   — ALL endpoints require_role("owner","manager","accountant") — finance-gated;
                     GET /dashboard/finance?from_date=&to_date= → {summary (refund-aware income/expenses/net
                       over date range), income_breakdown by revenue account, expense_breakdown by expense
                       account, pending_in (unpaid service fees + outstanding course balances — current-state,
                       NOT date-filtered), counts (active course_students/batches/instructors)}

frontend/src/
  App.jsx                           — all routes; gated: loading screen → Login → app
  lib/api.js                        — fetch wrapper; get/post/patch/put/delete; all token-aware (Bearer JWT)
  lib/supabase.js                   — Supabase JS client; session persistence in localStorage; auto token-refresh
  lib/search.js                     — matchesQuery() — shared client-side forgiving search
  context/AuthContext.jsx           — useAuth hook; tracks session via getSession + onAuthStateChange;
                                      loads /api/me as user; exposes user, loading, login(), logout()
  components/Layout.jsx             — sidebar nav: Dashboard/Education/Employment/Data/Operations/PARTNERS/
                                      TASKS (My Tasks always visible; Assign/Manage only for owner/manager/team_leader)/
                                      LANGUAGE COURSES (Courses + Course Students + Batches + Instructors; all logged-in users)/
                                      FINANCE (Finance Dashboard; owner/manager/accountant only)/
                                      ADMIN (owner-only; Staff link); user name+role+Logout button in header
  components/AdmissionRoadmap.jsx   — interactive with studentId prop; read-only without
  components/PlacementRoadmap.jsx   — interactive with candidateId prop; read-only without
  components/EducationSelector.jsx  — cascading education selector (saves target_* on student)
  components/EmploymentSelector.jsx — cascading employment selector (saves target_* on candidate)
  pages/Login.jsx                   — email/password login page (shown when no session)
  pages/Staff.jsx                   — owner-only; role=permission-tier dropdown (no 'student');
                                      position=job-title dropdown (7 preset titles + Other→free-text);
                                      team=9-dept dropdown; Reports To shows "Full Name (role)";
                                      list + add/edit/deactivate drawer
  pages/MyTasks.jsx                 — every user; tasks assigned to me; todo→in_progress→done;
                                      "+ New Personal Task" (self-assign; optional student/candidate link)
  pages/ManageTasks.jsx             — owner/manager/team_leader only; table of manageable tasks;
                                      "+ Assign Task" drawer (assignee from /tasks/assignable-users;
                                      priority/due_date; Related To: None/Student/Candidate dropdown);
                                      edit/reassign/delete; status filter tabs; /manage-tasks guarded
  pages/Accounting.jsx              — WORKING — finance-gated /accounting (owner/manager/accountant);
                                      summary cards (Total Revenue green, Total Expenses red, Net);
                                      date-range + account-code + direction filters; transactions
                                      ledger with Effect labels (Income/Refund/Expense/Reversal);
                                      Add/Edit drawer: postable-account dropdown, amount, is_reversal
                                      checkbox, description, reference, payment_method, related student;
                                      Chart of Accounts read-only tab; BDT ৳ formatting
  pages/Courses.jsx                 — WORKING — course catalog CRUD; list + add/edit drawer; /courses
  pages/CourseStudents.jsx          — WORKING — registration list; add/edit drawer with enrollments section
                                      (course picker, agreed_fee, batch dropdown filtered to course);
                                      finance-gated payments panel; Convert to Student / Candidate; /course-students
  pages/Batches.jsx                 — WORKING — batch list + add/edit drawer (course, name, dates, status,
                                      notes, instructor dropdown); batch detail: headcount + per-student roster
                                      with payment_status badge + finance-gated amounts; LANGUAGE COURSES nav; /batches
  pages/Instructors.jsx             — WORKING — contract instructor list + add/edit drawer; finance-gated
                                      payments section (total paid, history, + Add Payment auto-posts
                                      expense to acct 5100, delete payment); LANGUAGE COURSES nav; /instructors
  pages/FinanceDashboard.jsx        — WORKING — finance-gated /finance-dashboard (owner/manager/accountant);
                                      summary cards (income/expenses/net/pending-in); counts row;
                                      income & expense breakdown panels by account; Pending Money In
                                      tables (unpaid service fees + outstanding course balances);
                                      date-range filter; BDT ৳ formatting
  pages/                            — one .jsx per page

supabase/migrations/  — ~37 timestamped .sql files; push with `supabase db push`
  *_add_task_related_links.sql           — adds related_student_id + related_candidate_id to tasks
  *_add_txn_is_reversal.sql             — adds transactions.is_reversal (bool default false)
  *_add_service_fee_posted_txn.sql      — adds service_fees.posted_transaction_id (uuid FK → transactions)
  *_create_course_track.sql             — creates courses + course_students + course_enrollments;
                                           seeded: JLPT N5, JFT-Basic, IELTS
  *_create_course_payments.sql          — creates course_payments (per-enrollment installments;
                                           posted_transaction_id FK transactions ON DELETE SET NULL)
  *_add_course_payment_trigger.sql      — (superseded) trigger approach; FAILED due to RLS; kept for history
  *_drop_course_payment_trigger.sql     — drops it; cascade reversal canonical → Python service-role (conv. 30)
  *_create_batches.sql                  — creates batches (course_id FK required, name, dates, status
                                           planned/running/completed/cancelled); adds
                                           course_enrollments.batch_id (uuid nullable FK → batches)
  *_create_instructors.sql              — creates instructors (full_name, phone, email, specialization,
                                           rate_note, is_active); adds batches.instructor_id FK;
                                           creates instructor_payments (instructor_id FK ON DELETE CASCADE,
                                           batch_id optional FK, posted_transaction_id FK transactions)
```

---

*Snapshot as of June 29, 2026. Regenerate at the next milestone. Keep HANDOFF.md in sync.*
