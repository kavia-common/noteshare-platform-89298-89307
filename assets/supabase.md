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
- Upload behavior: client uploads PDFs under a user-scoped prefix with a timestamp:
  - Path pattern: userId/yyyy/mm/<timestamp>_<originalname>.pdf
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

- Auth methods used: email/password with email verification flows and password reset.
- Signup uses a redirect back to the site. By default, the client uses window.location.origin; if REACT_APP_SITE_URL is set, it should match your Supabase Authentication URL settings.

Configure Supabase Authentication URLs:
- Go to Authentication > URL Configuration
  - Site URL: set to your dev/prod site (e.g., http://localhost:3000 or https://your-domain)
  - Redirect URLs (add all that apply; include wildcard to allow nested routes):
    * "http://localhost:3000/**"
    * "https://vscode-internal-29843-beta.beta01.cloud.kavia.ai:3000/**"  ← adjust to your actual preview/prod origin and port
- Ensure the route "/auth/callback" is permitted by the wildcard in Redirect URLs. The app finalizes sessions at this path.

Email sending and SMTP configuration (improves deliverability):
1) In Supabase Dashboard > Authentication > Providers > Email
   - Verify Email provider is enabled.
   - Optional but recommended: Configure a Custom SMTP provider (e.g., SendGrid, Postmark, AWS SES) for reliable delivery.
   - Set the “Sender email” to a verified address at your domain (e.g., no-reply@yourdomain.com).
   - In your SMTP provider, set up and verify SPF and DKIM DNS records. Consider adding a DMARC record for better inbox placement.
   - Save changes and send a test email.

2) In Supabase Dashboard > Authentication > URL Configuration
   - Ensure Site URL exactly matches REACT_APP_SITE_URL (if set), including scheme (https) and no trailing path beyond root.
   - Add Redirect URLs with wildcards to cover "/auth/callback" and any nested routes you might use in the future.

3) Logs and monitoring
   - Check Authentication > Logs for “Email” events and errors (rate limit exceeded, SMTP rejected, invalid recipient).
   - If emails are not sent, verify your project isn’t rate-limited and that the sender is not blocked by your SMTP provider.
   - Check https://status.supabase.com for incidents impacting email.

4) Spam and allowlisting
   - Ask recipients to check their spam/junk folder.
   - Recommend adding the sender address to their contacts/allowlist.
   - Use a recognizable “From name” (e.g., “NoteShare”) to reduce confusion.

5) Redirect & link validation
   - The app sets `emailRedirectTo` using REACT_APP_SITE_URL if defined, otherwise `window.location.origin`.
   - Make sure that this exact origin is included in Supabase “Site URL” and “Redirect URLs.”
   - Ensure the Auth callback route exists and is reachable at “/auth/callback”.
   - If you change domains, update both the environment variable and Supabase Auth URLs.

Relevant client routes:
- /auth/callback — handled by src/pages/AuthCallback.jsx (uses supabase.auth.getSessionFromUrl to finalize login or reset token)
- /auth/error — friendly error page for auth-related issues
- /login — combined login/signup/reset flows with validation and emails

Email Templates:
- In Authentication > Templates, customize:
  - Confirm signup
  - Magic link / OTP
  - Reset password
- Ensure links use the correct {{ .RedirectTo }} or default template variables. Keep branding clear to reduce spam filtering.

## End-to-end Flow

1) A user signs up or logs in (src/pages/AuthPage.jsx). On signup, emailRedirectTo defaults to window.location.origin.
2) After authentication, Supabase redirects the browser back to your site (must be allowed in Supabase Auth settings). The /auth/callback route processes the session.
3) Authenticated users can upload a PDF (src/components/UploadModal.jsx). The client uploads the file to the public notes bucket and inserts metadata into public.notes, including a public_url for display and download.
4) The Dashboard (src/pages/Dashboard.jsx) queries public.notes and renders results with optional search and category filters. Preview and download use public_url.

## Troubleshooting

- One-click checks: Open the in-app Diagnostics at /troubleshoot. It validates env variables (REACT_APP_SUPABASE_URL/KEY), the effective auth redirect URL, Supabase connectivity, and storage bucket access with actionable fixes.

Auth email not delivered (verification/magic link/reset):
1) Verify Auth URLs
   - Authentication > URL Configuration: Site URL matches your current origin.
   - Redirect URLs include the exact origin with wildcard, e.g.:
     - http://localhost:3000/**
     - https://your-domain/**
   - Ensure /auth/callback is handled (route exists in the app).

2) Check Email templates
   - Authentication > Templates: Ensure “Confirm signup” and other templates are enabled and contain default placeholders correctly.
   - If customized, ensure the button “Confirm your email” references the correct redirect.

3) Configure Custom SMTP (recommended)
   - Authentication > Providers > Email: Set your SMTP host, port, username, password, and From address (verified).
   - Verify your sending domain (SPF/DKIM) with your SMTP provider.
   - Send a test email from Supabase.

4) Inspect logs and status
   - Authentication > Logs: Filter for Email to see bounces/errors/rate limits.
   - Check https://status.supabase.com for any ongoing issues.

5) Spam and allowlist
   - Ask the user to check spam/junk.
   - Add the sender to contacts/allowlist.

6) Environment consistency
   - If REACT_APP_SITE_URL is set, it must match Auth Site URL and be included in Redirect URLs.
   - For preview URLs that change, either update Redirect URLs or rely on localhost during dev.

7) Rate limits
   - Avoid rapid repeated signups/resets; Supabase applies email rate limits. Try again later if rate limited.

Other issues:
- If uploads fail with 401/403: Verify user is signed in and storage insert policy for bucket 'notes' exists.
- If preview/download fails: Ensure public bucket and that getPublicUrl returns a valid URL and is stored in notes.public_url.

If you encounter 'ERROR: 42710: policy ... already exists' when running SQL:
- This occurs if you run CREATE POLICY for a policy that is already present. If you do not need to change the rule, you can safely ignore this error.
- If you need to change the policy definition, either use CREATE OR REPLACE POLICY where applicable, or drop the existing policy first using DROP POLICY and then recreate it with the new definition.
