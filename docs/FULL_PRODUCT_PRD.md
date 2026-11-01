# Padel Nerdz — Full Product Requirements Document

## 1. Product overview
Padel Nerdz is a native mobile social platform for padel communities.
It combines:
- messaging
- groups
- event and mix-in organisation
- match formats and scoring
- discovery of local groups
- organiser tooling
- payments
- media and recap content

The product aims to replace generic chat groups for padel communities with a purpose-built social and operational platform.

---

## 2. Vision
Create the best place to organize, chat about, and play padel.

### Core promise
"Your padel community. All in one place."

---

## 3. Target users
### Primary
- friend groups organising regular mix-ins
- community organisers
- private competitive padel circles

### Secondary
- clubs
- coaches
- leagues / organizers
- regional padel communities

---

## 4. Goals
1. Remove noise from generic chat platforms.
2. Make organising mix-ins dramatically easier.
3. Give selected players session-specific coordination without spamming non-participants.
4. Support formats like Kings & Queens, Americano, and Mexicano.
5. Create a monetizable platform through booking fees and organiser tools.
6. Build a secure social product that can scale.

---

## 5. Non-goals
- voice calling
- video calling
- generic non-padel social networking
- broad e-commerce
- desktop-first experience

---

## 6. Core product model
### Entities
- User
- Group
- Group membership
- Session / Mix-in
- Session registration
- Session selection
- Session room
- Match / Round
- Score submission
- Payment record
- Media asset
- Recap / Wrapped asset
- Reliability / attendance record
- Achievement / ranking record

---

## 7. App information architecture
### Main tabs
1. Chats
2. Play
3. Discover
4. Profile

### 7.1 Chats
- group chat list
- 1:1 messages
- session rooms
- media, voice notes, reactions, pinned posts, search

### 7.2 Play
- upcoming sessions
- registration status
- live match assignments
- scores and standings
- payment status

### 7.3 Discover
- nearby public groups
- open sessions
- recommended communities
- filters by level, distance, format, schedule

### 7.4 Profile
- player level
- bio and profile media
- reliability
- performance stats
- rankings
- settings and privacy

---

## 8. Authentication & identity
### Requirements
- sign up with phone number OTP
- no password required initially
- optional Face ID / Touch ID / Android biometric app lock
- optional profile photo
- display name required
- phone number used for identity but not publicly shown by default

### Acceptance criteria
- user can sign in with phone OTP
- user can re-enter with same number and recover account session
- app lock can be enabled and disabled

---

## 9. Groups
### Types
- public
- join-request / approval-based
- private / invite-only

### Group features
- cover image
- name
- description
- location / area
- member list
- roles: owner, admin, organiser, member
- pinned posts
- invite by contacts or link
- mute and notification settings

### Acceptance criteria
- user can create a group
- owner can promote organisers/admins
- private groups are not discoverable
- public groups can be discovered if enabled

---

## 10. Group chat
### Features
- text
- images
- short video clips
- GIFs / emoji / reactions
- voice notes
- replies
- forwards
- edit/delete own messages
- read receipts
- typing indicators
- pinned messages
- search
- media gallery

### Messaging rule
The main group is a persistent social space for all members.

---

## 11. Mix-ins / sessions
### Session creation settings
- title
- date/time
- venue/location
- description
- format
- number of courts
- max players
- reserve/waitlist rules
- level restrictions
- registration window
- price
- payment method
- organiser notes
- privacy and recap-sharing options

### Registration flow
- session is posted in the main group as a structured event card
- players register interest
- organiser can manually select players or use allocation rules
- waiting list supported
- selected players get moved into a private session room

### Acceptance criteria
- organiser can create a session from a group
- members can register
- selected players are separated into a session room
- non-selected members do not receive session-room communications

---

## 12. Session room
This is the most important structural feature.

### Purpose
A temporary, private space for the players selected for one mix-in.

### Participants
- selected players
- session organisers

### Contents
- session chat
- payment reminders and status
- attendance/check-in
- fixtures
- court assignments
- scores and confirmations
- private media from the session
- wrap-up and recap content

### Rules
- not visible to non-selected group members
- archived into session history after the event
- may be reopened for recap or disputes if needed

---

## 13. Match formats
### 13.1 Kings & Queens
Supports:
- 8 players / 2 courts
- 12 players / 3 courts
- 16 players / 4 courts

Rules:
- winners go up a court
- losers go down a court
- players split from previous partner
- next round generated dynamically from results

### 13.2 Americano
- rotating partners/opponents
- points accumulated over session
- can support rest rotation when needed

### 13.3 Mexicano
- dynamically balanced matchups based on performance
- best for competitive play

