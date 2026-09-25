@echo off
setlocal
cd /d "%~dp0"
set "STD=..\Rubric_Marking_Tool\program"

if not exist "%STD%\index.html" (
  echo Could not find the standard marking tool at %STD%
  echo Keep this folder next to the Rubric_Marking_Tool folder.
  pause
  exit /b 1
)

(for %%f in ("%STD%\datasets\data*.js") do type "%%f") > "%STD%\datasets\_all.js"

if not exist "bin\python\python.exe" (
  echo Portable Python is missing. Run setup.bat first.
  pause
  exit /b 1
)

title Advanced Rubric Marking Tool - close this window to stop
"bin\python\python.exe" server.py
pause
