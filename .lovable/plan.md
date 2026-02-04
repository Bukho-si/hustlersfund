
# Password Reset Feature

## Overview
Add a "Forgot Password" flow to the Auth page so users can reset their password if they forget it. This uses the built-in authentication password reset functionality which sends an email with a secure reset link.

## What Will Happen

### User Flow
1. User clicks "Forgot password?" link on the login form
2. A dialog opens asking for their email address
3. User enters email and clicks "Send Reset Link"
4. They receive an email with a password reset link
5. Clicking the link takes them to a page where they can set a new password
6. After resetting, they're redirected to sign in

## Changes to Make

### 1. Update Auth Hook (`src/hooks/useAuth.tsx`)
Add a new `resetPassword` function that calls the authentication password reset method with proper redirect URL.

### 2. Update Auth Page (`src/pages/Auth.tsx`)
- Add a "Forgot password?" link below the password field in the login form
- Create a dialog/modal for entering email to receive reset link
- Handle the reset request with loading state and success/error feedback

### 3. Create Reset Password Page (`src/pages/ResetPassword.tsx`)
A new page at `/reset-password` that:
- Detects the reset token from the URL (handled automatically by authentication)
- Shows a form to enter new password + confirm password
- Validates passwords match and meet requirements
- Updates the password using the authentication session
- Redirects to login on success

### 4. Update App Routes (`src/App.tsx`)
Add the new `/reset-password` route.

## Technical Details

```text
+------------------+     +------------------+     +------------------+
|   Auth Page      |     |  Email Inbox     |     | Reset Password   |
|                  |     |                  |     |   Page           |
|  [Forgot pwd?]---+---->| Reset link email +---->| Enter new pwd    |
|                  |     |                  |     | [Submit]         |
+------------------+     +------------------+     +--------+---------+
                                                          |
                                                          v
                                                 +------------------+
                                                 |  Auth Page       |
                                                 |  (Sign in with   |
                                                 |   new password)  |
                                                 +------------------+
```

### Auth Hook Addition
```typescript
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error: error as Error | null };
};
```

### UI Components Used
- Existing `Dialog` component for the forgot password modal
- Existing `Input`, `Label`, `Button` components for form
- Toast notifications for feedback

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/hooks/useAuth.tsx` | Add `resetPassword` and `updatePassword` functions |
| `src/pages/Auth.tsx` | Add forgot password link + dialog |
| `src/pages/ResetPassword.tsx` | Create new page for setting new password |
| `src/App.tsx` | Add `/reset-password` route |
