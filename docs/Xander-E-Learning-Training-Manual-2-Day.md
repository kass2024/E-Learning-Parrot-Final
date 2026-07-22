# Xander Learning Hub
## Full E-Learning Platform Training — Zero to Hero

---

| | |
|---|---|
| **Organization** | Xander Global Scholars |
| **Platform** | Xander Learning Hub (E-Learning) |
| **Training dates** | **9 July 2026** & **10 July 2026** |
| **Daily time** | **10:00 AM – 1:00 PM** (3 hours per day) |
| **Total duration** | 6 hours (2 sessions) |
| **Audience** | Admin staff, coordinators, instructors (new users) |
| **Level** | Beginner → Advanced (zero to hero) |
| **Live site** | https://xanderglobalacademy.com |
| **Admin API** | https://api.xanderglobalscholars.com |

---

## Training purpose

By the end of this training, participants will be able to:

1. Navigate the public website and all dashboard roles confidently.
2. Manage the full learner lifecycle: signup → approval → enrollment → payment → learning → certificate.
3. Create and publish courses, programs, materials, and study shifts.
4. Run Zoom meetings, live classes, webinars, and live cohorts.
5. Handle payments, revenue, and instructor payouts.
6. Configure marketing banners and partner institutions.
7. Use analytics and support tools (View as learner/instructor).

---

## Platform roles (know this first)

| Role | Who uses it | Dashboard |
|------|-------------|-----------|
| **Admin / Staff** | Head office team | Full admin menu |
| **Partner company** | Institution admin | Same menu, scoped to their institution |
| **Instructor** | Teachers / trainers | Courses, materials, quizzes, live classes |
| **Learner** | Students | My courses, payment, certificates |
| **Meeting user** | Webinar coordinator | Webinar signups & schedules only |

**Login:** `/login` — each role is redirected to the correct dashboard after sign-in.

---

# DAY 1 — Foundations & Learner Lifecycle
**Date: Thursday, 9 July 2026 | 10:00 AM – 1:00 PM**

---

## Session overview

| Time | Topic | Type |
|------|-------|------|
| 10:00 – 10:20 | Welcome, platform overview, roles | Presentation |
| 10:20 – 10:45 | Public website tour | Demo |
| 10:45 – 11:15 | Learner signup & student management | Hands-on |
| 11:15 – 11:30 | **Break** | |
| 11:30 – 12:15 | Courses, programs & approvals | Hands-on |
| 12:15 – 12:45 | Enrollment workflow end-to-end | Hands-on |
| 12:45 – 13:00 | Day 1 recap & Q&A | Discussion |

---

## 10:00 – 10:20 | Welcome & platform overview

### What is Xander Learning Hub?

A complete e-learning system that covers:

- Public course catalog and branded institution portals
- Student registration and enrollment
- Online payments (Stripe)
- Course materials (PDF, video, documents)
- Live Zoom classes and recorded sessions
- Quizzes and assessments (including AI-generated)
- Certificates with QR verification
- Webinar / meeting booking for prospects
- Marketing promo banners on the homepage
- Partner institution multi-tenant branding
- Revenue sharing and instructor payouts

### System architecture (simple)

```
Public website (React)  →  API (Laravel)  →  Database
         ↓                      ↓
   Learners browse        Admin manages everything
   Instructors teach      Stripe / Zoom / Email
```

### Trainer talking points

- Admin work happens in the **dashboard** after login.
- Learners and instructors use the **same login page** but see different menus.
- Changes in admin (approve course, publish banner) appear on the public site after save/publish.

---

## 10:20 – 10:45 | Public website tour

### Pages to show live

| Page | URL | What to explain |
|------|-----|-----------------|
| Homepage | `/` | Hero, featured courses, star promo banner (middle right) |
| Programs | `/courses` | Course catalog, search, pricing |
| About | `/about` | Company information |
| Sign up | `/signup` | 4-step learner registration |
| Book meeting | `/meeting-registration` | Calendly-style booking |
| Login | `/login` | All roles enter here |

