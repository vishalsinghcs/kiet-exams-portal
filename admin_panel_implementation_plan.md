# Examly Admin Panel — Complete Implementation Plan

## Overview

This plan rebuilds the Examly Admin Panel from its current basic single-role form into a premium, role-aware academic exam management system. The UI is inspired by the **Qurtubiks** dashboard: dark navy sidebar, clean white content area, stat cards, and rich table/card layouts.

---

## User Review Required

> [!IMPORTANT]
> A new `role` column (`"admin"`, `"teacher"`, `"student"`) replaces the simple `is_admin` boolean. A migration script will set all current `is_admin=True` users to `role="admin"`. The single admin account is preserved.

> [!WARNING]
> Teachers can only see and manage **their own exams**. Admins see everything. This is enforced at the **backend** level — not just the UI.

> [!CAUTION]
> File uploads (dataset ZIP + sample CSV) are stored on the local filesystem during development (`backend/uploads/`). For Render/cloud deployment, switch to Supabase Storage or S3.

---

## Open Questions

> [!IMPORTANT]
> 1. **Teacher creation**: How are teachers created? Assumed: Admin elevates any registered user to `teacher` role from the panel.
> 2. **File size limit**: Assumed 500MB max for dataset ZIP.
> 3. **Results view**: Shows submission metadata + CSV download link per student.
> 4. **Exam editing**: Allowed until `start_time` is reached.

---

## Reference UI Analysis (Qurtubiks Image)

### Sidebar (Left Panel)
- **Width**: ~200px, fixed, full height (`100vh`)
- **Background**: Deep navy `#1B2A4A`
- **Logo area**: Top-left — logo image + brand name in white, `padding: 28px 20px`, bottom border `rgba(255,255,255,0.08)`
- **Section labels**: `GENERAL`, `OTHER` — uppercase, `0.7rem`, `color: #64748B`, letter-spacing wide
- **Nav items**: Icon + label, `padding: 10px 20px`, `border-radius: 8px`, `margin: 2px 10px`
- **Hover**: `background: rgba(255,255,255,0.06)`
- **Active item**: `background: rgba(46,74,121,0.6)`, left `3px solid #2E4A79` border
- **All text**: `color: #CBD5E1`
- **Bottom**: Profile avatar + name + chevron, separated by top border

### Top Header Bar
- **Height**: 64px, white `#FFFFFF`, `border-bottom: 1px solid #E8EAED`
- **Left**: Bold page title `1.8rem 700` that changes per active tab
- **Right**: Bell icon + avatar profile pill with dropdown
- **Position**: `left: 200px`, fixed or sticky

### Stat Cards Row
- **3 cards** horizontally, white bg, `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- **Content per card**: Metric label (muted `0.85rem`), large bold number (`2rem 800`), colored circular icon right-aligned, "View all ›" link below

### Task/Exam Table Card (Bottom Left)
- White card, `border-radius: 16px`, `padding: 24px`
- Row: circular avatar, name (bold) + ID (muted below), task name, date/time
- "View all ›" at bottom-left of card

### Today's Schedule Panel (Bottom Right)
- Header: "Today, **Day Date**" + `<` `>` navigation arrows
- Each item: bold subject name, small grey section code pill, time in muted below
- **Active item**: Full-width brand-colored (`#2E4A79` or orange) filled row with white text
- Clean spacing, no table borders

---

## Proposed Changes

---

### Phase 1 — Database & Backend

#### [MODIFY] `backend/models.py`

```python
# User — add role
role = Column(String, default="student")  # "student" | "teacher" | "admin"

# Exam — add rich content + ownership + files + access code
created_by    = Column(Integer, nullable=True)   # user.id of creator
overview      = Column(Text, nullable=True)       # Markdown/HTML string
extra_sections= Column(Text, nullable=True)       # JSON: [{title, content}, ...]
dataset_path  = Column(String, nullable=True)     # /uploads/{exam_id}/dataset.zip
sample_csv_path = Column(String, nullable=True)   # /uploads/{exam_id}/sample.csv
access_code   = Column(String(6), nullable=True)  # 6-digit teacher-set code

# New table: ExamSectionAssignment
class ExamSectionAssignment(Base):
    __tablename__ = "exam_section_assignments"
    id         = Column(Integer, primary_key=True)
    exam_id    = Column(Integer)
    branch     = Column(String)   # "CSE AI" | "CSE AIML"
    section    = Column(String)   # "A" | "B" | "C" | "D" | "E"
    assigned_at= Column(DateTime, default=datetime.utcnow)
```

