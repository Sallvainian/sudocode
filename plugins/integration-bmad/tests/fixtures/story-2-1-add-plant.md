# Story 2.1: Add Plant Manually

Status: in-progress

## Story

As a user,
I want to add a plant by selecting from a database,
so that I can start tracking its care schedule.

## Acceptance Criteria

**Given** the user is on the add plant screen
**When** they search for a plant species
**Then** matching results are displayed from the plant database

## Tasks / Subtasks

- [x] Create plant database schema
- [x] Seed plant data
- [ ] Build search API endpoint
- [ ] Create add plant UI

## Dev Notes

- Use PostgreSQL full-text search for plant lookup
