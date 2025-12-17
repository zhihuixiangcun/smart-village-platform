# Quick MongoDB Installation Checklist

## 1. Download MongoDB
- Visit: https://www.mongodb.com/try/download/community
- Select: Windows x64, MSI package
- Download the installer

## 2. Install MongoDB
- Run the downloaded .msi file
- Choose "Complete" setup
- Check "Install MongoDB as a Service"
- Complete the installation

## 3. Verify Installation
- Open NEW Command Prompt (important!)
- Run: `mongod --version`
- Run: `mongo --version`

## 4. Start MongoDB Service
- Run: `net start MongoDB`
- Or check Services (services.msc) and start MongoDB Server

## 5. Initialize Database
- Run: `npm run init-db`

## Common Issues
- If commands not found, MongoDB may not be in PATH
- If service won't start, check Windows Services
- After installation, open a NEW command prompt