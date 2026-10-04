# 🗓️ Calendar-Driven Todo Manager & Admin Platform

A full-stack Todo application featuring a month-view calendar with task indicators, date-driven task isolation, full authentication with JWT httpOnly cookies, rate limiting, and a privacy-preserving Super Admin Dashboard with analytics.

---

## 🚀 Features

- **Authentication & User Management**:
  - Secure signup and login with `bcryptjs` (cost 12) and JWT stored in `httpOnly` cookies.
  - User-scoped tasks: Each user has their own private calendar and tasks.
  - Brute-force protection with `express-rate-limit` on authentication endpoints.
  - Active status checks: Deactivated users cannot log in or perform actions.
- **Calendar & Daily Tasks**:
  - Month grid view with local timezone date calculations (`YYYY-MM-DD`, safe for IST UTC+5:30).
  - Contributed dates highlighting (Amber for pending tasks, Emerald for all completed).
  - Task reordering, duplicate prevention, and optimistic UI updates with rollback handling.
- **Super Admin Dashboard**:
  - Initialized securely via seed script with environment variables.
  - Overview cards: Total users, Active users today (in `Asia/Kolkata` IST), Total tasks, Completion rate.
  - Daily usage breakdown table (last 7, 14, or 30 days) aggregating signups, logins, and task activity.
  - User management table: Search, filter, pagination, task counts, and instant activation/deactivation toggles.
  - **Strict Privacy**: Displays counts and activity metrics only; never exposes task text or descriptions.

---

## 📁 Project Structure

```text
Todo/
├── public/                 # Static assets
├── server/                 # Backend (Node.js + Express + MongoDB)
│   ├── config/
│   │   └── db.js           # Mongoose connection setup
│   ├── controllers/
│   │   ├── authController.js  # Signup, login, logout, getMe
│   │   ├── adminController.js # Overview stats, daily usage, user list, status toggle
│   │   └── todoController.js  # User-scoped CRUD & aggregation controllers
│   ├── middleware/
│   │   ├── authMiddleware.js  # Protect and requireSuperAdmin JWT middlewares
│   │   ├── rateLimiter.js     # Auth endpoint rate limiter
│   │   └── errorHandler.js    # 404 and global error formatting middleware
│   ├── models/
│   │   ├── User.js         # User model with roles ("user", "superadmin")
│   │   ├── Todo.js         # User-scoped Todo model with compound unique index
│   │   └── ActivityLog.js  # Platform activity logging
│   ├── routes/
│   │   ├── authRoutes.js   # /api/auth routes
│   │   ├── adminRoutes.js  # /api/admin routes
│   │   └── todoRoutes.js   # /api/todos routes
│   ├── scripts/
│   │   └── seedSuperAdmin.js # Seed/update Super Admin from env variables
│   ├── .env.example        # Backend environment template
│   ├── package.json        # Backend dependencies & scripts
│   ├── requests.http       # REST Client test file for API endpoints
│   └── server.js           # Express app entrypoint
├── src/                    # Frontend (React + Vite + Tailwind)
│   ├── api/
│   │   ├── authApi.js      # Auth endpoints fetch client
│   │   ├── adminApi.js     # Super Admin fetch client
│   │   └── todoApi.js      # Todo endpoints fetch client
│   ├── components/
│   │   ├── Calendar.jsx    # Custom Tailwind calendar component
│   │   └── Navbar.jsx      # Top navigation & role switcher bar
│   ├── context/
│   │   └── AuthContext.jsx # Global user auth & session provider
│   ├── hooks/
│   │   └── useTodos.js     # Custom hook with optimistic updates & rollbacks
│   ├── pages/
│   │   ├── Login.jsx       # Dark-themed login page
│   │   ├── Signup.jsx      # Dark-themed signup page
│   │   └── AdminDashboard.jsx # Super Admin metrics & user management dashboard
│   ├── todo/
│   │   └── Todo.jsx        # Dual-panel integrated calendar & todo page
│   ├── utils/
│   │   └── dateUtils.js    # Timezone-safe local date utilities
│   ├── App.jsx             # Root component with auth routing
│   ├── index.css           # Global stylesheet & scrollbar customization
│   └── main.jsx            # React DOM entrypoint
├── .env                    # Frontend environment configuration
├── index.html              # HTML shell
├── package.json            # Frontend dependencies & scripts
└── README.md               # Documentation
```

---

## ⚙️ Environment Variables

### 1. Backend (`server/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/calendar_todo
CLIENT_URL=http://localhost:5173
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_calendar_todo_2026_dev_mode
JWT_EXPIRES_IN=7d
SUPERADMIN_NAME=Loki Admin
SUPERADMIN_EMAIL=superadmin@todo.local
SUPERADMIN_PASSWORD=SuperAdminPass123
```

### 2. Frontend (`.env`)

```env
VITE_API_URL=https://to-do-ai3p.onrender.com/api
```

---

## 🛠️ Installation & Running Locally

### 1. Setup Backend & Seed Super Admin
```bash
cd server
npm install
npm run seed:admin
npm run dev
```
*Server starts on `https://to-do-ai3p.onrender.com/`.*

### 2. Setup Frontend
In the root directory:
```bash
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📡 API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user account (rate-limited) |
| `POST` | `/api/auth/login` | Log in user and receive `httpOnly` cookie (rate-limited) |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Restore user session on load |

### Todos (`/api/todos`) - *Requires Auth*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/todos?date=YYYY-MM-DD` | Get current user's tasks for date |
| `POST` | `/api/todos` | Create a new task (`{ text, date }`) |
| `PATCH` | `/api/todos/:id` | Update task (`{ text, completed }`) |
| `DELETE` | `/api/todos/:id` | Delete single task |
| `DELETE` | `/api/todos/completed?date=YYYY-MM-DD` | Bulk clear completed tasks for date |
| `PATCH` | `/api/todos/reorder` | Update task order (`{ date, orderedIds: [] }`) |
| `GET` | `/api/todos/summary?month=YYYY-MM` | User's monthly summary for calendar indicators |

### Admin (`/api/admin`) - *Requires Super Admin*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Platform metrics (total users, active today, completion rate) |
| `GET` | `/api/admin/usage/daily?from=...&to=...` | Daily activity timeline (signups, logins, tasks) |
| `GET` | `/api/admin/users?page=1&limit=20` | User management list with task counts |
| `PATCH` | `/api/admin/users/:id/status` | Activate or deactivate user accounts |