#### [NEW] `backend/migrate_role_and_exam_content.py`

One-time migration:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'student';
UPDATE users SET role = 'admin' WHERE is_admin = TRUE;
UPDATE users SET role = 'student' WHERE is_admin = FALSE;

ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS overview TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS extra_sections TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS dataset_path VARCHAR;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS sample_csv_path VARCHAR;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS access_code VARCHAR(6);

CREATE TABLE IF NOT EXISTS exam_section_assignments (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER NOT NULL,
    branch VARCHAR NOT NULL,
    section VARCHAR NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW()
);
```

#### [MODIFY] `backend/schemas.py`

- `UserResponse`: add `role: str`
- `ExamCreate`: add `overview: str`, `extra_sections: str` (JSON), `access_code: str` (exactly 6 digits, validated), keep file paths optional
- New: `ExamSectionAssign(exam_id, branch, section)`
- New: `ExamDetailResponse` with overview + sections + file paths
- New: `ExamCodeVerify(exam_id: int, code: str)` — used by student to unlock exam

#### [MODIFY] `backend/main.py`

**New role guards:**
```python
def get_teacher_or_admin(user):
    if user.role not in ("teacher", "admin"):
        raise HTTPException(403, "Teacher or Admin access required")
    return user

def get_admin_only(user):
    if user.role != "admin":
        raise HTTPException(403, "Admin-only access")
    return user
```

**New / changed endpoints:**

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/teacher/exams` | Teacher+Admin | Create exam (multipart with files) |
| `GET` | `/teacher/exams` | Teacher+Admin | Own exams (admin sees all) |
| `GET` | `/teacher/exams/{id}` | Teacher+Admin | Single exam detail |
| `PUT` | `/teacher/exams/{id}` | Teacher+Admin | Edit exam before start time |
| `POST` | `/teacher/exams/{id}/assign-section` | Teacher+Admin | Assign to entire branch+section |
| `GET` | `/teacher/exams/{id}/results` | Teacher+Admin | View student submissions |
| `GET` | `/teacher/sections/{branch}/{section}/count` | Teacher+Admin | Student count preview |
| `POST` | `/student/exams/{id}/verify-code` | Student | Verify 6-digit code → unlock exam |
| `POST` | `/admin/teachers` | Admin only | Elevate user to teacher |
| `GET` | `/admin/teachers` | Admin only | List all teachers |
| `DELETE` | `/admin/teachers/{id}` | Admin only | Revoke teacher role |
| `GET` | `/admin/stats` | Admin only | Dashboard stats |

**`POST /student/exams/{id}/verify-code` logic:**
- Student sends `{ code: "123456" }`
- Backend checks `exam.access_code == code`
- If correct AND current time is within `[start_time, start_time + duration]`: return `{ valid: true }`
- If wrong code: return `400 { detail: "Invalid exam code" }`
- If outside time window: return `403 { detail: "Exam is not currently active" }`
- **The access code is NEVER returned** in any `GET /teacher/exams` or student-facing response — it stays server-side only

---

### Phase 2 — Frontend File Structure

Split `AdminDashboard.jsx` into a proper admin module:

```
frontend/src/components/admin/
├── AdminLayout.jsx          ← Sidebar + header shell
├── AdminDashboardHome.jsx   ← Stats + recent exams + schedule
├── CreateExam.jsx           ← Full exam form with rich editor + uploads
├── AssignExam.jsx           ← Section-based bulk assignment
├── ViewExams.jsx            ← Exam cards grid
├── ViewResults.jsx          ← Per-exam results table
├── TeacherManagement.jsx    ← Admin only: manage teacher roles
└── admin.css                ← All admin styles
```

