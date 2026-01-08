# TaskFlow RBAC Web App

A full-stack project and task management web application with:

- Authentication (signup/login)
- Role-based access control (`ADMIN`, `MEMBER`)
- Project and team management
- Task creation, assignment, and status tracking
- Dashboard with totals, status distribution, and overdue tasks
- REST API + SQL database (PostgreSQL via Prisma)

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Auth: JWT + bcrypt

## Project Structure

```text
.
├── client/                # React app
├── server/                # Express API + Prisma
├── .env.example
└── railway.json
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set real values:

```bash
copy .env.example .env
```

3. Make sure `DATABASE_URL` points to a running PostgreSQL database.

4. Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

5. Optional: seed default admin:

```bash
npm run seed
```

6. Run app:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api`

## Default RBAC Rules

- First signup user becomes `ADMIN`
- All later signups become `MEMBER`
- `ADMIN` can create/delete projects and manage all users/projects/tasks
- Project `ADMIN` can manage team members and tasks in that project
- `MEMBER` can view project tasks and update status only for tasks assigned to them

## REST API (Core)

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users` (ADMIN)
- `PATCH /api/users/:userId/role` (ADMIN)
- `GET /api/projects`
- `POST /api/projects` (ADMIN)
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId` (Project/Admin)
- `DELETE /api/projects/:projectId` (ADMIN)
- `POST /api/projects/:projectId/members` (Project/Admin)
- `DELETE /api/projects/:projectId/members/:userId` (Project/Admin)
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks` (Project/Admin)
- `PATCH /api/tasks/:taskId` (Project/Admin or assigned member for status only)
- `DELETE /api/tasks/:taskId` (Project/Admin)
- `GET /api/dashboard/overview`

## Railway Deployment

1. Push this code to GitHub.
2. In Railway, create a new project and choose **Deploy from GitHub**.
3. Add a PostgreSQL service in Railway.
4. Set environment variables in Railway:
   - `DATABASE_URL` (from Railway Postgres)
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN=7d`
   - `CLIENT_ORIGIN` (your deployed app URL once available)
   - `PORT=5000` (optional, Railway sets this automatically)
5. Deploy. Nixpacks will run install/build and start with `npm run start`.
6. Open the deployed URL and create your first account (it becomes `ADMIN`).

## GitHub Push

```bash
git init
git add .
git commit -m "feat: full-stack task management app with RBAC and Railway deploy config"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```
