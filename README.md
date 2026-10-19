# Retain

Retain is a personal expense and monthly budget manager. The application has a React and TypeScript frontend and an Express API backed by MongoDB.

## Live application

**Frontend website:** https://retain-app-nine.vercel.app/

**Backend API:** https://retain-app-u7jd.onrender.com/

The API health check is available at the backend URL above.

## Features

- Create an account, sign in, and sign out.
- Protect signed-in pages and restrict the admin dashboard to admin users.
- Record, edit, view, and delete personal expenses.
- Search and filter expenses by category, payment method, and date range; sort by date or amount.
- Select a report month and view its spending, highest expense, category breakdown, and recent expenses.
- Set a monthly budget and view the amount spent and remaining.
- Paginate the expense list and choose how many rows to display.
- Admin-only dashboard with platform totals, category insights, recent expenses, and recent users.
- Admins can create, edit, and delete categories. Expenses in a deleted category are moved to Uncategorized.

## Technologies

- Frontend: React, TypeScript, Vite, React Router, Redux Toolkit, React Redux
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Authentication: React Context in the client; bcryptjs and JSON Web Tokens in the API

## Requirements

- Node.js and npm
- A MongoDB database (MongoDB Atlas or a local MongoDB server)

## Local setup

### 1. Configure the API

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/retain
JWT_SECRET=replace-with-a-long-random-secret
```

For MongoDB Atlas, use the connection string provided by Atlas as `MONGODB_URI`. Keep `.env` private; do not commit database credentials or the JWT secret.

Install dependencies and start the API:

```powershell
cd server
npm install
npm run dev
```

The API connects to MongoDB before it starts listening. Its health-check URL is `http://localhost:5000/`.

### 2. Configure and start the frontend

In a second terminal, optionally create `client/.env.local` if the API is not at the default URL:

```env
VITE_API_URL=http://localhost:5000
```

Then install dependencies and start Vite:

```powershell
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Deploying the frontend

Deploy the `client` directory as a static Vite site using a hosting provider such as Vercel or Netlify. Set this build environment variable in the hosting provider:

```env
VITE_API_URL=https://retain-app-u7jd.onrender.com
```

Build the site with `npm run build` from `client/`; the generated static files are in `client/dist`. After deployment, replace the frontend status near the top of this README with the public website URL.

## API overview

Protected endpoints require an `Authorization: Bearer <token>` header. Sign in or register to receive a token. User expense and budget records are scoped to the authenticated user. Category reads require sign-in; category changes and admin insights require an admin role.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register and sign in a new user |
| `POST` | `/api/auth/login` | Public | Sign in |
| `GET` | `/api/users/me` | Signed in | Get the current user |
| `GET` | `/api/expenses` | Signed in | List the current user's expenses; supports `search`, `category`, `paymentMethod`, `startDate`, `endDate`, and `sort` (`newest`, `oldest`, `amount-high`, `amount-low`) query parameters. Add `page` and/or `limit` for a paginated response (`limit` is 1–100). |
| `POST` | `/api/expenses` | Signed in | Create an expense |
| `PUT` | `/api/expenses/:id` | Owner | Update an expense |
| `DELETE` | `/api/expenses/:id` | Owner | Delete an expense |
| `GET` | `/api/budgets/:month` | Signed in | Get a monthly budget and spending summary; `month` uses `YYYY-MM` |
| `PUT` | `/api/budgets/:month` | Signed in | Create or update a monthly budget |
| `GET` | `/api/categories` | Signed in | List categories |
| `POST` | `/api/categories` | Admin | Create a category |
| `PUT` | `/api/categories/:id` | Admin | Update a category |
| `DELETE` | `/api/categories/:id` | Admin | Delete a category and reassign its expenses |
| `GET` | `/api/admin/insights` | Admin | Retrieve platform-wide metrics and recent activity |

The first registered account has the `user` role. To use the admin dashboard locally, assign `admin` to a trusted account's `role` field in the MongoDB database. Do not expose admin privileges to public sign-up.

When `page` or `limit` is supplied to `GET /api/expenses`, the response contains `expenses` and a `pagination` object with `page`, `limit`, `totalItems`, and `totalPages`. Date filters use `YYYY-MM-DD`; `endDate` includes that full day. The client filters and paginates the loaded expense list using Redux state.

## Useful commands

From `client/`:

```powershell
npm run build
npm run lint
```

From `server/`:

```powershell
npm start
npm run dev
```
