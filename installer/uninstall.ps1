# NWSDB WTP Designer - uninstaller (current user)
$AppName = 'NWSDB WTP Designer'
$Dest = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
Get-Process -Name $AppName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Programs')) "$AppName.lnk") -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk") -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Classes\.wtpd' -Recurse -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Classes\NWSDB.WTPDesigner.Project' -Recurse -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\NWSDBWTPDesigner' -Recurse -ErrorAction SilentlyContinue
# remove the program folder after this script exits (project files saved elsewhere are not touched)
Start-Process -FilePath cmd.exe -ArgumentList "/c timeout /t 2 /nobreak >nul & rmdir /s /q `"$Dest`"" -WindowStyle Hidden
Write-Host "$AppName has been removed. Your saved .wtpd project files were not deleted." -ForegroundColor Green
