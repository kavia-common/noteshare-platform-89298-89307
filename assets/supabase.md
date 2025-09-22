# Supabase Integration

This application uses Supabase for Authentication, Database, and Storage. Follow the steps below to configure a working deployment that matches the application code.

## Environment Variables

Create react_frontend/.env with the following variables:
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- (optional) REACT_APP_SITE_URL — used for auth redirects; defaults to window.location.origin when not set
- (optional) REACT_APP_MAX_UPLOAD_MB — maximum PDF upload size in MB; defaults to 50

The Supabase client is initialized in src/lib/supabaseClient.js and reads the env vars above. Do not hardcode credentials.

## Storage

- Bucket name: notes
- Visibility: public (so that public_url can be embedded and downloaded directly)
- Upload behavior: client uploads PDFs at the bucket root with a timestamp prefix
- Public URLs: generated in the client via storage.getPublicUrl(path) and stored in the notes table

Create the bucket:
1) Go to Storage > Create new bucket
2) Name: notes
3) Public bucket: enabled

Storage policies (allow authenticated uploads to the notes bucket):
Run in SQL Editor:
create policy "allow uploads for authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'notes');

Note: Because the bucket is public, read access is automatic. If you require private files, disable public access and use signed URLs instead of public_url. You must then adjust the app code to request signed URLs for preview and download.

## Database

Create the notes table and enable RLS. The schema reflects exactly what the app uses during uploads and browsing.

Run in SQL Editor:
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

Row Level Security policies:

-- Allow anyone (including unauthenticated) to read notes
create policy "Allow select for all users"
on public.notes
for select
using (true);

-- Allow authenticated users to insert their own notes
create policy "Allow insert for authenticated users"
on public.notes
for insert
to authenticated
with check (auth.uid() = owner or owner is null);

-- Allow owners to update their rows (optional, but recommended)
create policy "Allow update for owner"
on public.notes
for update
to authenticated
using (auth.uid() = owner);

-- Allow owners to delete their rows (optional)
create policy "Allow delete for owner"
on public.notes
for delete
to authenticated
using (auth.uid() = owner);

Notes:
- The application inserts title, description, author, category, file_path, file_size, and public_url after a successful storage upload.
- The owner column defaults to auth.uid(), binding rows to the authenticated user.
- The Dashboard queries the notes table and supports server-side filters using ilike and category equality.

## Authentication

- Auth methods used: email/password with optional email verification flows
- Signup uses a redirect back to the site. By default, the client uses window.location.origin; if REACT_APP_SITE_URL is set, it should match your Supabase Authentication URL settings.

Configure Supabase Authentication URLs:
- Go to Authentication > URL Configuration
  - Site URL: set to your dev/prod site (e.g., http://localhost:3000 or https://your-domain)
  - Redirect URLs:
    * http://localhost:3000/**
    * https://your-production-domain/**
- Ensure that the above URLs include the route /auth/callback because the app implements an AuthCallback page at that path to finalize the session.

Relevant client routes:
- /auth/callback — handled by src/pages/AuthCallback.jsx (uses supabase.auth.getSessionFromUrl to finalize login)
- /auth/error — friendly error page for auth-related issues

## End-to-end Flow

1) A user signs up or logs in (src/pages/AuthPage.jsx). On signup, emailRedirectTo defaults to window.location.origin.
2) After authentication, Supabase redirects the browser back to your site (must be allowed in Supabase Auth settings). The /auth/callback route processes the session.
3) Authenticated users can upload a PDF (src/components/UploadModal.jsx). The client uploads the file to the public notes bucket and inserts metadata into public.notes, including a public_url for display and download.
4) The Dashboard (src/pages/Dashboard.jsx) queries public.notes and renders results with optional search and category filters. Preview and download use public_url.

## Troubleshooting

- One-click checks: Open the in-app Diagnostics at /troubleshoot. It validates env variables (REACT_APP_SUPABASE_URL/KEY), Supabase connectivity, auth redirect URL, and storage bucket access with actionable fixes.
- If uploads fail with 401/403: Verify that the user is authenticated and the storage insert policy allowing authenticated users for bucket_id = 'notes' is in place.
- If preview/download fails or shows an unavailable message:
  - Ensure the bucket is public and that getPublicUrl returns a valid URL.
  - Confirm that public_url is stored in the notes row.
- If signup or login does not redirect back:
  - Check Authentication > URL Configuration to include your site and redirect patterns.
  - If you set REACT_APP_SITE_URL, ensure it matches your Supabase site/redirect settings exactly (scheme, domain, and trailing slash).
