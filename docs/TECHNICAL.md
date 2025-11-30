Technical overview of this project

High-level architecture  
- Frontend framework: Next.js App Router with React and TypeScript  
- Rendering model:
  - Mix of server components for data fetching
  - Client components for interactive pieces (auth, voting, commenting, moderation UI)  
- Styling:
  - Tailwind CSS imported through globals.css
  - Custom font variables via Geist and Geist Mono  
- State and context:
  - AuthProvider (Supabase Auth)
  - SolanaProvider via @wallet-ui/react
  - ToastProvider for global toasts  

Backend and server behavior  
- The “server” for most logic is Next.js:
  - App Router pages under src/app  
  - Server components are async functions that query Supabase  
- Next.js API routes (edge between app and Supabase RPCs):
  - src/app/api/delete-account/route.ts  
  - src/app/api/upload/route.ts  
  - src/app/api/admin/threads/remove/route.ts  
  - src/app/api/admin/comments/remove/route.ts  
- These routes:
  - Accept a Supabase access token via Authorization header
  - Verify the session and sometimes admin status
  - Call Supabase RPCs or REST endpoints to perform protected operations  

Database and Supabase  
- Database: PostgreSQL via Supabase  
- Main tables (based on current usage):
  - threads
    - id, title, body, created_at
    - author_id (FK to profiles.id)
    - url, url_domain
    - media_url, media_mime_type
    - is_deleted (soft delete flag)  
  - comments
    - id, thread_id (FK to threads.id)
    - body, created_at
    - author_id (FK to profiles.id)
    - parent_id (for nesting)
    - is_deleted (soft delete flag)  
  - votes
    - user_id
    - target_type ("thread" or "comment")
    - target_id
    - value (-1, 0, 1)  
  - profiles
    - id (same as auth user id)
    - display_name
    - bio
    - created_at
    - is_admin (moderator flag)  
- Row-level security:
  - Supabase Auth user is used in RLS policies
  - RPCs enforce:
    - users can only soft-delete their own content
    - admins can run elevated moderation functions  

Supabase client setup  
- src/lib/supabaseClient.ts:
  - createSupabaseClient reads:
    - NEXT_PUBLIC_SUPABASE_URL
    - NEXT_PUBLIC_SUPABASE_ANON_KEY  
  - Returns a SupabaseClient bound to the project URL and anon key  
- Usage:
  - On the server (in server components) for read-heavy queries  
  - On the client (inside providers and interactive components) for:
    - auth (sign-in, sign-out, sessions)
    - posting threads/comments
    - voting
    - mod tools (where the client supplies the access token to API routes)  

Auth and invite system  
- Authentication flows:
  - Email magic links:
    - EmailMagicLinkForm calls supabase.auth.signInWithOtp  
    - emailRedirectTo points to /auth with optional ?invite= token  
  - Solana wallet sign-in:
    - Web3SignInPanel integrates @wallet-ui/react and Phantom
    - supabase.auth.signInWithWeb3 handles the wallet-based login  
- Invite gate:
  - invite token is read from URL (?invite=...) using inviteToken helpers
  - token is saved to localStorage so it persists across redirects  
  - AuthProvider, after login:
    - calls Supabase RPC enforce_invite_for_user(p_invite_token)
    - if it fails, user is signed out and token is cleared  
- Profile synchronization:
  - AuthProvider ensures a row exists in profiles for each user (upsert by id)  
  - It also reads profiles.is_admin to set isAdmin in context  

Thread and comment lifecycle  
- Home page (/):
  - Server component:
    - uses Supabase to load threads with joined profiles (author display_name)
    - loads votes for those thread ids and aggregates a score per thread  
  - Data is passed to ThreadsClient for interactive features (e.g., live voting)  
- Thread page (/thread/[id]):
  - Server component:
    - parses thread id from route params
    - fetches the thread row + author display name
    - fetches all comments for that thread + author display names
    - loads votes for the thread and for all its comments
    - calculates:
      - initialThreadScore
      - initialCommentScores mapping id -> score  
  - Passes everything into ThreadClient (client component)  

ThreadClient (client behavior)  
- Holds local state for:
  - comments (flat list)
  - threadScore and commentScores
  - votes per (type, id) pair
  - reply/compose state
  - deleted/removed comment display  
