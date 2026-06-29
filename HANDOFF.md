# Education ERP / CRM — Project Handoff Document

> **Purpose:** Paste this into a new conversation to continue building without losing context. Exhaustive reference: full stack, complete file inventory, all table schemas, feature design details, build history, and conventions. Self-contained — assume the new assistant knows nothing else. For the lean orientation file Claude CLI loads automatically each session, see CLAUDE.md.

**Owner:** Mohd Abdur Rahman
**GitHub:** `research-arahman/edu-erp` (branch `main`)
**Local path:** `~/Library/Mobile Documents/com~apple~CloudDocs/vs_code_project/Virtual_Business/edu-erp`
**Last updated:** End of session, June 29, 2026
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
│           ├── service_fees.py        # CRUD + multi-filter GET + enriched list (partner/student/candidate names);
│           │                          #   _sync_fee_accounting(fee_row, user_id): when status→'paid' AND
│           │                          #   posted_transaction_id NULL → auto-create revenue txn (acct 4400
│           │                          #   if payer_type='partner', else 4200); set posted_transaction_id.
│           │                          #   When un-paid + posted → DELETE txn + clear link (reversal). Idempotent.
│           │                          #   GET /students/{id}/fees-summary + /candidates/{id}/fees-summary
│           │                          #   (finance-gated; total_paid, total_pending, paid_count, pending_count)
│           ├── accounting.py          # ALL endpoints require_role("owner","manager","accountant");
│           │                          #   GET /accounting/accounts (chart of accounts ordered by code);
│           │                          #   GET /accounting/transactions?from_date=&to_date=&account_code=&direction=
│           │                          #     (enriched: account_name + student_name);
│           │                          #   POST /accounting/transactions (direction auto-derived: revenue→credit,
│           │                          #     expense/cogs→debit; rejects non-postable accts HTTP 400;
│           │                          #     is_reversal flips direction);
│           │                          #   PATCH /accounting/transactions/{id};
│           │                          #   DELETE /accounting/transactions/{id};
│           │                          #   GET /accounting/summary?from_date=&to_date= (total_revenue, total_expenses,
│           │                          #     net, transaction_count; is_reversal subtracts from totals)
│           ├── selector_education.py  # read-only cascading selector endpoints (education chain)
│           ├── selector_employment.py # read-only cascading selector endpoints (employment chain)
│           ├── admin_users.py         # owner-only: GET /admin/users (list+resolve team_leader_name);
│           │                          #   POST /admin/users (create Supabase auth user via admin API + PATCH profile);
│           │                          #   PATCH /admin/users/{id} (edit profile; self-lockout guard)
│           ├── tasks.py               # ALL endpoints Depends(get_current_user) — auth-gated;
│                                      #   POST /tasks (task_type='assigned'; assigned_by=current user;
│                                      #     assigned_to omitted = self-assign; validates assignee is_active);
│                                      #   GET /tasks/mine?status= (tasks assigned to me; enriched names);
│                                      #   GET /tasks/assigned?status= (tasks I can see/manage; enriched names);
│                                      #   PATCH /tasks/{id} (status='done'→sets completed_at; explicit-null for related_*;
│                                      #     re-checks scope on reassign);
│                                      #   DELETE /tasks/{id};
│                                      #   GET /tasks/assignable-users (scope-filtered per assignment rule B)
│           ├── courses.py             # ALL endpoints auth-gated; deletes require owner/manager;
│           │                          #   courses CRUD (GET/POST/PATCH/DELETE /courses; seeded JLPT N5/JFT-Basic/IELTS);
│           │                          #   course_students: GET list (enriched: enrollments[], course_count, partner_name);
│           │                          #     GET {id} (full enriched); POST/PATCH;
│           │                          #     DELETE — fetches all descendant course_payments, deletes each linked
│           │                          #       transactions row via service-role client (bypasses RLS) BEFORE cascade;
│           │                          #   enrollments: POST /course-students/{id}/enrollments (agreed_fee defaults
│           │                          #     from course.default_fee when omitted; optional batch_id validated:
│           │                          #     batch.course_id must equal enrollment.course_id, HTTP 400 if mismatch);
│           │                          #     PATCH /enrollments/{id} (course_id, agreed_fee, status, payment_status,
│           │                          #       batch_id, enrollment_date, notes);
│           │                          #     DELETE /enrollments/{id} (explicit txn reversal before cascade);
│           │                          #   payments (FINANCE-GATED — require_role("owner","manager","accountant")):
│           │                          #     GET /enrollments/{id}/payments;
│           │                          #     GET /enrollments/{id}/payment-summary → {full_amount, total_paid, remaining, count};
│           │                          #     POST /enrollments/{id}/payments → records payment, auto-posts revenue txn
│           │                          #       to account 4300 (credit, reference "course_payment:{id}"),
│           │                          #       stores posted_transaction_id; recomputes payment_status;
│           │                          #     PATCH /payments/{id}; DELETE /payments/{id} (reverses txn, recomputes);
│           │                          #   batches: GET /batches?course_id= (enriched course_name + student_count);
│           │                          #     GET /batches/{id} → batch + roster (course_student_name, phone,
│           │                          #       enrollment_id, agreed_fee, status, payment_status,
│           │                          #       total_paid[finance-only], remaining[finance-only]) + headcount +
│           │                          #       roster totals (finance-gated amounts null for non-finance);
│           │                          #     POST /batches (course_id required); PATCH /batches/{id} (instructor_id
│           │                          #       validated against instructors table); DELETE /batches/{id};
│           │                          #   conversion: POST /course-students/{id}/convert-to-student;
│           │                          #   POST /course-students/{id}/convert-to-candidate
│           ├── instructors.py         # ALL endpoints auth-gated; deletes require owner/manager;
│           │                          #   GET /instructors (enriched: payment_count,
│           │                          #     total_paid[finance-only], assigned batch names);
│           │                          #   POST /instructors; PATCH /instructors/{id};
│           │                          #   DELETE /instructors/{id} — fetches all instructor_payments, deletes each
│           │                          #     linked transactions row via service-role BEFORE cascade (same RLS pattern
│           │                          #     as course_payments; convention 30 applies here too);
│           │                          #   FINANCE-GATED (require_role("owner","manager","accountant")):
│           │                          #     GET /instructors/{id}/payments;
│           │                          #     GET /instructors/{id}/payment-summary (total_paid, payment_count, currency);
│           │                          #     POST /instructors/{id}/payments — records instructor_payments row,
│           │                          #       auto-posts EXPENSE txn to account 5100 "Freelance/External Consultant
│           │                          #       Fees" (direction DEBIT, reference "instructor_payment:{id}",
│           │                          #       stores posted_transaction_id — idempotent);
│           │                          #     PATCH /instructor-payments/{id} (distinct path from /payments/{id}
│           │                          #       to avoid routing collision with course payment endpoints);
│           │                          #     DELETE /instructor-payments/{id} — reverses linked txn, clears link
│           └── dashboard.py           # ALL endpoints require_role("owner","manager","accountant") — finance-gated;
│                                      #   GET /dashboard/finance?from_date=&to_date= → {
│                                      #     summary: {total_income, total_expenses, net, currency}
│                                      #       (refund-aware revenue/expense logic over date range);
│                                      #     income_breakdown: [{account_code, account_name, total}]
│                                      #       (revenue accounts, e.g. 4300 course/4200 service/4400 commission);
│                                      #     expense_breakdown: [{account_code, account_name, total}]
│                                      #       (expense+cogs, e.g. 5100 instructor/6100 marketing);
│                                      #     pending_in: {unpaid_service_fees[] (status pending/invoiced, payer_name),
│                                      #       outstanding_course_balances[] (agreed_fee − sum(payments) where >0,
│                                      #       course_student_name/course_name/batch_name), pending_in_total}
│                                      #       — current-state only, NOT date-filtered;
│                                      #     counts: {active_course_students, active_batches, active_instructors}
│                                      #   }
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
│       │   │                                #   LANGUAGE COURSES (Courses + Course Students + Batches + Instructors;
│       │   │                                #     all logged-in users) /
│       │   │                                #   FINANCE (Finance Dashboard; owner/manager/accountant only) /
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
│           ├── Accounting.jsx               # WORKING — finance-gated /accounting (owner/manager/accountant);
│                                            #   summary cards (Total Revenue green, Total Expenses red, Net);
│                                            #   date-range + account-code + direction filters;
│                                            #   transactions ledger with Effect labels
│                                            #     (Income / Refund / Expense / Reversal);
│                                            #   Add/Edit drawer: postable-account dropdown, amount,
│                                            #   is_reversal checkbox ("This is a refund/reversal"),
│                                            #   description, reference, payment_method, related student;
│                                            #   Chart of Accounts read-only tab; BDT ৳ formatting
│           ├── Courses.jsx                  # WORKING — course catalog CRUD; list table + add/edit drawer;
│                                            #   /courses route; all logged-in users
│           ├── CourseStudents.jsx           # WORKING — course student registration list; add/edit drawer:
│           │                                #   demographics (name, DOB, phone, email, gender, address,
│           │                                #     notes, referred_by_partner_id, status);
│           │                                #   enrollments section: list of enrollments with course name,
│           │                                #     agreed_fee, status, payment_status badge; add enrollment
│           │                                #     (course picker, agreed_fee defaulting from course, batch
│           │                                #     dropdown filtered to course), edit, remove enrollment;
│           │                                #   finance-gated payments panel per enrollment (owner/manager/accountant):
│           │                                #     Full/Paid/Remaining summary; payment history table;
│           │                                #     + Add Payment (amount, date, method, reference, notes);
│           │                                #     delete individual payment;
│           │                                #   Convert section: Convert to Student / Convert to Candidate
│           │                                #     buttons with ✓ Converted indicators; /course-students route
│           ├── Batches.jsx                  # WORKING — batch list + add/edit drawer (course picker, name,
│           │                                #   start/end dates, status [planned/running/completed/cancelled],
│           │                                #   notes, instructor dropdown); batch detail panel: headcount,
│           │                                #   per-student roster with payment_status badge +
│           │                                #   finance-gated fee amounts (total_paid, remaining);
│           │                                #   LANGUAGE COURSES nav group; /batches route
│           ├── Instructors.jsx              # WORKING — contract instructor list + add/edit drawer
│           │                                #   (full_name, phone, email, specialization, rate_note,
│           │                                #   notes, is_active); finance-gated payments section:
│           │                                #   total paid summary, payment history, + Add Payment
│           │                                #   (auto-posts expense to acct 5100), delete payment;
│           │                                #   LANGUAGE COURSES nav group; /instructors route
│           └── FinanceDashboard.jsx         # WORKING — finance-gated /finance-dashboard
│                                            #   (owner/manager/accountant); summary cards
│                                            #   (Total Income / Total Expenses / Net / Pending In);
│                                            #   counts row (active course students / batches / instructors);
│                                            #   income & expense breakdown panels by account;
│                                            #   Pending Money In: unpaid service fees table +
│                                            #   outstanding course balances table; date-range filter
│                                            #   for summary/breakdown; BDT ৳ formatting;
│                                            #   FINANCE nav group
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
        ├── *_add_task_related_links.sql         # related_student_id (uuid FK → students ON DELETE SET NULL)
        │                                         # + related_candidate_id (uuid FK → candidates ON DELETE SET NULL) on tasks
        ├── *_add_txn_is_reversal.sql            # adds transactions.is_reversal (bool default false);
        │                                         # flips derived direction; subtracts from summary totals when true
        ├── *_add_service_fee_posted_txn.sql     # adds service_fees.posted_transaction_id (uuid FK → transactions
        │                                         # ON DELETE SET NULL); links paid fee to its auto-created txn
        ├── *_create_course_track.sql            # courses (uuid PK; name, description, default_fee float,
        │                                         #   currency default 'BDT', is_active, created_at);
        │                                         # course_students (uuid PK; full_name, phone, email,
        │                                         #   date_of_birth, gender, address, status text,
        │                                         #   referred_by_partner_id uuid FK → referral_partners,
        │                                         #   converted_student_id uuid FK → students,
        │                                         #   converted_candidate_id uuid FK → candidates,
        │                                         #   notes, created_at);
        │                                         # course_enrollments (uuid PK; course_student_id FK
        │                                         #   course_students ON DELETE CASCADE; course_id FK courses;
        │                                         #   agreed_fee float; currency; enrollment_date;
        │                                         #   status text; payment_status text default 'pending';
        │                                         #   posted_transaction_id uuid FK → transactions; notes;
        │                                         #   created_at); RLS: authenticated select/insert/update;
        │                                         # Seeded: JLPT N5, JFT-Basic, IELTS
        ├── *_create_course_payments.sql         # course_payments (uuid PK; enrollment_id FK
        │                                         #   course_enrollments ON DELETE CASCADE; amount float;
        │                                         #   currency; payment_date; payment_method; reference;
        │                                         #   notes; posted_transaction_id uuid FK → transactions
        │                                         #   ON DELETE SET NULL; recorded_by FK profiles; created_at)
        ├── *_add_course_payment_trigger.sql     # (SUPERSEDED) DB trigger to reverse txns on course_payment
        │                                         # delete — FAILED silently (RLS blocks trigger-context
        │                                         # deletes on transactions even SECURITY DEFINER). Left for
        │                                         # history; immediately dropped by next migration.
        ├── *_drop_course_payment_trigger.sql    # drops the above trigger; canonical reversal is Python
        │                                         # service-role DELETE before cascade (see §11 conventions)
        ├── *_create_batches.sql                  # batches (uuid PK; course_id uuid FK → courses NOT NULL;
        │                                         #   name text; start_date date; end_date date;
        │                                         #   status text CHECK ('planned'|'running'|'completed'|'cancelled')
        │                                         #   DEFAULT 'planned'; notes text; created_at timestamptz);
        │                                         # adds course_enrollments.batch_id (uuid nullable FK →
        │                                         #   batches ON DELETE SET NULL)
        └── *_create_instructors.sql              # instructors (uuid PK; full_name text NOT NULL; phone; email;
                                                  #   specialization; rate_note; is_active bool default true;
                                                  #   notes; created_at);
                                                  # adds batches.instructor_id (uuid nullable FK → instructors
                                                  #   ON DELETE SET NULL);
                                                  # instructor_payments (uuid PK; instructor_id FK instructors
                                                  #   ON DELETE CASCADE; batch_id uuid nullable FK batches
                                                  #   ON DELETE SET NULL; amount float; currency; payment_date;
                                                  #   payment_method; reference; notes;
                                                  #   posted_transaction_id uuid nullable FK → transactions
                                                  #   ON DELETE SET NULL; recorded_by FK profiles; created_at)
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
- **Service Fees** — CRUD; `GET` supports `?status=&direction=&partner_id=&student_id=&candidate_id=` filters; list enriches rows with partner/student/candidate names. `_sync_fee_accounting()` auto-posts a revenue transaction when `status→'paid'` and reverses it when un-paid. `GET /students/{id}/fees-summary` and `GET /candidates/{id}/fees-summary` (finance-gated) return `{total_paid, total_pending, paid_count, pending_count, fees}`.
- **Accounting** (all endpoints `require_role("owner","manager","accountant")` — finance-gated):
  - `GET /accounting/accounts` — full chart of accounts ordered by code
  - `GET /accounting/transactions?from_date=&to_date=&account_code=&direction=` — enriched with account_name + student_name
  - `POST /accounting/transactions` — direction auto-derived server-side (revenue→credit; expense/cogs→debit); rejects non-postable accounts (asset/liability/equity + headers) with HTTP 400; `is_reversal=true` flips direction
  - `PATCH /accounting/transactions/{id}` — update fields
  - `DELETE /accounting/transactions/{id}`
  - `GET /accounting/summary?from_date=&to_date=` — returns total_revenue, total_expenses, net, transaction_count; refund-aware: `is_reversal` subtracts from the corresponding total
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
- **Courses** (all auth-gated; `courses.py`):
  - `GET/POST/PATCH/DELETE /courses` — course catalog CRUD
  - `GET /course-students` — list enriched with enrollments[], course_count, referred_by_partner_name
  - `GET /course-students/{id}` — full enriched profile with enrollments + payments per enrollment
  - `POST/PATCH /course-students` — create / update course student demographics
  - `DELETE /course-students/{id}` — fetches all descendant `course_payments`, deletes each linked `transactions` row via service-role (bypasses RLS), then lets DB cascade course_student delete
  - `POST /course-students/{id}/enrollments` — enrol in a course; agreed_fee defaults from `course.default_fee`; optional `batch_id` validated (batch.course_id must equal enrollment.course_id — HTTP 400 if mismatch)
  - `PATCH /enrollments/{id}` — change course_id (with conflict validation), agreed_fee, status, payment_status, batch_id, date, notes
  - `DELETE /enrollments/{id}` — explicit transaction reversal for all payments before cascade
  - **Finance-gated payment endpoints (`require_role("owner","manager","accountant")`):**
    - `GET /enrollments/{id}/payments` — list payment records
    - `GET /enrollments/{id}/payment-summary` — `{full_amount, total_paid, remaining, payment_count, currency}`
    - `POST /enrollments/{id}/payments` — record a payment; auto-posts revenue transaction to account 4300 (credit, reference `course_payment:{id}`, sets `posted_transaction_id`); recomputes `enrollment.payment_status` (pending/partial/paid)
    - `PATCH /payments/{id}` — update (keeps linked transaction consistent)
    - `DELETE /payments/{id}` — reverses linked transaction, clears `posted_transaction_id`, recomputes enrollment payment status
  - **Batches** — `GET /batches?course_id=` enriched with student_count; `GET /batches/{id}` with full roster (course_student_name, phone, enrollment_id, agreed_fee, status, payment_status, total_paid[finance-only], remaining[finance-only]) + headcount + roster totals; `POST /batches` (course_id required); `PATCH /batches/{id}` (accepts instructor_id validated); `DELETE /batches/{id}`
  - `POST /course-students/{id}/convert-to-student` — creates a `students` row carrying over demographics + referred_by_partner_id; sets `converted_student_id`; 400 if already converted; course_student persists independently
  - `POST /course-students/{id}/convert-to-candidate` — same pattern; sets `converted_candidate_id`
