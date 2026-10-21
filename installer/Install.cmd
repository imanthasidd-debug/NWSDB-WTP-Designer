@echo off
rem Installs NWSDB WTP Designer for the current user (no admin rights needed)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 pause
