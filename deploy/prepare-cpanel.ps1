# Build Parrot-Learning for cPanel upload.
# Run from repo root:  .\deploy\prepare-cpanel.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Frontend = Join-Path $Root "E-learning-parrot-frontend"
$Backend = Join-Path $Root "E-learning-parrot-backend"
$Out = Join-Path $Root "deploy\output"
$Stamp = Get-Date -Format "yyyyMMdd-HHmm"

if (Test-Path $Out) { Remove-Item $Out -Recurse -Force }
New-Item -ItemType Directory -Path $Out | Out-Null

Write-Host "==> Building React frontend (production)..." -ForegroundColor Cyan
Push-Location $Frontend
if (-not (Test-Path "node_modules\vite")) {
    npm ci
}
npm run build
if (-not (Test-Path "dist\index.html")) { throw "Frontend build failed: dist/index.html missing" }
if (-not (Test-Path "dist\.htaccess")) { throw "Frontend build failed: dist/.htaccess missing — enable Show Hidden Files or re-run build" }
if (-not (Test-Path "dist\version.json")) { throw "Frontend build failed: dist/version.json missing" }
Copy-Item "public\.htaccess" "dist\.htaccess" -Force
Pop-Location

Write-Host "==> Zipping frontend dist (includes hidden .htaccess)..." -ForegroundColor Cyan
$feZip = Join-Path $Out "parrot-frontend-$Stamp.zip"
$distPath = Join-Path $Frontend "dist"
$distItems = Get-ChildItem -Path $distPath -Force | ForEach-Object { $_.FullName }
Compress-Archive -Path $distItems -DestinationPath $feZip -Force

Write-Host "==> Zipping Laravel API (no vendor/node_modules)..." -ForegroundColor Cyan
$beStage = Join-Path $Out "api-staging"
New-Item -ItemType Directory -Path $beStage | Out-Null
$exclude = @('vendor', 'node_modules', '.git', 'tests', 'storage\logs\*', '.env')
Get-ChildItem $Backend -Force | Where-Object {
    $_.Name -notin @('vendor', 'node_modules', '.git', 'tests')
} | ForEach-Object {
    Copy-Item $_.FullName -Destination (Join-Path $beStage $_.Name) -Recurse -Force
}
# Fresh writable storage skeleton
$storageDirs = @('framework\cache\data', 'framework\sessions', 'framework\views', 'logs')
foreach ($d in $storageDirs) {
    $p = Join-Path $beStage "storage\$d"
    New-Item -ItemType Directory -Path $p -Force | Out-Null
    New-Item -ItemType File -Path (Join-Path $p '.gitkeep') -Force | Out-Null
}
Copy-Item (Join-Path $Backend ".env.cpanel") (Join-Path $beStage ".env.cpanel") -Force

$backendHtaccess = @(
    (Join-Path $beStage ".htaccess"),
    (Join-Path $beStage "public\.htaccess")
)
foreach ($ht in $backendHtaccess) {
    if (-not (Test-Path $ht)) {
        throw "Backend deploy package missing required file: $ht"
    }
}

$beZip = Join-Path $Out "parrot-api-$Stamp.zip"
$beItems = Get-ChildItem -Path $beStage -Force | ForEach-Object { $_.FullName }
Compress-Archive -Path $beItems -DestinationPath $beZip -Force
Remove-Item $beStage -Recurse -Force

Write-Host ""
Write-Host "Done. Upload these to cPanel:" -ForegroundColor Green
Write-Host "  Frontend -> xanderglobalacademy.com document root: $feZip"
Write-Host "    MUST include: index.html, version.json, .htaccess (show hidden files)"
Write-Host "  API      -> api.xanderglobalacademy.com folder:     $beZip"
Write-Host "    MUST include: .htaccess (project root) + public/.htaccess"
Write-Host ""
Write-Host "See deploy/DEPLOY_CPANEL.md for post-upload steps."
