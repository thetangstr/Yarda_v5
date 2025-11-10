# Magic Link Email Customization Guide

## Overview

This guide shows you how to customize the magic link authentication email with Yarda branding in Supabase.

---

## Steps to Customize the Magic Link Email

### 1. Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your Yarda project: `gxlmnjnjvlslijiowamn`
3. Click on **Authentication** in the left sidebar
4. Click on **Email Templates**

### 2. Select Magic Link Template

1. In the Email Templates page, find the **"Magic Link"** template
2. Click on it to edit

### 3. Customize the Email Template

Replace the default template with this Yarda-branded version:

```html
<h2>Sign in to Yarda</h2>

<p>Hi there!</p>

<p>Click the link below to sign in to your Yarda account and start creating beautiful landscape designs.</p>

<p><a href="{{ .ConfirmationURL }}">Sign in to Yarda</a></p>

<p style="color: #666; font-size: 14px;">
  This link expires in 1 hour and can only be used once.
</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

<p style="color: #999; font-size: 12px;">
  Yarda - AI-Powered Landscape Design<br>
  If you didn't request this email, you can safely ignore it.
</p>
```

### 4. Customize Email Subject

Update the email subject to:

```
Sign in to Yarda
```

### 5. Optional: Enhance with HTML Styling

For a more polished look, you can add this enhanced HTML template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #10b981;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #10b981;
    }
    .content {
      padding: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(to right, #10b981, #059669);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌱 Yarda</div>
  </div>

  <div class="content">
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Sign in to Yarda</h2>

    <p>Hi there!</p>

    <p>Click the button below to sign in to your Yarda account and start creating beautiful landscape designs.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" class="button">
        Sign in to Yarda →
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      This link expires in <strong>1 hour</strong> and can only be used once for security.
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>Yarda</strong> - AI-Powered Landscape Design<br>
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
```

### 6. Save Changes

1. Click **Save** to apply the changes
2. Test the magic link by requesting one from the login page

---

## Testing the Custom Email

### Test Procedure

1. Go to your login page: https://yarda-v5-frontend-git-006-magic-link-auth-thetangstrs-projects.vercel.app/login
2. Enter a test email address
3. Click "Send Magic Link"
4. Check the email inbox for the customized email
5. Verify:
   - ✅ Yarda branding is present
   - ✅ Email subject is "Sign in to Yarda"
   - ✅ Button/link is styled correctly
   - ✅ Magic link works when clicked

---

## Email Template Variables

Supabase provides these variables you can use in the template:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The magic link URL (required) |
| `{{ .Email }}` | The user's email address |
| `{{ .Token }}` | The OTP token (don't expose this) |
| `{{ .RedirectTo }}` | The redirect URL after authentication |

---

## Best Practices

1. **Keep it simple** - Short, clear message with prominent call-to-action button
2. **Branding** - Include Yarda logo/name and brand colors (#10b981 green)
3. **Security note** - Mention 1-hour expiration and single-use token
4. **Mobile-friendly** - Ensure email looks good on mobile devices
5. **Accessibility** - Use readable font sizes and sufficient color contrast

---

## Troubleshooting

### Issue: Email not customized after saving
- **Solution:** Clear browser cache and request a new magic link

### Issue: Template variables not working
- **Solution:** Ensure you're using the correct syntax: `{{ .VariableName }}`

### Issue: Styling not rendering
- **Solution:** Some email clients strip complex CSS. Use inline styles or keep it simple.

---

## Next Steps

After customizing the email template:

1. ✅ Test with multiple email addresses
2. ✅ Verify on different email clients (Gmail, Outlook, Apple Mail)
3. ✅ Test on mobile devices
4. ✅ Update staging and production environments with same template

---

## Related Documentation

- [Supabase Email Templates Documentation](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Yarda Authentication Architecture](./AUTHENTICATION_ARCHITECTURE.md)
- [Staging Deployment Report](../STAGING_DEPLOYMENT_REPORT.md)
