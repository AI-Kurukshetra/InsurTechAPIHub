# Database Schema

## Users
Stores application users.

Fields:
- id
- email
- role
- created_at

## Employers
Companies providing insurance benefits.

Fields:
- id
- name
- industry
- size

## Employees
Employees belonging to employers.

Fields:
- id
- employer_id
- name
- age
- location

## Insurance_Carriers
Insurance providers.

Fields:
- id
- name
- website

## Insurance_Plans
Available insurance plans.

Fields:
- id
- carrier_id
- name
- premium
- deductible
- coverage_details

## Quotes
Generated insurance quotes.

Fields:
- id
- employee_id
- plan_id
- estimated_premium
- created_at

## Enrollments
Employee plan enrollments.

Fields:
- id
- employee_id
- plan_id
- enrollment_date
- status

## Dependents
Dependents covered by employee plans.

Fields:
- id
- employee_id
- name
- relationship