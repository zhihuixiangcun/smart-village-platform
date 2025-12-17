# Action Plan: Complete Smart Village Platform Setup

## Current Status
- Smart Village Platform server is running (API on port 3001, Monitoring on port 3002)
- MongoDB is NOT installed - Database features are disabled
- Database initialization is failing with connection refused error

## Immediate Actions Required

### 1. Install MongoDB Community Edition
Follow the manual installation guide in `MONGODB_MANUAL_INSTALLATION.md`:
- Download MongoDB from https://www.mongodb.com/try/download/community
- Install with "Complete" setup and "Install as a Service" options
- Add MongoDB to your system PATH

### 2. Verify MongoDB Installation
Open a new Command Prompt and run:
```
mongod --version
```
You should see version information if installed correctly.

### 3. Start MongoDB Service
Check if the service is running:
```
net start | findstr -i mongo
```
If not running, start it:
```
net start MongoDB
```

### 4. Initialize Database
Once MongoDB is running, initialize the database:
```
npm run init-db
```

### 5. Restart Platform Servers
Stop the current server (Ctrl+C) and restart:
```
npm run dev
```

## Verification
After completing these steps, you should be able to:
- Access the full API at http://localhost:3001
- Use all database-dependent features
- See database connection success in the server logs

## Troubleshooting
If you still encounter issues:
1. Check Windows Services (services.msc) for MongoDB service
2. Ensure MongoDB is added to your system PATH
3. Check firewall settings for port 27017