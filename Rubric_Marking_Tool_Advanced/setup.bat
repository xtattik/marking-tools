@echo off
setlocal
cd /d "%~dp0"
set "PY_VERSION=3.13.15"
set "PY_DIR=bin\python"
set "CURL=%SystemRoot%\System32\curl.exe"
set "TAR=%SystemRoot%\System32\tar.exe"

echo Advanced Marking Tool setup
echo.

if exist "%PY_DIR%\python.exe" goto :have_python
echo Downloading portable Python %PY_VERSION% ...
if not exist bin mkdir bin
"%CURL%" -fL --progress-bar -o "bin\python.zip.part" "https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
if errorlevel 1 goto :python_failed
move /y "bin\python.zip.part" "bin\python.zip" >nul
if not exist "%PY_DIR%" mkdir "%PY_DIR%"
"%TAR%" -xf "bin\python.zip" -C "%PY_DIR%"
if errorlevel 1 goto :python_failed
del "bin\python.zip"
echo [ok] Portable Python %PY_VERSION% installed.
goto :run_helper

:have_python
echo [ok] Portable Python is present.

:run_helper
"%PY_DIR%\python.exe" setup_helper.py
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%

:python_failed
echo [error] Could not download portable Python. Check your internet connection and run setup again.
if exist "bin\python.zip.part" del "bin\python.zip.part"
if exist "bin\python.zip" del "bin\python.zip"
pause
exit /b 1
