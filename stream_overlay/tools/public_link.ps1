# Link awam untuk penonton (viewer.html) & admin luar (control.html + PIN) guna Cloudflare Tunnel percuma.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$exe = Join-Path $PSScriptRoot 'cloudflared.exe'
if (-not (Test-Path -LiteralPath $exe)) {
  Write-Host ""
  Write-Host "  cloudflared.exe belum ada. Muat turun sekarang (lebih kurang 60 MB)? [Y/N]" -ForegroundColor Yellow
  $a = Read-Host "  "
  if ($a -notmatch '^[Yy]') { exit 1 }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $exe -UseBasicParsing
  Write-Host "  Siap muat turun." -ForegroundColor Green
}
Write-Host ""
Write-Host "  Pastikan START_OVERLAY.bat sedang jalan." -ForegroundColor Yellow
Write-Host "  Cari baris  https://xxxxx.trycloudflare.com  di bawah, kemudian kongsi:" -ForegroundColor Green
Write-Host "    Penonton : https://xxxxx.trycloudflare.com/viewer.html"
Write-Host "    Admin    : https://xxxxx.trycloudflare.com/control.html   (perlu PIN)"
Write-Host "  Link bertukar setiap kali dibuka. Tutup tetingkap ni untuk matikan link."
Write-Host ""
& $exe tunnel --url http://127.0.0.1:8787
