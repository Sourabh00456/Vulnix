# Start Celery Worker for Vulnix
# Usage: .\start_worker.ps1

Write-Host "Starting Vulnix Celery Worker..." -ForegroundColor Cyan

# Ensure we are in the backend directory context if the script is run from root
if (Test-Path ".\backend") {
    Set-Location ".\backend"
}

# Use the virtual environment
if (Test-Path "..\venv\Scripts\Activate.ps1") {
    . ..\venv\Scripts\Activate.ps1
}

# Run worker
# Note: -P solo is used for Windows development stability. 
# Remove -P solo for Linux/Production deployments.
celery -A app.tasks.worker worker --loglevel=info -P solo
