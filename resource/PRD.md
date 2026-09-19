# PRD.md

# Student Management Portal — Product Requirements Document

## 1. Document Purpose

This Product Requirements Document defines the product scope, user roles, workflows, functional requirements, permissions, acceptance criteria, and delivery boundaries for the **Student Management Portal**.

This document describes **what the system must do**.

Implementation details, coding standards, architecture decisions, and execution sequencing are documented separately in:

```text
AGENTS.md
context/project-overview.md
context/architecture.md
context/build-plan.md
context/code-standards.md
context/progress-tracker.md
```

If a product requirement conflicts with an implementation detail, the product requirement should be preserved unless the user explicitly changes the scope.

Historical note: an earlier Admission/RegistrationLink design (BDM-owned QR registration links, `REGISTERED → PENDING_ACCOUNTS_APPROVAL → ACCOUNTS_APPROVED → ASSIGNED_TO_TEACHER`) was superseded by the Run 2R Enrollment architecture below. No Admission/RegistrationLink runtime code remains.

---

# 2. Product Summary

The Student Management Portal is a role-based admission workflow system for an education/training organization.

The system manages the journey of a student from first registration through BDM processing, Accounts approval, and Teacher assignment.

The core business flow is:

```text
Student browses public catalog
        ↓
Student signs up (role forced to STUDENT)
        ↓
Student completes profile (session-owned)
        ↓
Student explicitly confirms enrollment
        ↓
PENDING_PAYMENT
        ↓
Server-controlled demo payment
        ↓
PAYMENT_VERIFIED + stable Enrollment QR
        ↓
Staff (BDM/Accounts) scans QR
        ↓
Staff assigns Teacher and approves
        ↓
APPROVED
        ↓
Student gains exact course access
Assigned Teacher gains curriculum access
```

The most important product requirements are:

- correct role separation
- secure backend authorization
- session-owned profiles and enrollments
- controlled workflow transitions
- minimal data exposure by role
- reliable payment verification (Decimal, fail-closed webhook)
- concurrency-safe checkout/finalize/approve
- stable opaque enrollment QR
- clean and responsive dashboards

---

# 3. Product Goal

The goal is to provide a simple, secure, and auditable admission workflow where each department can perform only the responsibilities relevant to its role.

The product should make it easy to answer:

```text
Which BDM brought this student?
What course is the student joining?
How much was paid?
Has Accounts approved the admission?
Which Teacher is assigned?
Can the Teacher access the student yet?
What course modules should the Teacher teach?
```

---

# 4. Success Criteria

The MVP is successful when all of the following are true:

1. Each verified enrollment has one stable, opaque verification QR.
2. A student can sign up without choosing a role (server forces STUDENT).
3. The student profile belongs only to the authenticated student.
4. The student explicitly confirms each enrollment (no auto-mutation on GET).
5. Duplicate/concurrent enrollment requests yield exactly one enrollment.
6. Payment is simulated entirely on the server with Decimal verification.
7. The webhook fails closed (503 without secret, 401 on bad signature) with zero mutation before auth.
8. A provider failure report (`success=false`) or wrong amount/currency never finalizes.
9. Concurrent checkouts never leave duplicate active PENDING payments.
10. Staff scan returns only verification-safe fields.
11. An unpaid enrollment cannot be approved.
12. Approval requires a valid QR token and a TEACHER-role assignee.
13. A Teacher cannot see the enrollment before approval.
14. After approval, only the assigned Teacher can access that enrollment.
15. The Teacher can see the enrollment's course and course modules.
16. The student can access exactly the approved course curriculum.
17. Role and ownership restrictions are enforced on the backend/API level.
18. The application is usable on desktop and mobile.
19. The production build succeeds and the core workflow can be demonstrated end-to-end.

---

# 5. Users and Personas

## 5.1 Student

### Description

A prospective/new student who browses the public course catalog and enrolls.

### Primary Need

Browse courses, sign up, and enroll quickly with explicit confirmations and visible payment/approval status.

