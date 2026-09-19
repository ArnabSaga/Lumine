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

---

# 2. Product Summary

The Student Management Portal is a role-based admission workflow system for an education/training organization.

The system manages the journey of a student from first registration through BDM processing, Accounts approval, and Teacher assignment.

The core business flow is:

```text
Student scans BDM QR
        ↓
Student submits registration
        ↓
Student is linked to the correct BDM
        ↓
BDM completes admission details
        ↓
Pending Accounts Approval
        ↓
Accounts verifies payment/admission
        ↓
Accounts approves
        ↓
Assigned Teacher gains access
        ↓
Teacher sees Student + Course + Course Modules
```

The most important product requirements are:

- correct role separation
- secure backend authorization
- correct ownership of students
- controlled workflow transitions
- minimal data exposure by role
- reliable QR-to-BDM association
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

1. A BDM has a unique QR-based student registration link.
2. A student can register through that link without logging in.
3. The student is automatically linked to the correct BDM.
4. Only that BDM can access the submitted student.
5. The BDM can add course, payment, class-start, and Teacher information.
6. The admission moves to `PENDING_ACCOUNTS_APPROVAL`.
7. Accounts can see only the information required for verification.
8. Accounts can approve the admission.
9. A Teacher cannot see the student before Accounts approval.
10. After approval, only the assigned Teacher can access that student.
11. The Teacher can see the student's course and course modules.
12. Role and ownership restrictions are enforced on the backend/API level.
13. The application is usable on desktop and mobile.
14. The production build succeeds and the core workflow can be demonstrated end-to-end.

---

# 5. Users and Personas

## 5.1 Student

### Description

A prospective/new student who receives a registration QR code from a BDM.

### Primary Need

Submit registration information quickly without creating an account or learning the internal system.

### Student Responsibilities

- scan/open BDM registration link
- complete registration form
- submit personal/educational information

### Student Does Not Need

- login
- dashboard
- workflow actions
- Accounts approval access
- Teacher assignment controls

Student authentication is not required for the MVP.

---

## 5.2 BDM

### Description

A Business Development Manager responsible for bringing and processing students.

### Primary Need

Receive registrations generated through their own QR code and complete the admission setup.

### BDM Responsibilities

- access own dashboard
- access own QR/registration link
- view students registered through own QR
- review full submitted student information
- assign a course
- enter admission amount
- enter paid amount
- set class starting date
- assign a Teacher
- submit admission for Accounts approval
- monitor current admission status

### BDM Restrictions

A BDM must not:

- see another BDM's students
- modify another BDM's students
- approve Accounts workflow
- bypass the admission workflow
- manually set arbitrary admission statuses

---

## 5.3 Accounts

### Description

Finance/accounts staff responsible for validating admission/payment information.

### Primary Need

See only the financial/admission information necessary to approve or reject/process an admission.

### Accounts Responsibilities

- access own dashboard
- view admissions awaiting approval
- see student name and email
- see course
- see admission amount
- see paid amount
- approve valid admissions

### Accounts Restrictions

Accounts must not receive unnecessary student information such as:

- full address
- educational background
- additional personal notes

Accounts must not:

- assign Teacher
- modify BDM ownership
- modify student registration profile
- access Teacher-only learning data unless separately required

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

- see students assigned to another Teacher
- see students before Accounts approval
- view BDM-only personal/educational details unless explicitly needed
- approve admissions
- change payment information
- change BDM ownership

---

# 6. MVP Scope

## 6.1 Included

The MVP includes:

- role-based authentication for BDM, Accounts, Teacher
- secure backend/API role authorization
- secure resource-level authorization
- unique BDM QR registration links
- public student registration
- automatic BDM association from QR token
- BDM student dashboard
- BDM admission completion
- course assignment
- payment information
- class start date
- Teacher assignment
- Accounts pending-approval dashboard
- Accounts approval action
- Teacher assigned-student dashboard
- Teacher student/course detail
- course modules
- admission status transitions
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

## 7.1 Registration

```text
BDM provides QR
↓
Student scans QR
↓
System validates registration token
↓
Registration form opens
↓
Student submits form
↓
System resolves token → BDM
↓
Student created
↓
Admission created
↓
Status = REGISTERED
↓
Student becomes visible to owning BDM
```

The Student must never supply or choose the trusted BDM identifier directly.

---

## 7.2 BDM Admission Processing

```text
BDM opens own student
↓
Reviews submitted registration
↓
Selects Course
↓
Enters Admission Amount
↓
Enters Paid Amount
↓
Selects Class Starting Date
↓
Assigns Teacher
↓
Submits admission
↓
Status = PENDING_ACCOUNTS_APPROVAL
```