- **Instructors** (all auth-gated; `instructors.py`):
  - `GET /instructors` — list enriched with payment_count, total_paid[finance-only], assigned batch names
  - `POST /instructors`, `PATCH /instructors/{id}` — instructor CRUD
  - `DELETE /instructors/{id}` — fetches all instructor_payments, deletes each linked `transactions` row via service-role BEFORE cascade (same Python-layer reversal rule as course_payments)
  - **Finance-gated payment endpoints (`require_role("owner","manager","accountant")`):**
    - `GET /instructors/{id}/payments` — list instructor payment records
    - `GET /instructors/{id}/payment-summary` — `{total_paid, payment_count, currency}`
    - `POST /instructors/{id}/payments` — records `instructor_payments` row; auto-posts EXPENSE transaction to account 5100 "Freelance/External Consultant Fees" (direction DEBIT, reference `instructor_payment:{id}`, stores `posted_transaction_id`); idempotent
    - `PATCH /instructor-payments/{id}` — distinct path to avoid routing collision with course payment endpoints
    - `DELETE /instructor-payments/{id}` — reverses linked transaction, clears `posted_transaction_id`
- **Finance Dashboard** (all endpoints `require_role("owner","manager","accountant")`; `dashboard.py`):
  - `GET /dashboard/finance?from_date=&to_date=` — returns `{summary: {total_income, total_expenses, net, currency}, income_breakdown: [{account_code, account_name, total}], expense_breakdown: [{...}], pending_in: {unpaid_service_fees[], outstanding_course_balances[], pending_in_total}, counts: {active_course_students, active_batches, active_instructors}}`. pending_in is current-state (not date-filtered). income/expense use the same refund-aware accounting logic as the summary endpoint.

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

