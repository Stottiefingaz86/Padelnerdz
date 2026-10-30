# Twilio + phone OTP (Padel Nerdz)

The mobile app already calls Supabase Auth phone OTP (`signInWithOtp` / `verifyOtp`).  
Twilio is the SMS provider **behind** Supabase — secrets stay in the Supabase dashboard, not in Expo.

Cursor has the **Twilio docs MCP** (`twilio-docs` → `https://mcp.twilio.com/docs`) for API search. Reload MCP if tools don’t appear.

## What you create in Twilio

1. Twilio account ([console](https://console.twilio.com))
2. **Verify** → Create Service  
   - API: `POST /v2/Services` (`CreateService`)  
   - Required: `FriendlyName` (e.g. `Padel Nerdz`, max 32 chars, no PII)  
   - Optional: `CodeLength` 4–10 (default 6), `DoNotShareWarningEnabled`
3. Copy:
   - Account SID (`AC…`)
   - Auth Token (or API Key)
   - Verify Service SID (`VA…`)

Trial accounts: verify recipient numbers in Console before SMS will deliver.

## Wire into Supabase (required for the app)

1. Open the **Padel Nerdz** Supabase project  
2. Authentication → Providers → **Phone** → enable  
3. Provider: **Twilio Verify**  
4. Paste Account SID, Auth Token, Verify Service SID  
5. Save  

Guide: [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login)

Then the existing app flow works:

| Screen | Call |
|--------|------|
| `/(auth)/phone` | `supabase.auth.signInWithOtp({ phone })` |
| `/(auth)/otp` | `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` |

**Beta / real friends:** SMS must work. Local device accounts are **off by default**.  
Only for solo demos set `EXPO_PUBLIC_ALLOW_LOCAL_PHONE_FALLBACK=true` — that path does **not** create a shared Supabase user and must not be used with real testers.

## What Supabase calls on Twilio (reference)

From Twilio Verify v2 (via MCP):

| Step | Operation | Endpoint |
|------|-----------|----------|
| Send OTP | `CreateVerification` | `POST /v2/Services/{ServiceSid}/Verifications` |
| | Body | `To` (E.164), `Channel=sms` |
| Check OTP | `CreateVerificationCheck` | `POST /v2/Services/{ServiceSid}/VerificationCheck` |
| | Body | `To` + `Code` |
| Success | | `status === "approved"` |

You do **not** call these from the mobile app when using Supabase Auth.

## Do not put in the Expo app

- Twilio Auth Token  
- Account SID / Verify SID (unless you bypass Supabase, which we don’t)

## Checklist

- [ ] Twilio Verify Service created (`VA…`)
- [ ] Supabase Phone + Twilio Verify enabled
- [ ] Test OTP on a real device (+34 / +54 / +44 as needed)
- [ ] Rate limits + CAPTCHA before production traffic
- [ ] App Review test numbers documented
