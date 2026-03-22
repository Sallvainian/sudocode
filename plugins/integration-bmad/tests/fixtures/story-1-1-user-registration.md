# Story 1.1: User Registration

Status: ready-for-dev

## Story

As a new user,
I want to create an account with my email,
so that I can save my plant collection.

## Acceptance Criteria

**Given** a valid email address and password meeting requirements
**When** the user submits the registration form
**Then** an account is created successfully

**Given** an email that is already registered
**When** the user tries to register with that email
**Then** an error message is shown indicating the email is taken

## Tasks / Subtasks

- [ ] Create registration API endpoint (AC: #1)
  - [ ] Add input validation
  - [ ] Implement password hashing
- [ ] Build registration form UI (AC: #1)
  - [x] Design form layout
  - [ ] Add client-side validation
- [x] Set up email service (AC: #1)

## Dev Notes

- Use bcrypt for password hashing
- Email validation via Zod schema
- Rate limit registration endpoint to 5 requests per minute

### References

- [Source: architecture.md#ADR-2]
