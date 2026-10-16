# HighFive ↔ ChatGPT JIA MCP

## Scope and status

Implementation branch: `codex/highfive-jia-mcp`, based on `dev` at `0a291f6`.
The original read-only request was explicitly expanded by the user to comments/replies/mentions and task creation. No task update, deletion or status transition tool is exposed. No deployment or production key issuance is performed by this change.

Existing HighFive service-key authentication, project scopes, task identifiers, custom status resolution, task creation service and service-comment/notification behavior are reused. The service comment handler is extracted into `src/lib/service-comments.ts` without exposing a second comment REST API. The MCP read module deliberately uses narrow selects with assignment/registration predicates at query time; existing broad REST task responses are not blindly forwarded. Existing REST task creation remains session-only.

## Identity and visibility

- An OAuth operator with the exact configured immutable `sub` can act as one fixed, active HighFive JIA user. This is an explicit single-operator integration, not a multi-user impersonation mechanism.
- The server resolves the configured user ID against the service key's organization and checks that organization/user are active. Only internal ADMIN/LEADER/WORKER identities are supported.
- Every request verifies the service key hash, expiry, revocation, READ permission and approved project list. Organization-wide keys and empty project grants are rejected.
- Task reads/comments require the same organization, an approved project, and `(workerId = JIA OR registrantId = JIA)`. Including JIA-created tasks supports follow-up after JIA creates a task for another worker. Unrelated private tasks stay inaccessible. Granting a project does not grant all of its tasks.
- The caller cannot supply a user, organization, registrant, arbitrary server URL or raw API token.
- Mention recipients must be active in the same organization and able to read the task under existing session rules: ADMIN, project-member LEADER, or the assigned WORKER. PARTNER/external users are excluded. Resolve duplicate names interactively; never choose a name match silently.
- New-task assignees must be active internal members of the selected allowed project. The registrant is always JIA. No implicit addition of project members is performed.

## Tools

| Tool | Inputs | Behavior |
|---|---|---|
| `list_my_tasks` | `page=1`, `limit=20` (max 50), optional `status` | JIA assigned/created tasks; safe person/project fields, dates, custom status label/isDone/isProgress |
| `get_task` | `taskId` positive integer | Scoped detail; text notes capped at 1,000 characters by existing JIA converter |
| `list_comments` | `taskId`, page/limit | Chronological flat comment/reply records, `parentId` preserves threading; content capped at 1,000 characters |
| `list_mention_targets` | `taskId` | Eligible ID/name candidates, max 100, `truncated` flag |
| `list_task_targets` | optional `projectId` | Allowed projects and active internal project members; max 100 projects and 100 members per project |
| `add_comment` | `taskId`, `content` (1–8,000), `mentionUserIds=[]` (max 20), optional `parentId`, `requestId` | Writes after confirmation; existing service comment path, JIA author label and notifications |
| `create_task` | `projectId`, `workerId`, `title` (1–200), optional `notes` (max 20,000), optional ISO `targetDate`, `requestId` | Creates task with JIA as registrant, initial project state, history and in-app assignment notification |

Task dates are ISO timestamps with timezone; convert user-local dates deliberately before confirming. Request IDs are 8–80 ASCII alphanumeric/underscore/hyphen characters, unique per approved operation. Retry with exactly the same ID and arguments; different content under an old ID is rejected with conflict. All schemas reject unknown properties.

Read tools declare `readOnlyHint=true`; writes declare `readOnlyHint=false`, `destructiveHint=false`, `idempotentHint=true`. Writes are hidden when their server feature flag is disabled. They require all three independent grants:

| Capability | Server flag | OAuth scope | HighFive service key |
|---|---|---|---|
| Read | `HIGHFIVE_MCP_ENABLED=true` | `highfive:read` | `READ` + explicit projects |
| Comment/reply/mention | `HIGHFIVE_MCP_COMMENTS_ENABLED=true` | `highfive:comment` + read | `COMMENT_CREATE` + read |
| Create task | `HIGHFIVE_MCP_TASKS_ENABLED=true` | `highfive:task:create` + read | `MCP_TASK_CREATE` + read |