### Marketing elements on public site

1. **Top promo strip** — headline, offer, coupon, countdown (admin: Marketing Management → Advert Banner).
2. **Starburst banner** — homepage middle-right, blinking promo (admin: Star Advert Banner).
3. **Institution portal** — `/i/{slug}` for partner-branded mini-sites.

### Hands-on exercise 1 (5 min)

- Open the homepage as a visitor.
- Identify the top banner and star banner.
- Open `/courses` and find one active course.

---

## 10:45 – 11:15 | Learner signup & student management

### Learner registration flow (public)

**Path:** `/signup` (or `/join/{institution-slug}` for partners)

| Step | Learner action |
|------|----------------|
| 1 | Choose institution (if applicable) |
| 2 | Select course(s) and study shift(s) |
| 3 | Enter profile: name, email, phone, country |
| 4 | Confirm and submit |

After signup, enrollment status = **Enrolled** (pending admin action).

### Admin: Student Management

**Dashboard → Student Management** (`/dashboard/students`)

| Action | When to use |
|--------|-------------|
| View student list | Daily monitoring |
| Approve student account | New signups |
| Approve enrollment | Allow learner into course |
| Mark as paid | Cash/bank payment (no Stripe) |
| Reject enrollment | Invalid or incomplete application |
| View as learner | Support / troubleshooting |

### Enrollment statuses (memorize)

| Status | Meaning | Learner can access? |
|--------|---------|---------------------|
| **Enrolled** | Applied, awaiting approval | Limited |
| **Approved** | Approved, payment may be due | Partial |
| **Paid** | Payment complete | Full access |
| **Completed** | Finished course | Full + certificate |
| **Rejected** | Declined | No |

### Hands-on exercise 2 (20 min)

1. Register a test learner on `/signup` (use a test email).
2. Log in as admin → **Student Management**.
3. Find the new student → approve account.
4. Approve enrollment for the selected course.
5. **Mark as paid** (or complete Stripe payment as learner).

**Success criteria:** Learner sees the course under **My Courses**.

---

## 11:30 – 12:15 | Courses, programs & approvals

### Programs

**Dashboard → Programs** (`/dashboard/programs`)

- Group related courses into a learning program (e.g. "IELTS Preparation", "Digital Skills").
- Learners can browse programs on the public site.

### Courses (admin path)

**Dashboard → Courses** (`/dashboard/courses`)

| Field | Notes |
|-------|-------|
| Title & description | Shown on public catalog |
| Price | 0 = free; >0 triggers Stripe |
| Program | Link to a program |
| Instructor | Assign teacher |
| Image | Course thumbnail |
| Status | Active / Inactive / Pending |

### Courses (instructor path)

**Instructor → Create Course** → submits as **Pending** → admin must approve.

### Course Approval

**Dashboard → Course Approval** (`/dashboard/course-approval`)

- Review instructor-submitted courses.
- **Approve** → status becomes Active (visible on public site).
- **Reject** → instructor notified with reason.

### Study Shifts

**Dashboard → Study Shifts** (`/dashboard/study-shifts`)

- Define weekly time slots per course (e.g. Monday 6–8 PM).
- Learners pick a shift at signup.
- Admin can change shift on enrollment later.

### Hands-on exercise 3 (25 min)

1. Create a new program: "Training Demo Program".
2. Create a course: "Demo Course 101", price $10, assign instructor.
3. Add one study shift (e.g. Saturday 10:00–12:00).
4. Set course status to **Active**.
5. Verify course appears on `/courses`.

---

## 12:15 – 12:45 | Full enrollment workflow (zero to paid)

### End-to-end checklist

```
[ ] 1. Course is Active on catalog
[ ] 2. Learner signs up at /signup
[ ] 3. Admin approves student in Student Management
[ ] 4. Admin approves enrollment
[ ] 5. Learner pays (Stripe) OR admin marks paid
[ ] 6. Learner opens My Courses → sees materials access
[ ] 7. (Later) Learner completes course → certificate available
```