Fully working feature pages: Countries, Institutes, Programs, AdmissionTemplates, PlacementTemplates, Industries, Employers, Jobs, DestinationExplorer, Students, Candidates, Inquiries, Applications, JobApplications, ReferralPartners, ServiceFees, Login, Staff, MyTasks, ManageTasks, Accounting, **Courses, CourseStudents, Batches, Instructors, FinanceDashboard**.
Placeholders: Dashboard. (Tasks.jsx old placeholder removed; replaced by MyTasks.jsx + ManageTasks.jsx.)

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
- `service_fees` (uuid PK) — direction (text CHECK IN ('incoming','outgoing') default 'incoming'), payer_type (text CHECK IN ('partner','student','other')), partner_id (uuid nullable FK → referral_partners), student_id (uuid nullable FK → students), candidate_id (uuid nullable FK → candidates), amount (float NOT NULL ≥ 0), currency (text default 'BDT'), milestone (text CHECK IN ('on_referral','on_coe','on_visa','on_enrollment','on_placement','custom')), description (text), status (text CHECK IN ('pending','invoiced','paid','cancelled') default 'pending'), due_date (date), paid_date (date), notes (text), **posted_transaction_id (uuid nullable FK → transactions ON DELETE SET NULL — set when status='paid' auto-posts; prevents double-posting; cleared on reversal)**, created_at, updated_at. **Finance-RLS-gated: `can_view_accounting()` for select/insert/update; `can_delete()` for delete.**

**Accounting (finance-RLS-gated via `can_view_accounting()` — owner/manager/accountant only):**
- `accounts` (int code PK) — **full chart of accounts seeded, codes 1000–6400** (assets, liabilities, equity, revenue, COGS, opex)
- `transactions` (uuid PK) — `txn_date` (date), `account_code` (int FK → accounts), `direction` (debit|credit — **auto-derived server-side from account_type; do NOT set from frontend**), `amount` (float), `currency` (text default 'BDT'), `description` (text), `reference` (text), `payment_method` (text), `student_id` (uuid nullable FK → students), `recorded_by` (uuid FK → profiles), **`is_reversal` (bool default false — flips derived direction AND subtracts from summary totals)**, `created_at`. Gateway fields (gateway_txn_id, gateway_ref, etc.) nullable placeholders for Stripe/PayPal.
- `investments`, `commissions` — capital + consultant commission tracking

**Task management:**
- `daily_task_templates` — fixed/daily task templates (not yet populated or used; needs `department_id` column added)
- `tasks` — `id` (uuid PK), `title`, `description`, `task_type` (text; 'assigned' for assigned tasks), `assigned_to` (uuid FK → profiles), `assigned_by` (uuid FK → profiles), `priority` (text), `status` (text: 'todo'|'in_progress'|'done'), `due_date` (date), `completed_at` (timestamptz; set when status→done; cleared when un-done), **`related_student_id`** (uuid nullable FK → students ON DELETE SET NULL), **`related_candidate_id`** (uuid nullable FK → candidates ON DELETE SET NULL), `created_at`, `updated_at`
- `notifications` — `recipient_id`, `type`, `related_task_id`, `is_read`; foundation for escalation (not yet triggered)