- Comment tree:
  - commentTree.ts converts the flat array into a nested tree
  - MAX_NESTING_DEPTH caps visual indentation
  - Comments are sorted to show freshest top-level comments first  
- Comment operations:
  - Add top-level comment or reply:
    - uses supabase.from("comments").insert(...)
    - updates comments array in state
    - initializes score for new comment as 0  
  - Delete own comment:
    - calls Supabase RPC soft_delete_comment(p_comment_id)
    - then marks comment as deleted locally and shows “[deleted]”  
- Voting:
  - Votes are loaded per user via Supabase queries to votes table
  - applyVote decides:
    - insert/update vote row via upsert
    - or delete vote row for unvote  
  - Local scores are updated optimistically based on delta (old -> new value)  

Moderation system (current)  
- isAdmin flag:
  - Coming from profiles.is_admin, read in AuthProvider  
- SiteHeader:
  - Shows /mod link only for authenticated admins  
- /mod page:
  - Uses useAuth to get supabase client and isAdmin  
  - Loads:
    - latest threads (id, title, body, created_at, is_deleted)
    - latest comments (id, thread_id, body, created_at, is_deleted)  
  - Actions:
    - Remove thread:
      - calls getAccessToken (supabase.auth.getSession)
      - POST /api/admin/threads/remove with Authorization: Bearer token
      - server route:
        - validates JWT
        - ensures user is admin (via enforce_admin_for_user RPC or equivalent)
        - calls admin_soft_delete_thread(p_thread_id, p_reason, p_note?)
      - front-end marks thread.is_deleted = true and shows “[removed]” in UI  
    - Remove comment:
      - same pattern, but /api/admin/comments/remove -> admin_soft_delete_comment  
  - Conceptual difference:
    - deleted = author-initiated soft delete (shown as “[deleted]”)
    - removed = moderator action (shown as “[removed]”)  

Account deletion flow  
- In /profile:
  - “Delete account” button in the danger zone section  
  - On click:
    - shows a custom confirmation popup (not a native alert/confirm)
    - if confirmed:
      - fetches access token (supabase.auth.getSession)
      - POST /api/delete-account with Authorization header  
- The delete-account route:
  - Identifies the user from the access token
  - Performs:
    - anonymization of threads and comments for that user
    - deletion/cleanup of profile and user-specific data (per schema.sql)
  - On success:
    - front-end calls signOut() and redirects to /  

Storage and media handling  
- Threads support optional media:
  - media_url, media_mime_type fields on threads table  
- Display:
  - If media_mime_type is image-like (or missing, defaulting to image):
    - Thread page renders an <img> with a bounded max height and border  
- Uploads:
  - /api/upload route accepts file uploads
  - Likely writes to Cloudflare R2 or similar object storage
  - Returns a URL that gets saved into threads.media_url  

Layout and shared components  
- RootLayout:
  - Global fonts and globals.css
  - Wraps children with:
    - AuthProvider
    - SolanaProvider
    - ToastProvider
    - AppShell  
- AppShell:
  - Renders SiteHeader
  - Provides main content container with max width and padding  
- SiteHeader:
  - Shows:
    - site name and environment label
    - navigation links:
      - /new, /profile (for authed users), /mod (for admins)
    - sign in/sign out button with a small status indicator  
- ToastProvider:
  - Simple global toast stack (currently one message at a time)
  - Positioned at top-center of the viewport
  - Used for feedback like “Thread deleted successfully”  

Runtime and caching behavior  
- Certain pages export:
  - dynamic = "force-dynamic"
  - This tells Next.js to:
    - always render fresh server output
    - not rely on long-lived static HTML
  - Ensures:
    - new threads/comments appear without needing a redeploy
    - mod actions propagate to readers quickly  

Overall mental model  
- Next.js (App Router) = web server and UI shell  
- Supabase = auth + Postgres + RLS + RPCs  
- Client components = interactive layer (auth flows, voting, commenting, moderation)  
- API routes = bridge for sensitive operations that require:
  - JWT verification
  - admin checks
  - orchestrated changes across multiple tables  

This setup gives you a clear separation:
- server components: read-oriented, SEO-friendly pages
- client components: interactive behavior and auth-aware actions
- Supabase: single source of truth for data, permissions, and auth.  