### Student Responsibilities

- browse public catalog and course detail
- sign up (role forced to STUDENT)
- complete profile (phone, address, education, optional notes)
- explicitly confirm course enrollments
- complete the server-controlled demo payment
- view verification QR after payment
- access approved course curriculum

### Student Does Not Need

- role selection at signup
- staff scanner access
- approval actions
- Teacher assignment controls

---

## 5.2 BDM

### Description

A Business Development staff member sharing the staff verification surface.

### Primary Need

Verify paid enrollments via QR scan and approve them with a Teacher assignment.

### BDM Responsibilities

- access staff scanner
- scan enrollment QR (camera or manual token)
- review privacy-minimized verification data
- assign a Teacher
- approve verified enrollments
- access BDM dashboard

### BDM Restrictions

A BDM must not:

- see student PII beyond the verification DTO
- approve unpaid enrollments
- assign non-teacher users
- bypass the payment workflow
- manually set arbitrary enrollment statuses

---

## 5.3 Accounts

### Description

Finance/accounts staff sharing the staff verification surface.

### Primary Need

Verify paid enrollments and approve them for course/teacher access.

### Accounts Responsibilities

- access staff scanner
- scan enrollment QR (camera or manual token)
- see student name and email
- see course and reference
- see payment state, amount, and currency
- approve valid verified enrollments

### Accounts Restrictions

Accounts must not receive unnecessary student information such as:

- address
- phone
- educational background
- additional personal notes

Accounts must not:

- assign non-teacher users
- approve unpaid enrollments
- modify student profiles
- access data beyond the verification DTO

---

## 5.4 Teacher

### Description

An instructor responsible for teaching approved students assigned to them.

### Primary Need

See only approved students assigned to them and understand the course requirements.

### Teacher Responsibilities

- access own dashboard
- view assigned approved students
- see student name
- see student email
- see course
- see course modules/learning requirements

### Teacher Restrictions

Teacher must not:

- see enrollments assigned to another Teacher
- see enrollments before approval
- view student PII beyond name/email
- approve enrollments
- change payment information
- change enrollment ownership

---

# 6. MVP Scope

## 6.1 Included

The MVP includes:

- role-based authentication (forced STUDENT signup, seeded staff)
- secure backend/API role authorization
- secure resource-level authorization
- public course catalog
- student profile (session-owned)
- explicit enrollment confirmation
- server-controlled demo payment
- fail-closed payment webhook
- stable opaque enrollment QR
- camera QR scanner with manual fallback
- staff verification with privacy-minimized DTO
- Teacher assignment + approval (concurrency-safe)
- exact approved-course access for students
- assigned-approved-only access for teachers
- course modules (data-driven, ordered)
- enrollment status transitions (backend-owned)
- backend validation
- responsive interface
- loading/error/empty states
- appropriate database relationships
- safe error handling

---

## 6.2 Optional / Bonus

These may be implemented only after the mandatory workflow is complete:

- student search
- filter by course
- filter by Teacher
- filter by status
- admission/status history UI
- payment status
- dashboard statistics
- Teacher assignment notification
- course progress tracking
- activity history

---

## 6.3 Out of Scope

The MVP does not require:

- student login
- student dashboard
- Google/social login
- OTP login
- password reset flow
- email verification
- SMS
- WhatsApp
- payment gateway
- invoice generation
- PDF generation
- attendance
- class scheduling engine
- chat
- advanced analytics
- multi-tenant architecture
- microservices
- Redis
- queues
- WebSockets
- complex notification infrastructure
- marketing/landing-site work
- animation-heavy UI

---

# 7. Core Workflow

## 7.1 Enrollment

```text
Student browses catalog
↓
Student signs up (role forced STUDENT)
↓
Student completes profile (session-owned)
↓
Student explicitly confirms enrollment
↓
System snapshots course price/currency
↓
Enrollment created
↓
Status = PENDING_PAYMENT
↓
Initial status-history row written (same transaction)
```

