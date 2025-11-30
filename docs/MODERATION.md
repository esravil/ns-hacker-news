Moderation roadmap (things to add later)

Goals  
Make moderation:
- fast for mods  
- predictable for users  
- resistant to spam, brigades, and low-effort abuse  

Scope to grow into:
- content-level tools (threads, comments, media)  
- user-level tools (bans, warnings, reputation)  
- system-level tools (rate limits, automations, visibility rules)  

Future moderation features

1) Roles and permissions  
- Move beyond a single is_admin flag into more granular roles, for example:
  - owner / superadmin  
  - moderator (full content tools)  
  - helper / junior mod (limited tools)  
- Permission flags you can toggle per role:
  - can_remove_content  
  - can_lock_threads  
  - can_manage_invites  
  - can_ban_users  
  - can_view_modlog  
- UI to:
  - search for users  
  - promote / demote them to a role  
  - see what permissions each role currently has  

2) Reports and queues  
- “Report” button on each thread and comment with:
  - canned reasons (spam, harassment, illegal, doxxing, NSFW, off-topic, etc.)  
  - optional free-text explanation from the reporter  
- reports table:
  - reporter_id  
  - target_type (thread/comment)  
  - target_id  
  - reason  
  - extra_details  
  - status (open, in_review, resolved, dismissed)  
  - resolved_by, resolved_reason, resolved_at  
- /mod/reports UI:
  - list of open reports sorted by freshness / severity  
  - quick actions: remove, warn user, temp-ban, ignore  
  - filters: reason, status, target user, reporter  

3) Modlog and transparency  
- mod_actions table for every impactful action:
  - actor_user_id  
  - action_type (remove_thread, remove_comment, lock_thread, ban_user, etc.)  
  - target_type and target_id  
  - reason_code and optional free_text_note  
  - created_at  
- internal modlog UI:
  - filter by actor, target user, date range, action type  
  - search by thread id / comment id / user id  
- optional public “moderation transparency” page:
  - redacted modlog (no private notes, no sensitive links)  
  - high-level reasons only, like “Removed for harassment”  

4) Bans, mutes and user control  
- user_bans table:
  - user_id  
  - kind (shadowban, hard_ban, post_only_ban, comment_only_ban)  
  - reason_code  
  - note  
  - expires_at (optional)  
  - created_by, created_at  
- behaviors:
  - shadowban: content appears normal for banned user but invisible to others  
  - hard ban: cannot post, comment, or vote; read-only (or blocked entirely)  
  - timed bans: automatically expire without manual cleanup  
- user-level controls:
  - per-user block/mute:
    - hides content from that user in your own view  
    - doesn’t require global moderation decision  

5) Content states and labels  
- Distinguish clearly between:
  - deleted (by author)  
  - removed (by mod)  
  - system-hidden (spam / automated filters)  
- additional flags:
  - is_locked (no new comments) on threads  
  - is_distinguished (mod / official comment)  
  - needs_review (flagged by another system but not yet reviewed)  
- UI:
  - add badges like [locked], [official], [auto-hidden as spam], etc.  

6) Spam and abuse protection  
- rate limits:
  - max posts per hour per user  
  - max comments per minute per user  
  - stricter limits for new accounts (account age < X days)  
- IP or device-level heuristics (where feasible)  
- basic link / media safety:
  - block known bad domains  
  - extra friction (confirmation) for posting links by new users  
- simple text heuristics:
  - naive profanity / slur lists  
  - detection of repeated copy-paste spam across multiple threads  
- tooling for mods:
  - “nuke user” action:
    - bulk remove or shadow-hide all content from a specific user  
  - “nuke thread” variant:
    - remove thread and optionally all its comments  

7) Appeals and user feedback  
- appeals table:
  - user_id  
  - related_action_id (link to mod_actions)  
  - body (appeal text)  
  - status (open, granted, denied)  
  - handled_by, handled_at  
- UI:
  - simple form where user can contest a removal or ban  
  - mod view showing the original content, the mod action, and the appeal in one place  

8) Automation and workflows  
- auto-actions:
  - automatically hide content once it passes a certain report threshold  
  - automatically lock threads that become high-risk (too many reports in short time)  
- scheduled tasks (off-app worker or cron):
  - clean up expired bans  
  - summarize moderation activity (daily or weekly email / dashboard)  
- experiment with:
  - simple keyword-based scoring to pre-prioritize the moderation queue  
  - “needs second opinion” status for borderline cases where two mods must agree  

9) Analytics and quality-of-life  
- dashboards:
  - number of reports per day  
  - top reasons  
  - average time to handle a report  
  - how many removals per mod  
- quality-of-life for mods:
  - keyboard shortcuts in the moderation UI  
  - in-place moderation on thread pages (hover tools on comments for mods)  
  - showing context (parent/child comments) directly in moderation views  

10) Policy scaffolding  
- simple, visible rules pages:
  - “What content is not allowed”  
  - “What moderators might do in each case”  
- short, consistent explanation strings attached to every mod action:
  - visible to the affected user  
  - optionally visible to everyone when they see “[removed]”  

These features can be layered in gradually. Start with a reports table + modlog, then add bans, then automation and analytics once the community grows.
