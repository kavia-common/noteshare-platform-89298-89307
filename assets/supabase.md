# Supabase Integration

This frontend uses Supabase for Authentication and Storage.

Environment Variables (set in react_frontend/.env):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY

Client initialization: src/lib/supabaseClient.js

Storage:
- Bucket name: notes (public)
- Files: uploaded PDFs stored at root with a timestamped prefix
- Public URLs generated via `getPublicUrl`

Database (table: notes):
- Columns: id (uuid), title (text), description (text), author (text), category (text), file_path (text), file_size (bigint), public_url (text), created_at (timestamptz)
- RLS: enable; policies to allow read (public or auth) and insert for authenticated users

Auth:
- Email/password login and signup
- Signup uses `emailRedirectTo: window.location.origin`

UI Integration:
- Uploads occur from UploadModal
- Browsing and searching in Dashboard
- Preview via iframe in PreviewPage
