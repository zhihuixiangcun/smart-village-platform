# Manual MongoDB Installation Guide

Since automatic installation failed, please follow these steps to manually install MongoDB:

## Step 1: Download MongoDB
1. Open your web browser and go to: https://www.mongodb.com/try/download/community
2. Select the following options:
   - Version: Latest Stable Release (4.4.x or higher)
   - Platform: Windows x64
   - Package: msi
3. Click "Download" to download the installer

## Step 2: Install MongoDB
1. Locate the downloaded .msi file (usually in your Downloads folder)
2. Double-click the .msi file to start the installation
3. In the installation wizard:
   - Choose "Complete" setup type
   - Check "Install MongoDB as a Service" 
   - Choose "Run service as Network Service user"
   - (Optional) Install MongoDB Compass
   - Click "Install" and wait for completion

## Step 3: Verify Installation
1. Open Command Prompt (cmd)
2. Type the following command and press Enter:
   ```
   mongod --version
   ```
3. If you see version information, MongoDB is installed correctly

## Step 4: Start MongoDB Service
1. Press Windows key + R to open Run dialog
2. Type "services.msc" and press Enter
3. In the Services window, look for "MongoDB Server"
4. If it's not running:
   - Right-click on "MongoDB Server"
   - Select "Start"

## Step 5: Initialize Database
1. Open a new Command Prompt
2. Navigate to your project directory:
   ```
   cd C:\Users\admin
   ```
3. Run the database initialization script:
   ```
   npm run init-db
   ```

If you encounter any issues during installation, please let me know and I'll help you troubleshoot.