# Security Specification: Account Creation & Authentication

## 1. Data Invariants
1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created or updated if `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Immutable Identity**: The `uid` in document data cannot be altered after creation and must match `request.auth.uid`.
3. **Immutable Origin**: `createdAt` cannot be modified during updates and must be set to server timestamp `request.time` on creation.
4. **Temporal Integrity**: `lastLoginAt` must be set to `request.time` on creation and on update.
5. **PII Strict Isolation**: Profile records are private; unauthenticated users or other users cannot read or list another user's document (`/users/{userId}`).
6. **No Self-Assigned Privileges / Shadow Fields**: Key count is strictly bounded, no unknown or malicious fields allowed.
7. **Document ID Sanitization**: Document ID must satisfy `isValidId(userId)` (size <= 128, alphanumeric and hyphens/underscores).

## 2. The "Dirty Dozen" Payloads
The following 12 malicious payloads attempt to break Identity, Integrity, and State:

1. **Unauthenticated Write**: Creating user document without active auth.
2. **Identity Spoofing**: User A attempting to create `/users/{userB}` with `request.auth.uid = userA`.
3. **Unverified Email**: Attempting to create document when `email_verified == false`.
4. **UID Field Hijacking**: Attempting to set `uid = "someoneElse"` inside the payload.
5. **Path ID Poisoning**: Document ID with 200 junk characters exceeding 128 length limit.
6. **Shadow Field Injection**: Injecting an unapproved field `{ isAdmin: true }` in user data.
7. **Tampering with createdAt on Update**: Trying to mutate `createdAt` to a backdated timestamp.
8. **Client Timestamp Forgery**: Supplying a client-generated timestamp instead of `request.time`.
9. **Oversized String Bomb (Denial of Wallet)**: Providing a 50KB string in `displayName`.
10. **Cross-User Snooping (Get)**: User A attempting `get` on `/users/{userB}`.
11. **List Scraping**: Any user attempting `list` query across `/users` collection.
12. **Malicious Deletion**: Any user attempting `delete` on user document.

## 3. Test Runner Concept (firestore.rules.test.ts)
All 12 payloads must be rejected by Firestore Security Rules with `PERMISSION_DENIED`.
