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

## Prerequisites
- Node.js 18+
- A Supabase project (https://supabase.com)

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

# Optional
# Maximum upload size in MB for PDFs (default 50)
REACT_APP_MAX_UPLOAD_MB=50

# Optional site URL used for auth redirects; if omitted, window.location.origin is used
# REACT_APP_SITE_URL=https://your-production-domain
```

3) Supabase configuration (required)
- Storage bucket
  - Create a public Storage bucket named `notes`
  - Add a storage policy to allow authenticated users to upload:
    - SQL (run in Supabase SQL Editor):
      ```
      create policy "allow uploads for authenticated"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'notes');
      ```
- Database schema and RLS
  - Create table `public.notes` with columns used by the app:
    ```
    BEGIN;
    create extension if not exists "pgcrypto";
    create table if not exists public.notes (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      description text,
      author text,
      category text,
      file_path text not null,
      file_size bigint,
      public_url text,
      created_at timestamptz not null default now(),
      owner uuid default auth.uid()
    );
    alter table public.notes enable row level security;
    COMMIT;
    ```
  - Add RLS policies:
    ```
    -- Allow anyone to read
    create policy "Allow select for all users"
    on public.notes
    for select
    using (true);

    -- Allow authenticated users to insert (owner defaults to auth.uid())
    create policy "Allow insert for authenticated users"
    on public.notes
    for insert
    to authenticated
    with check (auth.uid() = owner or owner is null);

    -- Optional: owner-only updates/deletes
    create policy "Allow update for owner"
    on public.notes
    for update
    to authenticated
    using (auth.uid() = owner);

    create policy "Allow delete for owner"
    on public.notes
    for delete
    to authenticated
    using (auth.uid() = owner);
    ```
- Authentication URL settings
  - Tip: Use the in-app Troubleshooter at /troubleshoot to verify env variables, URL config, and storage access.
  - In Supabase Dashboard > Authentication > URL Configuration:
    - Site URL: http://localhost:3000 (for local dev) and your production URL
    - Redirect URLs:
      - "http://localhost:3000/**"
      - "https://vscode-internal-29843-beta.beta01.cloud.kavia.ai:4000/**"
  - This app handles the callback at `/auth/callback`. Ensure your redirect patterns allow that path.

4) Run the app
```
npm start
```

## How it works (supabase)
- Supabase client is configured in `src/lib/supabaseClient.js` and reads env vars `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY`.
- Uploads happen in `src/components/UploadModal.jsx`. A PDF is uploaded to the `notes` storage bucket, `getPublicUrl` is used to generate a public URL, and a row is inserted into `public.notes`.
- The Dashboard (`src/pages/Dashboard.jsx`) queries `public.notes` and applies server-side filters (ilike for search across title/description/author, and category eq). It falls back to client-side filters if server-side filtering fails.
- Preview (`src/pages/PreviewPage.jsx`) renders the stored `public_url` in an iframe and shows guidance if the URL is not reachable.
- Auth callback is handled by `src/pages/AuthCallback.jsx` using `supabase.auth.getSessionFromUrl()`.

## Notes
- Signup uses `emailRedirectTo = window.location.origin` by default. If you configure `REACT_APP_SITE_URL`, it should align with Supabase Authentication settings.
- All Supabase credentials are read from env; do not hardcode secrets.
- If you prefer private storage, disable public bucket and switch the app to use signed URLs for preview/download and adjust RLS accordingly.

## Troubleshooting note (Supabase SQL policies)
If you see `ERROR: 42710: policy ... already exists` when running the SQL for policies, it means the policy has already been created. This is not a problem unless you need to change the rule. In that case, either:
- Use `CREATE OR REPLACE POLICY` where applicable, or
- Drop the existing policy first with `DROP POLICY` and then create it again with the new definition.