**Language Course Track:**
- `courses` (uuid PK) — `name` (text NOT NULL), `description` (text), `default_fee` (float), `currency` (text default 'BDT'), `is_active` (bool default true), `created_at`. **Seeded:** JLPT N5, JFT-Basic, IELTS.
- `course_students` (uuid PK) — dedicated entity separate from `students` (abroad applicants). Fields: `full_name`, `phone`, `email`, `date_of_birth` (date), `gender` (text), `address` (text), `status` (text default 'active'), `referred_by_partner_id` (uuid nullable FK → referral_partners), **`converted_student_id`** (uuid nullable FK → students — set on conversion; convert-once guard), **`converted_candidate_id`** (uuid nullable FK → candidates — set on conversion; convert-once guard per track), `notes` (text), `created_at`. Deleting a course_student does NOT delete the converted student/candidate — records are independent.
- `course_enrollments` (uuid PK) — joins course_student ↔ course with fee detail. `course_student_id` (uuid FK → course_students ON DELETE CASCADE), `course_id` (uuid FK → courses), `agreed_fee` (float — may differ from course.default_fee; negotiated at enrollment), `currency` (text default 'BDT'), `enrollment_date` (date), `status` (text default 'active'), `payment_status` (text default 'pending'; server-recomputed to 'partial' or 'paid' as payments are recorded), **`batch_id`** (uuid nullable FK → batches ON DELETE SET NULL — assignment validated: batch.course_id must equal enrollment.course_id), **`posted_transaction_id`** (uuid FK → transactions ON DELETE SET NULL — deprecated on enrollment; actual posting is per-payment via course_payments), `notes` (text), `created_at`. A student may enrol in multiple courses simultaneously.
- `course_payments` (uuid PK) — installment records per enrollment. `enrollment_id` (uuid FK → course_enrollments ON DELETE CASCADE), `amount` (float NOT NULL), `currency` (text default 'BDT'), `payment_date` (date), `payment_method` (text), `reference` (text), `notes` (text), **`posted_transaction_id`** (uuid nullable FK → transactions ON DELETE SET NULL — links to auto-created revenue txn; prevents double-posting; cleared on reversal), `recorded_by` (uuid FK → profiles), `created_at`. Finance-RLS-gated (can_view_accounting() on select/insert/update).
- `batches` (uuid PK) — a batch belongs to ONE course. `course_id` (uuid FK → courses NOT NULL), `name` (text), `start_date` (date), `end_date` (date), `status` (text CHECK IN ('planned','running','completed','cancelled') DEFAULT 'planned'), **`instructor_id`** (uuid nullable FK → instructors ON DELETE SET NULL), `notes` (text), `created_at`. Roster = course_enrollments with this batch_id. Headcount + per-student payment status on GET /batches/{id}; finance-gated amounts null for non-finance roles.
- `instructors` (uuid PK) — contract instructors; NOT auth users or profiles (no login). `full_name` (text NOT NULL), `phone`, `email`, `specialization` (text), `rate_note` (text), `is_active` (bool default true), `notes` (text), `created_at`.
- `instructor_payments` (uuid PK) — payments made to a contract instructor. `instructor_id` (uuid FK → instructors ON DELETE CASCADE), `batch_id` (uuid nullable FK → batches ON DELETE SET NULL), `amount` (float), `currency`, `payment_date`, `payment_method`, `reference`, `notes`, **`posted_transaction_id`** (uuid nullable FK → transactions ON DELETE SET NULL — links to auto-created expense txn on account 5100; same idempotency pattern as course_payments), `recorded_by` (uuid FK → profiles), `created_at`. Finance-RLS-gated. Auto-posts expense on POST; reversal on DELETE; cascade-reversed in Python (DELETE /instructors/{id}) before instructor delete — same convention 30 pattern.

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
- ✅ **C14 — Accounting Phase 1 (manual ledger):**
  - **Tables:** `accounts` (int code PK) and `transactions` already existed from `*_create_accounting.sql`. Chart of accounts seeded codes 1000–6400 (assets, liabilities, equity, revenue, COGS, opex).
  - **Migration** `*_add_txn_is_reversal.sql`: adds `transactions.is_reversal` (bool default false); when true, direction is flipped AND the summary subtracts from the account-type's total.
  - **`accounting.py` router** registered under `/api`; all endpoints `require_role("owner","manager","accountant")`: `GET /accounting/accounts`; `GET /accounting/transactions` (enriched with account_name + student_name); `POST /accounting/transactions` (direction auto-derived: revenue→credit, expense/cogs→debit; rejects non-postable accounts — asset/liability/equity and headers blocked HTTP 400); `PATCH` + `DELETE` by id; `GET /accounting/summary` (total_revenue, total_expenses, net, transaction_count; `is_reversal` flips direction and subtracts from totals).
  - **Accounting model decision:** single-posting (NOT full double-entry). Users post to ONE account; the chosen account determines income vs. expense. Direction is never set manually by the user.
  - **`TransactionCreate` / `TransactionUpdate`** Pydantic schemas added to `schemas.py`.
  - **`Accounting.jsx`** replaces the placeholder page: finance-gated `/accounting` route; summary cards (Total Revenue green, Total Expenses red, Net); date-range + account + direction filters; transactions ledger with Effect labels (Income / Refund / Expense / Reversal); Add/Edit drawer (postable-account-only dropdown, amount, `is_reversal` "This is a refund/reversal" checkbox, description, reference, payment_method, optional related student); Chart of Accounts read-only tab (full hierarchy); BDT ৳ formatting.
- ✅ **C16 — Language Course Track — Foundation (tables + CRUD + enrollments):**
  - **Migrations:** `*_create_course_track.sql` creates `courses`, `course_students`, `course_enrollments` with RLS; seeded JLPT N5, JFT-Basic, IELTS.
  - **`courses.py` router** registered under `/api`; all endpoints auth-gated; deletes require owner/manager. Courses CRUD. Course_students CRUD with enriched GET list (enrollments[], course_count, referred_by_partner_name) and full enriched GET by ID. Enrollment CRUD per course_student: `POST /course-students/{id}/enrollments` (agreed_fee defaults from course.default_fee when omitted); `PATCH /enrollments/{id}` (change course_id with validation, agreed_fee, status, payment_status, date, notes); `DELETE /enrollments/{id}` (explicit txn reversal before cascade). Multiple courses per student supported.
  - **`Courses.jsx`** — course catalog page: list + add/edit drawer. `/courses` route.
  - **`CourseStudents.jsx`** — registration page: list + add/edit drawer with demographics + enrollments section (add/edit/remove enrollment, course picker, agreed_fee override, payment_status badge). `/course-students` route.
  - **LANGUAGE COURSES nav group** added to `Layout.jsx` (Courses + Course Students, all logged-in users).
- ✅ **C17 — Language Course Track — Payments + Accounting Integration:**
  - **Migration** `*_create_course_payments.sql`: `course_payments` table with `posted_transaction_id` FK → transactions.
  - **Finance-gated payment endpoints** in `courses.py` (`require_role("owner","manager","accountant")`): `GET /enrollments/{id}/payments`; `GET /enrollments/{id}/payment-summary`; `POST /enrollments/{id}/payments` (records payment row, auto-posts revenue txn to account 4300 "Test Prep Course Registration" direction credit, reference `course_payment:{id}`, stores `posted_transaction_id`, then recomputes `enrollment.payment_status`); `PATCH /payments/{id}`; `DELETE /payments/{id}` (reverses linked txn, recomputes status).
  - **Accounting integrity — critical fix:** Cascade deletes (`DELETE /course-students/{id}`, `DELETE /enrollments/{id}`) were leaving orphaned accounting transactions because DB-level CASCADE deleted `course_payments` rows without reversing their linked `transactions`. A DB trigger approach was attempted (`*_add_course_payment_trigger.sql`) and FAILED silently — RLS on `transactions` blocks the trigger's DELETE even with `SECURITY DEFINER`. **Final solution:** dropped the trigger (`*_drop_course_payment_trigger.sql`); the Python DELETE handlers now fetch all descendant `course_payments`, delete each `linked transactions` row via the service-role supabase client (bypasses RLS), THEN delete the records. **Verified:** student-delete, enrollment-delete, and direct payment-delete all leave revenue balance 0 / transaction count 0. Convention: rely on service-role Python deletes for transaction reversal, NOT DB triggers.
  - **Frontend:** `CourseStudents.jsx` enrollment rows show finance-gated payments panel (Full/Paid/Remaining summary, payment history, + Add Payment button, delete payment). Only rendered for owner/manager/accountant.
