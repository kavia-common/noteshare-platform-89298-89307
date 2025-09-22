# NoteShare E2E Smoke Test Plan

This document describes the end-to-end smoke test flow for the React frontend integrated with Supabase:
- Sign up a new user
- Log in as the new user
- Upload a PDF document
- Validate appearance on Dashboard with preview and download
- Log out / log in again as an existing user
- Edge cases and resolutions

Prerequisites
- Ensure the React app is running. In this environment, the app auto-started and bound to an available port (e.g., 3002 if 3000 was used). In your own environment:
  - cd react_frontend
  - npm install
  - npm start
- Ensure react_frontend/.env contains:
  - REACT_APP_SUPABASE_URL
  - REACT_APP_SUPABASE_KEY (anon key)
  - Optional: REACT_APP_SITE_URL, REACT_APP_MAX_UPLOAD_MB
- Supabase set up:
  - Storage bucket "notes" (public)
  - Storage insert policy for authenticated users on bucket_id = 'notes'
  - public.notes table plus RLS policies as documented in assets/supabase.md
  - Authentication URL configuration includes your site URL and redirect patterns (e.g., http://localhost:3000/**) and callback /auth/callback

Test Data
- Prepare a small valid PDF file, e.g., sample.pdf (a few hundred KBs).

1) Sign Up (New User)
- Navigate to /login.
- Switch to Sign Up mode.
- Enter a valid email (e.g., test_user+<timestamp>@example.com) and a strong password (>=8 chr with letters and numbers). Confirm password.
- Submit. Expected outcomes:
  - If email confirmation is required by your Supabase project: Session may not be established. The UI should display a message: “Signup successful. Please check your email and click the verification link…”
  - If auto-confirmation is enabled: You should be redirected to / (dashboard).
- If a redirect error occurs, see /troubleshoot and ensure Authentication URLs in Supabase allow your site and /auth/callback.

2) Email Verification (if required)
- Open the email and click the verification link.
- After redirect to /auth/callback, the app should process the session and navigate to / (dashboard).

3) Login (Existing User)
- If not already signed in, go to /login and log in with the same credentials.
- Expected:
  - On success: redirect to / (dashboard).
  - On invalid credentials: user-friendly error.

4) Upload a PDF
- On the Dashboard, click “Upload” (Navbar or FAB button).
- Fill metadata:
  - Title: e.g., “Linear Algebra Notes”
  - Description: optional
  - Author: optional
  - Category: select “Mathematics” or others
  - File: select sample.pdf (must be PDF, under REACT_APP_MAX_UPLOAD_MB, default 50 MB)
- Submit.
- Expected:
  - If bucket “notes” exists and policy allows insert:
    - Upload success, row inserted into public.notes
    - Dashboard refreshes (auto refresh triggered) and shows the new card at top
  - If bucket not public: Upload succeeds, but the UI may show a warning: “Upload succeeded, but preview URL is not public…”

5) Validate on Dashboard
- Confirm your new note appears.
- Use search (query) and category filters in Navbar and ensure it filters as expected:
  - Searching by Title should narrow results.
  - Changing category should reflect appropriate results.

6) Preview and Download
- Click “Preview” on the new NoteCard.
- Expected:
  - If storage is public and public_url is valid: The iframe shows a preview of the PDF.
  - “Open” should open the public URL in a new tab; “Download” should download the file.
- If preview is unavailable:
  - The page explains bucket or URL issues and shows file_path for reference. Ensure the bucket is public or switch to signed URLs.

7) Logout and Login Again
- From Navbar -> Logout.
- Expected:
  - You are redirected to /login.
- Login once more with same credentials. Expect redirect to / and ability to upload/preview/download again.

Edge Cases and Resolutions

A) Signup redirect not returning to app (Auth callback issues)
- Symptoms: After clicking verification link or logging in, user ends on an error or not redirected correctly.
- Resolution:
  - Verify Supabase > Authentication > URL Configuration
    - Site URL matches your running app URL (e.g., http://localhost:3000 for local dev)
    - Redirect URLs include http://localhost:3000/** or your production URL /** (including /auth/callback)
  - If using REACT_APP_SITE_URL, ensure it matches the Site URL.
  - See /troubleshoot for diagnostics.

B) Login fails with “Invalid login credentials”
- Confirm email and password are correct.
- If the email is not confirmed and confirmation is required, check inbox for verification email.
- See /troubleshoot for anon key and URL validity.

C) Upload fails (401/403 or permission denied)
- Ensure you are signed in before uploading.
- Confirm storage policy:
  - create policy "allow uploads for authenticated"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'notes');
- Confirm bucket “notes” exists.

D) Preview/download unavailable
- If bucket is not public, getPublicUrl() will not produce a usable URL. Options:
  - Make the bucket public (recommended by default).
  - Or change app to use signed URLs (requires code changes and different RLS strategy).
- Ensure notes.public_url is stored during upload.
- Use /troubleshoot to validate a public URL can be formed.

E) Database errors (RLS)
- If insert blocked:
  - Ensure owner column defaults to auth.uid()
  - Apply “Allow insert for authenticated users” with check: auth.uid() = owner or owner is null
- If select blocked:
  - Apply “Allow select for all users”

F) Network/CORS issues on preview
- Some hosts may block cross-origin embedding.
- “Open” button should still navigate to the file in a new tab.
- If required, switch to a PDF viewer that proxies content from your own domain or use signed URLs with correct CORS.

G) Large file uploads
- If file > REACT_APP_MAX_UPLOAD_MB (default 50MB), the upload modal will show a size error.

Verification Checklist
- [ ] Can sign up a new user; email verification path works as configured
- [ ] Can log in as new or existing users and reach the dashboard
- [ ] Can upload a valid PDF and see it on the dashboard
- [ ] Preview page renders for public buckets (iframe)
- [ ] Download link works
- [ ] Logout and re-login works cleanly
- [ ] Navbar search & category filter operate correctly
- [ ] Troubleshooter at /troubleshoot reports OK or provides clear guidance

References
- assets/supabase.md for exact SQL and configuration
- src/pages/AuthPage.jsx for auth flows
- src/components/UploadModal.jsx for upload logic
- src/pages/Dashboard.jsx for listing and filters
- src/pages/PreviewPage.jsx for preview and download
- src/pages/Troubleshoot.jsx for in-app diagnostics