Enrollment is never created implicitly by page views. Concurrent duplicate
requests yield exactly one enrollment.

---

## 7.2 Demo Payment

```text
Student triggers checkout
↓
Serializable resolution:
  no payment → create PENDING attempt
  latest FAILED → new attempt
  latest PENDING → resume existing (no duplicate)
  latest SUCCEEDED → already-paid
↓
Server finalizes verified payment (mock provider)
↓
Decimal amount + currency verified
↓
Status = PAYMENT_VERIFIED
↓
Stable Enrollment QR created (once, never rotates)
```

The client never supplies amounts. Webhook callbacks authenticate via secret
+ signature and require `success === true` before any DB work.

---

## 7.3 Staff Verification & Approval

```text
Staff opens scanner
↓
Camera decode or manual token
↓
System resolves token → Enrollment (+ privacy-minimized DTO)
↓
Staff reviews verification-safe data
↓
Staff selects Teacher
↓
Staff approves
↓
System validates PAYMENT_VERIFIED + SUCCEEDED payment + QR proof + TEACHER role
↓
Status = APPROVED (exactly once under concurrency)
```

Unpaid enrollments, wrong QR tokens, and non-teacher assignees are rejected.

---

## 7.4 Student + Teacher Access

```text
Student opens course page
↓
APPROVED exact course → curriculum modules visible
otherwise → restricted page
```

```text
Teacher logs in
↓
System returns only assigned + APPROVED enrollments
↓
Teacher opens enrollment
↓
Teacher sees student name/email + course + ordered modules
```

Teacher access is prohibited before approval. Cross-teacher access is a safe 404.

---

# 8. Enrollment Status Model

Canonical statuses:

```text
PENDING_PAYMENT
PAYMENT_VERIFIED
APPROVED
```

Canonical order:

```text
PENDING_PAYMENT
    ↓
PAYMENT_VERIFIED
    ↓
APPROVED
```

## 8.1 Status Ownership

### PENDING_PAYMENT

Created automatically when the student explicitly confirms an enrollment.

### PAYMENT_VERIFIED

Created only by server-controlled payment finalization (demo checkout or
verified webhook) with Decimal amount + currency match.

### APPROVED

Created only by a valid staff approval action (BDM/ACCOUNTS role,
PAYMENT_VERIFIED state, SUCCEEDED payment, QR proof, TEACHER assignee).

---

## 8.2 Invalid Transitions

The system must reject invalid direct transitions.

Examples:

```text
PENDING_PAYMENT → APPROVED
any state → arbitrary client-set status
unpaid enrollment → APPROVED
```

The client must not have a generic "set status" capability. Duplicate
finalize/approve calls resolve to idempotent success or safe `409`.

---

# 9. Functional Requirements

# FR-001 — Staff Login

## Description

BDM, Accounts, and Teacher users must be able to authenticate.

## Required Inputs

```text
Email
Password
```

## Acceptance Criteria

- valid credentials authenticate successfully
- invalid credentials show safe error
- password is never stored or returned as plaintext
- authenticated session identifies user ID and role
- user is directed to the correct role dashboard

---

# FR-002 — Role-Based Dashboard Access

## Description

Each authenticated staff role must access only its own role area.

## Acceptance Criteria

```text
BDM → BDM dashboard
Accounts → Accounts dashboard
Teacher → Teacher dashboard
```

A user must not gain access to another role's protected API merely by typing its URL.

---

# FR-003 — Enrollment Verification QR

## Description

Each verified enrollment has one stable, opaque verification token that can be rendered as a QR code for staff scanning.

## Acceptance Criteria

- QR token is unique and high-entropy
- token is opaque (no IDs, email, or PII)
- token never rotates on payment retries or duplicate webhooks
- revoked/unknown tokens resolve to safe 404
- student sees the QR after payment verification
- staff can scan via camera or manual token input

---

# FR-004 — Public Signup, Profile & Enrollment

## Description

A Student signs up publicly, completes a session-owned profile, and explicitly confirms course enrollments.

