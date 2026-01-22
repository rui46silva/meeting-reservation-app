# Calendar Integration Setup Guide

This room reservation app supports integration with Google Calendar and Microsoft Calendar. Follow these steps to enable calendar syncing.

## Google Calendar Integration

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted
4. Select "Web application" as the application type
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Your production domain
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback`
7. Copy the Client ID

### 3. Add Environment Variable

Add to your `.env.local` file:
\`\`\`
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
\`\`\`

## Microsoft Calendar Integration

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Enter a name for your application
5. Select "Accounts in any organizational directory and personal Microsoft accounts"
6. Add redirect URI:
   - Platform: Single-page application
   - URI: `http://localhost:3000/api/auth/microsoft/callback`
7. Click "Register"

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Add "Calendars.ReadWrite" permission
6. Click "Add permissions"
7. Grant admin consent if required

### 3. Copy Application ID

1. Go to "Overview" in your app registration
2. Copy the "Application (client) ID"

### 4. Add Environment Variable

Add to your `.env.local` file:
\`\`\`
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
\`\`\`

## Using Calendar Integration

1. Click the Settings icon in the top right corner
2. Connect your Google and/or Microsoft accounts
3. When creating a reservation, check the boxes to sync with your calendars
4. The reservation will automatically be added to your selected calendars

## Notes

- Calendar tokens are stored in localStorage for this demo
- For production, implement proper OAuth flow with backend token storage
- Consider implementing token refresh logic for long-term usage
- Add proper error handling and user feedback for failed syncs
