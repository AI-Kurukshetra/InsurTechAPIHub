# AGENTS.md
> Living instruction file for Codex and all sub-agents in this repository.
> Read this file fully before starting any task.

---

# 🧠 Project Context — AI Mahakurukshetra Hackathon

This repository is part of the **Bacancy AI Mahakurukshetra Hackathon (March 2026)**.

The goal is to build an **InsurTech API Hub — Insurance Data & Benefits Connectivity Platform**.

The application allows employers and employees to:

- Browse insurance plans
- Compare plans
- Generate insurance quotes
- Enroll employees in plans
- Manage benefits from a dashboard

The system is a simplified MVP inspired by insurance data platforms like Vericred.

---

# ⏱ Hackathon Constraints

- Total development time: **10 hours**
- Framework: **Next.js (App Router)**
- Language: **TypeScript**
- Database/Auth: **Supabase**
- Deployment: **Vercel**
- AI development tool: **Codex CLI**

Focus on:

- working product
- simple architecture
- clean UI
- seed/demo data
- successful deployment

Avoid unnecessary complexity.

---

# 📋 Context Management — `/doc` Folder

Before starting any task, read the following files:

| File | Purpose |
|---|---|
| `/doc/PRD.md` | Product requirements |
| `/doc/TASKS.md` | Master task list |
| `/doc/PROGRESS.md` | Session progress log |
| `/doc/BLOCKERS.md` | Issues requiring human help |
| `/doc/CHANGELOG.md` | Code and schema changes |
| `/doc/DECISIONS.md` | Architecture decisions |
| `/doc/SCHEMA.md` | Database schema documentation |

If `/doc` does not exist, create it with empty files before starting development.

---

# 🚀 MVP Feature Scope

Only implement the following core features:

1. User authentication
2. Insurance plan directory
3. Plan comparison tool
4. Quote generator
5. Employee enrollment workflow
6. Admin dashboard
7. Seed/demo data

Optional features (only if time permits):

- AI plan recommendation
- Provider search
- analytics dashboard

Do NOT attempt enterprise integrations.

---

# 🏗 Tech Stack (Canonical)

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Database/Auth | Supabase |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query |
| Testing | Vitest + Playwright |
| Deployment | Vercel |

---

# 🔐 Environment Variables

This project uses Supabase for authentication and database.

Supabase credentials and project configuration **must NOT be stored in this repository**.

Environment variables will be provided by the developer during the Codex session.

Expected variables:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

These must be stored in:
.env.local


Never commit `.env.local`.

---

# 📁 Project Structure
/
├── app/
│ ├── (auth)/
│ ├── (dashboard)/
│ └── api/
├── components/
│ └── ui/
├── lib/
│ ├── supabase/
│ ├── validations/
│ └── utils.ts
├── hooks/
├── types/
├── middleware.ts
├── supabase/
│ └── migrations/
├── tests/
│ └── e2e/
└── doc/


---

# 🧩 Insurance Domain Model

Core entities used in the application:

Users  
Employers  
Employees  
Insurance_Carriers  
Insurance_Plans  
Quotes  
Enrollments  
Dependents  

Example relationships:

Employer → Employees  
Carrier → Plans  
Employee → Quotes  
Employee → Enrollments  

Keep the schema **simple for MVP**.

---

# 🤖 Multi-Agent Architecture

Codex operates using a **coordinator + specialist agents model**.

The root Codex session acts as **Project Coordinator**.

Subagents specialize in different tasks.

Agent roles:

| Agent | Responsibility |
|---|---|
| frontend | UI pages and components |
| backend | API routes and database queries |
| tester | unit tests |
| reviewer | code review and quality |

---

# 🔄 Coordinator Workflow

The coordinator should follow this sequence:

READ → TASKS.md
PLAN → break task into subtasks
SPAWN → specialist agents
VERIFY → confirm file outputs
TEST → run tests
REVIEW → review code
LOG → update documentation
COMMIT → commit changes

---

# 🧑‍💻 Development Conventions

TypeScript rules:

- strict mode enabled
- avoid `any`
- infer types from Zod schemas

Next.js rules:

- prefer server components
- client components only when necessary
- use server actions for mutations

---

# 🎨 UI Guidelines

Use:

- Tailwind CSS
- shadcn/ui components
- mobile-first design

Always include:

- loading states
- error states
- accessible components

---

# 🧪 Testing Standards

Unit tests:

pnpm test

E2E tests:

pnpm test:e2e


Test critical flows:

- authentication
- plan browsing
- quote generation
- enrollment

---

# 🚀 Deployment

Deployment must be done via **Vercel**.

Steps:

1. push repo to GitHub
2. import project into Vercel
3. add environment variables
4. deploy

Before recording demo:

- login works
- plans visible
- comparison works
- quote generation works
- enrollment works

---

# 🚫 Anti-Patterns

Never:

- commit secrets
- expose Supabase service keys
- skip validation
- leave unfinished TODOs
- create overly complex architecture

Always prioritize **working product over complexity**.

---

# 🆘 Escalation Rules

Stop and log to `/doc/BLOCKERS.md` when:

- requirements unclear
- environment variables missing
- database schema conflict
- build or test failure cannot be resolved

Never guess missing configuration values.

Wait for developer input.