- ✅ **C18 — Language Course Track — Course Student Conversion (→ Student / → Candidate):**
  - **Backend:** `POST /course-students/{id}/convert-to-student` creates a new `students` row carrying over full_name, phone, email, date_of_birth, address, referred_by_partner_id; sets status=active; sets `course_students.converted_student_id`; HTTP 400 if already converted to student. `POST /course-students/{id}/convert-to-candidate` mirrors this; sets `converted_candidate_id`; 400 if already converted to candidate. Guards are per-track (can convert to student AND candidate independently). Course student record PERSISTS after conversion — deleting it does NOT delete the created student/candidate (same design as inquiry conversion).
  - **Frontend:** `CourseStudents.jsx` edit drawer has a Convert section: "Convert to Student" button + "Convert to Candidate" button; each shows a `window.confirm`; on success shows "✓ Converted to Student" / "✓ Converted to Candidate" indicators. Verified in browser.

- ✅ **C19 — Language Course Track — Batches:**
  - **Migration** `*_create_batches.sql`: `batches` table (id uuid, course_id FK → courses NOT NULL, name, start_date, end_date, status CHECK (planned/running/completed/cancelled) default planned, notes, created_at). `course_enrollments.batch_id` (uuid nullable FK → batches ON DELETE SET NULL).
  - **Backend** (in `courses.py`; requires login; deletes owner/manager): `GET /batches?course_id=` enriched with course_name + student_count; `GET /batches/{id}` — batch detail + full roster (course_student_name, phone, enrollment_id, agreed_fee, status, payment_status, total_paid, remaining) + headcount + roster fee totals. Finance gate: fee/paid/remaining amounts are null for non-finance roles; payment_status label is always shown. `POST /batches` (course_id required); `PATCH /batches/{id}` (accepts instructor_id, validated against instructors); `DELETE /batches/{id}`. Enrollment endpoints (POST/PATCH) accept optional batch_id **validated to match enrollment.course_id** (HTTP 400 if not); enriched enrollment data includes batch_id/batch_name.
  - **Frontend** `Batches.jsx`: list + add/edit drawer (course picker, name, dates, status, notes, instructor dropdown). Batch detail panel: headcount, per-student roster with payment_status badge + finance-gated amounts. Batch assignment dropdown added to enrollment forms in `CourseStudents.jsx` (filtered to batches of that course). "Batches" link in LANGUAGE COURSES nav group.

- ✅ **C20 — Language Course Track — Contract Instructors + Instructor Payments (expense accounting):**
  - **Migration** `*_create_instructors.sql`: `instructors` table (id uuid, full_name NOT NULL, phone, email, specialization, rate_note, is_active, notes, created_at). `batches.instructor_id` (uuid nullable FK → instructors ON DELETE SET NULL). `instructor_payments` table (id uuid, instructor_id FK instructors ON DELETE CASCADE, batch_id nullable FK batches ON DELETE SET NULL, amount float, currency, payment_date, payment_method, reference, notes, posted_transaction_id nullable FK transactions ON DELETE SET NULL, recorded_by FK profiles, created_at).
  - **Backend** `instructors.py` (registered under `/api`): instructor records require login (deletes owner/manager). `GET /instructors` enriches with payment_count, total_paid[finance-only], assigned batches. `POST/PATCH /instructors`. `DELETE /instructors/{id}` — fetches all the instructor's payments, deletes each linked `transactions` row via service-role client BEFORE cascade (convention 30 — RLS blocks trigger-context deletes). Finance-gated payment endpoints: `GET /instructors/{id}/payments`; `GET /instructors/{id}/payment-summary`; `POST /instructors/{id}/payments` — records payment + **auto-posts EXPENSE transaction to account 5100** "Freelance/External Consultant Fees" (direction DEBIT, reference `instructor_payment:{id}`, stores `posted_transaction_id` — idempotent). `DELETE /instructor-payments/{id}` (distinct path from course /payments to avoid routing collision) — reverses linked txn, clears `posted_transaction_id`. `PATCH /instructor-payments/{id}`. `PATCH /batches/{id}` accepts instructor_id (validated vs instructors table); enriched batch responses include instructor_id/instructor_name.
  - **CRITICAL pattern (convention 30 applies here too):** Instructor payment expense reversal on cascade is handled EXPLICITLY in Python (service-role) in `DELETE /instructors/{id}` — NOT a DB trigger. Verified: payment posts expense to 5100; delete payment reverses; delete instructor reverses all (expenses + txn count return to 0, no orphans).
  - **Frontend** `Instructors.jsx`: list + add/edit drawer. Finance-gated payments section: total paid summary, payment history table, + Add Payment (posts to accounting as expense), delete payment. Instructor dropdown added to Batches add/edit form. "Instructors" link in LANGUAGE COURSES nav group.

- ✅ **C21 — Owner Finance Dashboard:**
  - **Backend** `dashboard.py` (registered under `/api`): `GET /dashboard/finance?from_date=&to_date=` — finance-gated (`require_role("owner","manager","accountant")`). Returns: `summary` {total_income, total_expenses, net, currency} (refund-aware revenue/expense logic over the date range, reuses same accounting computation as summary endpoint); `income_breakdown` [{account_code, account_name, total}] (all revenue accounts with non-zero totals in range, e.g. 4300 course / 4200 service / 4400 commission); `expense_breakdown` [{...}] (expense+cogs accounts, e.g. 5100 instructor / 6100 marketing); `pending_in` {unpaid_service_fees[] (status pending/invoiced, with payer_name), outstanding_course_balances[] (per enrollment agreed_fee − sum(payments) where balance >0, with course_student_name/course_name/batch_name), pending_in_total} — current-state only, NOT date-filtered; `counts` {active_course_students, active_batches, active_instructors}.
  - **Frontend** `FinanceDashboard.jsx` (route `/finance-dashboard`, guarded owner/manager/accountant; "Finance Dashboard" link in FINANCE nav group): summary cards (Total Income green / Total Expenses red / Net blue / Pending In amber); counts row; income & expense breakdown panels; Pending Money In section with unpaid service fees table + outstanding course balances table; date-range filter (applied to summary/breakdown only; pending_in always current-state); BDT ৳ formatting.

- ✅ **C15 — Accounting Phase 2 (auto-posting from service fees + fees-paid profile indicator):**
  - **Migration** `*_add_service_fee_posted_txn.sql`: adds `service_fees.posted_transaction_id` (uuid FK → transactions ON DELETE SET NULL).
  - **`_sync_fee_accounting(fee_row, current_user_id)`** helper in `service_fees.py`, wired into POST and PATCH:
    - When `status` becomes `'paid'` AND `posted_transaction_id` is null → auto-create ONE revenue transaction: `account_code=4400` if `payer_type='partner'` else `4200`; direction credit; amount/currency from fee; `txn_date=paid_date or today`; `reference=f"service_fee:{fee.id}"`; `student_id` if present; `recorded_by=current_user`. Then sets `posted_transaction_id`.
    - When `status != 'paid'` AND `posted_transaction_id` set → DELETE the linked transaction + clear `posted_transaction_id` (reversal). If already paid+posted → no-op (idempotent).
  - **Fees-paid profile indicator:** `GET /students/{id}/fees-summary` and `GET /candidates/{id}/fees-summary` (finance-gated) return `{total_paid, total_pending, paid_count, pending_count, fees:[...]}`. `Students.jsx` and `Candidates.jsx` edit drawers show a "Fees" section for owner/manager/accountant only: green "Fees paid: ৳X" if total_paid > 0, amber "Pending: ৳X" if pending; hidden in add mode and for non-finance roles.
  - **End-to-end verified:** pending→paid posts +amount to revenue and sets link; paid→pending reverses and removes txn; editing while paid does not duplicate.

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