## Required Fields (profile)

- Phone Number
- Address
- Educational Information

## Optional Field

- Additional Information

## Acceptance Criteria

- signup requires no role selection; server forces STUDENT
- staff cannot self-register as BDM/ACCOUNTS/TEACHER
- `role`/`userId` in profile payloads are ignored
- profile belongs only to the authenticated student
- `?course=slug` survives signup/login/profile redirects
- enrollment is created only by explicit confirmation (never on page view)
- successful creation writes the initial status history row atomically
- initial Enrollment status is `PENDING_PAYMENT`
- concurrent duplicate requests yield exactly one enrollment

---

# FR-005 — Student Enrollment List

## Description

Each student sees only their own enrollments with payment status and verification QR.

## Minimum Item Fields

- Course name
- Reference
- Price
- Status
- Assigned Teacher (when approved)
- Verification QR (when verified/approved)

## Acceptance Criteria

- student sees own enrollments only
- another student's enrollments are unreachable (safe 404)
- direct API access cannot bypass ownership

---

# FR-006 — Staff Scan

## Description

BDM/Accounts staff resolve an enrollment QR token into a privacy-minimized verification view.

## Acceptance Criteria

- valid token returns verification-safe DTO only
- address, phone, education, additionalInfo are never included
- tampered/revoked tokens return safe 404
- STUDENT and TEACHER roles are rejected (403)
- unauthenticated requests are rejected (401)

---

# FR-007 — Server-Controlled Payment

## Description

Demo payment is simulated entirely on the server; the client never supplies amounts.

## Required Behavior

- Checkout resolves in a serializable transaction
- No payment → create PENDING attempt
- Latest FAILED → new attempt
- Latest PENDING → resume existing (no duplicate)
- Latest SUCCEEDED → already-paid response

## Validation Rules

```text
enrollment owned by session student
enrollment status is PENDING_PAYMENT (else already-paid or 409)
provider success === true
received amount equals stored amount (Decimal.equals)
currency matches exactly
```

## Acceptance Criteria

On valid finalization:

```text
status:
PENDING_PAYMENT
→ PAYMENT_VERIFIED (+ stable QR)
```

The transition occurs in one atomic transaction with exactly one history event.

Concurrent checkouts leave exactly one SUCCEEDED payment and zero PENDING.

---

# FR-008 — Status Visibility

## Description

Students and staff can monitor the current enrollment status.

## Acceptance Criteria

Each surface distinguishes at minimum:

```text
Pending Payment
Payment Verified
Approved
```

Human-readable labels are used in UI.

---

# FR-009 — Staff Verification View

## Description

Staff must see verification-safe enrollment data when scanning a QR.

## Staff-Visible Fields

- Student Name
- Student Email
- Course
- Reference
- Payment state, amount, currency
- Status

## Acceptance Criteria

- unrelated personal information is never included in the API payload
- tampered tokens return 404
- cross-role access is rejected

---

# FR-010 — Staff Approval

## Description

BDM/Accounts staff approve a valid verified enrollment with a Teacher assignment.

## Preconditions

```text
authenticated role ∈ {BDM, ACCOUNTS}
status = PAYMENT_VERIFIED
SUCCEEDED payment exists
QR token matches and is unrevoked
assigned user role = TEACHER
```

## Acceptance Criteria

On approval:

- approver and timestamp are recorded
- status becomes APPROVED (exactly once under concurrency; duplicate → 409)
- student gains exact course access
- assigned teacher gains enrollment access
- unpaid enrollment → 409
- wrong QR → rejected
- non-teacher assignee → 400

---

# FR-011 — Teacher Enrollment List

## Description

Teacher sees only enrollments assigned to them with APPROVED status.

## Minimum Fields

- Student Name
- Email
- Course
- Approved date / module count

## Acceptance Criteria

An enrollment appears only when:

```text
assignedTeacherId = current Teacher
AND
status = APPROVED
```

Other teachers' enrollments are excluded from the list and unreachable by direct URL (safe 404).

