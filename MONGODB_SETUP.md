# MongoDB Setup Guide

## Issue: MongoDB Connection Error

If you're seeing `ECONNREFUSED` error, follow these steps:

## Option 1: Using MongoDB Atlas (Cloud)

### Steps:
1. **Check your connection string in `backend/.env`:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/invoice_management
   ```
   - Replace `username` and `password` with your Atlas credentials
   - Replace `cluster0.xxxxx.mongodb.net` with your cluster address
   - **Important:** Add `/invoice_management` at the end (database name)

2. **Whitelist your IP address:**
   - Go to MongoDB Atlas Dashboard
   - Click "Network Access" → "Add IP Address"
   - Add your current IP or use `0.0.0.0/0` for all IPs (less secure)

3. **Check your database user:**
   - Go to "Database Access"
   - Ensure user has read/write permissions

4. **Test connection:**
   ```bash
   cd backend
   npm run dev
   ```

## Option 2: Using Local MongoDB

### Steps:
1. **Install MongoDB locally:**
   - Download from: https://www.mongodb.com/try/download/community
   - Or use: `choco install mongodb` (Windows with Chocolatey)

2. **Start MongoDB service:**
   ```bash
   # Windows (as Administrator)
   net start MongoDB
   
   # Or manually
   mongod --dbpath "C:\data\db"
   ```

3. **Update `backend/.env`:**
   ```
   MONGODB_URI=mongodb://localhost:27017/invoice_management
   ```

4. **Restart backend server:**
   ```bash
   cd backend
   npm run dev
   ```

## Quick Fix for Current Issue

Your current connection string is missing the database name. Update it to:

```
MONGODB_URI=mongodb+srv://ritesh_db:Ritesh12345@cluster0.j8sxjtc.mongodb.net/invoice_management
```

**Note:** Make sure:
- Your IP is whitelisted in Atlas
- Your password doesn't have special characters that need URL encoding
- Network/firewall allows MongoDB connections

## Troubleshooting

### If still getting ECONNREFUSED:
1. Check internet connection
2. Verify Atlas cluster is running
3. Check firewall settings
4. Try using local MongoDB instead

### If getting authentication error:
1. Verify username/password in connection string
2. Check database user permissions in Atlas
3. Ensure password doesn't have special characters (or URL encode them)

### Test MongoDB Connection:
```bash
# Test Atlas connection
mongosh "mongodb+srv://ritesh_db:Ritesh12345@cluster0.j8sxjtc.mongodb.net/invoice_management"

# Test local connection
mongosh "mongodb://localhost:27017/invoice_management"
```



