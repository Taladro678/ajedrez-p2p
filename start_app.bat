@echo off
cd /d "%~dp0"
echo Iniciando servidor de desarrollo...
echo.
call npm run dev -- --open
pause
