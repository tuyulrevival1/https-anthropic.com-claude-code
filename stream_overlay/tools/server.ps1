# Pelayan kecil untuk overlay. Tiada install diperlukan (guna PowerShell bawaan Windows).
# Dijalankan oleh START_OVERLAY.bat. Biar tetingkap ni terbuka selagi live.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8787
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.woff2' = 'font/woff2'
  '.mp4' = 'video/mp4'; '.json' = 'application/json'; '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
}
try {
  $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, $port)
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "  Port $port sedang digunakan. Mungkin overlay dah jalan dalam tetingkap lain." -ForegroundColor Yellow
  Write-Host "  Tutup tetingkap overlay yang lain, kemudian buka semula START_OVERLAY.bat."
  Read-Host "  Tekan Enter untuk tutup"
  exit 1
}
Write-Host ""
Write-Host "  ==============================================" -ForegroundColor Magenta
Write-Host "   OVERLAY JALAN:  http://127.0.0.1:$port/" -ForegroundColor Green
Write-Host "   Jangan tutup tetingkap ni selagi live." -ForegroundColor Green
Write-Host "  ==============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Overlay Arena : http://127.0.0.1:$port/overlay.html?layout=4"
Write-Host "  Panel queue   : http://127.0.0.1:$port/control.html"
Write-Host ""
try { Start-Process "http://127.0.0.1:$port/index.html" } catch { }
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $line = $reader.ReadLine()
    while ($true) { $h = $reader.ReadLine(); if ($h -eq $null -or $h -eq '') { break } }
    $status = '200 OK'; $type = 'text/plain; charset=utf-8'; $body = $null
    if ($line -match '^(GET|HEAD) (\S+)') {
      $isHead = $matches[1] -eq 'HEAD'
      $path = [Uri]::UnescapeDataString($matches[2].Split('?')[0]).TrimStart('/')
      if ($path -eq '') { $path = 'index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $path))
      if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
        $body = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        if ($mime.ContainsKey($ext)) { $type = $mime[$ext] } else { $type = 'application/octet-stream' }
      } else {
        $status = '404 Not Found'; $body = [Text.Encoding]::UTF8.GetBytes("Tak jumpa: $path")
      }
    } else {
      $isHead = $false; $status = '400 Bad Request'; $body = [Text.Encoding]::UTF8.GetBytes('Bad request')
    }
    $head = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $hb = [Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if (-not $isHead) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