---

# FR-012 — Teacher Enrollment Detail

## Description

Teacher can view the assigned enrollment and course information.

## Required Data

- Student Name
- Email
- Course
- Course Modules / Learning Requirements (ordered, data-driven)

## Acceptance Criteria

- only assigned Teacher may access (safe 404 otherwise)
- unapproved enrollment cannot be accessed
- another Teacher cannot access by direct URL/API call

---

# FR-013 — Course Modules

## Description

Each Course can have ordered learning modules/topics.

Example:

```text
IELTS
1. Listening
2. Reading
3. Writing
4. Speaking
5. Mock Test
```

## Acceptance Criteria

- modules are stored as data
- Teacher UI reads modules from the selected Course
- modules are ordered
- duplicate order within one Course is prevented
- duplicate title within one Course is prevented

Do not hardcode IELTS modules directly into the Teacher page.

---

# FR-014 — Status History

## Description

The data model must support admission status/activity history.

This is required in the schema from the beginning even if the UI is added later.

## Expected Events

```text
Student Registered
Admission Submitted by BDM
Accounts Approved
Assigned to Teacher
```

## Acceptance Criteria

- each transition can be stored
- previous status may be null for initial creation
- actor may be null for system/public actions
- timestamp is stored

---

# FR-015 — Search and Filters

## Priority

Bonus only.

## Possible BDM Filters

- student name/email search
- course
- Teacher
- status

## Possible Accounts Filters

- search
- course
- status

## Possible Teacher Filters

- own student search
- course

Do not implement before the mandatory workflow is complete.

---

# 10. Authorization Matrix

| Capability | Student | BDM | Accounts | Teacher |
| --- | --- | --- | --- | --- |
| Public signup | Yes (forced STUDENT) | No | No | No |
| Login to dashboard | Yes | Yes | Yes | Yes |
| Confirm enrollment | Own only | No | No | No |
| Demo checkout | Own PENDING_PAYMENT only | No | No | No |
| Scan enrollment QR | No (403) | Yes | Yes | No (403) |
| See verification DTO | No | Yes | Yes | No |
| Approve enrollment | No | Yes | Yes | No |
| See assigned enrollments before approval | No | N/A | N/A | No |
| See assigned enrollments after approval | No | N/A | N/A | Own only |
| See Course Modules | Approved own course | No | No | Assigned approved enrollments |
| See student PII (address/phone/education) | Own only | No | No | No |
| Submit student profile | Own only | No (403) | No (403) | No (403) |
| Call payment webhook | No | N/A (secret-gated) | N/A (secret-gated) | No |

All restrictions are enforced by backend/API logic. The webhook additionally requires the server-side secret + signature with zero DB mutation before auth.

---

# 11. Data Requirements

## 11.1 User

Required:

```text
id
name
email
role
createdAt
updatedAt
```

Role values:

```text
STUDENT
BDM
ACCOUNTS
TEACHER
```

Public signup forces STUDENT (`role.input = false`). Staff emails are unique. Better Auth owns credential storage through its authentication tables.

---

## 11.2 Student

Required:

```text
id
userId (unique)
phone
address
education
additionalInfo?
createdAt
updatedAt
```

Ownership always derives from the authenticated session.

---

## 11.3 Course

Required:

```text
id
slug (unique)
name (unique)
description?
price (Decimal)
currency
isActive
createdAt
updatedAt
```

---

## 11.4 CourseModule

Required:

```text
id
courseId
title
description?
order
createdAt
updatedAt
```

Unique per Course:

```text
title
order
```

---

## 11.5 Enrollment

Required model capability:

```text
id
reference (unique, display-only)
studentId
courseId
priceAtEnrollment (Decimal snapshot)
currencyAtEnrollment
status (default PENDING_PAYMENT)
assignedTeacherId?
approvedById?
approvedAt?
createdAt
updatedAt
```

Rules:

- one Enrollment per student+course
- payment uses decimal precision
- reference collisions retry; student+course collisions return existing

