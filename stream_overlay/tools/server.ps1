# SYNO Overlay server. Tiada install diperlukan (guna PowerShell bawaan Windows).
# Dijalankan oleh START_OVERLAY.bat. Biar tetingkap ni terbuka selagi live.
#  - Fail overlay, App Kawalan & halaman penonton
#  - /api/state      : simpan & kongsi data (queue, baki VIP, W/L, timer)
#  - /api/order-hook/KUNCI : terima order automatik (Sociabuzz webhook)
#  - /api/orders     : App/overlay ambil order baru (PC ini / admin sahaja)
#  - Tulis data dari PC ni bebas; dari phone / admin / internet perlu PIN (data\admin_pin.txt)
#  - Link kekal (Tailscale Funnel): sediakan sekali dengan PASANG_LINK_KEKAL.bat
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8787
$dataDir = Join-Path $root 'data'
if (-not (Test-Path -LiteralPath $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
$stateFile = Join-Path $dataDir 'state.txt'
$pendingFile = Join-Path $dataDir 'orders_pending.txt'   # jurnal order: setiap baris ada nombor urutan "n", tak dipadam bila dibaca
$orderLog = Join-Path $dataDir 'orders_log.txt'
$pinFile = Join-Path $dataDir 'admin_pin.txt'
$keyFile = Join-Path $dataDir 'webhook_key.txt'
$publicFile = Join-Path $dataDir 'public_url.txt'

if (-not (Test-Path -LiteralPath $pinFile)) { [System.IO.File]::WriteAllText($pinFile, ('{0:D6}' -f (Get-Random -Minimum 0 -Maximum 1000000))) }
$pin = ([System.IO.File]::ReadAllText($pinFile)).Trim()
if (-not (Test-Path -LiteralPath $keyFile)) {
  $chars = 'abcdefghjkmnpqrstuvwxyz23456789'.ToCharArray()
  [System.IO.File]::WriteAllText($keyFile, (-join (1..20 | ForEach-Object { $chars | Get-Random })))
}
$hookKey = ([System.IO.File]::ReadAllText($keyFile)).Trim()

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.woff2' = 'font/woff2'
  '.mp4' = 'video/mp4'; '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'
  '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'; '.ico' = 'image/x-icon'
}
$latin1 = [System.Text.Encoding]::GetEncoding(28591)
function ToBytes([string]$s) { return [System.Text.Encoding]::UTF8.GetBytes($s) }
function JsonStr([string]$s) { return '"' + ($s -replace '\\', '\\' -replace '"', '\"') + '"' }

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

# ---------- link kekal: data\public_url.txt, atau Tailscale Funnel ----------
$publicUrl = ''
if (Test-Path -LiteralPath $publicFile) { $publicUrl = ([System.IO.File]::ReadAllText($publicFile)).Trim().TrimEnd('/') }
if (-not $publicUrl) {
  $ts = $null
  $cmd = Get-Command tailscale -ErrorAction SilentlyContinue
  if ($cmd) { $ts = $cmd.Source } elseif (Test-Path "$env:ProgramFiles\Tailscale\tailscale.exe") { $ts = "$env:ProgramFiles\Tailscale\tailscale.exe" }
  if ($ts) {
    try {
      # Funnel dihidupkan sekali oleh PASANG_LINK_KEKAL.bat (--bg, kekal walaupun restart). Di sini cuma semak.
      $job = Start-Job -ScriptBlock { param($exe) & $exe funnel status 2>&1 | Out-String } -ArgumentList $ts
      $out = ''; if (Wait-Job $job -Timeout 10) { $out = Receive-Job $job }
      Remove-Job $job -Force -ErrorAction SilentlyContinue
      $st = & $ts status --json | ConvertFrom-Json
      if ($out -match 'https://' -and $out -match "$port" -and $st.Self.DNSName) { $publicUrl = 'https://' + $st.Self.DNSName.TrimEnd('.') }
      elseif ($st.Self.DNSName) { Write-Host "  Tailscale ada, tapi Funnel belum hidup. Klik PASANG_LINK_KEKAL.bat sekali." -ForegroundColor Yellow }
    } catch { Write-Host "  (Tailscale tak dapat disemak: $($_.Exception.Message))" -ForegroundColor DarkYellow }
  }
}

Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Red
Write-Host "   SYNO OVERLAY JALAN  -  jangan tutup tetingkap ni" -ForegroundColor Green
Write-Host "  =====================================================" -ForegroundColor Red
Write-Host ""
Write-Host "  OBS overlay   : http://127.0.0.1:$port/overlay.html"
Write-Host "  App kawalan   : http://127.0.0.1:$port/control.html"
foreach ($ip in $ips) { Write-Host "  Wi-Fi sama    : http://${ip}:$port/control.html" -ForegroundColor Cyan }
if ($publicUrl) {
  Write-Host ""
  Write-Host "  LINK KEKAL (letak di Linktree / bio):" -ForegroundColor Magenta
  Write-Host "    Penonton : $publicUrl/viewer.html" -ForegroundColor Magenta
  Write-Host "    Admin    : $publicUrl/control.html   (perlu PIN)" -ForegroundColor Magenta
  Write-Host "    Sociabuzz webhook : $publicUrl/api/order-hook/$hookKey" -ForegroundColor Magenta
} else {
  Write-Host ""
  Write-Host "  Link kekal belum aktif. Klik PASANG_LINK_KEKAL.bat (sekali sahaja)." -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "  PIN admin     : $pin   (tukar dalam data\admin_pin.txt)" -ForegroundColor Yellow
Write-Host ""

$appUrl = "http://127.0.0.1:$port/control.html"
try { Start-Process 'msedge.exe' -ArgumentList "--app=$appUrl" } catch { try { Start-Process $appUrl } catch { } }

$fails = 0; $lockUntil = [DateTime]::MinValue
# nombor urutan order. Baris lama (tanpa "n") diberi nombor sekali semasa server mula.
$orderSeq = 0
if (Test-Path -LiteralPath $pendingFile) {
  $old = @([System.IO.File]::ReadAllLines($pendingFile) | Where-Object { $_.Trim() })
  $fixed = foreach ($ln in $old) {
    if ($ln -match '^\{"n":(\d+),') { $orderSeq = [Math]::Max($orderSeq, [int]$matches[1]); $ln }
    else { $orderSeq++; '{"n":' + $orderSeq + ',' + $ln.TrimStart().Substring(1) }
  }
  [System.IO.File]::WriteAllLines($pendingFile, [string[]]@($fixed))
}

# ---------- lagu sedang dimainkan (Spotify / IndoFinity guna Spotify) ----------
# 1) Windows media session (tunjuk lagu walaupun Spotify diminimize), 2) tajuk tetingkap Spotify "Artis - Lagu"
$npText = ''; $npAt = [DateTime]::MinValue; $npWinRT = $null
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $npAsTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
  $npWinRT = $true
} catch { $npWinRT = $false }
function NpAwait($op, [Type]$t) {
  $task = $npAsTask.MakeGenericMethod($t).Invoke($null, @($op))
  if ($task.Wait(1500)) { return $task.Result } else { return $null }
}
function Spotify-Ctl([string]$act) {
  if (-not $npWinRT) { return 'tiada-winrt' }
  try {
    if (-not $script:npMgr) { $script:npMgr = NpAwait ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]) }
    $ses = @($script:npMgr.GetSessions()) | Where-Object { $_.SourceAppUserModelId -match 'spotify' } | Select-Object -First 1
    if (-not $ses) { return 'tiada-spotify' }
    if ($act -eq 'pause') { [void](NpAwait ($ses.TryPauseAsync()) ([bool])) } else { [void](NpAwait ($ses.TryPlayAsync()) ([bool])) }
    return 'ok'
  } catch { return 'gagal' }
}
function Get-NowPlaying {
  $t = ''
  if ($npWinRT) {
    try {
      if (-not $script:npMgr) { $script:npMgr = NpAwait ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]) }
      if ($script:npMgr) {
        $ses = @($script:npMgr.GetSessions()) | Where-Object { $_.SourceAppUserModelId -match 'spotify' } | Select-Object -First 1
        if ($ses -and [string]$ses.GetPlaybackInfo().PlaybackStatus -eq 'Playing') {
          $pr = NpAwait ($ses.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
          if ($pr -and $pr.Title) { $t = $pr.Title; if ($pr.Artist) { $t = $pr.Artist + ' - ' + $pr.Title } }
        }
      }
    } catch { }
  }
  if (-not $t) {
    try {
      $w = Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -notmatch '^Spotify' -and $_.MainWindowTitle -ne 'Drag' } | Select-Object -First 1
      if ($w) { $t = $w.MainWindowTitle }
    } catch { }
  }
  return $t
}
# --- media dari app lain (IndoFinity / YouTube Music): tajuk lagu (Windows media) + bunyi setiap app (volume mixer) ---
$audioCs = @"
using System;
using System.Text;
using System.Globalization;
using System.Runtime.InteropServices;
namespace SynoAudio {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCo { }
  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator { [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices); }
  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection { [PreserveSig] int GetCount(out uint n); [PreserveSig] int Item(uint i, out IMMDevice dev); }
  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice { [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr prm, [MarshalAs(UnmanagedType.IUnknown)] out object iface); }
  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    [PreserveSig] int GetAudioSessionControl(IntPtr g, int f, out IntPtr c);
    [PreserveSig] int GetSimpleAudioVolume(IntPtr g, int f, out IntPtr v);
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator e);
  }
  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator { [PreserveSig] int GetCount(out int n); [PreserveSig] int GetSession(int i, out IAudioSessionControl2 s); }
  [ComImport, Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out int st);
    [PreserveSig] int GetDisplayName(out IntPtr name);
    [PreserveSig] int SetDisplayName(IntPtr v, IntPtr ctx);
    [PreserveSig] int GetIconPath(out IntPtr p);
    [PreserveSig] int SetIconPath(IntPtr v, IntPtr ctx);
    [PreserveSig] int GetGroupingParam(out Guid g);
    [PreserveSig] int SetGroupingParam(ref Guid g, IntPtr ctx);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr n);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr n);
    [PreserveSig] int GetSessionIdentifier(out IntPtr s);
    [PreserveSig] int GetSessionInstanceIdentifier(out IntPtr s);
    [PreserveSig] int GetProcessId(out uint pid);
  }
  [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioMeterInformation { [PreserveSig] int GetPeakValue(out float peak); }
  public static class Meter {
    // "pid:peak;pid:peak" for every audio session on every active output device
    public static string Scan() {
      var sb = new StringBuilder();
      var en = (IMMDeviceEnumerator)new MMDeviceEnumeratorCo();
      IMMDeviceCollection col; if (en.EnumAudioEndpoints(0, 1, out col) != 0 || col == null) return "";
      uint nd; col.GetCount(out nd);
      Guid iid = typeof(IAudioSessionManager2).GUID;
      for (uint d = 0; d < nd; d++) {
        IMMDevice dev; if (col.Item(d, out dev) != 0 || dev == null) continue;
        object o; if (dev.Activate(ref iid, 23, IntPtr.Zero, out o) != 0 || o == null) continue;
        IAudioSessionEnumerator se; if (((IAudioSessionManager2)o).GetSessionEnumerator(out se) != 0 || se == null) continue;
        int n; se.GetCount(out n);
        for (int i = 0; i < n; i++) {
          IAudioSessionControl2 c; if (se.GetSession(i, out c) != 0 || c == null) continue;
          try {
            uint pid; c.GetProcessId(out pid); float pk = 0;
            var m = c as IAudioMeterInformation; if (m != null) m.GetPeakValue(out pk);
            sb.Append(pid).Append(':').Append(pk.ToString("0.####", CultureInfo.InvariantCulture)).Append(';');
          } catch { }
          Marshal.ReleaseComObject(c);
        }
        Marshal.ReleaseComObject(se); Marshal.ReleaseComObject(o); Marshal.ReleaseComObject(dev);
      }
      Marshal.ReleaseComObject(col); Marshal.ReleaseComObject(en);
      return sb.ToString();
    }
  }
}
"@
$audioOk = $false
try { Add-Type -TypeDefinition $audioCs -Language CSharp -ErrorAction Stop; $audioOk = $true } catch { Write-Host 'Pengesan bunyi app tak dapat dimuat (lagu IndoFinity cuma dikesan ikut tajuk).' -ForegroundColor DarkYellow }
function CleanTxt([string]$s) { return ($s -replace '[\x00-\x1f]', ' ').Trim() }
function Get-MediaJson {
  $sm = @()
  if ($npWinRT) {
    try {
      if (-not $script:npMgr) { $script:npMgr = NpAwait ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]) }
      foreach ($ses in @($script:npMgr.GetSessions())) {
        $ti = ''; $ar = ''
        try { $pr = NpAwait ($ses.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]); if ($pr) { $ti = [string]$pr.Title; $ar = [string]$pr.Artist } } catch { }
        $pl = ([string]$ses.GetPlaybackInfo().PlaybackStatus -eq 'Playing')
        $sm += '{"app":' + (JsonStr (CleanTxt ([string]$ses.SourceAppUserModelId))) + ',"playing":' + ([string]$pl).ToLower() + ',"title":' + (JsonStr (CleanTxt $ti)) + ',"artist":' + (JsonStr (CleanTxt $ar)) + '}'
      }
    } catch { }
  }
  $au = @()
  if ($audioOk) {
    try {
      $by = @{}
      foreach ($p in ([SynoAudio.Meter]::Scan()).Split(';')) {
        if (-not $p) { continue }
        $a = $p.Split(':'); $id = [int]$a[0]; $pk = [double]::Parse($a[1], [Globalization.CultureInfo]::InvariantCulture)
        if ($id -eq 0) { continue }
        $nm = ''; try { $nm = (Get-Process -Id $id -ErrorAction Stop).ProcessName } catch { $nm = 'pid' + $id }
        if (-not $by.ContainsKey($nm) -or $by[$nm] -lt $pk) { $by[$nm] = $pk }
      }
      foreach ($k in $by.Keys) { $au += '{"name":' + (JsonStr (CleanTxt $k)) + ',"peak":' + $by[$k].ToString('0.####', [Globalization.CultureInfo]::InvariantCulture) + '}' }
    } catch { }
  }
  return '{"winrt":' + ([string][bool]$npWinRT).ToLower() + ',"audioOk":' + ([string]$audioOk).ToLower() + ',"smtc":[' + ($sm -join ',') + '],"audio":[' + ($au -join ',') + ']}'
}
$mediaJson = ''; $mediaAt = [DateTime]::MinValue
$hookHits = New-Object System.Collections.ArrayList   # 15 cubaan webhook terakhir (untuk App > Status webhook)
$cmds = New-Object System.Collections.ArrayList       # arahan Stream Deck menunggu overlay / App ambil
$deckActs = @('win', 'lose', 'win-1', 'lose-1', 'end-win', 'end-lose', 'end', 'timer-start', 'timer-pause', 'timer-reset', 'queue-on', 'queue-off', 'banner-on', 'banner-off', 'wl-reset', 'win-reset', 'lose-reset')
$fwdHeaders = @('x-forwarded-for', 'cf-connecting-ip', 'x-forwarded-host', 'forwarded', 'x-real-ip', 'tailscale-funnel-request')

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $ready = $client.Client.Poll(400000, [System.Net.Sockets.SelectMode]::SelectRead)
    if (-not $ready -or $client.Available -eq 0) { continue }
    $client.ReceiveTimeout = 4000
    $stream = $client.GetStream()

    # ---- read request bytes (headers + body) ----
    $buf = New-Object byte[] 65536; $ms = New-Object System.IO.MemoryStream; $hEnd = -1
    while ($hEnd -lt 0 -and $ms.Length -lt 65536) {
      $n = $stream.Read($buf, 0, $buf.Length); if ($n -le 0) { break }
      $ms.Write($buf, 0, $n); $hEnd = $latin1.GetString($ms.ToArray()).IndexOf("`r`n`r`n")
    }
    if ($hEnd -lt 0) { continue }
    $all = $ms.ToArray(); $headText = $latin1.GetString($all, 0, $hEnd)
    $lines = $headText -split "`r`n"; $line = $lines[0]; $hdr = @{}
    foreach ($h in $lines[1..($lines.Count - 1)]) { $ix = $h.IndexOf(':'); if ($ix -gt 0) { $hdr[$h.Substring(0, $ix).Trim().ToLower()] = $h.Substring($ix + 1).Trim() } }
    $len = 0; [void][int]::TryParse([string]$hdr['content-length'], [ref]$len); if ($len -gt 1048576) { $len = 1048576 }
    $bodyMs = New-Object System.IO.MemoryStream; $start = $hEnd + 4
    if (([string]$hdr['expect']) -match '100-continue' -and $all.Length -le $start) {
      $cont = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 100 Continue`r`n`r`n"); $stream.Write($cont, 0, $cont.Length); $stream.Flush()
    }
    if (([string]$hdr['transfer-encoding']) -match 'chunked') {
      # body dihantar dalam 'chunk' (tiada Content-Length): baca sampai chunk 0, kemudian cantum
      $raw = New-Object System.IO.MemoryStream
      if ($all.Length -gt $start) { $raw.Write($all, $start, $all.Length - $start) }
      try {
        while ($raw.Length -lt 1048576 -and -not $latin1.GetString($raw.ToArray()).EndsWith("0`r`n`r`n")) {
          $n = $stream.Read($buf, 0, $buf.Length); if ($n -le 0) { break }; $raw.Write($buf, 0, $n)
        }
      } catch { }
      $rb = $raw.ToArray(); $pos = 0
      while ($pos -lt $rb.Length) {
        $le = $latin1.GetString($rb, $pos, [Math]::Min(32, $rb.Length - $pos)).IndexOf("`r`n"); if ($le -lt 0) { break }
        $sz = 0; try { $sz = [Convert]::ToInt32((($latin1.GetString($rb, $pos, $le)) -split ';')[0].Trim(), 16) } catch { break }
        $pos += $le + 2; if ($sz -le 0) { break }
        $bodyMs.Write($rb, $pos, [Math]::Min($sz, $rb.Length - $pos)); $pos += $sz + 2
      }
    } else {
      if ($all.Length -gt $start) { $bodyMs.Write($all, $start, [Math]::Min($all.Length - $start, $len)) }
      while ($bodyMs.Length -lt $len) { $n = $stream.Read($buf, 0, [Math]::Min($buf.Length, $len - $bodyMs.Length)); if ($n -le 0) { break }; $bodyMs.Write($buf, 0, $n) }
    }
    $bodyBytes = $bodyMs.ToArray()

    # ---- who is calling? ----
    $remoteIp = $client.Client.RemoteEndPoint.Address
    $fwd = $false; foreach ($f in $fwdHeaders) { if ($hdr.ContainsKey($f)) { $fwd = $true } }
    $isLocal = [System.Net.IPAddress]::IsLoopback($remoteIp) -and -not $fwd -and ([string]$hdr['host'] -match '^(127\.0\.0\.1|localhost)(:\d+)?$')
    $locked = (Get-Date) -lt $lockUntil
    $okPin = $isLocal -or (-not $locked -and $hdr['x-pin'] -and $hdr['x-pin'] -eq $pin)
    if (-not $isLocal -and $hdr['x-pin'] -and -not $okPin -and -not $locked) {
      $fails++; if ($fails -ge 10) { $lockUntil = (Get-Date).AddMinutes(10); $fails = 0; Write-Host "  PIN salah terlalu banyak kali. Akses admin luar dikunci 10 minit." -ForegroundColor Red }
    }

    $status = '200 OK'; $type = 'text/plain; charset=utf-8'; $body = [byte[]]@(); $isHead = $false; $cors = $false
    $m = [regex]::Match([string]$line, '^(GET|HEAD|POST|OPTIONS) (\S+)')
    if (-not $m.Success) {
      $status = '400 Bad Request'; $body = ToBytes 'Bad request'
    } else {
      $method = $m.Groups[1].Value; $isHead = ($method -eq 'HEAD')
      $rawPath = $m.Groups[2].Value; $query = ''
      $qi = $rawPath.IndexOf('?'); if ($qi -ge 0) { $query = $rawPath.Substring($qi + 1); $rawPath = $rawPath.Substring(0, $qi) }
      $path = [Uri]::UnescapeDataString($rawPath).TrimStart('/')
      if ($path -eq '') { $path = 'index.html' }

      if ($path -eq 'api/state') {
        if ($method -eq 'POST') {
          if ($locked -and -not $isLocal) { $status = '429 Too Many Requests'; $body = ToBytes 'Dikunci sementara' }
          elseif (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes 'PIN salah' }
          else { [System.IO.File]::WriteAllBytes($stateFile, $bodyBytes); $body = ToBytes 'ok' }
        } elseif (Test-Path -LiteralPath $stateFile) { $body = [System.IO.File]::ReadAllBytes($stateFile) }
      } elseif ($path -eq 'api/order-hook' -or $path -like 'api/order-hook/*') {
        # Sociabuzz (atau servis lain) POST order ke sini. Kunci rahsia: /api/order-hook/KUNCI, ?key=KUNCI, atau header token
        $k = ''; foreach ($pair in $query -split '&') { if ($pair -like 'key=*') { $k = [Uri]::UnescapeDataString($pair.Substring(4)) } }
        if ($path -like 'api/order-hook/*') { $k = $path.Substring(15) }
        foreach ($hn in @('sb-webhook-token', 'x-sociabuzz-webhook-token', 'x-sociabuzz-token', 'x-webhook-token')) { if (-not $k -and $hdr[$hn]) { $k = $hdr[$hn] } }
        if (-not $k -and ([string]$hdr['authorization']) -match '^Bearer\s+(.+)$') { $k = $matches[1] }
        $k = ([string]$k).Trim().TrimEnd('/').Trim()   # URL ditampal dengan '/' atau ruang di hujung
        $via = 'Wi-Fi / Tailscale'
        if ($hdr.ContainsKey('tailscale-funnel-request') -or $hdr.ContainsKey('x-forwarded-for')) { $via = 'internet' } elseif ($isLocal) { $via = 'PC ini' }
        $res = 'ok'
        if ($method -ne 'POST') { $res = 'get' } elseif ($k -ne $hookKey) { $res = 'key' } elseif ($bodyBytes.Length -eq 0) { $res = 'empty' }
        $ua = ([string]$hdr['user-agent']); if ($ua.Length -gt 40) { $ua = $ua.Substring(0, 40) }
        [void]$hookHits.Insert(0, ('{"t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"r":' + (JsonStr $res) + ',"via":' + (JsonStr $via) + ',"n":' + $bodyBytes.Length + ',"ua":' + (JsonStr $ua) + '}'))
        while ($hookHits.Count -gt 15) { $hookHits.RemoveAt(15) }
        if ($res -eq 'key') { Write-Host ("  Webhook ditolak: kunci salah ({0}, {1}). Salin semula Webhook URL dari App." -f $via, (Get-Date -Format 'h:mm tt')) -ForegroundColor Red }
        elseif ($res -eq 'get') { Write-Host ("  Webhook dibuka dalam browser ({0}) - link OK" -f $via) -ForegroundColor Cyan }
        if ($method -ne 'POST') { $body = ToBytes 'OK' }   # test dari Sociabuzz / browser: jawapan sama 'OK'
        elseif ($k -ne $hookKey) { $status = '403 Forbidden'; $body = ToBytes 'Kunci salah' }
        else {
          $b64 = [Convert]::ToBase64String($bodyBytes)
          $ct = [string]$hdr['content-type']
          $orderSeq++
          $entry = '{"n":' + $orderSeq + ',"t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"ct":' + (JsonStr $ct) + ',"b":"' + $b64 + '"}'
          [System.IO.File]::AppendAllText($pendingFile, $entry + "`n")
          $hlist = ($hdr.GetEnumerator() | Where-Object { $_.Key -ne 'x-pin' } | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '; '
          [System.IO.File]::AppendAllText($orderLog, (Get-Date -Format 's') + "`r`n  HEADERS: " + $hlist + "`r`n  BODY: " + [System.Text.Encoding]::UTF8.GetString($bodyBytes) + "`r`n")
          Write-Host ("  Order baru diterima #{0} ({1})" -f $orderSeq, (Get-Date -Format 'h:mm tt')) -ForegroundColor Green
          $body = ToBytes 'OK'   # isi 'Webhook HTTP Test Response' di Sociabuzz dengan: OK
        }
      } elseif ($path -like 'api/do/*') {
        # Stream Deck: GET http://127.0.0.1:8787/api/do/end-win  (dari PC ni bebas; dari luar perlu ?pin=PIN)
        $act = $path.Substring(7).ToLower(); $qp = ''
        foreach ($pair in $query -split '&') { if ($pair -like 'pin=*') { $qp = [Uri]::UnescapeDataString($pair.Substring(4)) } }
        $okDo = $okPin -or (-not $locked -and $qp -and $qp -eq $pin)
        if ($deckActs -notcontains $act) { $status = '404 Not Found'; $body = ToBytes ('Arahan tak dikenali: ' + $act) }
        elseif (-not $okDo) { $status = '401 Unauthorized'; $body = ToBytes 'PIN salah'; if ($qp) { $fails++ } }
        else {
          [void]$cmds.Add('{"a":' + (JsonStr $act) + ',"t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '}')
          while ($cmds.Count -gt 30) { $cmds.RemoveAt(0) }
          Write-Host ("  Stream Deck: {0} ({1})" -f $act, (Get-Date -Format 'h:mm:ss tt')) -ForegroundColor Cyan
          $body = ToBytes ('OK ' + $act)
        }
      } elseif ($path -eq 'api/cmds') {
        $type = 'application/json'
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes '[]' }
        else { $body = ToBytes ('[' + ($cmds -join ',') + ']'); $cmds.Clear() }
      } elseif ($path -eq 'api/wl') {
        # untuk plugin Stream Deck: bilangan W/L sekarang (dibaca dari state.txt)
        $type = 'application/json'; $w = 0; $l = 0
        if (Test-Path -LiteralPath $stateFile) {
          try {
            $txt = [Uri]::UnescapeDataString([System.IO.File]::ReadAllText($stateFile))
            if ($txt -match '"wins":(\d+)') { $w = [int]$matches[1] }
            if ($txt -match '"losses":(\d+)') { $l = [int]$matches[1] }
          } catch { }
        }
        $body = ToBytes ('{"w":' + $w + ',"l":' + $l + '}'); $cors = $true
      } elseif ($path -eq 'api/versi') {
        # versi yang dipasang oleh KEMASKINI.bat (App bandingkan dengan GitHub)
        $vf = Join-Path $dataDir 'versi.txt'; $v = ''; if (Test-Path -LiteralPath $vf) { $v = ([System.IO.File]::ReadAllText($vf)).Trim() }
        $body = ToBytes $v
      } elseif ($path -eq 'api/nowplaying') {
        $type = 'application/json'
        if (((Get-Date) - $npAt).TotalSeconds -ge 2.5) { $npText = Get-NowPlaying; $npAt = Get-Date }
        $body = ToBytes ('{"t":' + (JsonStr $npText) + '}')
      } elseif ($path -eq 'api/media') {
        # app lain yang sedang main lagu (untuk jeda Spotify bila IndoFinity main lagu request)
        $type = 'application/json'
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes '{}' }
        else {
          if (((Get-Date) - $mediaAt).TotalSeconds -ge 1) { $mediaJson = Get-MediaJson; $mediaAt = Get-Date }
          $body = ToBytes $mediaJson
        }
      } elseif ($path -eq 'api/hooklog') {
        $type = 'application/json'
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes '[]' }
        else { $body = ToBytes ('[' + ($hookHits -join ',') + ']') }
      } elseif ($path -eq 'api/song-hook' -or $path -like 'api/song-hook/*') {
        # IndoFinity (atau tool TikTok lain) hantar song request: /api/song-hook/KUNCI?user={username}&comment={comment}
        $k = ''; if ($path -like 'api/song-hook/*') { $k = $path.Substring(14) }
        foreach ($pair in $query -split '&') { if (-not $k -and $pair -like 'key=*') { $k = [Uri]::UnescapeDataString($pair.Substring(4)) } }
        $k = ([string]$k).Trim().TrimEnd('/').Trim()
        $via = 'Wi-Fi / Tailscale'; if ($hdr.ContainsKey('tailscale-funnel-request') -or $hdr.ContainsKey('x-forwarded-for')) { $via = 'internet' } elseif ($isLocal) { $via = 'PC ini' }
        $res = 'song'; if ($k -ne $hookKey) { $res = 'key' }
        [void]$hookHits.Insert(0, ('{"t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"r":' + (JsonStr $res) + ',"via":' + (JsonStr ($via + ' · lagu')) + ',"n":' + $bodyBytes.Length + ',"ua":' + (JsonStr '') + '}'))
        while ($hookHits.Count -gt 15) { $hookHits.RemoveAt(15) }
        if ($k -ne $hookKey) { $status = '403 Forbidden'; $body = ToBytes 'Kunci salah' }
        else {
          $orderSeq++
          $entry = '{"n":' + $orderSeq + ',"k":"song","t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"q":' + (JsonStr $query) + ',"ct":' + (JsonStr ([string]$hdr['content-type'])) + ',"b":"' + [Convert]::ToBase64String($bodyBytes) + '"}'
          [System.IO.File]::AppendAllText($pendingFile, $entry + "`n")
          Write-Host ("  Song request diterima #{0} ({1})" -f $orderSeq, (Get-Date -Format 'h:mm tt')) -ForegroundColor Cyan
          $body = ToBytes 'OK'
        }
      } elseif ($path -like 'api/spotify/*') {
        # jeda / sambung Spotify (PC ini atau admin PIN)
        $act = $path.Substring(12)
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes 'PIN salah' }
        elseif ($act -notin @('pause', 'play')) { $status = '404 Not Found'; $body = ToBytes 'pause / play sahaja' }
        else { $body = ToBytes (Spotify-Ctl $act) }
      } elseif ($path -eq 'api/orders') {
        $type = 'application/json'
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes '[]' }
        else {
          # pulangkan order dengan nombor > after. Tak dipadam: App / overlay ingat nombor terakhir (orderSeq dalam state)
          $after = 0; foreach ($pair in $query -split '&') { if ($pair -like 'after=*') { [void][int]::TryParse($pair.Substring(6), [ref]$after) } }
          $items = @()
          if (Test-Path -LiteralPath $pendingFile) {
            $all = @([System.IO.File]::ReadAllLines($pendingFile) | Where-Object { $_.Trim() })
            if ($all.Count -gt 400) { $all = @($all[($all.Count - 300)..($all.Count - 1)]); [System.IO.File]::WriteAllLines($pendingFile, [string[]]$all) }
            $items = @($all | Where-Object { $_ -match '^\{"n":(\d+),' -and [int]$matches[1] -gt $after })
          }
          $body = ToBytes ('{"last":' + $orderSeq + ',"items":[' + ($items -join ',') + ']}')
        }
      } elseif ($path -eq 'api/rank-upload') {
        # rank_tool.html simpan logo rank yang dipotong (PNG) ke assets\ranks\
        $nm = ''; foreach ($pair in $query -split '&') { if ($pair -like 'name=*') { $nm = [Uri]::UnescapeDataString($pair.Substring(5)) } }
        if ($method -ne 'POST' -or $nm -notin @('epic', 'legend', 'mythic', 'honor', 'glory', 'immortal')) { $status = '400 Bad Request'; $body = ToBytes 'Nama rank salah' }
        elseif (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes 'PIN salah' }
        elseif ($bodyBytes.Length -lt 8 -or $bodyBytes[0] -ne 0x89 -or $bodyBytes[1] -ne 0x50) { $status = '400 Bad Request'; $body = ToBytes 'Bukan PNG' }
        else {
          $rdir = Join-Path $root 'assets\ranks'; if (-not (Test-Path -LiteralPath $rdir)) { New-Item -ItemType Directory -Path $rdir | Out-Null }
          [System.IO.File]::WriteAllBytes((Join-Path $rdir ($nm + '.png')), $bodyBytes); $body = ToBytes 'ok'
        }
      } elseif ($path -eq 'api/auth') {
        $type = 'application/json'
        $ipList = ($ips | ForEach-Object { JsonStr $_ }) -join ','
        $hook = ''; if ($okPin -and $publicUrl) { $hook = "$publicUrl/api/order-hook/$hookKey" } elseif ($okPin) { $hook = "/api/order-hook/$hookKey" }
        $body = ToBytes ('{"local":' + $isLocal.ToString().ToLower() + ',"ok":' + $okPin.ToString().ToLower() + ',"locked":' + $locked.ToString().ToLower() + ',"port":' + $port + ',"ips":[' + $ipList + '],"publicUrl":' + (JsonStr $publicUrl) + ',"hookUrl":' + (JsonStr $hook) + '}')
      } elseif ($path -like 'data/*' -or $path -like 'data\*' -or $path -like 'tools/*' -or $path -like 'tools\*') {
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
    $extra = ''; if ($cors) { $extra = "Access-Control-Allow-Origin: *`r`n" }
    $head = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`n$($extra)Connection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if (-not $isHead -and $body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
