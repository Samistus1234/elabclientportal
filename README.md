# ELAB Client Portal

Client-facing portal for applicants to track their application status.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualizations
- **Supabase** for authentication and database
- **Google Gemini** for AI-powered summaries

## Quick Start

```bash
# Navigate to the project directory
cd elabclientportal

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The app will run on `http://localhost:5174` (different port from command centre).

## Features

- **Magic Link Authentication** — Passwordless login via email
- **Dashboard** — Overview of all applications with status
- **Case View** — Detailed view of individual application
- **AI Summary** — Gemini-powered explanations of case status
- **Timeline** — Visual progress through stages
- **Client-Visible Notes** — Updates from staff marked for client viewing

## Connecting to Supabase

> **Security Note:** This client portal uses a **separate Supabase project** from the command centre. This ensures complete isolation between client users and admin users — separate databases, separate authentication, and no cross-portal data access.

### Setting Up Your Supabase Project

1. Create a new Supabase project for the client portal
2. Copy the project URL and anon key to your `.env` file
3. Set up the required database schema (see Database Schema section)
4. Deploy the edge functions

### Required Edge Functions

Deploy the edge functions to your client portal's Supabase project:

```bash
# Link to your client portal Supabase project
supabase link --project-ref your-project-ref

# Deploy edge functions
supabase functions deploy sync-case
supabase functions deploy client-case-summary

# Set required secrets
supabase secrets set SYNC_API_KEY=your-sync-api-key
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

### Data Synchronization

Case data is pushed from the command centre to this portal via the `sync-case` edge function. The command centre calls this function's API endpoint with the sync API key to create/update cases for clients to view.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Project Structure

```
elabclientportal/
├── src/
│   ├── pages/           # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── CaseView.tsx
│   ├── components/      # Reusable components
│   │   ├── TimelineView.tsx
│   │   └── AISummaryCard.tsx
│   ├── lib/             # Utilities
│   │   └── supabase.ts
│   └── App.tsx          # Main app with routing
└── ...config files
```
