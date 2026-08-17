param(
  [string]$Source = 'C:\Users\82540\Desktop\portfolio\website\sticker\sticker-lab-3x4.png',
  [string]$Destination = 'C:\Users\82540\Documents\personal website\public\stickers'
)

Add-Type -AssemblyName System.Drawing

$regions = @(
  @{ Name = 's_01'; X = 180;  Y = 130;  Width = 670; Height = 600 }, # Figma
  @{ Name = 's_02'; X = 980;  Y = 130;  Width = 700; Height = 570 }, # Blender
  @{ Name = 's_03'; X = 100;  Y = 700;  Width = 650; Height = 500 }, # Photoshop
  @{ Name = 's_04'; X = 700;  Y = 760;  Width = 440; Height = 380 }, # Cinema 4D
  @{ Name = 's_05'; X = 1180; Y = 760;  Width = 560; Height = 380 }, # Terminal
  @{ Name = 's_06'; X = 90;   Y = 1200; Width = 650; Height = 520 }, # R
  @{ Name = 's_07'; X = 630;  Y = 1200; Width = 570; Height = 520 }, # Premiere
  @{ Name = 's_08'; X = 1120; Y = 1200; Width = 640; Height = 520 }, # Rhinoceros
  @{ Name = 's_09'; X = 80;   Y = 1750; Width = 650; Height = 640 }, # After Effects
  @{ Name = 's_10'; X = 620;  Y = 1750; Width = 650; Height = 640 }, # Shutter
  @{ Name = 's_11'; X = 1180; Y = 1750; Width = 540; Height = 640 }  # 3D app
)

function Get-AlphaBounds {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [hashtable]$Region
  )

  $left = $Region.X + $Region.Width
  $top = $Region.Y + $Region.Height
  $right = $Region.X - 1
  $bottom = $Region.Y - 1

  for ($y = $Region.Y; $y -lt ($Region.Y + $Region.Height); $y++) {
    for ($x = $Region.X; $x -lt ($Region.X + $Region.Width); $x++) {
      if ($Bitmap.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $left) { $left = $x }
        if ($x -gt $right) { $right = $x }
        if ($y -lt $top) { $top = $y }
        if ($y -gt $bottom) { $bottom = $y }
      }
    }
  }

  if ($right -lt $left -or $bottom -lt $top) {
    throw "No visible pixels found for $($Region.Name)."
  }

  $padding = 18
  $left = [Math]::Max(0, $left - $padding)
  $top = [Math]::Max(0, $top - $padding)
  $right = [Math]::Min($Bitmap.Width - 1, $right + $padding)
  $bottom = [Math]::Min($Bitmap.Height - 1, $bottom + $padding)

  return [System.Drawing.Rectangle]::FromLTRB($left, $top, $right + 1, $bottom + 1)
}

New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$sourceBitmap = [System.Drawing.Bitmap]::new($Source)

try {
  foreach ($region in $regions) {
    $bounds = Get-AlphaBounds -Bitmap $sourceBitmap -Region $region
    $cutout = $sourceBitmap.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $path = Join-Path $Destination "$($region.Name).png"
      $cutout.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "$($region.Name): $($bounds.Width)x$($bounds.Height)"
    } finally {
      $cutout.Dispose()
    }
  }
} finally {
  $sourceBitmap.Dispose()
}
