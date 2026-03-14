# Changelog

All major code or schema changes should be recorded here.

## v0.1 – Initial Setup
- Created project documentation
- Added AGENTS.md
- Defined project architecture

## v0.2 – Authentication
- Added login page
- Added signup page
- Integrated Supabase Auth

## v0.3 – Insurance Plans
- Added insurance_plans table
- Implemented plan directory

## v0.4 - Auth UI and Validation
- Implemented `app/(auth)/sign-in/page.tsx` with Supabase email/password sign-in
- Implemented `app/(auth)/sign-up/page.tsx` with Supabase email/password sign-up
- Added client-side validation, loading states, and error feedback for auth forms
- Added authenticated-user redirect flow to `/dashboard`
- Added reusable UI components for forms: `Input`, `Label`, `Card`, and `Alert`

## v0.5 - Landing Page Redesign
- Replaced the home page with a modern, responsive SaaS-style landing page in `app/page.tsx`
- Added navbar with app branding, Home/Plans navigation, and Sign In/Sign Up buttons
- Added hero section with primary and secondary calls-to-action
- Added feature highlight cards for plan comparison, instant quotes, and enrollment
- Added footer with copyright and auth route links
