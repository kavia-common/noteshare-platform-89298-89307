# Supabase Integration

This frontend uses Supabase for Authentication, Database, and Storage.

Environment Variables (set in react_frontend/.env):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- (optional) REACT_APP_SITE_URL (for redirects; defaults to window.location.origin)

Client initialization: src/lib/supabaseClient.js

Storage:
- Bucket name: notes (public)
- Files: uploaded PDFs are stored at root with a timestamped prefix
- Public URLs are generated via `getPublicUrl`

Database (table: notes):
- Columns: id (uuid), title (text), description (text), author (text), category (text), file_path (text), file_size (bigint), public_url (text), created_at (timestamptz), owner (uuid)
- RLS: enabled; policies to allow read (public) and insert/update/delete for authenticated users (owner-scoped)

Auth:
- Email/password login and signup
- Signup uses a dynamic redirect (getURL())

UI Integration:
- Uploads occur from UploadModal
- Browsing and searching in Dashboard
- Preview via iframe in PreviewPage

--- 

Setup steps (run in Supabase Dashboard):

1) Storage bucket (public)
- Go to Storage > Create new bucket
- Name: notes
- Public bucket: enabled

2) Database schema and RLS
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

Policies:

-- Allow anyone to read
create policy "Allow select for all users"
on public.notes
for select
using (true);

-- Allow authenticated users to insert
create policy "Allow insert for authenticated users"
on public.notes
for insert
to authenticated
with check (auth.uid() = owner or owner is null);

-- Optional: allow owners to update/delete their rows
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

3) Storage policies (uploads by authenticated)
If the bucket is public, reads are allowed. To allow client uploads:

create policy "allow uploads for authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'notes');

4) Auth URL configuration
- Authentication > URL Configuration
  - Site URL: set to your dev/prod site (e.g., http://localhost:3000)
  - Redirect URLs: 
    * http://localhost:3000/**
    * https://your-production-domain/**
  - Update Email Templates as needed.

5) Environment variables:
- Create react_frontend/.env:
  REACT_APP_SUPABASE_URL=your_supabase_url
  REACT_APP_SUPABASE_KEY=your_supabase_anon_key
  # Optional for redirects:
  # REACT_APP_SITE_URL=https://your-production-domain

Notes:
- Client code uses supabase-js v2.
- UploadModal writes to storage bucket notes and inserts into table notes.
- PreviewPage uses public_url to display PDFs.
- If you want private buckets, switch to signed URLs and adjust read policies accordingly.
