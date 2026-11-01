# Security & Privacy Requirements

## Launch principle
Security is a release-blocking workstream.

## 1. Auth
- phone OTP with rate limiting
- device session controls
- biometric app lock option
- suspicious-login protections

## 2. Authorization
- every group, session, room, message, and media object must have scope-aware access rules
- RLS or equivalent authorization enforcement mandatory

## 3. Encryption
- TLS in transit
- encryption at rest
- private media through signed access
- do not claim E2EE unless fully implemented and audited

## 4. Secrets
- secure env handling
- no secrets in repo
- rotating tokens where possible

## 5. Media security
- upload validation
- virus/malware scanning where practical
- size limits
- content-type validation
- short-lived URL access for private media
- Cloudflare R2/CDN/WAF is optional later for media scale — **not** a launch security dependency (current stack: Supabase Auth + RLS + Edge signatures + signed URLs)

## 6. Abuse / moderation
- user blocking
- reporting
- admin moderation tools
- ban/removal flows

## 7. Privacy
- hidden phone numbers by default
- discoverability controls
- media consent for recap/Wrapped
- account deletion
- export request support

## 8. Auditability
- logs for payment verification, role changes, score adjudication, sanctions, recap publishing

## 9. Compliance direction
- GDPR-aware flows
- privacy policy and ToS required before launch
- retention schedule required

## 10. Testing
- auth and permissions test suite
- penetration test before launch
- dependency scanning
- code scanning

