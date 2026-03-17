# Start Project Script for Windows PowerShell
# This script starts both backend and frontend servers

Write-Host "🚀 Starting Invoice Management System..." -ForegroundColor Green
Write-Host ""

# Check if MySQL is accessible (optional check)
Write-Host "📋 Make sure XAMPP MySQL is running!" -ForegroundColor Yellow
Write-Host ""

# Start Backend
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Invoice-Generator-and-Management-System--main\backend'; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Invoice-Generator-and-Management-System--main\frontend'; npm run dev"

Write-Host ""
Write-Host "✅ Servers starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "🔌 Backend API: http://localhost:5000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  If you see database connection errors:" -ForegroundColor Red
Write-Host "   1. Verify MySQL password in backend/.env" -ForegroundColor Red
Write-Host "   2. Create database manually using backend/database/schema.sql" -ForegroundColor Red
Write-Host "   3. See SETUP_INSTRUCTIONS.md for details" -ForegroundColor Red
Write-Host ""
