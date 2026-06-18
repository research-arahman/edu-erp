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