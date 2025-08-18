# Environment Variables Documentation

This document describes all environment variables used in the Relâmpago project.

## Frontend Environment Variables

### Required Variables

#### `VITE_API_URL` or `VITE_API_BASE_URL`
- **Description**: Base URL for the backend API
- **Development**: `http://localhost:5000/api`
- **Production**: `https://site-gestao.onrender.com/api`
- **Example**: `VITE_API_URL=https://site-gestao.onrender.com/api`

### Optional Variables

#### `VITE_PUBLIC_API_URL`
- **Description**: Public API URL used by AuthContext for fetch requests
- **Default**: `/api` (relative path)
- **Production**: Should match the backend deployment URL
- **Example**: `VITE_PUBLIC_API_URL=/api`

#### `VITE_DASHBOARD_URL`
- **Description**: URL for the dashboard link in the footer
- **Default**: `http://localhost:5000/login`
- **Production**: Should point to the production login page
- **Example**: `VITE_DASHBOARD_URL=https://site-gestao-mu.vercel.app/login`

## Backend Environment Variables

### Required Variables

#### `SECRET_KEY`
- **Description**: Flask application secret key for session management
- **Default**: `asdf#FGSgvasgf$5$WGT` (development only)
- **Production**: **MUST** be changed to a secure random string
- **Example**: `SECRET_KEY=your-super-secure-secret-key-here`

#### `JWT_SECRET_KEY`
- **Description**: Secret key for JWT token signing and verification
- **Default**: `jwt-secret-string-change-in-production` (development only)
- **Production**: **MUST** be changed to a secure random string
- **Example**: `JWT_SECRET_KEY=your-jwt-secret-key-here`

### Optional Variables

#### `LOG_LEVEL`
- **Description**: Logging level for the application
- **Default**: `INFO`
- **Options**: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **Example**: `LOG_LEVEL=DEBUG`

#### `MAX_CONTENT_LENGTH`
- **Description**: Maximum file upload size in bytes
- **Default**: `26214400` (25MB)
- **Example**: `MAX_CONTENT_LENGTH=52428800` (50MB)

#### `USE_FIRESTORE`
- **Description**: Enable/disable Firestore for finance data storage
- **Default**: `true`
- **Options**: `true`, `false`, `1`, `0`, `yes`, `no`
- **Example**: `USE_FIRESTORE=false`

#### `FINANCE_COLL`
- **Description**: Firestore collection name for finance transactions
- **Default**: `finance_transactions`
- **Example**: `FINANCE_COLL=production_finance_transactions`

#### `FINANCE_JSON_PATH`
- **Description**: Fallback JSON file path for finance data (when Firestore is disabled)
- **Default**: `/tmp/finance_transactions.json`
- **Example**: `FINANCE_JSON_PATH=/app/data/finance.json`

#### `FRONTEND_URL`
- **Description**: Allowed frontend origins for CORS (comma-separated)
- **Default**: Not set (allows all origins with `*`)
- **Example**: `FRONTEND_URL=https://site-gestao-mu.vercel.app,http://localhost:5173`

## Database Environment Variables

### Firebase/Firestore (if using Firestore)

#### `GOOGLE_APPLICATION_CREDENTIALS`
- **Description**: Path to Google Cloud service account JSON file
- **Required**: Only if using Firestore
- **Example**: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`

#### `FIREBASE_PROJECT_ID`
- **Description**: Firebase project ID
- **Required**: Only if using Firestore
- **Example**: `FIREBASE_PROJECT_ID=your-firebase-project-id`

## Deployment-Specific Variables

### Vercel (Frontend)

Create a `.env.local` file in the frontend directory:

```env
VITE_API_URL=https://site-gestao.onrender.com/api
VITE_DASHBOARD_URL=https://site-gestao-mu.vercel.app/login
```

### Render (Backend)

Set these environment variables in the Render dashboard:

```env
SECRET_KEY=your-super-secure-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
LOG_LEVEL=INFO
USE_FIRESTORE=true
FRONTEND_URL=https://site-gestao-mu.vercel.app
```

## Security Notes

1. **Never commit sensitive environment variables** to version control
2. **Always use different secrets** for development and production
3. **Rotate secrets regularly** in production environments
4. **Use strong, random strings** for SECRET_KEY and JWT_SECRET_KEY
5. **Limit CORS origins** in production by setting FRONTEND_URL

## Development Setup

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000/api
VITE_DASHBOARD_URL=http://localhost:5173/login
```

### Backend (.env)
```env
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
LOG_LEVEL=DEBUG
USE_FIRESTORE=false
FINANCE_JSON_PATH=./data/finance_dev.json
```

## Production Checklist

- [ ] Set secure SECRET_KEY (minimum 32 characters)
- [ ] Set secure JWT_SECRET_KEY (minimum 32 characters)
- [ ] Configure proper FRONTEND_URL for CORS
- [ ] Set appropriate LOG_LEVEL (INFO or WARNING)
- [ ] Configure database credentials (if using Firestore)
- [ ] Test all API endpoints with production environment variables
- [ ] Verify CORS configuration allows frontend domain
- [ ] Confirm file upload limits are appropriate