### Payment options

| Method | Who initiates | Where |
|--------|---------------|-------|
| Stripe (card) | Learner | My Courses → Pay |
| Manual mark paid | Admin | Student Management |

### Hands-on exercise 4 (20 min)

Run the full checklist above with your demo learner and demo course.

---

## 12:45 – 13:00 | Day 1 recap

### Key takeaways

- Public site = marketing + catalog + signup.
- Admin dashboard = control center for students, courses, enrollments.
- Every learner passes through: **signup → approve → enroll → pay → learn**.

### Homework (optional)

- Log in as the demo learner and explore **My Courses**.
- Skim the admin sidebar and note any menu items you did not cover today.

---

# DAY 2 — Operations, Live Learning & Growth
**Date: Friday, 10 July 2026 | 10:00 AM – 1:00 PM**

---

## Session overview

| Time | Topic | Type |
|------|-------|------|
| 10:00 – 10:25 | Payments, revenue & instructor payouts | Demo + hands-on |
| 10:25 – 11:05 | Zoom, live classes, recordings, cohorts | Demo + hands-on |
| 11:05 – 11:20 | **Break** | |
| 11:20 – 11:50 | Webinar booking & meeting registration | Hands-on |
| 11:50 – 12:15 | Marketing banners & partner institutions | Hands-on |
| 12:15 – 12:40 | Instructor tools: materials, quizzes, earnings | Demo |
| 12:40 – 13:00 | Analytics, certificates, final Q&A | Wrap-up |

---

## 10:00 – 10:25 | Payments, revenue & instructor payouts

### Payment Management

**Dashboard → Payment Management** (`/dashboard/payments`)

- View all Stripe transactions.
- Filter by status, date, learner.
- Update payment status manually if needed.

### Revenue Management

**Dashboard → Revenue Management** (`/dashboard/revenue`)

- Platform vs instructor revenue split (default ~30% / 70%).
- Charts by course and instructor.
- Use for monthly reporting.

### Instructor Payouts

**Dashboard → Instructor Payouts** (`/dashboard/instructor-payouts`)

| Step | Action |
|------|--------|
| 1 | Instructor requests payout from their dashboard |
| 2 | Admin reviews request (bank / MoMo / PayPal details) |
| 3 | Admin approves or rejects |
| 4 | Mark as paid after transfer |

### Hands-on exercise 5 (15 min)

1. Open **Payment Management** — locate today's demo payment.
2. Open **Revenue Management** — identify platform vs instructor share.
3. (If sample data exists) Walk through one payout approval.

---

## 10:25 – 11:05 | Zoom, live classes, recordings & cohorts

### Four ways to run live sessions

| Feature | Menu | Best for |
|---------|------|----------|
| **Zoom Meetings** | Zoom Meetings | Ad-hoc staff meetings |
| **Live Classes** | Live Classes | Scheduled class per course |
| **Webinar Signups** | Webinar Signups | Public booking → approved meeting |
| **Live Cohorts** | Live Cohorts | Recurring slot + waiting room queue |

### Zoom Meetings (standalone)

**Dashboard → Zoom Meetings** (`/dashboard/zoom`)

- Create meeting: title, date/time, duration, invite emails.
- **Start** — opens in-app Zoom room.
- **Ended meetings** — playback / download recording when available.
- Copy join link to share.

### Live Classes (course-linked)

**Dashboard → Live Classes** (`/dashboard/classes`)

- Schedule a Zoom session tied to a specific course.
- Learners see it under **Live Classes** in their dashboard.
- Learners click **Join** when session is live.

### Recordings

**Dashboard → Recordings** (`/dashboard/zoom-recordings`)

- Browse cloud recordings from ended Zoom meetings.
- Play back or share with learners.

### Live Cohorts

**Dashboard → Live Cohorts** (`/dashboard/live-zoom-cohort`)

