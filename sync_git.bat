@echo off
echo ==========================================
echo    Cricket Core Auto-Sync to GitHub
echo ==========================================
echo.

echo 1. Adding all changes...
git add .

echo.
set /p commitMsg="Enter commit message (Press Enter for 'Auto update'): "
if "%commitMsg%"=="" set commitMsg=Auto update

echo.
echo 2. Committing changes...
git commit -m "%commitMsg%"

echo.
echo 3. Pushing to GitHub...
git push

echo.
echo ==========================================
echo           Sync Complete! 🚀
echo ==========================================
pause