### 13.4 Tournament by wins
Big events with skill categories and fixed doubles teams.

Structure:
- Categories (e.g. A higher, B lower)
- Groups per category (e.g. A1/A2, B1/B2) with 3–4 teams each
- Group stage: each team plays every other team in the group once
- Matches are best of 9 games; **games won = table points** (a 5–4 loss still earns 4 points)
- Top 2 from each group advance
- Semi-finals: group leaders play 2nd place of the other group (cross)
- Knockout matches are best of 9; only the match winner advances (group points stop mattering)
- 3rd/4th place match, then the final (per category)

### Acceptance criteria
- organiser can choose format
- system can generate pairings and standings per format
- player stats are recorded by format

---

## 14. Scores and verification
### Requirements
- score can be submitted by a player on the court or by organiser
- confirmation should go to both opposing-side players and organiser
- disputed results block progression until resolved or organiser-adjudicated
- silence is not acceptance
- correction path required

### Acceptance criteria
- result is not final until verified or adjudicated
- audit log captures who submitted / changed / confirmed

---

## 15. Payments
### Now
- organiser can configure manual methods: Revolut, Bizum, cash, transfer
- organiser can attach a payment link and instructions
- players can mark "I paid"
- organiser verifies manually

### Later
- integrated marketplace checkout
- organiser payout setup
- platform fee (e.g. €1 per paid booking + IVA — fixed so free events still pay)
- refunds, disputes, and revenue reporting

### Acceptance criteria
- organiser can define payment method per group/session
- payment status visible to selected players and organisers
- platform fee architecture must be configurable, even if not live initially

---

## 16. Reliability and attendance
### Features
- attendance status
- no-show tracking
- excused vs unexcused absence
- optional sanctions / reliability score
- organiser notes

### Example policy (configurable)
- first unexcused no-show: warning
- second within rolling 60 days: temporary restriction
- third: longer restriction

### Acceptance criteria
- organiser can mark attendance
- reliability history is visible to organisers
- players do not see private notes about others

---

## 17. Media
### In chat
- photos
- videos
- voice notes
- documents (optional phase 2)

### Storage model
- local device cache/storage for downloaded media
- cloud delivery/storage for sync and cross-device access
- retention rules for ephemeral vs persistent media

### Consent
- users can control whether their media can be used in recap content

---

## 18. Recaps / Wrapped
### Weekly recap
- session results
- standout stats
- selected media
- organiser share-back to main group optional

### Personal recap
- stats per player
- session highlights
- court progression

### Seasonal / annual Wrapped
- sessions played
- win rates
- top courts
- favourite partners
- top moments

### Acceptance criteria
- organiser can choose whether to share recap to main group
- recap visibility respects permissions and consent

---

## 19. Discover
### Features
- discover local public groups
- discover open sessions
- join-request flow
- filters by level / format / distance / activity

### Privacy
- opt-in discoverability
- location should be approximate, not overexposed

---

## 20. Notifications
### Notification categories
- chat messages
- mentions/replies
- session registration updates
- selection result
- payment reminder
- check-in reminder
- next court / next round
- score confirmation request
- recap available

### Requirements
- separate notification settings by type
- distinct sounds where supported
- mute options for group or session room

---

## 21. Search
### Search surfaces
- chats
- groups
- people
- sessions
- messages
- media

---

## 22. Security and privacy
This is launch-critical.

### Requirements
- secure auth
- encrypted in transit and at rest
- strong access controls
- media protection
- reporting/blocking
- audit logs for sensitive changes
- account deletion
- data export
- GDPR-aware privacy controls
- no fake claims of E2EE unless actually implemented

---

## 23. Moderation and abuse controls
- report user
- block user
- remove member
- ban member from group
- content moderation workflow for user-generated media/content

---

## 24. Brand requirements
- use Padel Nerdz logo asset with crown
- strong, energetic, premium social-sport feel
- clean dark / premium neutral base with bold accents
- not a visual WhatsApp clone
- native-feeling, polished UI

---

## 25. Business model
### Early
- free app download
- free groups and chat
- manual payment options

### Later
- platform booking fee per paid spot
- premium organiser tools
- club features
- highlighted discoverability or premium listings

---

## 26. Success metrics
- weekly active users
- groups created
- sessions created
- paid session registrations
- no-show reduction
- message volume / retention
- session completion rate
- recap share rate
- D30 retention

---

## 27. Release criteria
- core chat works reliably
- groups and session rooms work correctly
- at least one session format is fully usable, ideally all three
- security review completed
- private data access tests passed
- payment states and audit trail reliable
- push notifications working on iOS/Android
- app store compliance requirements satisfied

