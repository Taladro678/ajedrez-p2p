@echo off
title Limpieza y Reinicio
color 0C

echo ========================================
echo   LIMPIEZA DE INSTALACION ANTERIOR
echo ========================================
echo.

set "DEST=C:\dev\ajedrez-p2p"

if exist "%DEST%" (
    echo Eliminando carpeta anterior: %DEST%
    echo.
    rd /s /q "%DEST%"
    echo OK - Carpeta eliminada
) else (
    echo No hay carpeta anterior que eliminar
)

echo.
echo Presiona cualquier tecla para iniciar la instalacion rapida...
pause >nul

REM Ejecutar el script optimizado
call "%~dp0start_dev_local.bat"
