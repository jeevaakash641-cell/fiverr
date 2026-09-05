# One Community Ely — Platform Features & Implementation Documentation

> **AI-Powered Educational Platform for Classes 1–12 & Vocational Training**  
> *Developed for One Community Ely Training Centre*  
> *Last Updated: September 2026*

---

## 📋 Table of Contents
1. [Platform Overview](#-platform-overview)
2. [Technology Stack & Cloud Infrastructure](#-technology-stack--cloud-infrastructure)
3. [Core Feature Inventory](#-core-feature-inventory)
   - [1. User Authentication & Role-Based Access Control](#1-user-authentication--role-based-access-control)
   - [2. AI Learning Assistant & Real-Time Tutor](#2-ai-learning-assistant--real-time-tutor)
   - [3. Guide Books & Textbooks Catalog](#3-guide-books--textbooks-catalog)
   - [4. Book Management & AWS S3 Cloud Storage](#4-book-management--aws-s3-cloud-storage)
   - [5. Administrator Portal & Learner Management](#5-administrator-portal--learner-management)
   - [6. Admin Security & Settings](#6-admin-security--settings)
   - [7. User Feedback & Quality Rating System](#7-user-feedback--quality-rating-system)
   - [8. Student Analytics, Monitoring & Study History](#8-student-analytics-monitoring--study-history)
4. [Implementation Timeline (From Start to Present)](#-implementation-timeline-from-start-to-present)
5. [Backend REST API Reference](#-backend-rest-api-reference)
6. [Local Development & Build Commands](#-local-development--build-commands)

---

## 🌟 Platform Overview

**One Community Ely Educational Platform** is a comprehensive web-based learning and management ecosystem. It provides students with AI-powered tutoring, textbooks, practice quizzes, and offline notes, while giving administrators full visibility and control over users, learning materials, feedback, and platform security.

---

## 🛠 Technology Stack & Cloud Infrastructure

### **Frontend**
- **Framework:** React 18 (Single Page Application via React Router DOM v6)
- **Build Tool:** Vite 4.x
- **Styling:** Tailwind CSS (Custom `#23735F` / `emerald-700` One Community Ely branding)
- **Icons:** Lucide React
- **Rich Text & PDF:** Quill, HTML2PDF.js, LocalForage

### **Backend & Cloud Architecture**
- **Runtime:** Node.js (ES Modules) with Express.js REST API
- **Amazon Bedrock:** Claude / Google Gemma foundation models for step-by-step tutoring
- **Amazon S3:**
  - `edulearn-books-storage` — Cloud storage for uploaded textbooks, PDFs, and learning documents
  - `chat-history` — S3 bucket storage for AI session logs and student conversation archives
- **Amazon DynamoDB:**
  - `EduLearnUsers` — User profiles, roles, and status
  - `EduLearnFeedback` — Star ratings and user review records
  - `EduLearnStudentAnalytics` — Student study time and progress metrics
- **Amazon Translate & Speech Services:**
  - Real-time translation across 12+ Indian regional languages
  - Web Speech API SpeechSynthesis & SpeechRecognition for hands-free voice interaction

---

## 🚀 Core Feature Inventory

### 1. User Authentication & Role-Based Access Control
- **Dual Authentication Modes:**
  - **Google One-Click Sign-In:** Firebase OAuth integration for seamless student onboarding.
  - **Email & Password Authentication:** Standard login with role validation.
- **Strict Role Separation:**
  - **Learner (`student`):** Access to Dashboard, AI Assistant, Guide Books, Quizzes, and Notes.
  - **Administrator (`teacher`):** Access to Admin Portal, User Management, Book Uploads, Admin Settings, and System Analytics.
- **Banned Account Enforcement:** Instant session termination and login blocking for banned accounts.
- **Dedicated Admin Login (`/admin-login`):** Separate administrative sign-in portal with validation against the user database.

---

### 2. AI Learning Assistant & Real-Time Tutor (`/ai-assistant`)
- **Visual Design & Layout:**
  - Sticky branded header with active AI status indicator, voice selector, chat history link, and study notes toggle.
  - Full-width container with brand-aligned typography and responsive layout.
- **ChatGPT-Style Pill Input Bar:**
  - **`+` Action Popover Menu:**
    - 🖼️ **Attach Image:** Upload diagram or homework problem photo.
    - 🎥 **Video Link:** Paste YouTube URL for AI video concept analysis.
    - 📎 **Attach Files:** Upload PDFs, Word documents, EPUBs, and text files.
  - **One-Click Microphone:** Built-in speech-to-text dictation button.
  - **Attachment Preview:** Removable badge chips (`✕`) for attached media before sending.
- **Interactive Quiz & Exam Mode:**
  - When asked for a quiz or test (*e.g., "give me the normal quiz exam"*), the AI provides **only questions and options**.
  - Strict rule prevents spoiling answers upfront; scores and explanations are delivered only after the student replies.
- **Text-to-Speech (Read Aloud):**
  - Live voice playback of AI responses.
  - **Emoji Stripper:** Regex filter `[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}]` prevents the speech engine from reading emoji unicode names (*e.g., "waving hand sign"*) aloud.
  - Markdown bold/bullet cleaner for smooth, human-like voice synthesis.
- **Quick Tips Helper Bar (`💡 Quick Tips`):**
  - Single-row helper with click-to-ask prompts (*Explain a complex concept*, *Real-world examples*, *Generate a quiz*, *Step-by-step solution*).
- **Study Notes Integration (`NotesPanel`):** Side-by-side rich text notepad for recording revision notes while chatting with the AI.

---

### 3. Guide Books & Textbooks Catalog (`/guide-books`)
- **Digital Library:**
  - Dynamic catalog displaying textbooks across Mathematics, Science, English, Social Science, and Vocational skills.
  - S3 cloud synchronization with fallback to local curriculum library.
- **Search & Filtering:**
  - Keyword search across book title, author, and subject.
  - Filter by category and format (PDF, DOCX, EPUB, TXT).
- **Embedded Document Viewer (`/book/:id`):**
  - Full-page interactive PDF reader with page navigation, zoom, and download options.
- **Persistent Deletion Filtering:**
  - Deleted books are filtered out in real-time via `deletedBookIds` registry so removed books vanish permanently from student views.

---

### 4. Book Management & AWS S3 Cloud Storage (`/manage-books`, `/upload-books`)
- **Direct S3 Deletion:** Backend `DeleteObjectCommand` endpoint (`DELETE /api/books/:key(*)`) removes files directly from the AWS S3 bucket.
- **Synchronized Catalog:** Deleted items update local storage and cloud states simultaneously.
- **Standalone Book Upload Form:** Upload interface supporting multi-format files with metadata tagging (Title, Author, Subject, Class Level).

---

### 5. Administrator Portal & Learner Management (`/admin-panel`)
- **Live Metric Cards Bar:**
  - Total Registered Users
  - Real-Time Online Users (Live active status)
  - Total Learners (Students)
  - Total Administrators
  - User Feedback Submissions Count
  - Banned Accounts Count
- **Manage Learners Tab:**
  - Searchable learner roster with registration date, last active timestamp, and account status.
  - 🚫 **Ban / Unban Toggle:** Instantly revokes or restores platform access.
  - 🗑️ **Delete Account:** Purges learner from local and DynamoDB databases.
  - 🛡️ **Promote to Admin:** Elevates learner to administrator privileges.
- **Manage Admins Tab:**
  - Comprehensive list of active administrative accounts.
  - Protected controls preventing self-demotion or self-deletion.
  - Demote to Learner action for admin role lifecycle management.
- **User Feedback Tab:**
  - Centralized dashboard displaying student reviews, ratings, and issue reports.
  - Search by user name, email, keyword, or category.
  - Filter by Star Rating (1–5 Stars) and Category (General, AI Assistant, Quiz, Books, Bug Report, UI/UX).
  - Individual review deletion with DynamoDB synchronization.
- **Platform Analytics & System Statistics Tab:**
  - User demographic breakdown (Learners vs Admins vs Banned).
  - Material format diversity charts (PDF, DOC, TXT, EPUB).

---

### 6. Admin Security & Settings (`/admin-settings`)
- **Password Verification Security:**
  - Mandatory **Current Password \*** verification field before allowing any password updates.
  - Validates current password against stored credentials prior to applying new password.
- **Add New Administrator Form:**
  - Dedicated form to register new administrator accounts with full name, email, and password confirmation.
- **Standardized Visual Theme:**
  - Sentence-case labels, Inter typography, and One Community Ely `#23735F` emerald buttons.

---

### 7. User Feedback & Quality Rating System (`/feedback`)
- **Interactive Student Feedback Modal:**
  - 5-Star interactive rating component.
  - Category selector (`General`, `AI Assistant`, `Quiz`, `Live Classes`, `Books`, `Performance`, `UI/UX`, `Bug Report`).
  - Text area for detailed student feedback.
- **Backend Storage:**
  - Saved to DynamoDB `EduLearnFeedback` table with unique UUID and timestamp.
  - Optional email notification trigger to administration.

---

### 8. Student Analytics, Monitoring & Study History (`/history`, `/ai-history`)
- **AI Conversation Tracking:**
  - Automatic session logging with duration, subject tag, and message counts.
  - Cloud backup in S3 and local storage for offline retrieval.
- **Book Reading History:** Tracks recently opened textbooks, reading progress, and timestamps.
- **Quiz Performance Tracking:** Records practice quiz scores, question breakdown, and accuracy metrics.

---

## ⏱ Implementation Timeline (From Start to Present)

| Phase | Features & Modules Implemented |
| :--- | :--- |
| **Phase 1: Foundation** | Initial React + Vite architecture setup; AWS SDK integration; Tailwind styling and basic router setup. |
| **Phase 2: Authentication** | Firebase Google Sign-In & local storage credential authentication; student and teacher role separation. |
| **Phase 3: AI Assistant** | Amazon Bedrock (Google Gemma/Claude) chat integration; bilingual translation service; NotesPanel notepad. |
| **Phase 4: Digital Books Catalog** | GuideBooks library; embedded PDF viewer; AWS S3 bucket integration for book storage. |
| **Phase 5: Admin Portal** | Learner & Admin tables; ban/unban controls; S3 file upload and metadata management; system analytics. |
| **Phase 6: Book Deletion Sync** | S3 `DeleteObjectCommand` backend route; synchronized deletion between Admin Portal and GuideBooks. |
| **Phase 7: Security Hardening** | Added mandatory current password verification in Admin Settings; clean UI casing; unified emerald theme. |
| **Phase 8: AI Tab Redesign** | Rebuilt `/ai-assistant` layout to match GuideBooks design; added Quick Tips helper bar. |
| **Phase 9: ChatGPT-Style Input** | Integrated `+` popover menu (Images, Videos, Files); added dictation mic; full-width responsive pill bar. |
| **Phase 10: Smart Quiz & TTS Fixes** | Configured Bedrock interactive quiz rules (no answer spoilers); added emoji regex filter for Read Aloud. |
| **Phase 11: Admin User Feedback** | Added dedicated User Feedback management tab in Admin Portal with search, filter, and delete controls. |

---

## 📡 Backend REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/ai/ask` | Fast English AI tutoring response via Amazon Bedrock. |
| `POST` | `/api/chat` | AI tutoring with automatic language detection & translation. |
| `GET` | `/api/books` | Fetches catalog of uploaded books from AWS S3. |
| `DELETE`| `/api/books/:key(*)` | Deletes book file directly from AWS S3 bucket. |
| `POST` | `/api/feedback` | Submits student review/feedback to DynamoDB. |
| `GET` | `/api/feedback` | Fetches all feedback entries for admin review. |
| `DELETE`| `/api/feedback/:id` | Deletes a specific feedback entry from DynamoDB. |
| `GET` | `/api/users` | Fetches user accounts from DynamoDB. |
| `POST` | `/api/users/sync` | Syncs updated user profile / status to DynamoDB. |

---

## 💻 Local Development & Build Commands

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Run frontend & backend concurrently
npm run dev:full

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview
```

---

*Documentation maintained by One Community Ely Educational Platform Team.*
