@echo off
rem Doble clic para arrancar la app movil en Windows: muestra el codigo QR para Expo Go.
rem Ejecuta start-local.sh con Git Bash. Si la Wi-Fi no deja conectar: start-local.cmd --tunnel
rem Para detener: Ctrl+C en esta ventana, o cerrarla.

setlocal
title Colombia en datos
cd /d "%~dp0"

set "BASH="
for %%G in ("%ProgramFiles%\Git\bin\bash.exe" "%ProgramFiles(x86)%\Git\bin\bash.exe" "%LocalAppData%\Programs\Git\bin\bash.exe") do (
  if not defined BASH if exist "%%~G" set "BASH=%%~G"
)
if not defined BASH (
  for /f "delims=" %%G in ('where git 2^>nul') do (
    if not defined BASH if exist "%%~dpG..\bin\bash.exe" set "BASH=%%~dpG..\bin\bash.exe"
  )
)
if not defined BASH (
  echo No se encontro Git Bash. Instala Git para Windows: https://git-scm.com/download/win
  pause
  exit /b 1
)

"%BASH%" ./start-local.sh %*
echo.
pause
