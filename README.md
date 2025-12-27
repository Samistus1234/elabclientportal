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

This portal shares the same Supabase backend as `elabcommandcentre`. Use the same project credentials in your `.env` file.

### Required Edge Function

Deploy the `client-case-summary` edge function to enable AI summaries:

```bash
cd ../elabcommandcentre
supabase functions deploy client-case-summary
```

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
