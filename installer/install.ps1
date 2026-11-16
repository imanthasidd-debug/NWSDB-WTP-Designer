# NWSDB WTP Designer - per-user installer (no administrator rights required)
$ErrorActionPreference = 'Stop'
$AppName  = 'NWSDB WTP Designer'
$Version  = '1.6.0'
$Src      = Join-Path $PSScriptRoot $AppName
$Dest     = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
$Exe      = Join-Path $Dest "$AppName.exe"
$Icon     = Join-Path $Dest 'resources\app\dist\icon.ico'

if (-not (Test-Path (Join-Path $Src "$AppName.exe"))) { throw "Application folder '$Src' not found. Extract the whole ZIP first, then run Install.cmd again." }

Write-Host "Installing $AppName $Version to $Dest ..." -ForegroundColor Cyan
Get-Process -Name $AppName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
Copy-Item -Path (Join-Path $Src '*') -Destination $Dest -Recurse -Force
Copy-Item -Path (Join-Path $PSScriptRoot 'uninstall.ps1') -Destination $Dest -Force
if (Test-Path (Join-Path $PSScriptRoot 'Samples')) { Copy-Item -Path (Join-Path $PSScriptRoot 'Samples') -Destination $Dest -Recurse -Force }

# Shortcuts (Start menu + Desktop)
$Shell = New-Object -ComObject WScript.Shell
$StartMenu = Join-Path ([Environment]::GetFolderPath('Programs')) "$AppName.lnk"
$Desktop   = Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"
foreach ($lnkPath in @($StartMenu, $Desktop)) {
  $lnk = $Shell.CreateShortcut($lnkPath)
  $lnk.TargetPath = $Exe
  $lnk.WorkingDirectory = $Dest
  $lnk.IconLocation = "$Icon,0"
  $lnk.Description = 'Conventional water treatment plant design suite'
  $lnk.Save()
}

# .wtpd file association (current user)
$Prog = 'NWSDB.WTPDesigner.Project'
New-Item -Path "HKCU:\Software\Classes\.wtpd" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\.wtpd" -Name '(default)' -Value $Prog
New-Item -Path "HKCU:\Software\Classes\$Prog\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\$Prog" -Name '(default)' -Value 'WTP Designer project'
Set-ItemProperty -Path "HKCU:\Software\Classes\$Prog\DefaultIcon" -Name '(default)' -Value "`"$Icon`""
New-Item -Path "HKCU:\Software\Classes\$Prog\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\$Prog\shell\open\command" -Name '(default)' -Value "`"$Exe`" `"%1`""

# Apps & features entry
$Un = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\NWSDBWTPDesigner'
New-Item -Path $Un -Force | Out-Null
Set-ItemProperty -Path $Un -Name DisplayName -Value $AppName
Set-ItemProperty -Path $Un -Name DisplayVersion -Value $Version
Set-ItemProperty -Path $Un -Name Publisher -Value 'National Water Supply & Drainage Board'
Set-ItemProperty -Path $Un -Name DisplayIcon -Value $Icon
Set-ItemProperty -Path $Un -Name InstallLocation -Value $Dest
Set-ItemProperty -Path $Un -Name UninstallString -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Dest\uninstall.ps1`""
Set-ItemProperty -Path $Un -Name NoModify -Value 1 -Type DWord
Set-ItemProperty -Path $Un -Name NoRepair -Value 1 -Type DWord

Write-Host "Done. Start '$AppName' from the Start menu or the desktop shortcut." -ForegroundColor Green
Start-Process -FilePath $Exe