- Recurring live slot with a **join queue**.
- Host uses **Host Studio** to admit learners one by one.
- Good for office hours or consultation sessions.

### Hands-on exercise 6 (25 min)

1. Create a Zoom meeting for "Training Demo" (30 min, today +1 hour).
2. Copy join link; open join in new tab.
3. Schedule one **Live Class** on the demo course.
4. Browse **Recordings** (if any ended meetings exist).

---

## 11:20 – 11:50 | Webinar booking & meeting registration

### Public booking page

**URL:** `/meeting-registration` ("Book meeting with us")

| Step | User action |
|------|-------------|
| 1 | Pick date and time from calendar |
| 2 | Enter name, email, phone |
| 3 | Select reason: E-Learning / School Management / Other Tech Solutions |
| 4 | Confirm booking |

If no schedules exist, visitor sees: contact **info@xanderglobalscholars.com**.

### Admin: Webinar Signups

**Dashboard → Webinar Signups** (`/dashboard/meeting-registrations`)

| Action | Effect |
|--------|--------|
| **Approve** | Creates Zoom meeting + sends confirmation email with join link |
| **Reschedule** | Sends apology email; attendee can rebook or cancel |
| **Remind** | Sends reminder email before session |
| **Reject** | Declines with reason (email sent) |
| **Resend join link** | Re-sends meeting URL |

### Schedules (booking slots)

**Dashboard → Schedules** (`/dashboard/available-schedules`)

- Define when the public booking calendar is open.
- Set date ranges, repeat rules, and open hours.
- Without schedules, the booking page shows the contact email message.

### Hands-on exercise 7 (20 min)

1. Open **Schedules** — confirm at least one future slot exists.
2. Book a test meeting on `/meeting-registration`.
3. In **Webinar Signups**, approve the booking.
4. Check that confirmation email would be sent (or resend join link).

---

## 11:50 – 12:15 | Marketing & partner institutions

### Marketing Management

**Dashboard → Marketing Management** (`/dashboard/marketing`)

#### Advert Banner (top strip)

- Headline, offer text, coupon code
- Background color, countdown timer
- Link URL (optional)
- **Publish banner** → live immediately on all public pages

#### Star Advert Banner (homepage)

- Two lines of text (e.g. DISCOUNT / 10%)
- Star color, text color
- Expiry date/time (auto-hides after expiry; not shown on star)
- **Publish star banner** → appears middle-right on homepage

### Partner Institutions

**Dashboard → Partner Institutions** (`/dashboard/institutions`) — main admin only

| Step | Action |
|------|--------|
| 1 | Partner applies at `/institution-signup` (pays fee) |
| 2 | Admin approves institution |
| 3 | Partner admin logs in (`partner_company` role) |
| 4 | Partner sets branding in Settings → Institution |
| 5 | Learners use `/join/{slug}` or `/i/{slug}` |

### Hands-on exercise 8 (15 min)

1. Update top promo banner → Publish.
2. Update star banner → Publish.
3. Verify both on homepage.
4. (Optional) Open Partner Institutions and review one partner record.

---

## 12:15 – 12:40 | Instructor tools (demo)

Switch to an **instructor account** (or use **View as instructor** from admin).

| Menu | What instructors do |
|------|---------------------|
| **Create Course** | Submit new course for approval |
| **My Courses** | View assigned courses |
| **Materials** | Upload PDFs, videos, lesson files |
| **Assessment** | Create quizzes; AI generate from materials |
| **Live Classes** | Schedule Zoom for their course |
| **Students** | See enrolled learners per course |
| **Performance** | Course analytics |
| **Earnings & Payouts** | View revenue share; request payout |

### Materials upload tips

- Supported: PDF, video links, documents.
- Large files may use pCloud integration.
- Organize by module/lesson for learner clarity.

### Quizzes

- Types: multiple choice, true/false, short answer, oral (audio).
- **AI generate** — upload material → auto-create questions.
- Publish quiz → learners see under course assessments.

