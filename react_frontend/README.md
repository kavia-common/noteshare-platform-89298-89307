# NoteShare React Frontend

A modern, responsive SPA for uploading, browsing, searching, previewing, and downloading notes/books in PDF format. Auth and storage are powered by Supabase.

## Features
- Supabase Auth (email/password), Storage uploads
- Browse notes in a responsive grid with search and category filters
- Upload modal with metadata (title, description, author, category)
- Preview PDFs via embedded iframe
- Download via public URL
- Profile page for basic user information
- Ocean Professional theme (blue with amber accents), smooth shadows, rounded corners

## Setup
1) Install dependencies
```
npm install
```

2) Configure environment variables
Create `.env` at `react_frontend/.env`:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_anon_key
```

3) Supabase configuration (required)
- Create a public Storage bucket named `notes`
- Create a table `notes` with columns:
  - id: uuid primary key default uuid_generate_v4() (or gen_random_uuid())
  - title: text
  - description: text
  - author: text
  - category: text
  - file_path: text
  - file_size: bigint
  - public_url: text
  - created_at: timestamptz default now()
- Enable RLS and add policies:
  - Select: allow for all (or authenticated) as per your needs
  - Insert: allow for authenticated users
- Ensure Storage bucket is public or provide signed URL logic

4) Run
```
npm start
```

## Notes
- Signup uses emailRedirectTo = window.location.origin
- All supabase credentials are read from env; do not hardcode secrets
- Extend UI and data model as needed
