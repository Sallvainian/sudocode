## Epic 1: User Authentication & Account Management

Enable users to create accounts, log in, and manage their profiles.

### Story 1.1: User Registration

As a new user,
I want to create an account with my email,
so that I can save my plant collection.

**Acceptance Criteria:**

**Given** a valid email and password
**When** the user submits the registration form
**Then** an account is created and the user is logged in
**And** a confirmation email is sent

### Story 1.2: User Login

As a returning user,
I want to log in with my credentials,
so that I can access my saved plants.

**Acceptance Criteria:**

**Given** a registered account
**When** the user enters correct credentials
**Then** they are authenticated and redirected to the dashboard

### Story 1.3: Profile Management

As a logged-in user,
I want to update my profile information,
so that my account reflects my preferences.