---

## 12:40 – 13:00 | Analytics, certificates & wrap-up

### Reports & Analytics

**Dashboard → Reports & Analytics** (`/dashboard/analytics`)

- Enrollment trends
- Revenue (Stripe vs manual)
- Top courses and instructors
- Learner demographics

### Certificates

- Issued when enrollment is **Paid** or **Completed**.
- Learner downloads PDF from **Certificates** menu.
- QR code links to public verification: `/verify/certificate/{courseId}/{studentId}`.

### Support superpower: View As

From **User Management**, **Student Management**, or **Instructor Management**:

- **View as learner** — see exactly what the student sees.
- **View as instructor** — troubleshoot instructor issues.
- **View as partner** — test institution-scoped admin.

### User Management

**Dashboard → User Management** (`/dashboard/users`)

- Create admin, staff, instructor, partner accounts.
- Reset access; assign roles.

---

## Final competency checklist

Participants should be able to complete each item without help:

### Day 1 skills
- [ ] Explain all platform roles
- [ ] Navigate public website and catalog
- [ ] Register a learner and approve enrollment
- [ ] Create a course and program
- [ ] Mark enrollment as paid

### Day 2 skills
- [ ] Create a Zoom meeting and live class
- [ ] Approve a webinar signup
- [ ] Configure and publish both marketing banners
- [ ] Open revenue and payment reports
- [ ] Upload course material as instructor
- [ ] Use View as learner for support

---

## Quick reference — admin menu map

| Section | Menu items |
|---------|------------|
| **Overview** | Dashboard |
| **Administration** | Instructor Payouts, Revenue, Payments, Users, Partner Institutions, Instructor Approval, Course Approval, Students, Marketing |
| **Analytics** | Reports & Analytics |
| **Learning ops** | Courses, Programs, Study Shifts, Instructors, Live Classes, Zoom Meetings, Recordings, Webinar Signups, Schedules, Live Cohorts, Materials |
| **Account** | Settings |

---

## URLs cheat sheet

| Purpose | URL |
|---------|-----|
| Public homepage | https://xanderglobalacademy.com |
| Course catalog | https://xanderglobalacademy.com/courses |
| Learner signup | https://xanderglobalacademy.com/signup |
| Book meeting | https://xanderglobalacademy.com/meeting-registration |
| Login | https://xanderglobalacademy.com/login |
| Admin dashboard | https://xanderglobalacademy.com/dashboard/admin |
| Certificate verify | https://xanderglobalacademy.com/verify/certificate/{courseId}/{studentId} |

---

## Trainer notes

### Before Day 1
- [ ] Confirm admin login credentials for all trainees
- [ ] Create 2–3 test learner emails
- [ ] Ensure at least one Active course and one schedule slot exist
- [ ] Test Stripe in test mode (or prepare manual mark-paid workflow)
- [ ] Projector / screen share ready

### Before Day 2
- [ ] Confirm Zoom credentials work (`Zoom Meetings` page loads)
- [ ] Prepare sample webinar signup to approve
- [ ] Marketing banners draft content ready
- [ ] Instructor test account available

### If something fails live
- **API error** → check https://api.xanderglobalscholars.com is up
- **Zoom not loading** → verify Zoom env vars on server
- **Email not sent** → check MAIL settings; use Resend join link
- **No booking dates** → add schedules or show contact-email fallback

---

## Assessment (optional — 10 min at end of Day 2)

1. Name the four platform roles and one task each performs.
2. List the enrollment statuses in order from signup to certificate.
3. Where do you approve a course submitted by an instructor?
4. How does a learner book a meeting with the company?
5. What is the difference between Zoom Meetings and Live Classes?
6. How do you publish the homepage star promo banner?

**Pass:** 4/6 correct.

---

*Document prepared for Xander Global Scholars — Xander Learning Hub E-Learning Platform Training.*  
*Version 1.0 — July 2026*
