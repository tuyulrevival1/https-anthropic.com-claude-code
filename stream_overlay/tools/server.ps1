# SYNO Overlay server. Tiada install diperlukan (guna PowerShell bawaan Windows).
# Dijalankan oleh START_OVERLAY.bat. Biar tetingkap ni terbuka selagi live.
#  - Fail overlay, app kawalan & halaman penonton
#  - /api/state : simpan & kongsi data (queue, baki VIP, W/L, timer)
#  - Tulis data dari PC ni bebas; dari phone / admin lain perlu PIN (data\admin_pin.txt)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8787
$dataDir = Join-Path $root 'data'
if (-not (Test-Path -LiteralPath $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
$stateFile = Join-Path $dataDir 'state.txt'
$pinFile = Join-Path $dataDir 'admin_pin.txt'
if (-not (Test-Path -LiteralPath $pinFile)) {
  $newPin = '{0:D4}' -f (Get-Random -Minimum 0 -Maximum 10000)
  [System.IO.File]::WriteAllText($pinFile, $newPin)
}
$pin = ([System.IO.File]::ReadAllText($pinFile)).Trim()

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.woff2' = 'font/woff2'
  '.mp4' = 'video/mp4'; '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'
  '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'; '.ico' = 'image/x-icon'
}
function ToBytes([string]$s) { return [System.Text.Encoding]::UTF8.GetBytes($s) }

try {
  $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any, $port)
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "  Port $port sedang digunakan. Mungkin overlay dah jalan dalam tetingkap lain." -ForegroundColor Yellow
  Write-Host "  Tutup tetingkap overlay yang lain, kemudian buka semula START_OVERLAY.bat."
  Read-Host "  Tekan Enter untuk tutup"
  exit 1
}

$ips = @()
try {
  $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not [System.Net.IPAddress]::IsLoopback($_) } |
    ForEach-Object { $_.ToString() }
} catch { }

Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Red
Write-Host "   SYNO OVERLAY JALAN  -  jangan tutup tetingkap ni" -ForegroundColor Green
Write-Host "  =====================================================" -ForegroundColor Red
Write-Host ""
Write-Host "  OBS overlay   : http://127.0.0.1:$port/overlay.html"
Write-Host "  App kawalan   : http://127.0.0.1:$port/control.html"
Write-Host "  Penonton      : http://127.0.0.1:$port/viewer.html"
foreach ($ip in $ips) {
  Write-Host "  Phone / admin : http://${ip}:$port/control.html   (Wi-Fi sama)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  PIN admin     : $pin   (tukar dalam data\admin_pin.txt)" -ForegroundColor Yellow
Write-Host ""

# buka app kawalan sebagai tetingkap app (Edge), atau browser biasa
$appUrl = "http://127.0.0.1:$port/control.html"
try { Start-Process 'msedge.exe' -ArgumentList "--app=$appUrl" } catch {
  try { Start-Process $appUrl } catch { }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    # sambungan kosong (preconnect browser) jangan tahan server
    $ready = $client.Client.Poll(400000, [System.Net.Sockets.SelectMode]::SelectRead)
    if (-not $ready -or $client.Available -eq 0) { continue }
    $client.ReceiveTimeout = 3000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
    $line = $reader.ReadLine()
    $hdr = @{}
    while ($true) {
      $h = $reader.ReadLine()
      if ($h -eq $null -or $h -eq '') { break }
      $ix = $h.IndexOf(':')
      if ($ix -gt 0) { $hdr[$h.Substring(0, $ix).Trim().ToLower()] = $h.Substring($ix + 1).Trim() }
    }
    $remoteIp = $client.Client.RemoteEndPoint.Address
    $isLocal = [System.Net.IPAddress]::IsLoopback($remoteIp) -and -not $hdr.ContainsKey('cf-connecting-ip') -and -not $hdr.ContainsKey('x-forwarded-for')
    $okPin = $isLocal -or ($hdr['x-pin'] -eq $pin)

    $status = '200 OK'; $type = 'text/plain; charset=utf-8'; $body = [byte[]]@(); $isHead = $false
    $m = [regex]::Match([string]$line, '^(GET|HEAD|POST) (\S+)')
    if (-not $m.Success) {
      $status = '400 Bad Request'; $body = ToBytes 'Bad request'
    } else {
      $method = $m.Groups[1].Value; $isHead = ($method -eq 'HEAD')
      $rawPath = $m.Groups[2].Value
      $qi = $rawPath.IndexOf('?'); if ($qi -ge 0) { $rawPath = $rawPath.Substring(0, $qi) }
      $path = [Uri]::UnescapeDataString($rawPath).TrimStart('/')
      if ($path -eq '') { $path = 'index.html' }

      if ($path -eq 'api/state') {
        if ($method -eq 'POST') {
          if (-not $okPin) {
            $status = '401 Unauthorized'; $body = ToBytes 'PIN salah'
          } else {
            $len = 0; [void][int]::TryParse([string]$hdr['content-length'], [ref]$len)
            $buf = New-Object char[] $len; $read = 0
            while ($read -lt $len) { $n = $reader.Read($buf, $read, $len - $read); if ($n -le 0) { break }; $read += $n }
            [System.IO.File]::WriteAllText($stateFile, [string]::new($buf, 0, $read))
            $body = ToBytes 'ok'
          }
        } elseif (Test-Path -LiteralPath $stateFile) {
          $body = [System.IO.File]::ReadAllBytes($stateFile)
        }
      } elseif ($path -eq 'api/auth') {
        $type = 'application/json'
        $ipList = ($ips | ForEach-Object { '"' + $_ + '"' }) -join ','
        $body = ToBytes ('{"local":' + $isLocal.ToString().ToLower() + ',"ok":' + $okPin.ToString().ToLower() + ',"port":' + $port + ',"ips":[' + $ipList + ']}')
      } elseif ($path -like 'data/*' -or $path -like 'data\*') {
        $status = '403 Forbidden'; $body = ToBytes 'Tiada akses'
      } else {
        $full = [System.IO.Path]::GetFullPath((Join-Path $root $path))
        if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
          $body = [System.IO.File]::ReadAllBytes($full)
          $ext = [System.IO.Path]::GetExtension($full).ToLower()
          if ($mime.ContainsKey($ext)) { $type = $mime[$ext] } else { $type = 'application/octet-stream' }
        } else {
          $status = '404 Not Found'; $body = ToBytes "Tak jumpa: $path"
        }
      }
    }
    $head = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if (-not $isHead -and $body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
