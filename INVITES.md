# nsreddit – Invite-only signup, QR batches, and legacy one-time links

This app is **invite-only**. Users can only create an account if they first come in via a valid signup token. After that, they can sign in / sign out normally with email magic link or wallet.

## Data model recap

Tables (see `supabase/schema.sql`):

- `public.signup_tokens`
  - `token` – the opaque invite string (what you put in URLs / QR codes).
  - `kind` – `'qr_batch'` (multi-use within a batch) or `'legacy_single'` (one-time).
  - `expires_at` – optional expiry; if set and in the past, the token is invalid.
  - `used_at` – when the token was consumed.
  - `used_by` – the `auth.users.id` that consumed the token (FK).

- `public.signup_token_uses`
  - Currently just records additional usage metadata if you want it in the future.

Helpers:

- `public.consume_signup_token(p_token text, p_user_id uuid)` – low-level helper that:
  - Validates the token (exists, not expired, single-use rules for `legacy_single`).
  - Sets `used_at` + `used_by`.
- `public.enforce_invite_for_user(p_invite_token text)` – higher-level gate used by the app:
  - If the current user already has any token with `used_by = auth.uid()`, it returns.
  - Otherwise, it **requires** `p_invite_token` and calls `consume_signup_token`.
  - Raises an exception if no valid token is available.

The React app calls `enforce_invite_for_user()` automatically right after any sign-in.

---

## How QR-gated signup works (on-site attendees vs previous cohorts)

*Look at INVITE_TOKENS.md to understand how to make tokens*

2. Take the token stirng from the result (e.g. abcd123...) and embed it in the QR URL:
example-domain.com/auth?invite={string}

3. When someone scans the QR and visits that URL:
- The /auth page captures the ?invite= value and stores it in localStorage.
- After they complete email or wallet sign-in, AuthProvider calls:

```javascript
supabase.rpc("enforce_invite_for_user", {
  p_invite_token: inviteTokenFromStorage,
});
```

- enforce_invite_for_user then:
    - if this is their first sign-in:
        - validates the token and marks it as used (used_at, used_by)
    - If they already consumed a token earlier:
        - returns immediately and does nothing

4. If enforcement fails (no token, expired token, already-used legacy token, etc.):
- The app signs the user back out.

- The UI shows a simple “sign-in is invite-only” message.

- That user cannot access the site until they come in through a valid invite.

## Legacy one-time invite links
For people who used to attend in person but are not physically present:

1. Create a single-use token:
```sql
insert into public.signup_tokens (token, kind, email, metadata)
values (
  encode(gen_random_bytes(16), 'hex'),
  'legacy_single',
  'someone@example.com',
  jsonb_build_object(
    'note', 'Legacy one-time invite for long-time member'
  )
)
returning *;
```

2. Build invite url:
example-domain.com/auth?invite={token}
- Flow is identical to QR:
    - ?invite= is stored
    - after sign-in, enforce_invite_for_user runs and calls consume_signup_token
- because kind = 'legacy_single', consume_signup_token will refuse to reuse this token:
    - the second user (or second attempt) will get an error and be signed out

3. To check usage from db:
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

- when user successfully signs in for the first time with this invite:
    - used_at becomes non-null
    - used_by is set to their auth.users.id