The BDM cannot submit an incomplete or invalid admission.

---

## 7.3 Accounts Approval

```text
Accounts opens pending admission
↓
Reviews allowed information
↓
Verifies payment/admission
↓
Clicks Approve
↓
Approval metadata recorded
↓
Status = ACCOUNTS_APPROVED
↓
Teacher access is enabled
↓
Status = ASSIGNED_TO_TEACHER
```

The implementation may move through the two approval/assignment states in one backend transaction as long as the status history remains coherent.

---

## 7.4 Teacher Access

```text
Teacher logs in
↓
System returns only assigned + approved students
↓
Teacher opens student
↓
Teacher sees Student + Course
↓
Teacher sees Course Modules
```

Teacher access is prohibited before Accounts approval.

---

# 8. Admission Status Model

Canonical statuses:

```text
REGISTERED
PENDING_ACCOUNTS_APPROVAL
ACCOUNTS_APPROVED
ASSIGNED_TO_TEACHER
```

Canonical order:

```text
REGISTERED
    ↓
PENDING_ACCOUNTS_APPROVAL
    ↓
ACCOUNTS_APPROVED
    ↓
ASSIGNED_TO_TEACHER
```

## 8.1 Status Ownership

### REGISTERED

Created automatically when Student registration succeeds.

### PENDING_ACCOUNTS_APPROVAL

Created automatically when the owning BDM submits complete admission details.

### ACCOUNTS_APPROVED

Created only by a valid Accounts approval action.

### ASSIGNED_TO_TEACHER

Represents the Teacher-visible state after approval.

---

## 8.2 Invalid Transitions

The system must reject invalid direct transitions.

Examples:

```text
REGISTERED → ACCOUNTS_APPROVED
REGISTERED → ASSIGNED_TO_TEACHER
PENDING_ACCOUNTS_APPROVAL → REGISTERED
Teacher action → ACCOUNTS_APPROVED
```

The client must not have a generic "set status" capability.

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

# FR-003 — BDM Registration Link

## Description

A BDM must have an unpredictable registration token/link that can be represented as a QR code.

## Acceptance Criteria

- registration token is unique
- token is not a simple BDM ID
- link resolves to the owning BDM
- inactive/expired/invalid link cannot create a Student
- BDM can see/copy the registration link
- BDM can see the QR representation

---

# FR-004 — Public Student Registration

## Description

A Student can submit a registration form through a valid BDM registration link.

## Required Fields

- Full Name
- Email
- Phone Number
- Address
- Educational Information

## Optional Field

- Additional Information

## Acceptance Criteria

- no login required
- token must be valid before submission succeeds
- Student is linked to BDM resolved from the token
- Student cannot choose/override trusted BDM ownership
- successful registration creates a Student
- successful registration creates an Admission
- initial Admission status is `REGISTERED`
- owning BDM sees the Student
- other BDMs do not see the Student

---

# FR-005 — BDM Student List

## Description

Each BDM sees students registered through their own registration link(s).

## Minimum List Fields

- Student Name
- Course or empty state
- Assigned Teacher or empty state
- Status

## Acceptance Criteria

- BDM sees own Students
- BDM does not see other BDM Students
- direct API request for another BDM Student is rejected/not returned

---

# FR-006 — BDM Student Detail

## Description

The owning BDM can view the full registration information submitted by the Student.

## Acceptance Criteria

- only owning BDM can access
- full registration profile is available to owning BDM
- other BDM cannot access by guessed/direct URL

---

# FR-007 — BDM Admission Submission

## Description

The owning BDM completes admission information.

## Required Fields

- Course
- Admission Amount
- Paid Amount
- Class Starting Date
- Assigned Teacher

## Validation Rules

```text
course required
course must exist
course should be active
admissionAmount >= 0
paidAmount >= 0
paidAmount <= admissionAmount
classStartDate required
assigned Teacher required
assigned user role must be TEACHER
Student must belong to current BDM
```

## Acceptance Criteria

On valid submission:

```text
status:
REGISTERED
→ PENDING_ACCOUNTS_APPROVAL
```

The transition occurs on the backend.

Invalid/incomplete submission does not change workflow state.

---

# FR-008 — BDM Status Monitoring

## Description

BDM must be able to monitor the current status of their Students.

## Acceptance Criteria

BDM can distinguish at minimum:

```text
Registered
Pending Accounts Approval
Accounts Approved
Assigned to Teacher
```

Human-readable labels should be used in UI.

---

# FR-009 — Accounts Pending Admissions