`AdminDashboard.jsx` becomes a thin wrapper that renders `<AdminLayout />`.

---

### Phase 3 — AdminLayout.jsx (Sidebar + Header)

**Sidebar nav items:**
```
GENERAL
  📊  Dashboard
  📝  Create Exam
  📋  Assign Exam
  📁  My Exams
  📈  Results

ADMIN  (visible only if role === "admin")
  🎓  Manage Teachers

─────────────────
  [Avatar] Name  ▾    ← profile dropdown at bottom
```

**Logo**: Use `/examly_logo_trans.png` (transparent bg — looks clean on dark sidebar)

**CSS:**
```css
.admin-sidebar {
  width: 210px; position: fixed; height: 100vh; left: 0; top: 0;
  background: #1B2A4A; display: flex; flex-direction: column;
  border-right: 1px solid rgba(255,255,255,0.06);
}
.admin-nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px; margin: 2px 10px;
  border-radius: 8px; color: #CBD5E1;
  cursor: pointer; font-size: 0.9rem; font-weight: 500;
  transition: background 0.2s; border-left: 3px solid transparent;
}
.admin-nav-item:hover { background: rgba(255,255,255,0.06); }
.admin-nav-item.active {
  background: rgba(46,74,121,0.55);
  border-left-color: #2E4A79; color: #FFFFFF;
}
.admin-main { margin-left: 210px; min-height: 100vh; background: #F4F6F9; }
.admin-topbar {
  height: 64px; background: #FFF;
  border-bottom: 1px solid #E8EAED;
  display: flex; align-items: center;
  justify-content: space-between; padding: 0 32px; position: sticky; top: 0; z-index: 40;
}
```

---

### Phase 4 — AdminDashboardHome.jsx

**Stats cards (3 across):**
- "Total Exams" / "Enrolled Students" / "Pending Submissions"
- Card: white, `border-radius: 16px`, `padding: 24px`, shadow
- Number: `font-size: 2rem; font-weight: 800`
- Right: colored icon circle (blue=exams, purple=students, green=submissions)
- "View all ›" link in `#2E4A79`

**Recent Exams table card (left 60%):**
- Columns: Exam Code badge | Exam Name | Sections Assigned | Start Time | Status
- Status pills: `Scheduled`→blue, `Active`→green, `Completed`→grey
- Row hover highlight `#F8F9FA`

**Upcoming Today panel (right 40%):**
- Header: "Today, **Mon 5**" with `<` `>` arrows
- Each exam: bold name, small section code pill (grey), time below in muted
- Current active exam: full-width `#2E4A79` filled row, white text

---

### Phase 5 — CreateExam.jsx

**Install rich text editor:**
```bash
npm install @uiw/react-md-editor
```

**Two-column layout (60/40 split):**
- Left: form fields + editor
- Right: live rendered preview of the exam question (exactly as student sees it)

**Required fields:**
1. Subject Code (text, max 20)
2. Subject Name (text)
3. Exam Name (text)
4. Duration (number, 1–300 min)
5. Start Time (datetime-local, must be future)
6. **Exam Access Code** — 6-digit numeric field
   - Input: `type="text"`, `maxLength=6`, digits only enforced with regex
   - Label: "Exam Access Code" with info tooltip: "Students must enter this code to unlock the exam. Share it only at exam start time."
   - Displayed with a lock icon (🔒) beside it
   - Validation: exactly 6 digits, no letters
   - Stored in DB as `access_code` (plain text — not sensitive enough to hash, but never exposed to students via API)
7. **Overview** — `<MDEditor>` component, min height 200px
8. **Extra Sections** — dynamic list:
   - "+ Add Section" button adds `{ id, title, content }` to state array
   - Each section: title input + MDEditor + 🗑 remove button
   - Stored as JSON string for backend

**File upload zones:**
```
Dataset ZIP:
┌──────────────────────────────┐
│  ☁  Drop .zip here or browse │
│     Max 500MB                │
└──────────────────────────────┘

Sample Submission CSV:
┌──────────────────────────────┐
│  📄  Drop .csv here or browse│
└──────────────────────────────┘
```
- Dashed border `#CBD5E1`, `border-radius: 12px`
- On hover: `border-color: #2E4A79`
- On file selected: show filename + size + green check + "Remove"

