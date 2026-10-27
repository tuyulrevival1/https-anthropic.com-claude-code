# Kemaskini SYNO overlay ke versi terbaru dari GitHub (dijalankan oleh KEMASKINI.bat).
# Folder data\ (baki VIP, PIN, link), assets\seed_doc.js dan logo rank pilihan TIDAK disentuh.
$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repo = 'tuyulrevival1/https-anthropic.com-claude-code'
$branch = 'claude/streaming-layout-chou-kof-vie6x8'
$url = "https://codeload.github.com/$repo/zip/refs/heads/$branch"

Write-Host ''
Write-Host '  =============================================' -ForegroundColor Red
Write-Host '   KEMASKINI SYNO OVERLAY' -ForegroundColor Green
Write-Host '  =============================================' -ForegroundColor Red
Write-Host ''

# versi terbaru (untuk paparan sahaja)
$info = ''
try {
  $c = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/commits/$($branch)" -UseBasicParsing -Headers @{ 'User-Agent' = 'syno-update' }
  $info = ([string]$c.commit.message -split "`n")[0] + '  (' + ([DateTime]$c.commit.committer.date).ToLocalTime().ToString('d MMM yyyy h:mm tt') + ')'
  $verFile = Join-Path $root 'data\versi.txt'
  if ((Test-Path -LiteralPath $verFile) -and (([System.IO.File]::ReadAllText($verFile)).Trim() -eq $c.sha)) {
    Write-Host '  Dah guna versi terbaru:' -ForegroundColor Cyan
    Write-Host "    $info"
    Write-Host ''
    $ans = Read-Host '  Muat turun semula juga? (y = ya, Enter = tidak)'
    if ($ans -ne 'y') { exit 0 }
  }
} catch { $c = $null }

$tmp = Join-Path $env:TEMP ('syno_update_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
$zip = Join-Path $tmp 'syno.zip'
Write-Host '  [1] Muat turun versi terbaru...'
try { Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing }
catch {
  Write-Host "  Gagal muat turun: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host '  Semak internet, kemudian cuba lagi.'
  exit 1
}
try { Unblock-File -LiteralPath $zip } catch { }

Write-Host '  [2] Buka ZIP...'
Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
$src = Get-ChildItem -LiteralPath $tmp -Directory -Recurse | Where-Object { $_.Name -eq 'stream_overlay' } | Select-Object -First 1
if (-not $src) { Write-Host '  Folder stream_overlay tak jumpa dalam ZIP.' -ForegroundColor Red; exit 1 }

# simpan config.js lama kalau awak pernah ubah (harga / teks)
$oldCfg = Join-Path $root 'assets\config.js'; $newCfg = Join-Path $src.FullName 'assets\config.js'
$cfgNote = $false
if ((Test-Path -LiteralPath $oldCfg) -and (Test-Path -LiteralPath $newCfg) -and ((Get-FileHash -LiteralPath $oldCfg).Hash -ne (Get-FileHash -LiteralPath $newCfg).Hash)) {
  Copy-Item -LiteralPath $oldCfg -Destination (Join-Path $root 'assets\config.lama.js') -Force; $cfgNote = $true
}

Write-Host '  [3] Salin fail baru...'
$skip = @('data\*', 'exports\frames\*', 'assets\ranks\pilihan\*', 'assets\seed_doc.js', 'KEMASKINI.bat')  # KEMASKINI.bat sedang berjalan: jangan timpa
$n = 0
Get-ChildItem -LiteralPath $src.FullName -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($src.FullName.Length).TrimStart('\')
  foreach ($s in $skip) { if ($rel -like $s) { return } }
  $dst = Join-Path $root $rel
  $dir = Split-Path $dst -Parent
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item -LiteralPath $_.FullName -Destination $dst -Force
  try { Unblock-File -LiteralPath $dst } catch { }
  $n++
}
Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($c -and $c.sha) {
  $dd = Join-Path $root 'data'; if (-not (Test-Path -LiteralPath $dd)) { New-Item -ItemType Directory -Path $dd | Out-Null }
  [System.IO.File]::WriteAllText((Join-Path $dd 'versi.txt'), $c.sha)
}

Write-Host ''
Write-Host "  SIAP! $n fail dikemas kini." -ForegroundColor Green
if ($info) { Write-Host "  Versi: $info" }
if ($cfgNote) { Write-Host '  config.js lama disimpan sebagai assets\config.lama.js (kalau awak pernah ubah harga / teks, salin semula dari situ).' -ForegroundColor Yellow }
Write-Host ''
Write-Host '  Langkah seterusnya:' -ForegroundColor Cyan
Write-Host '   1. Tutup tetingkap hitam overlay (kalau terbuka), kemudian buka semula START_OVERLAY.bat'
Write-Host '   2. OBS: klik kanan Overlay > Properties > Refresh cache of current page'
Write-Host ''
