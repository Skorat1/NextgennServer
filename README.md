# 🎮 NextGenn Server

Backend REST API and MySQL data store powering the **NextGenn** web gaming platform and Admin Control Panel.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules `import`/`export`)
- **Web Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MySQL](https://www.mysql.com/) (Connection pooling & automated schema migrations)
- **Security & Utilities**:
  - `express-rate-limit` (API rate limiting)
  - `cors` (Cross-Origin Resource Sharing)
  - `dotenv` (Environment variable management)
  - Custom crypto/signature utilities & sanitization

---

## 📁 Project Structure

```text
backend/
├── config/                  # Database connections & table initialization
│   └── db.js                # MySQL pool, automated table creation & seeding
├── constants/               # System defaults & seed records
│   └── seedData.js          # Initial categories and administrative accounts
├── controllers/             # Request handlers & core business logic
│   ├── adminController.js
│   ├── analyticsController.js
│   ├── authController.js
│   ├── categoryController.js
│   ├── fairController.js
│   ├── gameController.js
│   ├── gamificationController.js
│   ├── messageController.js
│   ├── submissionController.js
│   └── userController.js
├── middleware/              # Express middlewares
│   ├── authMiddleware.js    # JWT & role verification
│   ├── errorHandler.js      # Global error handling & logging
│   ├── notFoundHandler.js   # 404 handler for undefined routes
│   └── rateLimiter.js       # Express rate limiter configuration
├── models/                  # MySQL data abstraction models
│   ├── Category.js
│   ├── Game.js
│   ├── Message.js
│   ├── Submission.js
│   └── User.js
├── routes/                  # Express route definitions
│   ├── adminRoutes.js
│   ├── analyticsRoutes.js
│   ├── authRoutes.js
│   ├── categoryRoutes.js
│   ├── fairRoutes.js
│   ├── gameRoutes.js
│   ├── gamificationRoutes.js
│   ├── index.js             # Central router mounted on /api
│   ├── messageRoutes.js
│   ├── proxyRoutes.js       # Game embed proxy
│   ├── submissionRoutes.js
│   └── userRoutes.js
├── scripts/                 # Database maintenance and management scripts
│   ├── clean_games.js       # Clears games database table
│   └── reset_plays.js       # Resets plays, likes, and dislikes to 0
├── services/                # Specialized domain services
│   └── scraperService.js    # External game scraper service
├── utils/                   # Shared utility helpers
│   ├── crypto.js            # Encryption, hashing & signatures
│   └── sanitize.js          # Input sanitization
├── .env.example             # Template environment variables
├── .gitignore               # Ignored files (node_modules, .env, logs)
├── package.json             # NPM dependencies & scripts
├── server.js                # Application entry point & graceful shutdown
└── README.md                # Server documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [MySQL Server](https://www.mysql.com/) (running on port 3306 or configured host)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Skorat1/NextGenn-Server.git
cd NextGenn-Server
npm install
```

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env` and fill in your MySQL credentials:
```bash
cp .env.example .env
```

Example `.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_super_secret_key

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=nextgenn
MYSQL_PORT=3306
```

### 4. Running the Server

#### Development Mode (Auto-reloads on file changes)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

When started, the database tables and default seed categories/users are automatically created if they do not already exist.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts server with Node watch mode (`--watch`) |
| `npm start` | Starts server in production mode |
| `npm run db:clean` | Executes `scripts/clean_games.js` to clear all games |
| `npm run db:reset-plays` | Executes `scripts/reset_plays.js` to reset counters |

---

## 📡 API Endpoints Overview

All main API endpoints are prefixed with `/api`.

| Prefix | Router | Key Responsibilities |
| :--- | :--- | :--- |
| `/` | Root | API Health & Status info |
| `/game-proxy` | `proxyRoutes` | Proxy for embedding third-party games securely |
| `/api/health` | Analytics | Server health check endpoint |
| `/api/stats/online` | Analytics | Real-time active player metrics |
| `/api/auth` | `authRoutes` | User signup, login, session validation & Passkey support |
| `/api/admin` | `adminRoutes` | Admin authentication and administrative actions |
| `/api/games` | `gameRoutes` | CRUD operations for games, search, categories, plays & ratings |
| `/api/categories` | `categoryRoutes` | Game categories management |
| `/api/users` | `userRoutes` | Profile management, cloud save, and user role administration |
| `/api/submissions` | `submissionRoutes` | Developer game submissions & approvals |
| `/api/messages` | `messageRoutes` | Contact messages and support tickets |
| `/api/provably-fair` | `fairRoutes` | Provably fair verification for mini-games |
| `/api/gamification` | `gamificationRoutes` | XP, badges, leaderboards, and daily quests |
