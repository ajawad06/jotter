# Notes App

A full-stack Google Keep clone built for organized note-taking. Features rich text support, category-based styling, and various export options.

## 🚀 Key Features

- **Auth & Profiles**: Secure user accounts with customizable display names and theme preferences.
- **Note Management**:
  - Create, Pin, Archive, and Trash notes.
  - Apply colors to categorize different types of notes.
- **Rich Editor**: Integrated editor for formatting text (bold, italic, lists, etc.).
- **Import/Export**: Load from `.txt` files and export your notes as indexed `.txt` or `.pdf`.
- **Responsive UI**: A modern interface that works across devices, featuring both List and Grid views.

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router, Vite, React Quill, jsPDF.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Auth.
- **Development**: ESLint for code quality, SonarCloud for static analysis.

## 📥 Setup & Running

1. **Install everything**:

   ```bash
   npm run install:all
   ```

2. **Configure environment**:
   Create a `backend/.env` with your `PORT`, `MONGODB_URI`, and `JWT_SECRET`.

3. **Start the app**:
   - Backend: `npm run dev:backend`
   - Frontend: `npm run dev:frontend`

## 🧪 Testing

I used **Jest/RTL** for the frontend and **Mocha/Chai** for the backend to ensure stability.

- Run all tests: `npm test`
- Check coverage: `npm run test:coverage -w backend` (or `-w frontend`)
