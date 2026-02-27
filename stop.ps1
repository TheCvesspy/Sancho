Write-Host "Stopping application..." -ForegroundColor Yellow

# Function to kill process by port
function Stop-ProcessByPort($port) {
    if ($port -eq 0) { return }
    $processIds = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
    if ($processIds) {
        foreach ($pid in $processIds) {
            Write-Host "Stopping process on port $port (PID: $pid)..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

# Backend ports (from launchSettings.json)
Stop-ProcessByPort 5293
Stop-ProcessByPort 7234

# Frontend port (Next.js default)
Stop-ProcessByPort 3000

# Also kill by name specifically
Get-Process -Name "Sancho.API" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Shutdown complete." -ForegroundColor Green
