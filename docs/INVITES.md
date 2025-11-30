# nsreddit – invite-only signup, QR batches, and legacy one-time links

## This app is invite-only. Users can only create an account if they first come in via a valid signup token. After that, they can sign in and sign out normally with email magic link or wallet, but the initial admission is controlled by the database.

### Data model recap

1. The core table is public.signup_tokens. Each row represents an invite token. The token column is the opaque invite string that you put into URLs or QR codes. The kind column is either qr_batch for multi-use tokens that many people can use, or legacy_single for one-time invite links. The expires_at column is an optional expiry; if it is set and in the past, the token is treated as invalid. The used_at column records when the token was first consumed, and used_by stores the auth.users.id that consumed it.

2. There is also a public.signup_token_uses table. It records each successful first-time use of a token, so later you can see which cohort a member came from or attach extra metadata if you want.

3. There are two helper functions in the database. 

  - public.consume_signup_token(p_token text, p_user_id uuid) is a low-level helper that validates the token, applies expiry rules, and enforces single-use behavior for legacy_single tokens. It then sets used_at and used_by on the token row and returns the updated token. 
  - public.enforce_invite_for_user(p_invite_token text) is the higher-level gate used by the app. It first checks if the current user (auth.uid) already has any token with used_by = auth.uid. If so, the function returns immediately and the user is treated as already admitted. If not, the function requires p_invite_token, trims it, calls consume_signup_token, and then inserts a row into signup_token_uses so you can track that this user came in via that token. If anything fails (no token, invalid token, expired token, or a reused legacy_single token), the function raises an exception and the app should sign the user back out.

4. The React app calls enforce_invite_for_user automatically after any successful sign-in. The idea is that the frontend remains dumb and simply passes along whatever invite token it has stored; the database is the source of truth for who is allowed to stay signed in.

### How QR-gated signup works

1. For on-site events, you typically use qr_batch tokens so that a single token can admit many people. See invite_tokens.md in the repo root for concrete SQL examples of how to create these tokens in Supabase.

  - At a high level, you first create a qr_batch token and then embed the raw token string into a URL such as https://example-domain.com/auth?invite={token}. You put this URL behind a QR code at the venue. When someone scans the QR and lands on /auth, the page reads the invite parameter from the URL and stores it using the invite token helpers in src/lib/inviteToken.ts, usually in localStorage. This keeps the token available across the email magic-link redirect.

  - After the user completes email or wallet sign-in and Supabase returns a session, the auth layer in the frontend calls enforce_invite_for_user with the stored token. If it is the user’s first ever sign-in, the function will validate the token, mark it as used, insert a row into signup_token_uses, and return. If they already consumed any invite token previously, the function simply returns and does nothing; they are already admitted. If the token is missing, invalid, expired, or is a legacy_single token that has already been used, the function raises an exception. The app should catch that failure, sign the user back out, and show a simple "sign-in is invite-only" style message.

  - Because qr_batch tokens do not enforce single-use semantics, one token can be reused by an entire cohort, but each admitted user is still tied to the specific token they came in with through signup_token_uses.

2. Legacy one-time invite links

  - For people who are not physically present at the venue or for true one-off invites, you use legacy_single tokens. These are single-use. See invite_tokens.md under "Legacy Single tokens (Single use)" for the exact SQL you can paste into the Supabase SQL editor.

  - The flow is the same as with QR tokens: you generate a token with kind = legacy_single, embed it into an auth URL such as https://example-domain.com/auth?invite={token}, and send that link directly to the person. The /auth page captures the invite parameter and stores it. After the user signs in, enforce_invite_for_user runs and calls consume_signup_token. On the first successful use, consume_signup_token marks used_at and used_by and returns the token, and enforce_invite_for_user records a row in signup_token_uses. Any subsequent attempt to use the same legacy_single token will cause consume_signup_token to raise an error because used_at is already set. The frontend then signs that second user out and refuses access.

### Checking invite usage

*You can inspect invite usage directly in SQL. For example, to see recent tokens and whether they have been used, you can run:*

```sql
select
  token,
  kind,
  email,
  used_at,
  used_by
from public.signup_tokens
order by created_at desc;
```

**When a user successfully signs in for the first time with any invite, used_at becomes non-null and used_by is set to their auth.users.id. The signup_token_uses table will also have a row linking that user to the specific token that admitted them.**

### Overall design

The key idea is that the database decides who is allowed to be a member. The frontend only reads the invite token from the URL, stores it across redirects, and calls enforce_invite_for_user after sign-in. If the function succeeds, the user stays signed in; if it fails, the user is signed out and sees that access is invite-only. qr_batch tokens give you a convenient multi-use mechanism for events and cohorts, while legacy_single tokens give you strict single-use links for people you want to invite individually.
