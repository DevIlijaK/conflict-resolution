# Email Setup Guide

This project uses [Resend](https://resend.com) for sending invitation emails. Follow these steps to set up email functionality:

## 1. Get a Resend API Key

1. Sign up for a free account at [resend.com](https://resend.com)
2. Verify your domain (or use the sandbox mode for testing)
3. Create an API key from your Resend dashboard

## 2. Install the Resend package

```bash
pnpm add resend
```

## 3. Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Resend API Key (required)
RESEND_API_KEY=re_your_api_key_here

# Your app's base URL (optional, defaults to localhost:3000)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## 4. Update the "From" Email Address

In `convex/email.ts`, update line 120 to use your verified domain:

```typescript
from: "Conflict Resolution <noreply@yourdomain.com>", // Replace with your verified domain
```

## 5. Testing

For development/testing, you can use Resend's sandbox mode which doesn't require domain verification.

## How it Works

1. When a user clicks "Send Invitation" in the app, it calls the `sendInvitation` mutation
2. The mutation schedules the `sendInvitationEmail` action to run asynchronously
3. The action sends a beautifully formatted HTML email with:
   - Conflict details
   - A direct link to join the conflict resolution
   - Both HTML and plain text versions

## Email Template Features

- Professional HTML design with inline CSS
- Responsive layout that works on all devices
- Clear call-to-action button
- Fallback plain text version
- Proper error handling and logging
