# Muat turun ikon rank MLBB asli (PNG) dari wiki Mobile Legends (fandom) ke assets\ranks\.
# Fail terbaik disimpan sebagai epic.png, legend.png, ... dan beberapa calon lain di assets\ranks\pilihan\
# supaya awak boleh tukar sendiri kalau yang dipilih bukan yang awak mahu.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dir = Join-Path $root 'assets\ranks'
$alt = Join-Path $dir 'pilihan'
New-Item -ItemType Directory -Force -Path $dir, $alt | Out-Null
$api = 'https://mobile-legends.fandom.com/api.php'
$ua = 'SYNO-Overlay/1.0 (rank icon downloader)'

$tiers = @(
  @{ file = 'epic';     words = @('epic');               queries = @('Epic rank', 'Rank Epic', 'Epic tier icon') },
  @{ file = 'legend';   words = @('legend');             queries = @('Legend rank', 'Rank Legend', 'Legend tier icon') },
  @{ file = 'mythic';   words = @('mythic');             queries = @('Mythic rank', 'Rank Mythic', 'Mythic tier icon') },
  @{ file = 'honor';    words = @('honor', 'honour');    queries = @('Mythical Honor', 'Mythic Honor rank', 'Honor rank') },
  @{ file = 'glory';    words = @('glory');              queries = @('Mythical Glory', 'Mythic Glory rank', 'Glory rank') },
  @{ file = 'immortal'; words = @('immortal');           queries = @('Mythical Immortal', 'Mythic Immortal rank', 'Immortal rank') }
)
$good = @('rank', 'tier', 'icon', 'emblem', 'badge', 'medal', 'logo')
$bad  = @('frame', 'border', 'avatar', 'skin', 'hero', 'season', 'reward', 'chest', 'banner', 'background', 'recall', 'emote', 'card', 'title')

function Get-Json($params) {
  $q = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([Uri]::EscapeDataString([string]$_.Value))" }) -join '&'
  return Invoke-RestMethod -Uri "${api}?$q" -UserAgent $ua -TimeoutSec 30
}

foreach ($t in $tiers) {
  Write-Host ""
  Write-Host "  Cari rank: $($t.file.ToUpper())" -ForegroundColor Cyan
  $titles = @{}
  foreach ($qq in $t.queries) {
    try {
      $r = Get-Json @{ action = 'query'; list = 'search'; srnamespace = '6'; srsearch = $qq; srlimit = '25'; format = 'json' }
      foreach ($hit in $r.query.search) { $titles[$hit.title] = 1 }
    } catch { Write-Host "    (carian gagal: $qq)" -ForegroundColor DarkYellow }
  }
  $cands = @()
  $list = @($titles.Keys)
  for ($i = 0; $i -lt $list.Count; $i += 40) {
    $chunk = $list[$i..([Math]::Min($i + 39, $list.Count - 1))] -join '|'
    try {
      $r = Get-Json @{ action = 'query'; titles = $chunk; prop = 'imageinfo'; iiprop = 'url|size|mime'; format = 'json' }
      foreach ($p in $r.query.pages.PSObject.Properties) {
        $pg = $p.Value; if (-not $pg.imageinfo) { continue }
        $ii = $pg.imageinfo[0]; $name = $pg.title.ToLower()
        if ($ii.mime -ne 'image/png' -and $ii.mime -ne 'image/webp') { continue }
        $hasWord = $false; foreach ($w in $t.words) { if ($name.Contains($w)) { $hasWord = $true } }
        if (-not $hasWord) { continue }
        $score = [Math]::Min([int]$ii.width, 1024) / 64
        foreach ($w in $good) { if ($name.Contains($w)) { $score += 6 } }
        foreach ($w in $bad)  { if ($name.Contains($w)) { $score -= 12 } }
        if ([Math]::Abs([int]$ii.width - [int]$ii.height) -lt ([int]$ii.width * 0.25)) { $score += 4 }  # hampir segi empat
        $cands += [pscustomobject]@{ title = $pg.title; url = $ii.url; w = $ii.width; h = $ii.height; score = $score }
      }
    } catch { Write-Host "    (gagal baca maklumat gambar)" -ForegroundColor DarkYellow }
  }
  $cands = $cands | Sort-Object -Property score -Descending | Select-Object -First 5
  if (-not $cands) { Write-Host "    Tak jumpa. Letak sendiri $($t.file).png dalam assets\ranks\" -ForegroundColor Yellow; continue }
  $n = 0
  foreach ($c in $cands) {
    $n++
    $dest = Join-Path $alt ("{0}_{1}.png" -f $t.file, $n)
    try {
      Invoke-WebRequest -Uri $c.url -OutFile $dest -UserAgent $ua -UseBasicParsing -TimeoutSec 60
      Write-Host ("    {0}. {1}  ({2}x{3})" -f $n, $c.title, $c.w, $c.h)
      if ($n -eq 1) { Copy-Item $dest (Join-Path $dir ($t.file + '.png')) -Force }
    } catch { Write-Host "    (gagal muat turun $($c.title))" -ForegroundColor DarkYellow }
  }
  Write-Host "    Dipilih: $($cands[0].title)  ->  assets\ranks\$($t.file).png" -ForegroundColor Green
}
Write-Host ""
Write-Host "  Siap. Semak gambar dalam assets\ranks\ ." -ForegroundColor Green
Write-Host "  Kalau ada yang salah, salin fail lain dari assets\ranks\pilihan\ dan namakan semula (cth epic_2.png -> epic.png)."
Write-Host "  Lepas tu Refresh overlay dalam OBS."
