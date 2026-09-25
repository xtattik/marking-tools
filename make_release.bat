@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: make_release.bat v1.0
  exit /b 1
)
set "VERSION=%~1"
set "TAR=%SystemRoot%\System32\tar.exe"
set "OUT=release\marking-tools-%VERSION%.zip"

rem Refresh the combined datasets so the zip works without running the launchers first.
(for %%f in ("Rubric_Builder\program\datasets\data*.js") do type "%%f") > "Rubric_Builder\program\datasets\_all.js"
(for %%f in ("Rubric_Marking_Tool\program\datasets\data*.js") do type "%%f") > "Rubric_Marking_Tool\program\datasets\_all.js"

if not exist release mkdir release
if exist "%OUT%" del "%OUT%"

"%TAR%" -a -c -f "%OUT%" --exclude "*/original rubrics" --exclude "*/original rubrics/*" --exclude "*/models" --exclude "*/models/*" Rubric_Builder Rubric_Marking_Tool
if errorlevel 1 (
  echo Zip failed.
  exit /b 1
)

echo Created %OUT%