An ADMIN must explicitly select the new MCP-only task-create permission when issuing a key. Existing keys are not upgraded automatically. The permission does not enable POST/PATCH/DELETE on legacy task REST endpoints.

### Approval boundary

The OAuth grant and service permissions authorize the capability; they are not cryptographic proof of approval for each specific comment/task. Tool instructions require the assistant to show project/task, recipient, exact content and date and obtain explicit user confirmation before every write. Configure the ChatGPT connection to require write-tool confirmations; do not enable automatic approval. Test this host behavior before enabling either write flag. No untrusted task/comment can grant approval. This version does not implement a separate server-side per-operation human approval inbox. If host-level confirmation cannot be enforced in the target environment, leave write flags disabled and add a separate server-side approval flow before rollout.

## Authentication / ChatGPT setup (separate from server implementation)

1. Use an established OAuth 2.1 authorization provider. Existing NextAuth credentials sessions and HighFive API keys are not OAuth authorization servers. This PR implements the MCP resource server, not a homemade authorization provider.
2. Configure authorization code + PKCE S256, issuer metadata, supported client registration/predefined client, audience/resource binding, the three least-privilege scopes and user consent. Restrict access to the intended operator.
3. Copy the exact redirect URI/client metadata shown by the actual ChatGPT connection UI into the provider allowlist; do not assume a static callback URI. Configure refresh-token behavior if ongoing access is required.
4. Inject the environment variables in `.env.example`; set resource to the exact externally reachable HTTPS `/api/mcp` URL. Preserve issuer spelling/trailing slash exactly. JWKS must be a fixed trusted HTTPS URL. Bind `HIGHFIVE_MCP_OAUTH_SUBJECT` to the approved operator and `HIGHFIVE_MCP_USER_ID` to the actual JIA account. Never store secret values in Git/docs/chat.
5. Initially leave both write flags false. The dedicated service key must have READ and specific projects, `allowOrgWide=false`.
6. The server publishes `GET /.well-known/oauth-protected-resource`; unauthenticated POST requests advertise it via `WWW-Authenticate`. OAuth access tokens must be RS256/ES256 signed with expected issuer, exact audience, subject, expiry and read scope. The OAuth token is never used as the HighFive service key.
7. After deployment approval and resource/provider verification, create a private custom MCP connection using the actual account's supported ChatGPT interface, URL `/api/mcp`, OAuth authentication. Account/workspace availability is not established by this PR; do not claim the plugin is installed or supported until the actual connection succeeds. If unavailable, report the limitation and keep the server inactive; an OAuth-capable MCP Inspector/client can validate the server independently.
8. Scan tools and test reads first. Then, after confirming host write prompts, explicitly grant scopes/key permissions and enable comment/task flags for controlled write tests.

Official references checked during development:
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/mcp-server

## Deployment configuration — requires separate approval

The MCP route runs inside the existing Next.js app image and existing Compose app service. No new public port, DB, Redis, Caddy listener or service is required. Existing `env_file: .env` supplies configuration; do not bake secrets into the Docker image.

Through the existing Cloudflare Tunnel → Nginx Proxy Manager → HighFive app path, route `/api/mcp` and `/.well-known/oauth-protected-resource` to the same app. Use TLS; disable proxy caching for these paths and do not log Authorization headers or request/response bodies. Set proxy body limit to 64 KiB, reasonable authentication/rate limits and request timeouts. The app also enforces a 64 KiB JSON body limit, rejects batch calls and cross-origin browser requests, and returns `Cache-Control: no-store`.

Transport is stateless Streamable HTTP with JSON responses. POST supports initialization, notifications, tools/list and tools/call. GET/DELETE return 405; there is no persistent SSE session or resumable session state. Process-local OAuth JWKS caching does not cache HighFive service grants or user activation state.

