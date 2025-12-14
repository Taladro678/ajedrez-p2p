@echo off
title Servidor de Desarrollo - Ajedrez P2P
color 0A

echo ========================================
echo   Instalador y Servidor de Desarrollo
echo ========================================
echo.

REM Mapear temporalmente la ruta UNC a la unidad Z:
echo [1/4] Mapeando unidad temporal...
net use Z: "\\caja\Users\user\Downloads\1\script 2025\app" /persistent:no 2>nul
if errorlevel 1 (
    echo ERROR: No se pudo mapear la unidad Z:
    echo Intentando continuar de todas formas...
    pause
    exit /b 1
)

echo OK - Unidad Z: mapeada correctamente
echo.

REM Cambiar a la unidad Z:
Z:
cd \

REM Verificar si existen node_modules
if not exist "node_modules" (
    echo.
    echo [2/4] Instalando dependencias (esto puede tardar unos minutos)...
    echo Por favor espera...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Fallo la instalacion de dependencias
        pause
        net use Z: /delete 2>nul
        exit /b 1
    )
) else (
    echo [2/4] Dependencias ya instaladas
)

echo.
echo [3/4] Iniciando servidor de desarrollo...
echo.
echo ========================================
echo   Servidor iniciado!
echo   Presiona Ctrl+C para detener
echo ========================================
echo.

call npm run dev

echo.
echo.
echo [4/4] Servidor detenido
echo Limpiando...

REM Limpiar: Desconectar la unidad Z al terminar
cd C:\
net use Z: /delete 2>nul

echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
