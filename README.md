# Jotter - Smart Note Taking

Jotter is a feature-rich, full-stack notes management application for capturing and organizing ideas, with a Google-Keep-inspired UI and an agentic AI assistant. It pairs a React-based frontend with a Node.js/Express backend and emphasizes code quality, comprehensive tests, and modern development practices.

## Key Features

### Note Management

- **Full life cycle**: Create, edit, pin, archive, and move notes to trash (auto-purged after 30 days), make a copy, and manually reorder notes via drag and drop. Pinned notes are grouped separately, Keep-style.
- **Categorization**: Color-code notes (light/dark palettes) and organize with multiple labels per note; filter, search, and sort from the sidebar.
- **Rich text editing**: Format notes inline (H1/H2, bold, italic, underline) in a Keep-style composer with a bottom toolbar; click any note to reopen it in a centered modal editor. Lightweight checklist notes are also supported.
- **Reminders**: Set a date/time reminder on any note and review them from the dedicated Reminders view.
- **Attachments**: Attach images (shown as a banner on the card) and files to notes, stored via Cloudinary.
- **Organization**: Navigate quickly between notes, Ask Jotter, reminders, labels, archive, and trash from the sidebar.

### AI Features

- **AI writing help in the composer**: While writing a note, use Jotter AI to generate a title, fix grammar, or suggest smart tags (capped at three), powered by Groq's fast LLM inference API.
- **Ask Jotter (agentic assistant)**: A dedicated full-page assistant that answers natural-language questions about your notes and stats (totals, pinned, archived, reminders, labels) and can take actions on your behalf via tool-calling — create notes, set reminders, add labels, archive/unarchive, and delete (move to trash) — resolving target notes by title (with a clarification prompt when ambiguous) and remembering recent conversation context.

### User Customization

- **Personalized profiles**: Secure registration and login with JWT-based authentication, behind a redesigned split-screen landing page.
- **Email verification**: New accounts receive a verification email; unverified users see a resend banner and a status badge on their profile.
- **Forgot/reset password**: Self-service password reset via an emailed, time-limited link, plus in-app change-password for signed-in users.
- **UI preferences**: Toggle between list and grid views, with full dark mode support.
- **Profile management**: Update your display name, profile photo, and theme color; see account stats (notes, pinned, archived, labels); change your password; and permanently delete your account and all its notes from a guarded danger zone.

### Data Portability

- **Export**: Export an individual note to a `.txt` file from the note's overflow menu.

### Security & Operations

- **Rate limiting**: Auth and AI endpoints are throttled to guard against abuse.
- **Helmet**: Secure HTTP headers on every response.
- **API documentation**: Interactive Swagger/OpenAPI docs at `/api/docs`.

## Branding

- Browser title: `Jotter`
- App logo/favicon: `frontend/public/jotter-logo.png` (a lightbulb mark, tinted to the app's orange accent)
- Accent color: warm orange (`#ef7d18`)

## Screenshots

Screenshots are not currently checked into this repository. When adding new screenshots, capture the dashboard, empty state, auth screen, and profile page after starting the frontend with `npm run dev:frontend`.

## Tech Stack

### Frontend

- **React 18** with **Vite**
- **React Router v6**
- **React Hooks** and Context API
- Custom `contentEditable` rich-text composer (no heavyweight editor dependency)
- **jsPDF** for note export

### Backend

- **Node.js** and **Express**
- **MongoDB** with **Mongoose** ODM
- **JWT** for session management
- **Pino** and **Pino-HTTP** for logging
- **Nodemailer** for transactional email (verification, password reset)
- **Cloudinary** + **Multer** for image/file attachment uploads
- **Groq API** (with tool/function calling) for composer AI actions and the agentic Ask Jotter assistant
- **express-rate-limit** and **Helmet** for API hardening
- **swagger-jsdoc** + **swagger-ui-express** for interactive API docs

## Project Structure

The project follows a monorepo structure using npm workspaces.

```text
Jotter/
|-- backend/                 # Node.js + Express API
|   |-- src/
|   |   |-- config/          # Logger and environment configuration
|   |   |-- controllers/     # Request handlers
|   |   |-- db/              # MongoDB configuration
|   |   |-- services/        # Core business logic
|   |   |-- repositories/    # Data access layer
|   |   |-- models/          # Mongoose schemas
|   |   |-- middlewares/     # Auth, error handling, and validation
|   |   |-- routes/          # Express endpoint definitions
|   |   `-- utils/           # Shared utilities
|   `-- test/                # Mocha + Chai unit and integration tests
|
|-- frontend/                # React + Vite application
|   |-- public/              # Static assets, including the Jotter logo
|   `-- src/
|       |-- api/             # API wrappers
|       |-- components/      # Reusable UI building blocks
|       |-- pages/           # Full-page views and tests
|       |-- utils/           # Storage and formatting helpers
|       `-- App.jsx          # Root component and routing
|
|-- scripts/                 # Sonar scanner scripts
`-- docker-compose.sonar.yml # Local SonarQube infrastructure
```

## Development Setup

### Prerequisites

- Node.js v18 or later
- MongoDB local instance or MongoDB Atlas URI
- Docker for running SonarQube locally

### 1. Installation

Install dependencies for both workspaces from the repository root:

```bash
npm run install:all
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d

# Frontend origin used to build links in emails (verification, password reset)
FRONTEND_URL=http://localhost:5173

# Groq API - powers the AI note actions and notes chat (get a free key at console.groq.com)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Cloudinary - powers image/file attachment uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# SMTP - powers verification and password reset emails (e.g. Gmail app password or Mailtrap)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM="Jotter <no-reply@jotter.app>"
```

All of the above beyond `PORT`, `MONGODB_URI`, and the `JWT_*` values are optional for local development: if `GROQ_API_KEY`, Cloudinary, or SMTP credentials are missing, the corresponding feature (AI actions, attachment uploads, email delivery) responds with a clear error or, for email, simply logs the link instead of sending it.

### 3. Execution

Run both services:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

Once the backend is running, interactive API documentation is available at `http://localhost:5000/api/docs`.

## Testing and Quality Assurance

Run all tests from the root:

```bash
npm test
```

Run lint checks:

```bash
npm run lint
```

## Static Analysis with SonarQube

Use the local Docker-based SonarQube setup to track code smells and quality gates.

```bash
npm run sonar:up
npm run sonar:scan
npm run sonar:down
```
