@echo off
echo ========================================
echo   Ajedrez P2P - Iniciando
echo ========================================
echo.

REM Verificar si node_modules existe
if not exist "node_modules\" (
    echo [!] Dependencias no encontradas
    echo [*] Instalando dependencias...
    echo     Este proceso puede tardar unos minutos...
    echo.
    call npm install
    echo.
    echo [OK] Dependencias instaladas correctamente
    echo.
)

echo [*] Iniciando servidor de desarrollo...
echo [i] Presiona Ctrl+C para detener el servidor
echo.
cmd /k npm start