---

## 11.6 EnrollmentQr

Required:

```text
id
enrollmentId (unique)
token (unique, opaque)
createdAt
revokedAt?
```

Created once; never rotates.

---

## 11.7 Payment

Required:

```text
id
enrollmentId
provider
providerPaymentId (unique)
amount (Decimal)
currency
status (default PENDING)
verifiedAt?
createdAt
updatedAt
```

---

## 11.8 EnrollmentStatusHistory

Required:

```text
id
enrollmentId
fromStatus?
toStatus
changedById?
createdAt
```

---

# 12. Validation Requirements

All external input must be validated on the backend.

## Public Signup + Profile

Validate at minimum:

- name required
- email valid
- password meets policy
- role forced to STUDENT regardless of input
- phone/address/education required for profile
- profile ownership from session only

## Enrollment + Checkout

Validate:

- course exists and is active
- enrollment owned by session student
- enrollment status allows checkout (else already-paid or 409)
- concurrent duplicates resolve to one enrollment

## Payment Finalization (server)

Validate:

- provider success === true
- received amount equals stored amount (Decimal)
- currency matches
- payment + enrollment in expected state

## Webhook (before any DB work)

Validate:

- webhook secret configured (else 503)
- signature present and correct (else 401)

## Staff Approval

Validate:

- user role ∈ {BDM, ACCOUNTS}
- enrollment exists and is PAYMENT_VERIFIED
- SUCCEEDED payment exists
- QR token matches and is unrevoked
- assigned user role is TEACHER

---

# 13. Security Requirements

## 13.1 Passwords

- plaintext passwords must never be persisted
- password hashes must never be returned
- password hashes must never be placed in client session payloads

---

## 13.2 QR Token Security

Enrollment verification tokens must:

- be unique
- be unpredictable (high-entropy)
- be opaque (no IDs, email, or PII)
- be stable (never rotate on retries/duplicates)
- be rejectable when unknown/revoked (safe 404)

---

## 13.3 Data Minimization

APIs should return only the fields needed by the requesting role.

This is especially important for Accounts and Teacher.

---

## 13.4 Resource Isolation

A valid role is not sufficient.

The system must also verify resource ownership.

Examples:

```text
Student A cannot access Student B's enrollments.
Teacher A cannot access Teacher B's enrollments.
```

---

## 13.5 Workflow Integrity

Clients must not control status directly.

Server-side business actions determine state transitions.

---

## 13.6 Error Safety

User-facing errors must not expose:

- stack traces
- database internals
- raw Prisma errors
- secrets
- hashes
- hidden resource details

---

# 14. API Behavior Requirements

Exact route names may evolve, but the API must support the following capabilities.

## Public

```text
Validate registration token
Submit student registration
```

## BDM

```text
List own Students
View own Student
Submit Admission details
```

## Accounts

```text
List pending Admissions
View allowed Admission details
Approve Admission
```

## Teacher

```text
List assigned approved Students
View assigned approved Student + Course Modules
```

The API must enforce role and resource restrictions independently from the UI.

---

# 15. User Experience Requirements

## 15.1 General

The interface should be:

- clean
- professional
- responsive
- easy to understand
- fast to navigate
- suitable for administrative use

Production-level visual design is not required.

---

## 15.2 Responsive Behavior

The application should work reasonably at:

```text
desktop
tablet
mobile
```

Tables may use horizontal scrolling or responsive cards on smaller screens.

---

## 15.3 Form UX

Forms should include:

- visible labels
- required-field indication where useful
- validation messages
- loading/pending state
- disabled duplicate submission
- success/error feedback

---

## 15.4 Empty States

Examples:

```text
No students have registered yet.

No admissions are awaiting approval.

No approved students are assigned to you yet.
```

---

## 15.5 Status Visibility

Workflow status should always be shown using human-readable labels.

Example:

```text
Pending Accounts Approval
```

not:

```text
PENDING_ACCOUNTS_APPROVAL
```

---