**Submission:** `multipart/form-data` POST with all fields + files

---

### Phase 6 — AssignExam.jsx

**Form:**
1. Select Exam (dropdown — own exams only)
2. Select Branch (`CSE AI` | `CSE AIML`)
3. Select Section (dynamic: A–E for CSE AI, A–D for CSE AIML)
4. Live count preview: "This will assign to **47 students** in CSE AI – Section B"
5. "Assign to Section" button → `POST /teacher/exams/{id}/assign-section`

**Already assigned panel** below form:
- List of `branch – section` combos already assigned with student count
- Remove/revoke option per assignment

---

### Phase 7 — ViewExams.jsx

**Card-based grid** (not a boring table):

```
┌────────────────────────────────────────────────────────┐
│  [CS401]  Machine Learning — Mid Semester              │
│  🕐 3h   📅 15 May 2025, 10:00 AM   ● Active          │
│  Assigned: CSE AI-A, CSE AI-B (86 students)           │
│  🔒 Code: ••••••  [Show]                              │
│                    [View Results]  [Edit]  [···]       │
└────────────────────────────────────────────────────────┘
```

- Search bar + status filter + sort (by date, by name)
- "Edit" disabled if start_time passed
- **Exam Code**: shown as masked `••••••` with an eye/show button — teacher can reveal it when needed to share with students at exam start
- "···" menu: Duplicate, Delete (with confirm modal)
- Admin sees ALL exams with teacher name shown; teacher sees only own

---

### Phase 8 — ViewResults.jsx

**Three stat mini-cards:** Assigned | Submitted | Not Submitted

**Results table:**
- Columns: Name | Branch-Section | Submitted At | Download CSV
- Filter by branch/section
- Rows not submitted: muted red "Not submitted" with `—` in download column
- Download column: ↓ icon that triggers file download

---

### Phase 9 — TeacherManagement.jsx (Admin Only)

**Two sections:**

1. Elevate to Teacher:
   - Email input + "Make Teacher" button
   - Calls `POST /admin/teachers`

2. Current Teachers table:
   - Name | Email | Created At | [Revoke] button
   - Revoke → `DELETE /admin/teachers/{id}` → sets role back to "student"

> No option to create another admin — this is blocked at backend level.

---

### Phase 10 — Logo Update Across Site

**Available logos in `/public/`:**
- `examly_logo.png` — full logo (use in white navbars)
- `examly_logo_trans.png` — transparent bg (use in dark sidebar)
- `examly_logo_only.png` — icon only

**Files to update:** `AdminDashboard.jsx`, `Dashboard.jsx`, `LandingPage.jsx`, `AdminPage.jsx`

```jsx
// Instead of importing from assets:
// <img src="/examly_logo_trans.png" /> — in sidebar
// <img src="/examly_logo.png" />       — in white navbars
```

---

## Complete File Change Summary

| File | Action | Key Changes |
|---|---|---|
| `backend/models.py` | MODIFY | `role` on User; `overview`, `extra_sections`, `dataset_path`, `sample_csv_path`, `created_by`, **`access_code`** on Exam; new `ExamSectionAssignment` table |
| `backend/schemas.py` | MODIFY | `role` in UserResponse; `ExamCreate` extended with `access_code`; new `ExamSectionAssign`, `ExamDetailResponse`, `ExamCodeVerify` |
| `backend/main.py` | MODIFY | New role guards; 11 new endpoints incl. `/student/exams/{id}/verify-code`; file upload handling |
| `backend/migrate_role_exam_content.py` | NEW | One-time DB migration incl. `access_code` column |
| `frontend/src/components/admin/AdminLayout.jsx` | NEW | Sidebar + topbar shell |
| `frontend/src/components/admin/AdminDashboardHome.jsx` | NEW | Stats + recent exams + today's schedule |
| `frontend/src/components/admin/CreateExam.jsx` | NEW | Rich exam form with MDEditor + file upload |
| `frontend/src/components/admin/AssignExam.jsx` | NEW | Section-based bulk assignment |
| `frontend/src/components/admin/ViewExams.jsx` | NEW | Premium exam cards with search/filter |
| `frontend/src/components/admin/ViewResults.jsx` | NEW | Results table per exam |
| `frontend/src/components/admin/TeacherManagement.jsx` | NEW | Admin-only teacher role management |
| `frontend/src/components/admin/admin.css` | NEW | All admin panel styles |
| `frontend/src/components/AdminDashboard.jsx` | MODIFY | Becomes thin wrapper for AdminLayout |
| `frontend/src/components/AdminDashboard.css` | DELETE | Replaced by `admin.css` |
| `frontend/src/components/AdminPage.jsx` | MODIFY | Logo update |
| `frontend/src/components/Dashboard.jsx` | MODIFY | Logo update |
| `frontend/src/components/LandingPage.jsx` | MODIFY | Logo update |