1. **Task Management — later phases** — assigned tasks (phase 1, C12) is done. Remaining phases:
   - `profiles` extensions needed: `department_id` INT FK → departments (need a `departments` table for the 9 departments), `tier` text CHECK IN ('manager','team_leader','team_member'), `reports_to` uuid nullable self-ref FK → profiles. Also: `department_id` column on `daily_task_templates`.
   - **Fixed/daily task generation** — lazy-on-login approach recommended: when staff logs in, generate today's task instances from matching `daily_task_templates` (by department_id + tier) if not already present for today.
   - **Verification step** — add `verified_at` timestamptz (or `is_verified` bool) to task instances; staff must explicitly verify; unverified ≠ done even after `end_time` passes.
   - **Time/calendar flagging** — after a fixed task's `end_time` window passes and it remains unverified, auto-flag as `missed`/`overdue` (lazy evaluation on next load, or Supabase Edge Function cron).
   - **Escalation notifications** — write to `notifications` table (recipient_id, type, related_task_id, is_read) escalating up `reports_to` chain: staff → team_leader → manager → owner.
   - Full design in §10A.

2. **Language Course Track** — foundation (C16), payments (C17), conversion (C18), batches (C19), contract instructors (C20), and finance dashboard (C21) are **DONE**. Remaining in order:
   - **(a) Course Lead Funnel** — extend `inquiries.interest_track` CHECK to add `'language_course'`; add `POST /inquiries/{id}/convert-course-student` endpoint; show course-specific fields in inquiry form when `interest_track === 'language_course'`. Reuses existing inquiry infrastructure.
   - **(b) Japan Language-School Roadmap Template** — the 4-phase workflow in §14 Component 8 maps onto the reusable process-template pattern; build when the lead funnel conversion is done so course students have a roadmap after converting.
   - Full spec in §14.

3. **Wire `assigned_counselor` / `created_by`** into feature routers and schemas. All feature routers are now auth-gated; `get_current_user()` is already available on every endpoint. When creating a student/candidate/inquiry/application: populate `created_by` from `get_current_user().id`. When assigning: populate `assigned_counselor` from chosen user's ID. FK columns already exist in DB but are omitted from all schemas and forms.

4. **Deferred checklists** — `application_checklist` and `job_application_checklist` tables already exist. Goals: (a) seed items from `admission_requirements` when a new application is created; (b) tick-off UI in Applications Kanban drawer; (c) mirror for job applications.

5. **Marketing + company expense pages** — marketing page auto-posts expense entries to accounting on save; company expense page requires file upload (receipts) → needs pluggable file storage (Supabase Storage or Google Drive API).

6. **Apply-tab restructure** (PF-1) — see §13. Move `EducationSelector` + `AdmissionRoadmap` from Student profile into the Application record; same for Employment track. A student may have multiple applications; the application becomes the unit of work.

7. **Backend search endpoints for Students/Candidates** — client-side search (`lib/search.js`) is fine for hundreds of records. If data grows large, add `?q=` to the GET endpoints.

8. **Security hardening pass** before go-live — per-row visibility for counselors (`assigned_counselor` filter on students/candidates endpoints), rate limiting, input sanitization audit.

9. **Google Drive document integration** (service-account), then **Render deployment**. Render server needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` as env vars; frontend build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time env vars.

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
- **Instructor payments auto-post expense to account 5100 (Freelance/External Consultant Fees), direction DEBIT.** `POST /instructors/{id}/payments` records an `instructor_payments` row and auto-posts an expense transaction to account 5100 (reference `instructor_payment:{id}`, stores `posted_transaction_id` — idempotent). `DELETE /instructor-payments/{id}` (distinct path from course `/payments/{id}` — avoids routing collision) reverses the linked transaction before deleting. `DELETE /instructors/{id}` fetches ALL the instructor's payments and reverses each linked transaction via the service-role client BEFORE cascade delete — same Python-layer reversal rule as course_payments (convention 30 applies). Verified: payment posts expense; delete payment reverses; delete instructor reverses all — no orphaned transactions.
- **Batch course-scoping: a batch belongs to exactly ONE course.** When assigning `batch_id` to a course enrollment (POST or PATCH), validate that `batch.course_id == enrollment.course_id` (HTTP 400 if mismatch). The batch assignment dropdown in `CourseStudents.jsx` is filtered to only batches of the chosen course. Finance-gated batch roster: `GET /batches/{id}` enriches each roster row with `total_paid` and `remaining` only for finance roles; `payment_status` label is always shown regardless of role.

---

## 12. Immediate Next Step

**Language Course Track foundation + payments + conversion + batches + contract instructors + finance dashboard (C16–C21) are complete.**

The next step is the **Course Lead Funnel** (§10 item 2a):

---

**Next — Course Lead Funnel (Language Course Track 2a):**

Step 1 — Migration:
- Alter `inquiries.interest_track` CHECK constraint to allow `'language_course'` as a third value (alongside `'education'` and `'employment'`). Drop the old CHECK, add new one.

Step 2 — Backend:
- In `inquiries.py`, add `POST /inquiries/{id}/convert-course-student` endpoint: same convert-once guard pattern (`status != 'converted'` AND `converted_student_id IS NULL` AND `converted_candidate_id IS NULL`; also check a `converted_course_student_id` FK if adding one); carry over name/phone/email/referred_by_partner_id; create `course_students` row; mark inquiry `status='converted'`.
- Add course-specific inquiry fields to schemas when `interest_track = 'language_course'` (e.g., `target_course`, `target_test_date`).

Step 3 — Frontend:
- `Inquiries.jsx`: add `'Language Course'` option to interest_track dropdown; show course-specific fields (target test, target date) when track = language_course; add "Convert to Course Student" button alongside existing conversion buttons.

---

**Also available — Task Management later phases:** Schema extensions (`departments` table, `department_id`/`tier`/`reports_to` on `profiles`) + fixed-task generation → verification → escalation (§10A full spec).

---

> **Before starting:** ensure all three terminals are running; `curl http://127.0.0.1:8000/api/instructors` (with owner JWT) → returns instructor list.

---

---

## 13. PLANNED FEATURES (not yet built)

Requirements captured only — no code written. Do NOT implement unless explicitly requested.

> **✅ PF-3 (Accounting Core) — DONE as C14.** Manual ledger, chart of accounts UI, transactions CRUD, summary endpoint, `Accounting.jsx` page fully working.
>
> **✅ PF-2 (Service Fee "Paid" → Profile Indicator + Accounting Integration) — DONE as C15.** Auto-posting via `_sync_fee_accounting`; `posted_transaction_id` link; fees-paid indicator on student/candidate profiles for finance roles.

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

**Additional requirements (clarified by owner):**
- The Applications and Job Applications pages should be **fully dynamic** — showing **all application-related detail in one place**:
  - Education application: institute/university, course/program, destination country, admission roadmap + progress.
  - Job application: employer, job, placement roadmap + progress.
- Applications should be **categorized by application type**: e.g., **"University"**, **"Language School"**, and **"Other"**. (The "Language School" category ties into the Language Course track — a course student converting to a Japan language-school abroad applicant would appear under that category on the Applications page.)
- Student and Candidate profile pages remain **pure demographic/contact data** (already largely the case). Rich application/destination/roadmap detail belongs on the Applications/Job Applications pages.
- The **"Apply"** action on a Student or Candidate profile creates a new Application (categorized by type) and navigates to it. This implies an `application_type` field (or equivalent) on the `applications` table.
- A student may have multiple applications (different types, different destinations, different intakes) — all visible and manageable on the Applications page.
- **Core multi-application requirement (clarified by owner, June 27, 2026):** The Applications system must support **MULTIPLE applications PER PERSON to MULTIPLE INSTITUTIONS running in parallel**. Specifically: **(a)** an abroad **Education student** can apply to multiple universities/programs simultaneously (e.g., University of Tokyo AND Osaka University at the same time); **(b)** a **language-course student** progressing toward Japan can apply to multiple Japanese **language schools** at once — not just one. The unit of work is one application per institution. This is: **one applicant → many institution applications**, each categorized by type (**University / Language School / Other**), each carrying its own destination selection, admission roadmap, and independent progress tracking.
- **This remains a planned chunk, not yet built.**

