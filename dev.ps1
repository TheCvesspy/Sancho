Write-Host "Starting application..." -ForegroundColor Yellow

# Ensure we are in the root directory
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }
Set-Location $root

# Stop existing processes first to ensure a clean start/restart
& "$root/stop.ps1"

Write-Host "`nStarting Backend (New Window)..." -ForegroundColor Cyan
# Using Start-Process to run the backend in its own window so logs are visible
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location $root/backend/Sancho.API; dotnet run" -WindowStyle Normal

Write-Host "`nStarting Frontend..." -ForegroundColor Cyan
Set-Location "$root/frontend"
npm run dev
