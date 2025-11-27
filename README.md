# nsreddit (dev)

nsreddit is a small, anonymous discussion forum MVP for the Network State community, built with Next.js and Supabase. It provides Hacker News–style threads and comments with simple voting and pseudonymous profiles.

## Features

- Anonymous-friendly auth (Solana wallet or email magic link)
- Text threads with optional external URL and image attachment
- Nested comments with basic navigation and soft delete
- Upvote / downvote on threads and comments
- Minimal profiles (display name + bio) and public profile pages

## Quick start

1. Install dependencies:

```bash
npm install
```
2. Configure environment variables in .env.local for:

- Supabase (URL and anon key)

- Cloudflare R2 (if you want image uploads)

3. Apply the database schema in supabase/schema.sql to your Supabase project.

4. Run the dev server:
```bash
npm run dev
# Then open http://localhost:3000 in your browser.
```