---

### PF-4: Roadmap Step Editing & Rich-Text (Admission & Placement Roadmaps)

**Context:** The admission roadmap (`AdmissionRoadmap.jsx`) and placement roadmap (`PlacementRoadmap.jsx`) display ordered steps sourced from `admission_steps` / `placement_steps` tables (via templates). Currently steps are defined once in the template and rendered read-only or with status controls (Pending/Current/Done) on a per-student/per-candidate basis. This feature adds authoring power to both the template step list and (optionally) the live per-record roadmap.

**Requirements:**

**(a) Inline step editing** — After a step exists (in a template or on a live roadmap), the user can edit the step's **title** and **description** in-place without navigating away to the template management page.

**(b) Drag-and-drop reordering** — Steps can be reordered by dragging within the list. The sort order must persist (implies a `position` or `order` field on the roadmap-step table; `step_order` already exists on `admission_steps` / `placement_steps` and should be updated on drop).

**(c) Rich-text step description** — The step description field supports **word-processor-style formatting**: at minimum **bullet points** and **numbered lists**; ideally also **bold** and **italic**. Storage: decide between **HTML** (rendered with a sanitizer) or **Markdown** (rendered with a Markdown component). A frontend rich-text editor component is required (e.g., TipTap, Quill, or equivalent lightweight library).

**Scope decision (resolve at build time):**
- Does inline editing apply to **template** steps only (editing in `AdmissionTemplates.jsx` / `PlacementTemplates.jsx`), to the **live per-student/per-candidate roadmap steps**, or **both**?
- Does each student/candidate get their own overrideable copy of step text, or does editing the template propagate to all records on that template? A pragmatic default: edits apply to the template-level steps (shared source); per-record overrides are a future enhancement.

**Implementation notes for build time:**
- Check the actual schema of `admission_steps` and `placement_steps` before implementing. `step_order` already exists on both; confirm it is respected by current list rendering. Check whether `description` columns are plain `text` (sufficient for HTML/Markdown without migration).
- The backend needs: `PATCH /admission-templates/{template_id}/steps/{step_id}` (or equivalent) to accept updated title, description, and step_order. For bulk drag-reorder, add `PATCH /admission-templates/{id}/steps/reorder` → receives `[{id, step_order}]` array.
- Parallel changes required for `placement_templates` / `placement_steps` — keep both tracks in sync.

**This is a focused enhancement chunk, not yet built.**

---

---

---

## 14. LANGUAGE COURSE TRACK (3rd track) — Spec + Build Status

> **Status:** Foundation, payments, and conversion are DONE (C16–C18). Remaining phases captured below. Full vision spec preserved for planning. Do NOT implement remaining phases unless explicitly requested.

---

### Overview

The business is adding a **third revenue track** alongside the existing Education (abroad) and Employment/SSW tracks: an **on-site Language / Test-Prep Course business** run from the office. Courses currently planned: JLPT N5, IELTS, GRE, GMAT, and other Western-pathway prep. This is a distinct revenue line with its own student entity, batch system, instructors, and finance flows.

**Key distinction:** course students are people who take in-office prep courses. They are entirely separate from the `students` table (abroad applicants). A course student may later convert into an education-track student or SSW candidate, mirroring the existing inquiry → student/candidate conversion pattern.

---

### Component 1 — Course Student Entity (`course_students` table)

New dedicated table, separate from the existing `students` abroad-applicant table. Fields to include:
- Own demographic / contact fields (name, DOB, phone, email, address)
- The course(s) they are enrolled in
- Enrollment / registration date
- Status (active / completed / dropped / etc.)
- **Conversion link:** `converted_student_id` (uuid nullable FK → students) and `converted_candidate_id` (uuid nullable FK → candidates), mirroring the `inquiries` conversion pattern. A course student can later become an education-track abroad student or an SSW candidate — apply the same convert-once guard.

**Do not store course students in the existing `students` table.** Demographics and context are different; keeping them separate avoids schema pollution.

---

### Component 2 — Courses + Course Registration Page

- **`courses` table** — defines course offerings: course name (JLPT N5, IELTS, GRE, GMAT, …), default course fee, currency, description, is_active.
- **Course Registration page** — enrol a course student into a course, capturing the course fee at time of registration. This fee is the per-student revenue amount.
- **`course_enrollments` table (explicit model):** a course student may enrol in **multiple courses** — the relationship is `course_students` 1 → many `course_enrollments` → `courses`. The `course_enrollments` record ties: `course_student_id` ↔ `course_id` ↔ `batch_id` (nullable until assigned to a batch) ↔ **`agreed_fee` float** (the fee negotiated at enrollment time, which may differ from the course default) ↔ `payment_status`. This table is the unit of course-fee tracking.
- **Accounting integration:** when a course enrollment fee is collected (payment_status → 'paid'), auto-post as a **revenue transaction** in the `transactions` table. Suggested account: a dedicated revenue account such as 4300 "Test Preparation Course Registration" (add to chart of accounts if not present), or reuse the nearest existing revenue code. The posting must be traceable to the specific course student and batch. **This auto-posting is the chunk immediately after the course-student/courses/enrollment foundation is built** — it reuses the same `_sync_fee_accounting`-style pattern established in C15 (no additional infrastructure needed).

---

### Component 3 — Batches

- **`batches` table** — a batch belongs to a course; has: `course_id`, `batch_name` / `batch_code`, `start_date`, `end_date` / period label, `assigned_instructor_id` (FK → `instructors` table, see Component 4), `max_seats`, `is_active`.
- **`batch_enrollments` table** — joins `course_students` ↔ `batches` with `payment_status` (paid / partial / pending) and `paid_amount` float.
- **Language-course page UI** should show:
  - Headcount per batch (how many students enrolled).
  - Per-student payment completion status within each batch.
- A course student's profile should show their current batch and payment status.

---

### Component 4 — Contract Instructors (NOT fixed staff)

Instructors are hired **contractually per-course / per-class / per-hours** and are **distinct from system staff** (they do not necessarily have login accounts; they are not in `profiles`). Model them as their own entity:

- **`instructors` table** — name, phone, email, specialization (JLPT, IELTS, etc.), is_active, notes.
- **`instructor_engagements` table** — links an instructor to a specific batch/course: `instructor_id`, `batch_id`, `engagement_type` (per_hour / per_class / per_course), `agreed_rate` (float), `currency`, `total_hours` or `total_classes` (nullable), `notes`.
- **`instructor_payments` table** — records actual payments made to an instructor for an engagement: `instructor_id`, `engagement_id`, `amount` (float), `currency`, `payment_date`, `status` (pending / paid / cancelled), `notes`.
- **Accounting integration:** when an instructor payment is recorded (status → 'paid'), auto-post as an **expense transaction** in `transactions`. Suggested account: 5100 "Freelance / External Consultant Fees" or a dedicated instructor-cost account. Posting must be traceable to the instructor and batch.

---

### Component 5 — Per-Student Course Finance → Accounting (auto-posting)

The accounting plumbing for the course track works as follows:

| Event | Accounting effect |
|---|---|
| Course registration fee collected (payment_status → 'paid') | Revenue transaction posted (debit receivable / bank, credit course revenue account) |
| Instructor payment made (status → 'paid') | Expense transaction posted (debit instructor-cost account, credit payable / bank) |

Every posting must carry metadata: `course_student_id` / `batch_id` for fee postings; `instructor_id` / `engagement_id` for expense postings. This allows the owner to drill down into what drove each accounting entry.