Rollback: disable `HIGHFIVE_MCP_ENABLED` and restart the app, revoke the dedicated service key and OAuth grant as needed. Revoke only this integration's key; preserve existing JIA integration keys. No database schema migration is introduced.

## Audit / idempotency / notifications

- MCP request/tool attempts and success/failure codes use existing AuditLog. Secrets, arbitrary input, task titles and comments are excluded from MCP audit payloads. Existing business history still records task activity.
- Audit failure before execution blocks the operation. An audit failure after a write may return an error even though the write committed; retry only with the original request ID.
- Task creation uses a serializable transaction for task, request log, history, in-app notification and success audit, with bounded conflict retries. Duplicate request IDs do not create extra tasks or notifications. A later manual edit can make an old retry conflict; inspect rather than generate a new ID blindly.
- Comments reuse existing service-comment idempotency and notification dispatch. Same request ID for a different task/content/parent is rejected; `source=JIA` and service label identify the writer. The shared handler rechecks current task/project/mention access.
- Existing comment notifications are best-effort asynchronous; duplicate comment retries do not resend notifications. A committed comment does not prove a mention push reached a device. For task creation, the in-app notification is committed atomically unless the recipient muted the project; external push/calendar sync is not added.

## Validation / acceptance

Automated tests cover real signed JWT claim checks, inactive/denied principals, read-only grants, scoped Prisma predicates, custom states, mention recipients, write permission gates, idempotency, protocol schemas/annotations, actual stateless HTTP initialization/discovery/invocation, invalid inputs, body limits, origin checks and audit fail-closed behavior. Existing repository tests also run. Database-dependent write tests use mocked Prisma; they do not establish real PostgreSQL rollback/concurrency behavior.

Before production acceptance, use an isolated staging DB and provider:
1. Seed two organizations, approved/unapproved projects, active/inactive JIA/users, own/created/unrelated tasks and threaded comments.
2. With an authorized OAuth token, read JIA's assigned and created tasks; verify actual custom status flags, dates, author/timestamps and reply pagination.
3. Access another user's task, another organization and an unapproved project by guessed ID: no data, same not-found outcome. Reassign JIA's task away and verify fresh requests lose access unless JIA is its registrant.
4. Test bad signature/issuer/audience/subject/expiry/scope, revoked/expired service key, inactive organization/JIA and empty/org-wide project grants.
5. Confirm write prompts. Post one confirmed comment, reply and mention; inspect JIA author label, stored record, recipient permissions and actual in-app/device notifications separately. Reject unauthorized/inactive/ambiguous recipients and foreign parent comment.
6. Create one confirmed task for an eligible project member. Verify JIA registrant, target date, custom initial state, history, assignment notification and visibility in JIA reads.
7. Replay each request ID, including concurrent retries. Verify exactly one business record and no duplicated notifications. Reuse an ID with changed payload: conflict. Test transaction rollback on log/notification failure.
8. Verify no status/delete/update tools exist, and existing UI/session workflows and legacy API authorization still work.
9. Check actual ChatGPT account connection, tool visibility, OAuth consent/refresh and write confirmations. Record URL, version/commit and observed outcomes without copying credentials.

Until these staging/ChatGPT checks are completed, report implementation/test results separately from deployment, connection and device verification.

### Recorded development checks (2026-10-16)

- `npm test -- --reporter=dot`: 26 test files / 165 tests passed (includes existing regression suite).
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with warnings in existing application pages/components; no lint errors.
- `npm run build`: production build passed; existing image/hook warnings and a bcryptjs optional crypto resolution warning were emitted.
- `git diff --check`: passed.
- Not performed: real PostgreSQL HTTP/transaction/concurrency integration, external OAuth provider registration, actual ChatGPT install/consent/refresh, production deployment, device push verification.
