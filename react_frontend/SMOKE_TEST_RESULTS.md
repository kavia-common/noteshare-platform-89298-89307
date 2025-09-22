# NoteShare E2E Smoke Test Results (React Frontend)

Date: [run-date]
Environment: Local React (Create React App), Supabase client SDK
Container: react_frontend
Required env: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY (anon)

Important: This run is executed in a sandbox environment without live Supabase credentials. Therefore, interactive auth and storage operations cannot complete here. The results below combine:
- Code-level verification (routes, flows, UI behaviors)
- Built-in diagnostics from /troubleshoot
- Explicit instructions for a real environment run with expected pass/fail criteria

How to run locally (real environment):
1) cd react_frontend
2) npm install
3) Create .env with:
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_KEY=your_supabase_anon_key
   (optional) REACT_APP_SITE_URL=https://your-site (or http://localhost:3000)
   (optional) REACT_APP_MAX_UPLOAD_MB=50
4) npm start
5) Validate supabase per assets/supabase.md (bucket, RLS, auth URLs)

Smoke-Test Checklist

1) Sign up as a brand-new user
- Path: /login → switch to Sign Up
- Inputs: valid email, strong password (>=8, includes letter+number), confirm password
- Behavior (code-verified):
  - AuthPage uses supabase.auth.signUp({ email, password, options: { emailRedirectTo: getURL() } })
  - getURL() = REACT_APP_SITE_URL or window.location.origin, normalized with scheme and trailing slash
  - If session not returned (email confirmation required), shows: “Signup successful. Please check your email...”
  - If auto-confirm enabled, navigates to “/”
- Edge Cases:
  - Weak password: inline guidance and error messages
  - Duplicate email: “This email is already registered...”
  - Misconfigured redirect: “Redirect URL is not allowed...” with link to /troubleshoot
- Verification: In a real run, ensure Supabase Auth URL config allows your Site URL and /auth/callback.

Status in this run: Not executed (no live credentials). Code path verified OK.

2) Email verification (if required)
- Behavior:
  - Click email link → returns to /auth/callback
  - AuthCallback calls supabase.auth.getSessionFromUrl() and routes to “/” on success
  - On failure: navigates to /auth/error
- Verification:
  - Confirm that /auth/callback is allowed in Supabase > Auth > URL Configuration.

Status in this run: Not executed. Code path verified, clear error handling.

3) Login (as existing user)
- Path: /login (Login mode)
- Behavior:
  - supabase.auth.signInWithPassword
  - On success: explicit navigate to “/”
  - Errors mapped to friendly messages (invalid credentials, email not confirmed, rate limits, key issues)
- Verification: Provide correct credentials; on success, redirect to dashboard.

Status in this run: Not executed. Code path verified OK.

4) Upload a PDF
- From dashboard “Upload” button or FAB:
  - Opens UploadModal
  - Validates PDF by MIME/ext; size <= REACT_APP_MAX_UPLOAD_MB (default 50 MB)
  - Requires auth session (requireAuthSession and getCurrentUser)
  - Storage path: userId/yyyy/mm/<timestamp>_<sanitized>.pdf
  - supabase.storage.from('notes').upload(...)
  - public URL via storage.getPublicUrl(path)
  - Insert row into public.notes with title, description, author, category, file_path, file_size, public_url
  - Success: message and auto-close; AppRouter triggerRefresh updates Dashboard
- Errors: Friendly messages for auth missing, permission errors (401/403), bucket not found, network, conflict, RLS insert blocked
- Pre-requisites: public bucket “notes”; storage insert policy for authenticated users; notes table with RLS from assets/supabase.md

Status in this run: Not executed. Code path verified OK; strong error handling present.

5) Dashboard refresh and search/filter
- Dashboard lists notes ordered by created_at desc, limit 200
- Server-side filters:
  - category eq
  - q across title/description/author using or ilike
- Fallback to client-side filtering if server-side errors
- Navbar search and category sync to URL via useSearchParams
- Clicking Upload triggers modal; after upload, refreshKey increments and dashboard reloads

Status in this run: Static rendering verified; server interaction not executed due to no credentials.

6) Preview and Download
- NoteCard: Preview button routes to /preview/:id; Download opens public_url
- PreviewPage: loads note by id; validates public_url; fetch probe with no-cors; if unreachable shows clear guidance; iframe for preview when OK. “Open” and “Download” buttons disabled when missing/invalid URL.
- If bucket not public: Preview shows guidance and file_path.

Status in this run: Not executed. Code path verified with robust fallback guidance.

7) Logout and re-login
- Navbar Logout: supabase.auth.signOut(); navigate to /login
- Login again and reattempt upload or preview

Status in this run: Not executed. Code path verified OK.

Troubleshooter (/troubleshoot)
- Checks env presence and format, anon key validity via getSession, database select on public.notes (limited), auth redirect URL guidance, and storage bucket presence/public URL form.
- Provides actionable fixes for any failed checks.

Status in this run: Page loads; live checks will be meaningful only with env set.

Edge Cases and Observations
- Missing env vars: supabaseClient warns in console; Troubleshooter flags and instructs to fix.
- RLS issues: UploadModal maps RLS errors to helpful guidance.
- Private bucket: Upload succeeds, Preview warns about URL; instruct to make public or switch to signed URLs.
- Large files: clear error with by-how-much over limit.
- CORS on preview: iframe may fail on some hosts, “Open” will still navigate; consider viewer proxy if needed.
- Search UX: Clear search button visible when q not empty; category default “all”.

Actionable Items if Failures Occur
- If signup/login redirect fails: verify Auth URL config and REACT_APP_SITE_URL; confirm /auth/callback allowed.
- If upload 401/403: confirm auth session and storage policy for bucket_id='notes' (see assets/supabase.md).
- If preview fails: ensure bucket is public or switch to signed URLs; verify public_url stored.
- If DB insert blocked: verify notes schema, owner default to auth.uid(), and insert policy for authenticated users.

Real-Environment Pass Criteria
- User can sign up; verification path redirects to / via /auth/callback.
- Login redirects to dashboard “/”.
- Uploading a small PDF inserts a row; dashboard refresh shows new card at top.
- Preview shows PDF in iframe; “Open” and “Download” work.
- Logout → /login; re-login works; upload works again.
- /troubleshoot shows all OK or provides clear fixes.

Conclusion
- Implementation appears correct and robust with helpful diagnostics.
- A live run with valid Supabase configuration is expected to pass if assets/supabase.md is followed precisely.

Appendix: Key Files
- Auth: src/pages/AuthPage.jsx, src/pages/AuthCallback.jsx, src/pages/AuthError.jsx
- Storage/Upload: src/components/UploadModal.jsx
- Listing/Filters: src/pages/Dashboard.jsx, src/components/Navbar.jsx
- Preview/Download: src/pages/PreviewPage.jsx, src/components/NoteCard.jsx
- Supabase client: src/lib/supabaseClient.js
- Diagnostics: src/pages/Troubleshoot.jsx