---

---

## Phase 11 — Student Exam Code Gate (ExamEnvironment.jsx)

When a student clicks "Start Exam" on the Dashboard, instead of immediately opening the JupyterLite environment, a **code entry gate screen** is shown first.

**Gate screen UI:**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🔒  Enter Exam Code                             │
│                                                  │
│  Machine Learning — Mid Semester                 │
│  CS401 · CSE AI · Section B                     │
│                                                  │
│  [ _ ] [ _ ] [ _ ] [ _ ] [ _ ] [ _ ]            │
│        (6-digit OTP-style input)                 │
│                                                  │
│  ⚠ You have 3h to complete this exam            │
│                                                  │
│  [ Start Exam ]                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**UX design:**
- 6 individual single-digit boxes (OTP-style), auto-focus-next on each digit input
- Centered on a dark overlay (same dark mesh background)
- Exam name and subject code shown above for context
- Warning about time limit
- On submit: `POST /student/exams/{id}/verify-code` with `{ code }`
- **If correct**: gate fades out, JupyterLite iframe loads (with Framer Motion `AnimatePresence`)
- **If wrong**: boxes shake with red border animation, error message "Incorrect code. Ask your teacher."
- **If outside time window**: show "Exam is not currently active" message, no retry
- The code gate state is stored in component local state — not in localStorage (prevents bypassing by refreshing)
- Once successfully verified, a `verified: true` flag is kept in React state for the session; refreshing the page shows the gate again (by design — prevents exam tab sharing)

**Files to modify:**
- `ExamEnvironment.jsx`: add `codeVerified` state; render gate screen if `!codeVerified`
- `ExamEnvironment.css`: add gate screen styles

---

## Suggested Improvements

1. **Auto exam status**: Compute `Scheduled / Active / Completed` dynamically from `start_time + duration` — no manual status field needed.
2. **"Started" tracking**: Record when a student opens the exam environment, so teacher can distinguish "Opened but didn't submit" from "Never opened".
3. **Exam duplication**: "Duplicate" option in ··· menu clones an exam as a draft for next semester.
4. **In-app notifications**: Badge on student dashboard when a new exam is assigned to their section.
5. **Exam preview**: Teacher can click "Preview" to see exactly what the student will see in ExamEnvironment before publishing.
6. **CSV validator**: Backend validates that student-submitted CSV columns match the sample CSV format.
7. **Teacher profile on exam page**: Show "Exam by: Teacher Name, Dept." in the ExamEnvironment question header.

---

## Verification Plan

### Automated
- Run migration script → verify DB columns exist
- `POST /teacher/exams` with multipart → verify file saved + DB row created
- `POST /teacher/exams/{id}/assign-section` → verify all students in that section have `ExamEnrollment` rows
- `GET /teacher/exams` as Teacher A → verify Teacher B's exams are NOT returned

### Manual Browser
1. Admin login → all 6 nav items visible including "Manage Teachers"
2. Teacher login → "Manage Teachers" hidden
3. Create exam with rich text + file upload → exam appears in View Exams
4. Assign to CSE AI – Section A → student in that section sees exam on dashboard
5. Check live preview updates as teacher types in rich editor
6. Student submits CSV → teacher sees submission in Results tab with download link