**Dependency note:** this auto-posting plumbing uses the same `transactions` table and pattern as the `service_fees` auto-posting (C15 — already done). No additional infrastructure is needed before building course money-flows.

---

### Component 6 — Owner Finance Command-Center (Dashboard)

A finance-gated dashboard (owner / manager / accountant only) that aggregates ALL pending and actual money flows across the entire business:

**Pending money IN (to collect):**
- Course fees: `batch_enrollments` where `payment_status != 'paid'` — grouped by course/batch, showing student name + amount due.
- Service fees: `service_fees` where `status = 'pending'` or `'invoiced'` — existing tracker.

**Pending money OUT (to pay):**
- Instructor payments: `instructor_payments` where `status = 'pending'`.
- Other planned expenses: salary runs, business expenses (from manual accounting entries).

**Summary view:**
- Total income (this month / YTD) from accounting transactions (revenue accounts).
- Total expenses (this month / YTD) from accounting transactions (expense accounts).
- Outstanding receivables vs. outstanding payables at a glance.

**Implementation:** Built on top of `transactions` (accounting ledger) + `service_fees` + `batch_enrollments` + `instructor_payments`. The dashboard is read-only aggregation; all underlying records are managed in their respective pages.

---

### Component 7 — Course Lead Funnel (Inquiries extension)

Course leads arrive primarily from **social-media advertising** (people interested in JLPT N5 / IELTS / GRE etc.). The funnel:

1. Lead comes in (social media / walk-in / referral)
2. Staff **calls** the prospect
3. Prospect visits office
4. Some **register** (→ become a course student)
5. Complete the course → outcome (pass test, convert to abroad student, etc.)

**This largely maps onto the existing `inquiries` tracker**, extended for the course track:
- `interest_track` column on `inquiries` currently supports `'education'` and `'employment'`. Add `'language_course'` (or `'course'`) as a third allowed value.
- A course inquiry can convert into a course student (new conversion endpoint: `POST /inquiries/{id}/convert-course-student`). Apply the same convert-once guard pattern as existing conversions.
- Inquiry form: show course-specific fields (e.g. target test, target score, target test date) when `interest_track = 'language_course'`.

---

### Component 8 — Japan Language-Course Roadmap Template (PRESERVE VERBATIM)

The owner provided a detailed **4-phase agency workflow** for admitting a Bangladeshi student to a Japanese language school (~6 months before arrival). This maps onto the reusable process-template pattern (like admission/placement templates) but is specific to the language-school pathway. Preserve the full detail below as the authoritative source for the roadmap template when it is built.

---

**PHASE 1 — Student Screening & Pre-Qualification**

1. **Education history:** Verify 12+ years of formal schooling (HSC or equivalent). Check study gap — ideally less than 5 years; if gap exists, obtain proof of activities or job experience during that period.
2. **Japanese language ability:** Student must have a certificate of ≥150 hours of Japanese study **OR** a JLPT N5 / NAT-TEST Level 5 pass. Note: the Japanese school often schedules a Skype/Zoom interview — do not submit a student who cannot introduce themselves in Japanese.
3. **Financial sponsor check:** Sponsor (usually a parent) must demonstrate approximately 15–20 Lakh BDT (~1.5–2 million JPY) in liquid, stable funds. Funds must appear stable — not newly deposited.

---

**PHASE 2 — School Selection & Application (5–6 months before departure)**

- Agency must have a partnership / agent registration with Japanese language schools (contact "Overseas Admissions" department of target schools).
- **Intake sessions and apply-by deadlines:**
  - April intake → apply October / November
  - July intake → apply February / March
  - October intake → apply April / May
  - January intake → apply August / September
- Submit the school's "Application for Admission" on the student's behalf.
- School schedules a **video interview** — prepare the student (why Japan, who is the sponsor, future plans).

---

**PHASE 3 — COE Documentation (most work-intensive phase)**

Once accepted, collect and translate all required documents for the Certificate of Eligibility (COE) submission to Japan's Immigration Bureau. The school submits to Immigration as proxy.

**A) Student documents:**
- Original passport (minimum 6 months validity remaining)
- All academic certificates and marksheets: SSC, HSC, Bachelor's (if applicable)
- Japanese language study certificate (150-hour completion) **OR** JLPT / NAT-TEST pass certificate
- English-language birth certificate
- Photographs: 3 cm × 4 cm, white background

**B) Sponsor financial documents:**
- Bank solvency certificate (~2 million JPY / ~18–20 Lakh BDT)
- 6–12 months bank statement (caution: large sudden deposits are a red flag to Immigration)
- Proof of income: trade license / salary certificate / 3 years' tax return with TIN
- Relationship proof: Nikahnama (if parents are married) / parents' marriage deed; Family Tree Certificate from City Corporation or Union Parishad

**C) Agency task:**
- Scan all documents clearly; assemble a digital package; send to the Japanese school, which submits to the Immigration Bureau on the student's behalf.

---

**PHASE 4 — COE Issuance & Visa Processing (1–2 months before departure)**

1. COE result takes 2–3 months (issued or rejected).
2. On approval, school sends an invoice (COE copy + tuition invoice). Instruct the student / sponsor to SWIFT-transfer approximately 700,000–800,000 JPY (first-year tuition) to the school's account.
3. School mails the original COE + admission letter via DHL / EMS / FedEx.
4. **Visa application** at the Embassy of Japan in Dhaka: submit passport, visa application form, original COE, photo, and a cover letter. The embassy may conduct an interview in Japanese.
5. Once the visa is pasted (~1 week processing), book the flight and inform the school of the arrival date so they can arrange airport pickup.

**Pro-tips:**
- Pre-screen applicants strictly: too many immigration rejections will cause Japanese schools to stop working with the agency.
- Require notarized English / Japanese translation of all Bengali-language documents.
- Conduct strict mock interviews with the student before the school interview: questions about tuition amount, father's annual income, why Japan, future plans after graduating.

---

### Recommended Build Sequence

> ~~**Step 0 (build FIRST — prerequisite):** Accounting Phase 2 — **Auto-posting infrastructure.**~~ ✅ **DONE (C15).** The `_sync_fee_accounting` helper, `posted_transaction_id` link on `service_fees`, and revenue auto-posting are complete. Course fee and instructor-payment postings will reuse the same `transactions` table and the same auto-post pattern established in C15.

**Build status:**

| Step | What to build | Status |
|---|---|---|
| ~~(a)~~ | ~~Course Student entity (`course_students`) + Courses (`courses`) + multi-enrollment + Registration page (fee installments → accounting account 4300)~~ | ✅ **DONE (C16 + C17)** |
| ~~(conv)~~ | ~~Course student → Student / Candidate conversion (convert-once guard per track)~~ | ✅ **DONE (C18)** |
| ~~(b)~~ | ~~Batches (`batches` + `batch_enrollments`) + per-student payment status~~ | ✅ **DONE (C19)** |
| ~~(c)~~ | ~~Contract Instructors (`instructors` + `instructor_engagements` + `instructor_payments`) → accounting expense acct 5100~~ | ✅ **DONE (C20)** |
| ~~(d)~~ | ~~Owner finance command-center / dashboard (pending in/out, income/expense summary)~~ | ✅ **DONE (C21)** |
| (e) | Course lead funnel: extend `inquiries.interest_track` CHECK to `'language_course'`; add course-inquiry → course-student conversion endpoint | Next — see §12 |
| (f) | Japan language-course roadmap template (from Component 8 Phase 1–4 workflow); reuse admission/placement template pattern | After (e) |

**Key dependency chain:** ~~Step 0 (auto-posting)~~ ✅ DONE → ~~(a) course fees post as revenue~~ ✅ DONE → (b) batches → (c) instructor payments post as expense → (d) dashboard aggregates all of the above.

---

*Snapshot as of June 29, 2026. As building continues this will drift — regenerate at the next milestone. Keep CLAUDE.md in sync.*
