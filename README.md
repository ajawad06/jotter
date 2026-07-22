# Notes Tracker

A feature-rich, full-stack notes management application inspired by Google Keep. This project focuses on high code quality, comprehensive testing, and modern development practices, featuring a React-based frontend and a robust Node.js/Express backend.

## 🌟 Key Features

### Note Management

- **Full Life-cycle**: Create, edit, pin, archive, and move notes to trash.
- **Categorization**: Color-code notes for visual organization and quick identification.
- **Rich Text Editing**: Integrated `React Quill` editor for formatted content (bold, italics, lists).
- **Organization**: Powerful sidebar navigation for quick access to your main notes, archive, and deleted items.

### User Customization

- **Personalized Profiles**: Secure registration and login with JWT-based authentication.
- **UI Preferences**: Toggle between List and Grid views. Full **Dark Mode** support for a comfortable experience.
- **Profile Management**: Update your display name and choose a unique theme color for your profile.

### Data Portability

- **Import**: Bulk import notes from local `.txt` files.
- **Export**: Save individual notes or your entire collection as indexed `.txt` files or formatted `.pdf` documents.

## 🛠️ Tech Stack

### Frontend

- **React 18** (Vite) & **React Router v6**
- **State Management**: React Hooks & Context API
- **Utilities**: `jsPDF` (Exports), `Lucide React` (Icons), `BcryptJS` (Hashing)

### Backend

- **Node.js** & **Express**
- **Database**: **MongoDB** with **Mongoose** ODM
- **Security**: **JWT** (JSON Web Tokens) for session management
- **Logging**: `Pino` & `Pino-HTTP` for clinical logging

## 📂 Project Structure

### Workspace Organization

The project follows a monorepo structure using **npm workspaces**, cleanly separating logic between the client and server.

```text
Notes-App/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/          # logger + dotenv configure
│   │   ├── controllers/     # Request handlers & logic orchestration
|   |   ├── db/              # MongoDB configuration
│   │   ├── services/        # Core business logic
│   │   ├── repositories/    # Database abstraction (Data Access Layer)
│   │   ├── models/          # Mongoose schemas
│   │   ├── middlewares/     # Auth, error handling, validation
│   │   └── routes/          # Express endpoint definitions
│   │   └── utils/           # Error Handler etc.
│   └── test/                # Mocha + Chai unit & integration tests
|
├── frontend/                # React + Vite application
│   ├── src/
│       ├── api/             # Axios/Fetch API wrappers
│       ├── components/      # Reusable UI building blocks
│       ├── pages/           # Full-page views (Dashboard, Login, etc.) + Tests
│       ├── utils/           # Storage & formatting helpers
│       └── App.jsx          # Root component & routing
|
├── scripts/                 # script for Sonar Scanner
└── docker-compose.sonar.yml # Local SonarQube infrastructure
```

## 📥 Development Setup

### Prerequisites

- **Node.js**: v18 or later
- **MongoDB**: Local instance or MongoDB Atlas URI
- **Docker**: For running SonarQube locally

### 1. Installation

The project uses **npm workspaces** to manage both frontend and backend dependencies from the root:

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
```

### 3. Execution

Run both services simultaneously:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

## 🧪 Testing & Quality Assurance

Quality is a core pillar of this project, with high coverage across both stacks.

### Comprehensive Testing

- **Backend**: Tested with `Mocha`, `Chai`, and `Sinon` (88% Coverage).
- **Frontend**: Tested with `Jest` and `React Testing Library` (78%+ Coverage).

Run all tests from the root:

```bash
npm test
```

### Static Analysis with SonarQube

We use a local **Docker-based SonarQube** instance to track code smells and quality gates.

1. **Spin up SonarQube**:
   ```bash
   npm run sonar:up
   ```
2. **Execute Scan**:
   ```bash
   npm run sonar:scan
   ```
3. **Shutdown**:
   ```bash
   npm run sonar:down
   ```
