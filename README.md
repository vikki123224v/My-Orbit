# Orbit — Find Your People

Orbit is a privacy-first, full-stack geospatial web application that enables people to discover nearby friends who have explicitly chosen to share their live location.

## Core Privacy Architecture
- **Location Sharing is OFF by Default**: Simply being friends does not grant location visibility.
- **Directional Friend-by-Friend Permissions**: If Alice shares her location with Bob, Bob does not automatically share with Alice.
- **Morphed Presence Privacy Mode**: Lets friends know you are out and about without sending coordinates to unauthorized viewers.
- **Instant Kill Switch**: Disabling sharing immediately stops browser tracking and invalidates coordinates in PostgreSQL.
- **Database-Enforced Access Control**: Row-Level Security (RLS) ensures unpermitted viewers cannot query coordinates.

---

## Tech Stack
- **Frontend**: React 18/19, TypeScript, Vite, Tailwind CSS, Lucide React, React Router, Leaflet, React Leaflet.
- **Backend & Database**: Supabase (Auth, PostgreSQL, Realtime, Row Level Security, RPC Functions).
- **Map Provider**: OpenStreetMap with custom dark styling.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v22.18.0)
- npm 9+
- A free account on [Supabase](https://supabase.com)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project parameters:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Do NOT commit your `.env` file to Git. It is excluded by `.gitignore`.)*

### 3. Apply Database Migrations in Supabase
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Open or paste the contents of `supabase/migrations/20261020000000_orbit_initial_schema.sql`.
4. Click **Run** to execute the migration.
5. In **Authentication -> URL Configuration**, add your local frontend URL (e.g. `http://localhost:5173`) to the **Redirect URLs**.

### 4. Run the Application Locally
```bash
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Build for Production & Verify
```bash
npm run build
```
This produces optimized production assets in `dist/`.

---

## License
MIT
