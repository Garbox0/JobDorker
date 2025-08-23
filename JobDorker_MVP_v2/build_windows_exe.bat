@echo off
setlocal enabledelayedexpansion

REM === CONFIG ===
set "INCLUDE_WEBVIEW=1"   REM 1 = con pywebview, 0 = sin pywebview (lite)
set "APP_NAME=JobDorker"

REM === Crear requirements.txt si no existe ===
if not exist requirements.txt (
  >requirements.txt echo pyinstaller>=6.8
  >>requirements.txt echo pillow>=10.4
  if "%INCLUDE_WEBVIEW%"=="1" >>requirements.txt echo pywebview>=6.0
)

REM === Limpiar y crear venv ===
rmdir /s /q .venv build dist __pycache__ 2>nul
python -m venv .venv || goto :FAIL
call .venv\Scripts\activate || goto :FAIL

REM === Instalar deps ===
python -m pip install --upgrade pip || goto :FAIL
pip install -r requirements.txt || goto :FAIL

REM === Icono: si no hay .ico pero hay .png, generarlo con Python inline ===
set "ICON_PARAM="
if exist logo.ico (
  set "ICON_PARAM=--icon logo.ico"
) else (
  if exist logo.png (
    python -c "from PIL import Image; Image.open('logo.png').save('logo.ico', sizes=[(256,256),(128,128),(64,64),(32,32),(16,16)])" || goto :ICONFAIL
    if exist logo.ico set "ICON_PARAM=--icon logo.ico"
  )
)

:ICONFAIL

REM === Hidden-import sólo si incluimos pywebview ===
set "HIDDEN="
if "%INCLUDE_WEBVIEW%"=="1" set "HIDDEN=--hidden-import webview.platforms.edgechromium"

REM === Compilar (usar SIEMPRE pyinstaller del venv) ===
".\.venv\Scripts\pyinstaller.exe" --noconfirm --clean ^
  --onefile --windowed ^
  --name "%APP_NAME%" ^
  %ICON_PARAM% ^
  --add-data "logo.png;." ^
  %HIDDEN% ^
  JobDorker.py || goto :FAIL

echo(
echo ===== Hecho =====
echo EXE: .\dist\%APP_NAME%.exe
echo(
certutil -hashfile ".\dist\%APP_NAME%.exe" SHA256
goto :END

:FAIL
echo(
echo *** ERROR en el build. Revisa el log anterior. ***
exit /b 1

:END
endlocal
pause
