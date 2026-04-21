# Notes App

Day 1 bootstrap for a full-stack Notes App internship project.

## Tech stack

- Backend: Node.js (Express)
- Frontend: React
- Database: MySQL
- Logging: Pino
- Backend testing: Mocha + Chai
- Frontend testing: Jest + Testing Library
- Quality: SonarQube

## Project structure

- `backend/` - API, middleware, logging, database setup
- `frontend/` - React app baseline and tests

## Quick start

1. Install all dependencies:
   - `npm run install:all`
2. Start backend:
   - `npm run dev:backend`
3. Start frontend:
   - `npm run dev:frontend`
4. Run all tests:
   - `npm test`

## Day 1 scope

- Monorepo scaffold
- Backend health endpoint
- Global error middleware
- Pino and HTTP request logging
- MySQL connection module
- Frontend baseline screen
- CI and SonarQube starter config
