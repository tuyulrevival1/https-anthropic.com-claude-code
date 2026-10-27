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
# teks yang tertera dalam tetingkap IndoFinity (tajuk lagu + @peminta), dibaca guna Windows UI Automation
$uiaOk = $false
try { Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes -ErrorAction Stop; $uiaOk = $true } catch { }
$ifxJson = '[]'; $ifxAt = [DateTime]::MinValue
# Fungsi baca media / IndoFinity. Dijalankan di thread belakang supaya server tak lambat (butang on / off terus laju).
$mediaDefs = @'
function JsonStr([string]$s) { return '"' + ($s -replace '\\', '\\' -replace '"', '\"') + '"' }
function NpAwait($op, [Type]$t) {
  $task = $npAsTask.MakeGenericMethod($t).Invoke($null, @($op))
  if ($task.Wait(1500)) { return $task.Result } else { return $null }
}
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
      foreach ($k in $by.Keys) {
        # tajuk tetingkap app (sesetengah player tulis tajuk lagu di situ)
        $wt = ''; try { $wt = [string](Get-Process -Name $k -ErrorAction Stop | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle } catch { }
        $au += '{"name":' + (JsonStr (CleanTxt $k)) + ',"peak":' + $by[$k].ToString('0.####', [Globalization.CultureInfo]::InvariantCulture) + ',"win":' + (JsonStr (CleanTxt $wt)) + '}'
      }
    } catch { }
  }
  # baca teks IndoFinity setiap 3 saat, hanya bila ia berbunyi (supaya server tak lambat)
  $ifLoud = $false; foreach ($x in $au) { if ($x -match '"name":"IndoFinity"' -and $x -notmatch '"peak":0[,}]' -and $x -notmatch '"peak":0\.0(0|1)') { $ifLoud = $true } }
  if ($ifLoud -and ((Get-Date) - $script:ifxAt).TotalSeconds -ge 3) { $script:ifxJson = Get-IfxTexts; $script:ifxAt = Get-Date }
  elseif (-not $ifLoud -and ((Get-Date) - $script:ifxAt).TotalSeconds -ge 20) { $script:ifxJson = '[]' }
  return '{"winrt":' + ([string][bool]$npWinRT).ToLower() + ',"audioOk":' + ([string]$audioOk).ToLower() + ',"uia":' + ([string]$uiaOk).ToLower() + ',"smtc":[' + ($sm -join ',') + '],"audio":[' + ($au -join ',') + '],"ifx":' + $script:ifxJson + '}'
}
function Get-IfxTexts {
  if (-not $uiaOk) { return '[]' }
  $out = New-Object System.Collections.ArrayList
  try {
    $pids = @(Get-Process -Name 'IndoFinity' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    if ($pids.Count -eq 0) { return '[]' }
    $A = [System.Windows.Automation.AutomationElement]
    $wins = $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($w in $wins) {
      if ($pids -notcontains $w.Current.ProcessId) { continue }
      [void]$out.Add((JsonStr ('[tetingkap] ' + (CleanTxt ([string]$w.Current.Name)))))
      # semua elemen yang ada nama (teks, link, item senarai, kumpulan) ikut susunan skrin
      $prev = ''
      foreach ($e in $w.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
        $n = ''; try { $n = CleanTxt ([string]$e.Current.Name) } catch { }
        if ($n -and $n -ne $prev -and $n.Length -le 200) { [void]$out.Add((JsonStr $n)); $prev = $n }
        if ($out.Count -ge 400) { break }
      }
    }
  } catch { }
  return '[' + ($out -join ',') + ']'
}
'@
. ([ScriptBlock]::Create($mediaDefs))
$mediaShared = [hashtable]::Synchronized(@{ json = ''; want = [DateTime]::MinValue })
$mediaBg = $null
try {
  $mediaPS = [PowerShell]::Create()
  [void]$mediaPS.AddScript('param($shared, $npAsTask, $npWinRT, $audioOk, $uiaOk)' + "`n" + $mediaDefs + @'
$script:ifxJson = '[]'; $script:ifxAt = [DateTime]::MinValue
while ($true) {
  if (((Get-Date) - $shared.want).TotalSeconds -lt 15) { try { $shared.json = Get-MediaJson } catch { } ; Start-Sleep -Milliseconds 450 }
  else { Start-Sleep -Milliseconds 400 }
}
'@)
  [void]$mediaPS.AddArgument($mediaShared).AddArgument($npAsTask).AddArgument($npWinRT).AddArgument($audioOk).AddArgument($uiaOk)
  $mediaBg = $mediaPS.BeginInvoke()
} catch { $mediaBg = $null }
$mediaJson = ''; $mediaAt = [DateTime]::MinValue
# ---------- auto efek kill MLBB: baca banner kill di skrin game (Windows OCR), di thread belakang ----------
$capCs = @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Drawing.Imaging;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
namespace SynoCap {
  public static class Cap {
    delegate bool EnumProc(IntPtr h, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    static bool dpiSet = false;
    static void Dpi() { if (!dpiSet) { dpiSet = true; try { SetProcessDPIAware(); } catch { } } }
    static string Title(IntPtr h) { var t = new StringBuilder(300); GetWindowText(h, t, 300); return t.ToString(); }
    // tajuk semua tetingkap yang nampak (satu baris setiap satu)
    public static string List() {
      var sb = new StringBuilder();
      EnumWindows((h, p) => { if (IsWindowVisible(h)) { string s = Title(h); if (s.Length > 0) sb.Append(s.Replace("\n", " ")).Append('\n'); } return true; }, IntPtr.Zero);
      return sb.ToString();
    }
    static IntPtr Find(string part) {
      IntPtr found = IntPtr.Zero; string want = (part ?? "").ToLowerInvariant();
      if (want.Length == 0) return found;
      EnumWindows((h, p) => { if (IsWindowVisible(h) && Title(h).ToLowerInvariant().Contains(want)) { found = h; return false; } return true; }, IntPtr.Zero);
      return found;
    }
    // bahagian gelap (0..1), sampel kasar
    static double DarkRatio(Bitmap b) {
      int n = 0, d = 0, sx = Math.Max(1, b.Width / 40), sy = Math.Max(1, b.Height / 40);
      for (int y = 0; y < b.Height; y += sy) for (int x = 0; x < b.Width; x += sx) { Color c = b.GetPixel(x, y); n++; if (c.R + c.G + c.B < 30) d++; }
      return n == 0 ? 1 : (double)d / n;
    }
    // tangkap seluruh tetingkap. mode = "pw" (PrintWindow) atau "skrin" (salin dari skrin bila PrintWindow hitam)
    public static Bitmap Snap(string title, out string mode) {
      mode = ""; Dpi();
      IntPtr h = Find(title);
      if (h == IntPtr.Zero) { mode = "tetingkap tak jumpa"; return null; }
      if (IsIconic(h)) { mode = "tetingkap diminimize"; return null; }
      RECT r; GetWindowRect(h, out r);
      int W = r.R - r.L, H = r.B - r.T;
      if (W < 80 || H < 80) { mode = "tetingkap terlalu kecil"; return null; }
      var full = new Bitmap(W, H, PixelFormat.Format32bppArgb);
      bool ok;
      using (var g = Graphics.FromImage(full)) { IntPtr dc = g.GetHdc(); ok = PrintWindow(h, dc, 2); g.ReleaseHdc(dc); }
      mode = "pw";
      if (!ok || DarkRatio(full) > 0.9) {
        try { using (var g = Graphics.FromImage(full)) g.CopyFromScreen(r.L, r.T, 0, 0, new Size(W, H)); mode = "skrin"; } catch { }
      }
      return full;
    }
    // gambar dari OBS (bytes jpg/png) jadi Bitmap
    public static Bitmap FromBytes(byte[] data) {
      if (data == null || data.Length == 0) return null;
      using (var ms = new MemoryStream(data)) using (var img = Image.FromStream(ms)) return new Bitmap(img);
    }
    // potong bahagian (pecahan 0..1), besarkan untuk OCR, pulangkan PNG. stat = "biru,merah,gelap"
    public static byte[] Crop(Bitmap full, double fx, double fy, double fw, double fh, double scale, out string stat) { return Crop(full, fx, fy, fw, fh, scale, false, out stat); }
    // enh = versi kelabu kontras tinggi (bantu OCR baca tulisan banner yang berwarna-warni)
    public static byte[] Crop(Bitmap full, double fx, double fy, double fw, double fh, double scale, bool enh, out string stat) {
      stat = "0,0,0";
      int W = full.Width, H = full.Height;
      int cx = Math.Max(0, Math.Min(W - 10, (int)(W * fx))), cy = Math.Max(0, Math.Min(H - 10, (int)(H * fy)));
      int cw = Math.Max(10, Math.Min(W - cx, (int)(W * fw))), ch = Math.Max(10, Math.Min(H - cy, (int)(H * fh)));
      double sc = scale;
      if (cw * sc > 2400) sc = 2400.0 / cw;
      if (ch * sc > 2400) sc = Math.Min(sc, 2400.0 / ch);
      int ow = Math.Max(40, (int)(cw * sc)), oh = Math.Max(40, (int)(ch * sc));
      using (var crop = new Bitmap(ow, oh, PixelFormat.Format32bppArgb)) {
        using (var g2 = Graphics.FromImage(crop)) {
          g2.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
          g2.DrawImage(full, new Rectangle(0, 0, ow, oh), new Rectangle(cx, cy, cw, ch), GraphicsUnit.Pixel);
        }
        int blue = 0, red = 0, dark = 0;
        for (int y = 0; y < oh; y += 4) for (int x = 0; x < ow; x += 4) {
          Color c = crop.GetPixel(x, y);
          if (c.R + c.G + c.B < 60) dark++;
          if (c.B > 140 && c.B > c.R + 50) blue++; else if (c.R > 150 && c.R > c.B + 60 && c.R > c.G + 40) red++;
        }
        stat = blue + "," + red + "," + dark;
        if (enh) {
          var rect = new Rectangle(0, 0, ow, oh);
          var bd = crop.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
          int n = bd.Stride * oh; var px = new byte[n]; Marshal.Copy(bd.Scan0, px, 0, n);
          int lo = 255, hi = 0;
          for (int i = 0; i < n; i += 4) { int l = (px[i] * 29 + px[i + 1] * 150 + px[i + 2] * 77) >> 8; if (l < lo) lo = l; if (l > hi) hi = l; }
          int span = Math.Max(1, hi - lo);
          for (int i = 0; i < n; i += 4) {
            int l = (px[i] * 29 + px[i + 1] * 150 + px[i + 2] * 77) >> 8;
            int v = (l - lo) * 255 / span; v = v > 150 ? 0 : 255;   // tulisan terang jadi hitam atas putih
            px[i] = px[i + 1] = px[i + 2] = (byte)v; px[i + 3] = 255;
          }
          Marshal.Copy(px, 0, bd.Scan0, n); crop.UnlockBits(bd);
        }
        using (var ms = new MemoryStream()) { crop.Save(ms, ImageFormat.Png); return ms.ToArray(); }
      }
    }
    // gambar kecil (JPEG) untuk pratonton dalam App
    public static byte[] Thumb(Bitmap full, int maxW) {
      int w = Math.Min(maxW, full.Width), h = Math.Max(1, (int)((double)full.Height * w / full.Width));
      using (var t = new Bitmap(w, h, PixelFormat.Format24bppRgb)) {
        using (var g = Graphics.FromImage(t)) { g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBilinear; g.DrawImage(full, 0, 0, w, h); }
        var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
        var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 70L);
        using (var ms = new MemoryStream()) { t.Save(ms, enc, ps); return ms.ToArray(); }
      }
    }
  }
  // OBS WebSocket 5 (OBS 28+): ambil gambar source terus dari OBS
  public class Obs : IDisposable {
    ClientWebSocket ws; int rid = 0;
    public string Error = "";
    public bool Ok { get { return ws != null && ws.State == WebSocketState.Open; } }
    static string B64Sha(string s) { using (var h = SHA256.Create()) return Convert.ToBase64String(h.ComputeHash(Encoding.UTF8.GetBytes(s))); }
    static string Field(string json, string name) {
      var m = Regex.Match(json, "\"" + name + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
      return m.Success ? Regex.Unescape(m.Groups[1].Value) : null;
    }
    static string Esc(string s) { return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\""); }
    bool Send(string msg) {
      var b = Encoding.UTF8.GetBytes(msg);
      return ws.SendAsync(new ArraySegment<byte>(b), WebSocketMessageType.Text, true, CancellationToken.None).Wait(3000);
    }
    string Recv(int ms) {
      var buf = new byte[65536]; var all = new MemoryStream(); var until = DateTime.Now.AddMilliseconds(ms);
      while (true) {
        var left = (int)(until - DateTime.Now).TotalMilliseconds; if (left < 50) left = 50;
        var t = ws.ReceiveAsync(new ArraySegment<byte>(buf), CancellationToken.None);
        if (!t.Wait(left)) { Error = "OBS tak jawab"; Kill(); return null; }
        if (t.Result.MessageType == WebSocketMessageType.Close) { Error = "OBS putuskan sambungan (password salah?)"; Kill(); return null; }
        all.Write(buf, 0, t.Result.Count);
        if (t.Result.EndOfMessage) return Encoding.UTF8.GetString(all.ToArray());
      }
    }
    void Kill() { try { if (ws != null) ws.Abort(); } catch { } try { if (ws != null) ws.Dispose(); } catch { } ws = null; }
    public bool Connect(int port, string pass) {
      Kill(); Error = "";
      try {
        ws = new ClientWebSocket(); ws.Options.AddSubProtocol("obswebsocket.json");
        if (!ws.ConnectAsync(new Uri("ws://127.0.0.1:" + port), CancellationToken.None).Wait(3000)) { Error = "OBS tak dapat dihubungi (port " + port + ")"; Kill(); return false; }
        string hello = Recv(3000); if (hello == null) return false;
        string ident = "{\"op\":1,\"d\":{\"rpcVersion\":1,\"eventSubscriptions\":0";
        string ch = Field(hello, "challenge"), salt = Field(hello, "salt");
        if (ch != null && salt != null) {
          if (string.IsNullOrEmpty(pass)) { Error = "OBS minta password (OBS > Tools > WebSocket Server Settings > Show Connect Info)"; Kill(); return false; }
          ident += ",\"authentication\":\"" + B64Sha(B64Sha(pass + salt) + ch) + "\"";
        }
        ident += "}}";
        if (!Send(ident)) { Error = "OBS tak terima"; Kill(); return false; }
        string ok = Recv(3000); if (ok == null) return false;
        if (!Regex.IsMatch(ok, "\"op\"\\s*:\\s*2")) { Error = "OBS tolak sambungan"; Kill(); return false; }
        return true;
      } catch (Exception e) { Error = "OBS: " + (e.InnerException != null ? e.InnerException.Message : e.Message); Kill(); return false; }
    }
    public string Request(string type, string data) {
      if (!Ok) { Error = "OBS tak bersambung"; return null; }
      try {
        string id = (++rid).ToString();
        if (!Send("{\"op\":6,\"d\":{\"requestType\":\"" + type + "\",\"requestId\":\"" + id + "\"" + (data != null ? ",\"requestData\":" + data : "") + "}}")) { Error = "OBS tak terima"; Kill(); return null; }
        for (int i = 0; i < 20; i++) {
          string m = Recv(4000); if (m == null) return null;
          if (m.Contains("\"requestId\":\"" + id + "\"")) {
            if (!Regex.IsMatch(m, "\"result\"\\s*:\\s*true")) { Error = "OBS: " + (Field(m, "comment") ?? "permintaan gagal"); return null; }
            return m;
          }
        }
        Error = "OBS tak jawab"; return null;
      } catch (Exception e) { Error = "OBS: " + e.Message; Kill(); return null; }
    }
    // gambar source / scene (jpg). null kalau gagal (lihat Error)
    public Bitmap Shot(string source, int width) {
      string m = Request("GetSourceScreenshot", "{\"sourceName\":\"" + Esc(source) + "\",\"imageFormat\":\"jpg\",\"imageWidth\":" + width + ",\"imageCompressionQuality\":90}");
      if (m == null) return null;
      int i = m.IndexOf("base64,"); if (i < 0) { Error = "OBS: tiada gambar"; return null; }
      int j = m.IndexOf('"', i); if (j < 0) return null;
      try { return Cap.FromBytes(Convert.FromBase64String(m.Substring(i + 7, j - i - 7).Replace("\\/", "/"))); } catch (Exception e) { Error = "gambar OBS rosak: " + e.Message; return null; }
    }
    // nama semua source + scene (satu baris setiap satu)
    public string Sources() {
      var sb = new StringBuilder();
      string a = Request("GetSceneList", null); if (a == null) return null;
      foreach (Match m in Regex.Matches(a, "\"sceneName\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"")) sb.Append(Regex.Unescape(m.Groups[1].Value)).Append('\n');
      string b = Request("GetInputList", null); if (b == null) return sb.ToString();
      foreach (Match m in Regex.Matches(b, "\"inputName\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"")) sb.Append(Regex.Unescape(m.Groups[1].Value)).Append('\n');
      return sb.ToString();
    }
    public void Dispose() { Kill(); }
  }
}
'@
$capOk = $false
try { Add-Type -TypeDefinition $capCs -ReferencedAssemblies System.Drawing -ErrorAction Stop; $capOk = $true } catch { Write-Host 'Pengesan kill (tangkap skrin) tak dapat dimuat.' -ForegroundColor DarkYellow }
$killFile = Join-Path $dataDir 'killfx.json'
$killOld = Join-Path $dataDir 'killfx.txt'
# tetapan: src = 'win' (tetingkap) / 'obs' (source dalam OBS). team = 'kda' (kill saya ikut KDA) / 'me' (ikut nama) / 'ally' / 'all'
$killShared = [hashtable]::Synchronized(@{ on = $false; win = ''; x = 0.2; y = 0.08; w = 0.6; h = 0.32; team = 'kda'; ign = ''; solo = $true; src = 'win'; obsSrc = ''; obsPort = 4455; obsPass = ''; kx = 0.0; ky = 0.0; kw = 0.0; kh = 0.0; last = '{}'; shot = $null; shotWant = [DateTime]::MinValue; events = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList)) })
$killKeys = @('on', 'win', 'x', 'y', 'w', 'h', 'team', 'ign', 'solo', 'src', 'obsSrc', 'obsPort', 'obsPass', 'kx', 'ky', 'kw', 'kh')
function KillNum([string]$v, [double]$d) { $o = 0.0; if ([double]::TryParse($v, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$o)) { return [Math]::Max(0.0, [Math]::Min(1.0, $o)) } return $d }
function KillSet([string]$k, $v) {
  $sv = [string]$v
  switch -exact ($k) {
    'on' { $killShared.on = ($sv -eq '1' -or $sv -eq 'True') }
    'solo' { $killShared.solo = -not ($sv -eq '0' -or $sv -eq 'False') }
    'win' { $killShared.win = ($sv -replace '[\r\n]', ' ').Trim() }
    'ign' { $killShared.ign = ($sv -replace '[\r\n]', ' ').Trim() }
    'obsSrc' { $killShared.obsSrc = ($sv -replace '[\r\n]', ' ').Trim() }
    'obsPass' { $killShared.obsPass = $sv }
    'obsPort' { $pn = 0; if ([int]::TryParse($sv, [ref]$pn) -and $pn -gt 0 -and $pn -lt 65536) { $killShared.obsPort = $pn } }
    'src' { if ($sv -eq 'obs') { $killShared.src = 'obs' } else { $killShared.src = 'win' } }
    'team' { if (@('kda', 'me', 'ally', 'all') -contains $sv) { $killShared.team = $sv } }
    default { if (@('x', 'y', 'w', 'h', 'kx', 'ky', 'kw', 'kh') -contains $k) { $killShared[$k] = KillNum $sv ([double]$killShared[$k]) } }
  }
}
function Save-KillCfg {
  $o = [ordered]@{}; foreach ($k in $killKeys) { $o[$k] = $killShared[$k] }
  try { [System.IO.File]::WriteAllText($killFile, (ConvertTo-Json $o -Compress), (New-Object System.Text.UTF8Encoding $false)) } catch { }
}
if (Test-Path -LiteralPath $killFile) {
  try { $kj = [System.IO.File]::ReadAllText($killFile) | ConvertFrom-Json; foreach ($k in $killKeys) { if ($null -ne $kj.$k) { KillSet $k $kj.$k } } } catch { }
} elseif (Test-Path -LiteralPath $killOld) {
  try {
    $kv = ([System.IO.File]::ReadAllText($killOld)).Trim().Split('|')
    if ($kv.Count -ge 7) { $ki = 0; foreach ($k in @('on', 'win', 'x', 'y', 'w', 'h', 'team', 'ign', 'solo')) { if ($ki -lt $kv.Count) { KillSet $k $kv[$ki] }; $ki++ } }
  } catch { }
}
$killBg = $null
if ($capOk) {
  try {
    $killPS = [PowerShell]::Create()
    [void]$killPS.AddScript(@'
param($K, $npAsTask)
function NpAwait($op, [Type]$t) {
  $task = $npAsTask.MakeGenericMethod($t).Invoke($null, @($op))
  if ($task.Wait(3000)) { return $task.Result } else { return $null }
}
function JsonStr([string]$s) { return '"' + ($s -replace '\\', '\\' -replace '"', '\"') + '"' }
function NormT([string]$s) { return ($s.ToUpper() -replace '[^A-Z0-9]', '') }
# 2 = ada tepat, 1 = beza 1 huruf (perkataan 7 huruf ke atas), 0 = tiada
function Score([string]$txt, [string]$key) {
  if ($txt.Contains($key)) { return 2 }
  $n = $key.Length
  if ($n -lt 7 -or $txt.Length -lt $n) { return 0 }
  for ($i = 0; $i -le $txt.Length - $n; $i++) {
    $d = 0
    for ($j = 0; $j -lt $n; $j++) { if ($txt[$i + $j] -ne $key[$j]) { $d++; if ($d -gt 1) { break } } }
    if ($d -le 1) { return 1 }
  }
  return 0
}
# kedudukan nama dalam teks (boleh beza 1 huruf kalau nama 6 huruf ke atas); -1 = tiada
function FindAt([string]$txt, [string]$key) {
  $i0 = $txt.IndexOf($key); if ($i0 -ge 0) { return $i0 }
  $n = $key.Length
  if ($n -lt 6 -or $txt.Length -lt $n) { return -1 }
  for ($i = 0; $i -le $txt.Length - $n; $i++) {
    $d = 0
    for ($j = 0; $j -lt $n; $j++) { if ($txt[$i + $j] -ne $key[$j]) { $d++; if ($d -gt 1) { break } } }
    if ($d -le 1) { return $i }
  }
  return -1
}
$ocr = $null; $err = ''
try {
  [void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
  [void][Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
  [void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
  [void][Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]
  [void][Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
  try { $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language 'en-US')) } catch { }
  if (-not $ocr) { $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
  if (-not $ocr) { $err = 'Tiada bahasa OCR. Windows Settings > Time & Language > Language: tambah English.' }
} catch { $err = 'OCR Windows tak dapat dimuat: ' + $_.Exception.Message }
# baca teks dari PNG. pulangkan @{ res = OcrResult; w = lebar } atau $null
function Ocr([byte[]]$png) {
  if (-not $png -or -not $ocr) { return $null }
  $ms = New-Object System.IO.MemoryStream (,$png)
  try {
    $ras = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($ms)
    $dec = NpAwait ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ras)) ([Windows.Graphics.Imaging.BitmapDecoder])
    if (-not $dec) { return $null }
    $sbm = NpAwait ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    if (-not $sbm) { return $null }
    $r = NpAwait ($ocr.RecognizeAsync($sbm)) ([Windows.Media.Ocr.OcrResult])
    if (-not $r) { return $null }
    return @{ res = $r; w = [double]$sbm.PixelWidth }
  } finally { $ms.Dispose() }
}
$words = @('FIRSTBLOOD=first', 'DOUBLEKILL=double', 'TRIPLEKILL=triple', 'MANIAC=maniac', 'SAVAGE=savage', 'SHUTDOWN=shutdown', 'KILLINGSPREE=spree', 'MONSTERKILL=monster', 'MEGAKILL=mega', 'UNSTOPPABLE=unstoppable', 'GODLIKE=godlike', 'LEGENDARY=legendary', 'RAMPAGE=rampage', 'WIPEDOUT=wiped')
$lastAt = @{}; $lastAny = [DateTime]::MinValue; $firstAt = [DateTime]::MinValue; $hitName = ''; $hitAt = 0
$obs = $null; $obsNext = [DateTime]::MinValue; $frame = 0
$kStable = -1; $kRead = -2; $kSame = 0; $pendAt = $null; $prevFound = ''; $wordType = ''; $wordAt = [DateTime]::MinValue; $kdaTxt = ''
while ($true) {
  $mode = [string]$K.team; $srcObs = ([string]$K.src -eq 'obs')
  $need = $(if ($srcObs) { [string]$K.obsSrc } else { [string]$K.win })
  $previewOnly = (-not $K.on -and (Get-Date) -lt $K.shotWant)
  if ((-not $K.on -and -not $previewOnly) -or -not $need -or -not $ocr) {
    if ($obs -and -not $K.on) { $obs.Dispose(); $obs = $null }
    $K.last = '{"on":' + ([string][bool]$K.on).ToLower() + ',"ocr":' + ([string][bool]$ocr).ToLower() + ',"err":' + (JsonStr $err) + ',"hit":' + (JsonStr $hitName) + ',"hitAt":' + $hitAt + '}'
    Start-Sleep -Milliseconds 800; continue
  }
  $frame++
  $info = ''; $txt = ''; $e2 = ''; $res = $null; $imgW = 1.0; $meX = -1.0; $other = $false; $how = ''; $bmp = $null; $kNow = -1
  try {
    if ($srcObs) {
      $how = 'obs'
      if ((-not $obs -or -not $obs.Ok) -and (Get-Date) -ge $obsNext) {
        if (-not $obs) { $obs = New-Object SynoCap.Obs }
        if (-not $obs.Connect([int]$K.obsPort, [string]$K.obsPass)) { $obsNext = (Get-Date).AddSeconds(4) }
      }
      if ($obs -and $obs.Ok) { $bmp = $obs.Shot($need, 1600) }
      if (-not $bmp) { if ($obs) { $e2 = $obs.Error } else { $e2 = 'OBS tak bersambung' } }
    } else {
      $bmp = [SynoCap.Cap]::Snap($need, [ref]$how)
      if (-not $bmp) { $e2 = $how; $how = '' }
    }
    if ($bmp) {
      $stat = ''
      # selang-seli: gambar asal / versi kontras tinggi
      $png = [SynoCap.Cap]::Crop($bmp, [double]$K.x, [double]$K.y, [double]$K.w, [double]$K.h, 1.6, (($frame % 2) -eq 0), [ref]$stat)
      $info = '' + $bmp.Width + ',' + $bmp.Height + ',' + $stat + ',' + $how
      if (-not $previewOnly -and $mode -eq 'kda' -and [double]$K.kw -gt 0.003 -and [double]$K.kh -gt 0.003) {
        $st2 = ''
        $png2 = [SynoCap.Cap]::Crop($bmp, [double]$K.kx, [double]$K.ky, [double]$K.kw, [double]$K.kh, 4.0, (($frame % 2) -eq 1), [ref]$st2)
        $o2 = Ocr $png2
        if ($o2) { $kdaTxt = (([string]$o2.res.Text) -replace '[\x00-\x1f]', ' ').Trim() } else { $kdaTxt = '' }
        # nombor pertama dalam kotak KDA = bilangan kill anda
        $mm = [regex]::Match(($kdaTxt -replace '[Il|]', '/'), '\d+')
        if ($mm.Success -and $mm.Value.Length -le 2) { $kNow = [int]$mm.Value }
      }
      if ((Get-Date) -lt $K.shotWant) { try { $K.shot = [SynoCap.Cap]::Thumb($bmp, 720) } catch { } }
      $bmp.Dispose(); $bmp = $null
      if ($previewOnly) { $png = $null; $txt = '' }
      $o1 = Ocr $png
      if ($o1) { $res = $o1.res; $imgW = $o1.w; $txt = [string]$res.Text }
    }
  } catch { $e2 = $_.Exception.Message; if ($bmp) { try { $bmp.Dispose() } catch { } } }
  $now = Get-Date
  if ($previewOnly) {
    $K.last = '{"on":false,"ocr":true,"preview":true,"how":' + (JsonStr $how) + ',"info":' + (JsonStr $info) + ',"hit":' + (JsonStr $hitName) + ',"hitAt":' + $hitAt + ',"err":' + (JsonStr $e2) + '}'
    Start-Sleep -Milliseconds 500; continue
  }
  # banner kill: padanan tepat menang, kemudian perkataan paling panjang
  $norm = ($txt.ToUpper() -replace '[^A-Z]', '')
  $found = ''; $best = 0; $bestLen = 0
  foreach ($w in $words) { $p = $w.Split('='); $sc = Score $norm $p[0]; if ($sc -gt $best -or ($sc -eq $best -and $sc -gt 0 -and $p[0].Length -gt $bestLen)) { $best = $sc; $bestLen = $p[0].Length; $found = $p[1] } }
  # FIRST BLOOD hanya sekali setiap game
  if ($found -eq 'first' -and ((($now - $firstAt).TotalMinutes -lt 8) -or ($mode -eq 'kda' -and $kStable -gt 1))) { $found = '' }
  # kill saya ikut nama: Banner MLBB, pembunuh di kiri, yang mati di kanan
  $ign = NormT ([string]$K.ign)
  if ($mode -eq 'me' -and $res -and $ign.Length -ge 2) {
    try {
      $all = @(); foreach ($ln in $res.Lines) { $acc = ''; $st = @(); $lw = @(); foreach ($wd in $ln.Words) { $st += $acc.Length; $acc += (NormT ([string]$wd.Text)); $lw += $wd; $all += $wd }
        if ($meX -ge 0) { continue }
        $at = FindAt $acc $ign; if ($at -lt 0) { continue }
        $endAt = $at + $ign.Length - 1; $l = 1e9; $r = -1.0; $cy = 0.0; $hh = 0.0
        for ($q = 0; $q -lt $lw.Count; $q++) {
          $s1 = $(if ($q + 1 -lt $lw.Count) { $st[$q + 1] } else { $acc.Length }) - 1
          if ($s1 -ge $at -and $st[$q] -le $endAt) { $b = $lw[$q].BoundingRect; if ($b.X -lt $l) { $l = $b.X }; if ($b.X + $b.Width -gt $r) { $r = $b.X + $b.Width }; $cy = $b.Y + $b.Height / 2; $hh = $b.Height }
        }
        if ($r -ge 0) { $meX = (($l + $r) / 2) / $imgW; $meR = $r; $meCy = $cy; $meH = [Math]::Max($hh, 8) }
      }
      if ($meX -ge 0) { foreach ($o in $all) { $b = $o.BoundingRect; if ($b.X -gt ($meR + 6) -and [Math]::Abs(($b.Y + $b.Height / 2) - $meCy) -lt $meH -and (NormT ([string]$o.Text)).Length -ge 2) { $other = $true; break } } }
    } catch { $e2 = $_.Exception.Message }
  }
  $mine = ($meX -ge 0 -and $meX -lt 0.5)
  $fire = ''
  if ($mode -eq 'kda') {
    # banner yang baru muncul (bukan yang masih tertinggal di skrin)
    if ($found -and $found -ne $prevFound) { $wordType = $found; $wordAt = $now }
    if ($kNow -ge 0) {
      if ($kNow -eq $kRead) { $kSame++ } else { $kRead = $kNow; $kSame = 1 }
      # pantas: K naik 1 serentak dengan banner baru = terus terima (tak tunggu bacaan kedua)
      $quick = ($kStable -ge 0 -and $kNow -eq $kStable + 1 -and $wordType -and ($now - $wordAt).TotalSeconds -le 2.5)
      if ($kSame -ge 2 -or $quick) {
        if ($kStable -lt 0 -or $kNow -lt $kStable) { $kStable = $kNow; $pendAt = $null }
        elseif ($kNow -gt $kStable -and $kNow -le $kStable + 3) { $kStable = $kNow; $pendAt = $now }
        elseif ($kNow -gt $kStable + 3 -and $kSame -ge 4) { $kStable = $kNow }
      }
    }
    if ($pendAt) {
      if ($wordType -and ($pendAt - $wordAt).TotalSeconds -le 2.5 -and -not ($wordType -eq 'first' -and $kStable -gt 1)) { $fire = $wordType; $wordType = ''; $pendAt = $null }
      elseif (($now - $pendAt).TotalSeconds -ge 0.9) { if ($K.solo) { $fire = 'solo' }; $pendAt = $null }
    }
  } elseif ($found) {
    if ($found -ne $prevFound) {
      $teamOk = $true
      if ($mode -eq 'ally') { $ci = $info.Split(','); if ($ci.Count -ge 4) { $teamOk = ([int]$ci[2] -gt [int]$ci[3]) } }
      elseif ($mode -eq 'me') { $teamOk = $mine }
      if ($teamOk) { $fire = $found }
    }
  } elseif ($mode -eq 'me' -and $K.solo -and $mine -and $meX -lt 0.45 -and $other -and ($now - $lastAny).TotalSeconds -ge 3) { $fire = 'solo' }
  if ($found -or $frame % 3 -eq 0) { $prevFound = $found }
  if ($fire) {
    # kill lain terus keluar (FIRST BLOOD -> DOUBLE KILL 1 saat kemudian); jenis sama dalam 4 saat = banner yang sama
    $fresh = ($mode -eq 'kda') -or (-not $lastAt.ContainsKey($fire)) -or (($now - $lastAt[$fire]).TotalSeconds -ge 4)
    if ($fresh) {
      [void]$K.events.Add($fire); $lastAt[$fire] = $now; $lastAny = $now
      if ($fire -eq 'first') { $firstAt = $now }
      $hitName = $fire; $hitAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    }
  }
  $K.last = '{"on":true,"ocr":true,"how":' + (JsonStr $how) + ',"k":' + $kStable + ',"kda":' + (JsonStr $kdaTxt) + ',"mex":' + [Math]::Round($meX, 2).ToString([Globalization.CultureInfo]::InvariantCulture) + ',"info":' + (JsonStr $info) + ',"text":' + (JsonStr (($txt -replace '[\x00-\x1f]', ' ').Trim())) + ',"hit":' + (JsonStr $hitName) + ',"hitAt":' + $hitAt + ',"err":' + (JsonStr $e2) + '}'
  if ($e2 -and -not $res) { Start-Sleep -Milliseconds 700 } else { Start-Sleep -Milliseconds 120 }
}
'@)
    [void]$killPS.AddArgument($killShared).AddArgument($npAsTask)
    $killBg = $killPS.BeginInvoke()
  } catch { $killBg = $null }
}
# versi fail overlay (berubah bila KEMASKINI.bat salin fail baru): overlay dalam OBS muat semula sendiri
$siteVer = ''; $siteVerAt = [DateTime]::MinValue
function SiteVer {
  if (((Get-Date) - $script:siteVerAt).TotalSeconds -ge 5) {
    $script:siteVerAt = Get-Date; $mx = 0L
    $vfs = @(Get-ChildItem -LiteralPath (Join-Path $root 'assets') -File -ErrorAction SilentlyContinue) + @(Get-ChildItem -LiteralPath $root -Filter '*.html' -File -ErrorAction SilentlyContinue)
    foreach ($f in $vfs) { if ($f.LastWriteTimeUtc.Ticks -gt $mx) { $mx = $f.LastWriteTimeUtc.Ticks } }
    $script:siteVer = [string]$mx
  }
  return $script:siteVer
}
# suara announcer: teks setiap kill
$voiceText = @{ solo = 'Solo kill!'; first = 'First blood!'; double = 'Double kill!'; triple = 'Triple kill!'; maniac = 'Maniac!'; savage = 'Savage!'; shutdown = 'Shut down!'; spree = 'Killing spree!'; monster = 'Monster kill!'; mega = 'Mega kill!'; unstoppable = 'Unstoppable!'; godlike = 'God like!'; legendary = 'Legendary!'; rampage = 'Rampage!'; wiped = 'Wiped out!' }
function Make-Voice([string]$text, [string]$file) {
  Add-Type -AssemblyName System.Speech
  $syn = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    try { $syn.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Male, [System.Speech.Synthesis.VoiceAge]::Adult) } catch { }
    $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo 44100, ([System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen), ([System.Speech.AudioFormat.AudioChannel]::Mono)
    $syn.SetOutputToWaveFile($file, $fmt)
    $syn.Volume = 100
    $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><prosody pitch="x-low" rate="-15%" volume="x-loud"><emphasis level="strong">' + [System.Security.SecurityElement]::Escape($text) + '</emphasis></prosody></speak>'
    try { $syn.SpeakSsml($ssml) } catch { $syn.Speak($text) }
    $syn.SetOutputToNull()
  } finally { $syn.Dispose() }
}
$hookHits = New-Object System.Collections.ArrayList   # 15 cubaan webhook terakhir (untuk App > Status webhook)
$cmds = New-Object System.Collections.ArrayList       # arahan Stream Deck menunggu overlay / App ambil
$stateRev = [long]((Get-Date) - [DateTime]'2026-01-01').TotalMilliseconds   # naik setiap kali state disimpan (/api/rev)
$deckActs = @('win', 'lose', 'win-1', 'lose-1', 'end-win', 'end-lose', 'end', 'timer-start', 'timer-pause', 'timer-reset', 'queue-on', 'queue-off', 'mabar-open', 'mabar-close', 'mabar-toggle', 'facecam-on', 'facecam-off', 'facecam-toggle', 'handcam-on', 'handcam-off', 'handcam-toggle', 'kill-solo', 'kill-first', 'kill-double', 'kill-triple', 'kill-maniac', 'kill-savage', 'kill-shutdown', 'kill-spree', 'kill-monster', 'kill-mega', 'kill-unstoppable', 'kill-godlike', 'kill-legendary', 'kill-rampage', 'kill-wiped', 'banner-on', 'banner-off', 'wl-reset', 'win-reset', 'lose-reset')
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
          else { [System.IO.File]::WriteAllBytes($stateFile, $bodyBytes); $stateRev++; $body = ToBytes 'ok' }
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
      } elseif ($path -eq 'api/rev') {
        # semakan pantas (5 kali sesaat): nombor state + arahan Stream Deck menunggu
        $type = 'application/json'; $body = ToBytes ('{"s":' + $stateRev + ',"c":' + ($cmds.Count + $killShared.events.Count) + ',"v":"' + (SiteVer) + '"}')
      } elseif ($path -eq 'api/cmds') {
        $type = 'application/json'
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes '[]' }
        else {
          foreach ($ke in @($killShared.events)) { [void]$cmds.Add('{"a":"kill-' + $ke + '","t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '}') }
          $killShared.events.Clear()
          $body = ToBytes ('[' + ($cmds -join ',') + ']'); $cmds.Clear()
        }
      } elseif ($path -eq 'api/killcfg') {
        # tetapan auto efek kill (App > Live > Auto efek kill). Password OBS tak dihantar balik.
        $type = 'application/json'
        if ($method -eq 'POST') {
          if (-not $okPin) { $status = '401 Unauthorized' }
          else {
            $kf = @{}
            foreach ($pair in ([System.Text.Encoding]::UTF8.GetString($bodyBytes)) -split '&') { $kp = $pair.Split('=', 2); if ($kp.Count -eq 2) { $kf[$kp[0]] = [Uri]::UnescapeDataString($kp[1].Replace('+', ' ')) } }
            foreach ($kk in $killKeys) { if ($kf.ContainsKey($kk)) { KillSet $kk $kf[$kk] } }
            Save-KillCfg
          }
        }
        $ic = [Globalization.CultureInfo]::InvariantCulture
        $kjs = '{"cap":' + ([string]$capOk).ToLower() + ',"run":' + ([string][bool]$killBg).ToLower() + ',"on":' + ([string][bool]$killShared.on).ToLower() + ',"solo":' + ([string][bool]$killShared.solo).ToLower() + ',"obsPassSet":' + ([string][bool]$killShared.obsPass).ToLower() + ',"obsPort":' + [int]$killShared.obsPort
        foreach ($kk in @('win', 'team', 'ign', 'src', 'obsSrc')) { $kjs += ',"' + $kk + '":' + (JsonStr ([string]$killShared[$kk])) }
        foreach ($kk in @('x', 'y', 'w', 'h', 'kx', 'ky', 'kw', 'kh')) { $kjs += ',"' + $kk + '":' + ([double]$killShared[$kk]).ToString($ic) }
        $body = ToBytes ($kjs + '}')
      } elseif ($path -eq 'api/killshot') {
        # gambar skrin yang server nampak (pratonton dalam App, untuk lukis kotak)
        if (-not $okPin) { $status = '401 Unauthorized'; $body = ToBytes 'PIN' }
        else {
          $killShared.shotWant = (Get-Date).AddSeconds(8)
          $sb2 = $killShared.shot
          if ($sb2) { $body = [byte[]]$sb2; $type = 'image/jpeg' } else { $status = '404 Not Found'; $body = ToBytes 'Belum ada gambar' }
        }
      } elseif ($path -eq 'api/obssources') {
        # senarai source / scene dalam OBS (OBS WebSocket)
        $type = 'application/json'
        if (-not $okPin -or -not $capOk) { $body = ToBytes '{"ok":false,"err":"PIN"}' }
        else {
          $ob = New-Object SynoCap.Obs
          try {
            if ($ob.Connect([int]$killShared.obsPort, [string]$killShared.obsPass)) {
              $lst = $ob.Sources()
              if ($null -eq $lst) { $body = ToBytes ('{"ok":false,"err":' + (JsonStr $ob.Error) + '}') }
              else { $ol = @(); foreach ($t in $lst.Split("`n")) { $t = $t.Trim(); if ($t -and $ol -notcontains (JsonStr $t)) { $ol += (JsonStr $t) } }; $body = ToBytes ('{"ok":true,"list":[' + ($ol -join ',') + ']}') }
            } else { $body = ToBytes ('{"ok":false,"err":' + (JsonStr $ob.Error) + '}') }
          } finally { $ob.Dispose() }
        }
      } elseif ($path -match '^voice/([a-z]+)\.wav$') {
        # suara announcer setiap kill (dijana sekali guna suara Windows, disimpan dalam data\voice)
        $vk = $Matches[1]; $vt = $voiceText[$vk]
        if (-not $vt) { $status = '404 Not Found'; $body = ToBytes 'Tiada' }
        else {
          $vdir = Join-Path $dataDir 'voice'
          if (-not (Test-Path -LiteralPath $vdir)) { New-Item -ItemType Directory -Path $vdir | Out-Null }
          $vfile = Join-Path $vdir ($vk + '.wav')
          if (-not (Test-Path -LiteralPath $vfile)) { try { Make-Voice $vt $vfile } catch { Write-Host ('Suara announcer gagal: ' + $_.Exception.Message) -ForegroundColor DarkYellow } }
          if ((Test-Path -LiteralPath $vfile) -and (Get-Item -LiteralPath $vfile).Length -gt 1000) { $body = [System.IO.File]::ReadAllBytes($vfile); $type = 'audio/wav' }
          else { $status = '404 Not Found'; $body = ToBytes 'Suara tak dapat dijana' }
        }
      } elseif ($path -eq 'api/killlog') {
        $type = 'application/json'; $body = ToBytes ([string]$killShared.last)
      } elseif ($path -eq 'api/windows') {
        # senarai tetingkap untuk pilih skrin game (App > Live > Auto efek kill)
        $type = 'application/json'
        if (-not $okPin -or -not $capOk) { $body = ToBytes '[]' }
        else {
          $wl = @(); foreach ($t in ([SynoCap.Cap]::List()).Split("`n")) { $t = ($t -replace '[\x00-\x1f]', ' ').Trim(); if ($t) { $wl += (JsonStr $t) } }
          $body = ToBytes ('[' + ($wl -join ',') + ']')
        }
      } elseif ($path -eq 'api/wl') {
        # untuk plugin Stream Deck: bilangan W/L sekarang (dibaca dari state.txt)
        $type = 'application/json'; $w = 0; $l = 0; $cf = 0; $chh = 0; $mc = 0
        if (Test-Path -LiteralPath $stateFile) {
          try {
            $txt = [Uri]::UnescapeDataString([System.IO.File]::ReadAllText($stateFile))
            if ($txt -match '"wins":(\d+)') { $w = [int]$matches[1] }
            if ($txt -match '"losses":(\d+)') { $l = [int]$matches[1] }
            if ($txt -match '"mabarClosed":true') { $mc = 1 }
            # bahagian "hide" (on / off kamera): {"p":{...},"l":{...}}
            $hi = $txt.IndexOf('"hide":{')
            if ($hi -ge 0) {
              $dep = 0; $j = $hi + 7
              for (; $j -lt $txt.Length; $j++) { $ch0 = $txt[$j]; if ($ch0 -eq '{') { $dep++ } elseif ($ch0 -eq '}') { $dep--; if ($dep -eq 0) { break } } }
              $hs = $txt.Substring($hi, [Math]::Min($j - $hi + 1, $txt.Length - $hi))
              if ($hs -match '"l":\{[^}]*"cam":true') { $cf = 1 }
              if ($hs -match '"l":\{[^}]*"hand":true') { $chh = 1 }
            }
          } catch { }
        }
        $body = ToBytes ('{"w":' + $w + ',"l":' + $l + ',"faceOff":' + $cf + ',"handOff":' + $chh + ',"closed":' + $mc + '}'); $cors = $true
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
          if ($mediaBg -and -not $mediaBg.IsCompleted) {
            $mediaShared.want = Get-Date; $mj = [string]$mediaShared.json
            if (-not $mj) { $mj = '{"winrt":false,"audioOk":false,"smtc":[],"audio":[],"ifx":[]}' }
            $body = ToBytes $mj
          } else {
            if (((Get-Date) - $mediaAt).TotalSeconds -ge 0.7) { $mediaJson = Get-MediaJson; $mediaAt = Get-Date }
            $body = ToBytes $mediaJson
          }
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
        [void]$hookHits.Insert(0, ('{"t":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ',"r":' + (JsonStr $res) + ',"via":' + (JsonStr ($via + ' - lagu')) + ',"n":' + $bodyBytes.Length + ',"ua":' + (JsonStr '') + '}'))
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