# 16. Non-Functional Requirements

## NFR-001 — Maintainability

Code should be:

- TypeScript
- readable
- modular
- logically separated
- reasonably reusable

Avoid unnecessary architecture.

---

## NFR-002 — Security

Role and resource authorization must be enforced server-side.

---

## NFR-003 — Data Integrity

Multi-record workflow operations should be atomic where partial completion would create an invalid state.

---

## NFR-004 — Performance

The MVP does not require advanced optimization.

However:

- avoid obviously wasteful database queries
- query only fields needed
- add practical indexes for ownership/status queries

---

## NFR-005 — Reliability

Core workflow operations should fail safely.

A failed multi-step operation should not leave partially transitioned admission state.

---

## NFR-006 — Accessibility

Use semantic form controls, labels, focus states, and text status indicators.

Color must not be the only way workflow state is communicated.

---

## NFR-007 — Compatibility

The application should run in modern desktop/mobile browsers.

---

# 17. Acceptance Test Scenarios

# Scenario A — Session Ownership

Given a signed-up student with a completed profile:

When the student confirms an enrollment:

Expected:

```text
Enrollment belongs to that student only.
Another student receives safe 404 on direct access.
role/userId injection in profile payloads is ignored.
```

---

# Scenario B — Payment & Stable QR

Given a PENDING_PAYMENT enrollment:

When the server-controlled checkout runs (including concurrently):

Expected:

```text
Status = PAYMENT_VERIFIED
Exactly one SUCCEEDED payment, zero PENDING left
One stable QR token (never rotates on duplicates)
```

---

# Scenario C — Webhook Forgery Resistance

When the webhook is called without a secret, with a wrong signature,
with a wrong amount/currency, or with success=false:

Expected:

```text
Rejected (503/401/409/400 respectively)
Zero DB mutation for auth failures
Zero finalization for amount/currency/success failures
```

---

# Scenario D — Approval Gates

When staff attempts approval:

Expected:

```text
Unpaid enrollment → 409
Wrong QR token → rejected
Non-teacher assignee → 400
Concurrent approvals → exactly one 200 + one 409
```

---

# Scenario E — Teacher Isolation

Given an APPROVED enrollment assigned to Teacher A:

Expected:

```text
Teacher A sees the enrollment.
Teacher B list excludes it.
Teacher B direct API request returns safe 404.
```

---

# Scenario F — Teacher Course Modules

Given the enrollment's course has ordered modules:

Teacher A opens the enrollment.

Expected:

```text
Student Name
Email
Course
Ordered module list (from CourseModule data, never hardcoded)
```

---

# Scenario G — Amount/Currency Mismatch

When the webhook reports an amount or currency that does not match the stored payment:

Expected:

```text
rejected
payment remains PENDING
enrollment remains PENDING_PAYMENT
no history or QR side effects
```

---

# Scenario H — Invalid Teacher Assignment

When staff attempts approval with a user whose role is not TEACHER:

Expected:

```text
request rejected (400)
status remains unchanged
```

---

# Scenario I — Duplicate Approval

When staff attempts to approve an already approved enrollment:

Expected:

```text
safe 409 response
no duplicate workflow side effects
```

---

# Scenario J — Invalid QR

When staff scans an unknown, tampered, or revoked verification token:

Expected:

```text
safe 404
no enrollment data disclosed
```

---

# 18. Dashboard Requirements

# 18.1 Student Dashboard

Minimum useful sections:

```text
My Enrollments (course, reference, price, status, teacher, QR)

Enroll in More Courses
```

Explicit confirmation is required for every new enrollment.

---

# 18.2 Staff Scanner

Minimum useful sections:

```text
Camera scanner + manual token verification

Enrollment verification result
Teacher assignment + approval action
```

Each result shows only:

```text
Student name/email
Course
Reference
Amount / paid amount
Status
```

No student PII beyond name/email.

---

# 18.3 Teacher Dashboard

Minimum useful sections:

```text
My Assigned Enrollments
```

Each item/row:

```text
Student
Email
Course
Approved date / module count
```

Only APPROVED assigned enrollments appear.

---

# 19. Course Module Requirements

The system must support Course-specific learning requirements.

Example data:

```text
IELTS
├── Listening
├── Reading
├── Writing
├── Speaking
└── Mock Test
```

Future courses can have different module sets without code changes.

The base MVP only needs module visibility.

Progress tracking is bonus scope.

---

# 20. Audit / History Requirements

The schema must support status history from the beginning.

If the history UI is implemented, it should be able to show:

```text
Registered
19 Sep 2026, 10:00

Admission Submitted
19 Sep 2026, 10:20

Accounts Approved
19 Sep 2026, 10:35

Assigned to Teacher
19 Sep 2026, 10:35
```

This is a high-value bonus after mandatory functionality.

---

# 21. 24-Hour Delivery Priority

Priority order:

```text
1. Database/Foundation
2. Authentication
3. Authorization
4. QR registration
5. BDM workflow
6. Accounts workflow
7. Teacher workflow
8. Security testing
9. Responsive/UI polish
10. Bonus features
```

The mandatory workflow should be functioning before bonus work starts.

If time becomes limited:

```text
remove bonus work
preserve security
preserve workflow correctness
preserve backend validation
```

Do not sacrifice authorization or workflow correctness for visual polish.

---

# 22. MVP Definition of Done

The MVP is complete only when all applicable requirements below are true.
Start every item unchecked; check only what the closure verification proves:

```text
[ ] Public signup creates STUDENT only
[ ] Staff cannot self-register as privileged role
[ ] Student profile is session-owned
[ ] Course choice survives signup/profile flow
[ ] Enrollment created only by explicit action
[ ] Duplicate enrollment safe
[ ] Payment uses Decimal/string money contract
[ ] Checkout does not create duplicate active pending payments
[ ] Demo payment is entirely server-controlled
[ ] Webhook fails closed when secret is unavailable
[ ] Invalid webhook signature causes zero mutations
[ ] Payment success=false cannot finalize
[ ] Wrong amount / wrong currency rejected
[ ] Payment transition atomic
[ ] Concurrent payment finalization safe
[ ] QR created once, never rotates, opaque token only
[ ] Camera scanner works with manual fallback
[ ] Staff scan DTO is privacy-minimized
[ ] Unpaid enrollment cannot be approved
[ ] Approval requires valid QR + TEACHER role
[ ] Concurrent approval safe
[ ] Student accesses exact approved course only
[ ] Teacher sees exact assigned approved enrollments only
[ ] Workflow status is backend-controlled
[ ] Backend role authorization exists
[ ] Backend resource ownership checks exist
[ ] Direct API manipulation cannot bypass access rules

[ ] Forms have backend validation
[ ] Error handling is safe
[ ] Responsive UI is usable
[ ] Loading/empty/error states are present

[ ] Database migration state is valid
[ ] Prisma schema unchanged by closure pass
[ ] Lint passes
[ ] Production build passes
[ ] End-to-end HTTP suite passes
[ ] Manual browser journey passes
```

---

# 23. Future Product Expansion

Potential future product features after the practical:

- student login/dashboard
- course progress tracking
- class attendance
- installment/payment history
- invoice/receipt generation
- email notifications
- Teacher assignment notifications
- class scheduling
- academic notes
- document uploads
- completion/certificate workflow
- analytics/reporting
- administrator/super-admin role
- configurable course templates
- admissions archive
- student re-enrollment / multiple admissions

These are not part of the current MVP unless explicitly requested.

---

# 24. Final Product Rule

The product should remain simple enough to finish within the practical timeframe while proving the important engineering requirements.

When tradeoffs are necessary, prioritize:

```text
correct workflow
backend authorization
resource isolation
data privacy
validation
data integrity
clear UI
```

over:

```text
feature count
animations
visual complexity
extra infrastructure
```

The strongest submission is a complete, secure admission workflow that behaves correctly for every role.
