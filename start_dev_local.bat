@echo off
title Servidor de Desarrollo - Ajedrez P2P
color 0A

echo ========================================
echo   Servidor de Desarrollo - Ajedrez P2P
echo ========================================
echo.

REM Definir rutas
set "SOURCE=\\caja\Users\user\Downloads\1\script 2025\app"
set "DEST=C:\dev\ajedrez-p2p"

echo [1/4] Preparando carpeta de destino...
if not exist "C:\dev\" mkdir "C:\dev"
if not exist "%DEST%" mkdir "%DEST%"

echo.
echo [2/4] Copiando proyecto (excluyendo node_modules y dist)...
echo.

robocopy "%SOURCE%" "%DEST%" /E /XD node_modules dist .git temp-repo "Nueva carpeta" /XF *.log /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo OK - Copia completada
echo.

echo [3/4] Cambiando al directorio del proyecto...
cd /d "%DEST%"
echo Directorio actual: %CD%
echo.

if not exist "node_modules" (
    echo [4/4] Instalando dependencias...
    echo Esto puede tardar 2-3 minutos, por favor espera...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Fallo la instalacion
        pause
        exit /b 1
    )
    echo.
    echo OK - Instalacion completada
) else (
    echo [4/4] Dependencias ya instaladas, omitiendo...
)

echo.
echo ========================================
echo   INICIANDO SERVIDOR
echo ========================================
echo.
echo Abriendo navegador en http://localhost:5173
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173

echo Iniciando Vite...
echo.

npm run dev

echo.
echo Servidor detenido
pause
