# Education ERP / CRM — Project Context

## What this is
A centralized CRM + ERP for an education consultancy (Advance Educonsultancy (Pvt) Ltd.)guiding Bangladeshi
students applying to 30–40 global destinations (UK, Japan, US, Canada,
Australia, Germany, Ireland, Turkey, Malaysia, etc.) for Bachelor's,
Master's, PhD, and language programs.

## Stack
- Database + Auth: Supabase (Postgres, Row-Level Security)
- Backend: FastAPI (Python) — deployed on Render
- Frontend: React + Vite + Tailwind — deployed on Render
- Document storage: Google Drive API (service account)
- Source control: Git / GitHub (research-arahman/edu-erp)

## Roles (permission tiers) — enum `user_role`
- owner: highest authority; manages managers; can delete
- manager: manages teams; can delete anything
- team_leader: leads a team, assigns tasks; CANNOT delete
- staff: counselor/officer/instructor — add & edit only; CANNOT delete
- accountant: manages accounting module; CANNOT delete
- student: portal, read-only
- (legacy value `counselor` also exists)

Job titles (Business Developer, Marketing Officer, Admission Officer,
Application Officer, Counselor, Language Instructor) live in
`profiles.position` — NOT in the role enum. Teams live in `profiles.team`,
reporting line in `profiles.team_leader_id`.

## Core access rules (enforced by Postgres RLS — do not weaken)
- Only owner + manager can DELETE (helper: `can_delete()`).
- Accounting tables (accounts, transactions, investments, commissions)
  are visible ONLY to owner, manager, accountant (`can_view_accounting()`).
- The activity_log is immutable: insert + select only, no update/delete.
- Task management for others restricted to owner/manager/team_leader
  (`can_manage_tasks()`).

## Key tables
- countries, institutes, programs, program_sessions, admission_requirements
- students (rich profile: passport, income, supporter, academic/career,
  purpose, + target_country/institute/program/session)
- profiles (staff, extends auth.users; role/position/team/team_leader_id)
- inquiries (lead tracker: new→contacted→qualified→converted/lost)
- applications + application_checklist (8-stage pipeline via enum app_stage)
- activity_log (immutable audit trail)
- journey_stages + student_journey (visual roadmap; 8 seeded stages)
- accounts (chart of accounts 1000–6400), transactions (gateway-ready),
  investments, commissions
- daily_task_templates, tasks, notifications

## The cascading destination selector (central feature)
Data-driven dependent dropdowns, showing ONLY data that exists (never generic):
Country → institute type (university/language_school/diploma)
  → University path: ownership → degree level → department → course → session
  → Language path: level_category (jlpt/english/topik...) → level_label
     (N5, IELTS Prep...) → school → session
Each completed selection feeds the student's target_* fields and the
visual roadmap, which is visible to owner/manager/staff.

## Conventions
- Every data table has RLS. New tables must follow the same pattern:
  select/insert/update for authenticated; delete via can_delete().
- Write significant actions to activity_log.
- Money: store amount + currency; default BDT; never hardcode FX.
- Keep secrets out of Git (.env, service-account.json are gitignored).

## Second track: Job Placement / SSW (employment)
The system now serves TWO applicant types that share infrastructure
(profiles, documents, tasks, accounting, activity_log) but have separate
data chains and pipelines:
- **Students** (education track) — existing.
- **Candidates** (employment track) — job-seekers, esp. Japan SSW, expanding
  to Europe and beyond.

### Employment tables
- industry_fields — SSW/industry sectors (Japan's 16 SSW fields seeded,
  country-scoped, is_ssw flag).
- qualification_types — language & skills tests (JLPT, JFT-Basic, SSW Skills
  Test seeded); has levels[] array and optional industry_field_id.
- employers — company database (parallel to institutes); industry_field_id,
  is_ssw_registered, housing_support, contact person.
- jobs — openings (parallel to programs); structured requirements via
  req_language_qual_id + req_language_level and req_skills_qual_id; salary
  range, start_period, positions_available.
- candidates — job-seeker profile (parallel to students); work experience,
  structured language/skills proficiency, and target chain.
- job_applications + job_application_checklist — employment pipeline via
  enum job_stage: applied → screening → interview → offer → coe_processing
  → visa_processing → placed.

### Employment cascading selector (parallel to education selector)
Country → Industry/SSW field → Employer → Job position → start period.
Mirrors the education selector pattern exactly; show only data that exists.
Feeds candidate.target_* fields and (later) a roadmap.

### Conventions for the employment track
- Same RLS pattern as everything else: select/insert/update for authenticated;
  delete via can_delete().
- Language/skills requirements are STRUCTURED (point to qualification_types),
  not free text — so the system can match candidate level vs job requirement.
- Placement fees and consultant commissions post to the existing accounting
  chart of accounts (same accounts/transactions/commissions tables).
- Keep education and employment code parallel and consistent (routers,
  schemas, frontend components) so neither track creates a mess for the other.