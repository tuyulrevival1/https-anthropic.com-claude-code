# Sekali sahaja: sediakan LINK KEKAL (Tailscale Funnel) untuk penonton & admin di luar Wi-Fi.
$ErrorActionPreference = 'Continue'
$port = 8787
function Find-Tailscale {
  $c = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @("$env:ProgramFiles\Tailscale\tailscale.exe", "${env:ProgramFiles(x86)}\Tailscale\tailscale.exe")) { if (Test-Path $p) { return $p } }
  return $null
}
function Step($n, $t) { Write-Host ""; Write-Host "  [$n] $t" -ForegroundColor Cyan }

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Red
Write-Host "   SYNO - Sediakan LINK KEKAL (sekali sahaja)" -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Red

# 1. pasang Tailscale
Step 1 "Semak Tailscale"
$ts = Find-Tailscale
if (-not $ts) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "      Memasang Tailscale (tekan Yes kalau Windows tanya)..."
    winget install -e --id Tailscale.Tailscale --accept-source-agreements --accept-package-agreements
    Start-Sleep -Seconds 5
    $ts = Find-Tailscale
  }
  if (-not $ts) {
    Start-Process 'https://tailscale.com/download/windows'
    Write-Host "      Tak dapat pasang sendiri. Halaman muat turun Tailscale dah dibuka." -ForegroundColor Yellow
    Write-Host "      Pasang Tailscale, kemudian klik semula PASANG_LINK_KEKAL.bat."
    Read-Host "      Tekan Enter untuk tutup"; exit 1
  }
}
Write-Host "      OK: $ts" -ForegroundColor Green

# 2. log masuk
Step 2 "Log masuk Tailscale"
$st = $null; try { $st = & $ts status --json 2>$null | ConvertFrom-Json } catch { }
if (-not $st -or $st.BackendState -ne 'Running') {
  Write-Host "      Browser akan terbuka. Log masuk guna akaun Google / Microsoft awak."
  Write-Host "      (Kalau browser tak buka, salin link https://login.tailscale.com/... di bawah ke browser.)"
  & $ts up
  try { $st = & $ts status --json 2>$null | ConvertFrom-Json } catch { }
}
if (-not $st -or $st.BackendState -ne 'Running') { Write-Host "      Belum log masuk. Cuba lagi." -ForegroundColor Yellow; Read-Host "      Tekan Enter untuk tutup"; exit 1 }
Write-Host "      OK: dah log masuk" -ForegroundColor Green

# 3. nama link
Step 3 "Nama link (huruf kecil, tanpa jarak). Contoh: synostore"
$cur = ($st.Self.DNSName -split '\.')[0]
$name = Read-Host "      Tekan Enter untuk kekalkan '$cur', atau taip nama baru"
if ($name -and $name -match '^[a-z0-9-]{2,40}$' -and $name -ne $cur) {
  & $ts set --hostname=$name 2>&1 | Out-Null
  Start-Sleep -Seconds 3
  try { $st = & $ts status --json 2>$null | ConvertFrom-Json } catch { }
}

# 4. hidupkan Funnel (kekal walaupun PC restart)
Step 4 "Hidupkan Funnel"
Write-Host "      Kalau keluar link 'Funnel is not enabled', buka link tu dalam browser dan tekan ENABLE / APPROVE."
Write-Host "      Lepas tu tunggu sekejap, skrip ni sambung sendiri."
& $ts funnel --bg $port
Start-Sleep -Seconds 2
& $ts funnel status

try { $st = & $ts status --json 2>$null | ConvertFrom-Json } catch { }
$dns = ''; if ($st -and $st.Self.DNSName) { $dns = $st.Self.DNSName.TrimEnd('.') }
if (-not $dns) { Write-Host "      Tak dapat baca nama link. Buka 'tailscale funnel status' untuk lihat link." -ForegroundColor Yellow; Read-Host "      Tekan Enter untuk tutup"; exit 1 }
$base = "https://$dns"
try { Set-Clipboard -Value "$base/viewer.html" } catch { }

Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Red
Write-Host "   SIAP! LINK KEKAL AWAK:" -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Red
Write-Host ""
Write-Host "   Penonton (letak di Linktree / bio):" -ForegroundColor Magenta
Write-Host "     $base/viewer.html" -ForegroundColor White
Write-Host "     (dah disalin ke clipboard, terus Paste)"
Write-Host ""
Write-Host "   Admin (dari mana-mana, perlu PIN):" -ForegroundColor Magenta
Write-Host "     $base/control.html" -ForegroundColor White
Write-Host ""
Write-Host "   PIN admin ada dalam tetingkap START_OVERLAY / fail data\admin_pin.txt"
Write-Host "   Link hidup bila PC on DAN START_OVERLAY.bat sedang jalan."
Write-Host ""
Read-Host "  Tekan Enter untuk tutup"