## Description

Accounts must see admissions waiting for approval.

## Accounts-Visible Fields

- Student Name
- Student Email
- Course
- Admission Amount
- Paid Amount
- Status

## Acceptance Criteria

- only pending admissions appear in the pending queue
- unrelated personal information is not included in the API payload
- Accounts cannot access full BDM Student profile through Accounts endpoints

---

# FR-010 — Accounts Approval

## Description

Accounts can approve a valid pending admission.

## Preconditions

```text
authenticated role = ACCOUNTS
status = PENDING_ACCOUNTS_APPROVAL
assigned Teacher exists
```

## Acceptance Criteria

On approval:

- Accounts approver is recorded
- approval timestamp is recorded
- workflow progresses through approved state
- Student becomes Teacher-visible
- duplicate approval does not produce duplicate side effects
- invalid workflow state is rejected safely

---

# FR-011 — Teacher Student List

## Description

Teacher sees only students assigned to them and approved by Accounts.

## Minimum Fields

- Student Name
- Email
- Course
- Class Start Date (optional but useful)

## Acceptance Criteria

A Student appears only when:

```text
assignedTeacherId = current Teacher
AND
Accounts approval completed
```

Other Teachers cannot see or retrieve the Student.

---

# FR-012 — Teacher Student Detail

## Description

Teacher can view the assigned Student and course information.

## Required Data

- Student Name
- Email
- Course
- Course Modules / Learning Requirements

## Acceptance Criteria

- only assigned Teacher may access
- unapproved Student cannot be accessed
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
| Submit public registration | Yes | No | No | No |
| Login to staff dashboard | No | Yes | Yes | Yes |
| See own QR | No | Yes | No | No |
| See full registration profile | No | Own Students only | No | No |
| See Student Name | N/A | Own Students | Pending admissions | Assigned approved Students |
| See Student Email | N/A | Own Students | Pending admissions | Assigned approved Students |
| See Address | N/A | Own Students | No | No |
| See Education | N/A | Own Students | No | No |
| Select Course | No | Own Students | No | No |
| Enter payment details | No | Own Students | Verify only | No |
| Assign Teacher | No | Own Students | No | No |
| Approve admission | No | No | Yes | No |
| See assigned Students before approval | No | Monitor only | N/A | No |
| See assigned Students after approval | No | Monitor | N/A | Own only |
| See Course Modules | No | Optional | No | Assigned approved Students |
| Access another BDM's Student | No | No | N/A | N/A |
| Access another Teacher's Student | No | N/A | N/A | No |

All restrictions must be enforced by backend/API logic.

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

Staff emails are unique. Better Auth owns credential storage through its authentication tables.

---

## 11.2 RegistrationLink

Required:

```text
id
token
bdmId
isActive
expiresAt?
createdAt
updatedAt
```

Token is unique and unpredictable.

---

## 11.3 Student

Required:

```text
id
fullName
email
phone
address
education
additionalInfo?
registeredViaBdmId
createdAt
updatedAt
```

Student email is not required to be globally unique in MVP.

---

## 11.4 Course

Required:

```text
id
name
description?
isActive
createdAt
updatedAt
```

Course name is unique.

---

## 11.5 CourseModule

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

## 11.6 Admission

Required model capability:

```text
id
studentId
courseId?
admissionAmount?
paidAmount?
classStartDate?
assignedTeacherId?
submittedByBdmId?
status
accountsApprovedById?
accountsApprovedAt?
createdAt
updatedAt
```

Rules:

- one Admission per Student in MVP
- payment uses decimal precision
- pre-BDM fields may be null while status is REGISTERED

---

## 11.7 AdmissionStatusHistory

Required:

```text
id
admissionId
fromStatus?
toStatus
changedById?
createdAt
```

---

# 12. Validation Requirements

All external input must be validated on the backend.

## Student Registration

Validate at minimum:

- full name required
- email valid
- phone required
- address required
- education required
- token valid and active

## BDM Admission

Validate:

- Student belongs to BDM
- Course exists
- Teacher exists
- Teacher role is TEACHER
- amount values valid
- paid amount does not exceed admission amount
- class start date required
- current workflow status allows submission

## Accounts Approval

Validate:

- user role is ACCOUNTS
- Admission exists
- current status is pending
- required BDM admission data exists
- assigned Teacher still exists/is valid

---

# 13. Security Requirements

## 13.1 Passwords

- plaintext passwords must never be persisted
- password hashes must never be returned
- password hashes must never be placed in client session payloads

---

## 13.2 QR Token Security

Registration tokens must:

- be unique
- be unpredictable
- not expose trusted BDM ownership directly
- be rejectable when invalid/inactive/expired

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
BDM A cannot access BDM B's Student.
Teacher A cannot access Teacher B's Student.
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

# Scenario A — Correct BDM Ownership

Given:

```text
BDM A
BDM B
```

When Student A registers using BDM A's QR:

Expected:

```text
BDM A sees Student A.
BDM B does not see Student A.
BDM B cannot retrieve Student A directly.
```

---

# Scenario B — Pending Admission

Given Student A belongs to BDM A.

When BDM A completes:

```text
Course
Admission Amount
Paid Amount
Start Date
Teacher A
```

and submits:

Expected:

```text
Status = PENDING_ACCOUNTS_APPROVAL
Accounts can see the admission.
Teacher A still cannot see Student A.
```

---

# Scenario C — Accounts Privacy

When Accounts opens Student A's pending admission:

Expected data includes:

```text
Name
Email
Course
Admission Amount
Paid Amount
```

Expected data does not include:

```text
Address
Education
Additional personal information
```

---

# Scenario D — Accounts Approval

When Accounts approves Student A:

Expected:

```text
approval metadata stored
workflow progresses
Teacher A gains access
```

---

# Scenario E — Teacher Isolation

Given Student A is assigned to Teacher A.

After Accounts approval:

Expected:

```text
Teacher A sees Student A.
Teacher B does not see Student A.
Teacher B direct API request is rejected/not returned.
```

---

# Scenario F — Teacher Course Modules

Given Student A's Course is IELTS.

Teacher A opens Student A.

Expected:

```text
Student Name
Email
IELTS
Listening
Reading
Writing
Speaking
Mock Test
```

Modules should come from CourseModule data.

---

# Scenario G — Invalid Payment

When BDM submits:

```text
admissionAmount = 10000
paidAmount = 15000
```

Expected:

```text
validation error
status remains unchanged
```

---

# Scenario H — Invalid Teacher Assignment

When BDM attempts to assign a User whose role is not TEACHER:

Expected:

```text
request rejected
status remains unchanged
```

---

# Scenario I — Duplicate Accounts Approval

When Accounts attempts to approve an already approved Admission:

Expected:

```text
safe conflict/no-op response
no duplicate workflow side effects
```

---

# Scenario J — Invalid QR

When a Student opens an invalid/inactive/expired registration token:

Expected:

```text
registration cannot proceed
no Student is created
```

---

# 18. Dashboard Requirements

# 18.1 BDM Dashboard

Minimum useful sections:

```text
My Registration QR

Total Students
Registered
Pending Accounts
Approved/Assigned

Student list
```

Student list should provide:

```text
Name
Course
Teacher
Status
```

---

# 18.2 Accounts Dashboard

Minimum useful sections:

```text
Pending Approvals
```

Each item/row should show:

```text
Student
Email
Course
Admission Amount
Paid Amount
Approve
```

No unnecessary Student profile fields.

---

# 18.3 Teacher Dashboard

Minimum useful sections:

```text
My Students
```

Each item/row:

```text
Student
Email
Course
Start Date (optional)
```

Only approved/assigned Students appear.

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

The MVP is complete only when all applicable requirements below are true:

```text
[ ] BDM authentication works
[ ] Accounts authentication works
[ ] Teacher authentication works

[ ] BDM has unique registration QR/link
[ ] Public Student registration works
[ ] Registration resolves correct BDM
[ ] Other BDM cannot access Student

[ ] BDM can select Course
[ ] BDM can enter Admission Amount
[ ] BDM can enter Paid Amount
[ ] BDM can set Class Starting Date
[ ] BDM can assign Teacher
[ ] Invalid Teacher role is rejected
[ ] Invalid payment amounts are rejected

[ ] BDM submission sets Pending Accounts Approval
[ ] Accounts sees pending Admission
[ ] Accounts payload is data-minimized
[ ] Accounts can approve
[ ] Approval metadata is stored

[ ] Teacher cannot see Student before approval
[ ] Assigned Teacher sees Student after approval
[ ] Other Teacher cannot access Student
[ ] Teacher sees Course
[ ] Teacher sees Course Modules

[ ] Workflow status is backend-controlled
[ ] Backend role authorization exists
[ ] Backend resource ownership checks exist
[ ] Direct API manipulation cannot bypass access rules

[ ] Forms have backend validation
[ ] Error handling is safe
[ ] Responsive UI is usable
[ ] Loading/empty/error states are present

[ ] Database migration is valid
[ ] Lint passes
[ ] Production build passes
[ ] End-to-end manual smoke test passes
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
