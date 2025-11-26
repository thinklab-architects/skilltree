$ErrorActionPreference = "Stop"

Write-Host "Starting auto-deployment process..." -ForegroundColor Cyan

# Check git status
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to deploy." -ForegroundColor Yellow
    exit
}

# Add all changes
Write-Host "Adding files..." -ForegroundColor Green
git add .

# Commit changes
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$message = "Auto deploy: $timestamp"
Write-Host "Committing with message: '$message'..." -ForegroundColor Green
git commit -m "$message"

# Push to remote
Write-Host "Pushing to GitHub..." -ForegroundColor Green
git push

Write-Host "Upload complete! GitHub Actions should now trigger a redeployment." -ForegroundColor Cyan
