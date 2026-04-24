@echo off
echo ====================================
echo VoxLibrary Database Setup
echo ====================================
echo.

echo Step 1: Installing better-sqlite3...
call npm install better-sqlite3
if errorlevel 1 (
    echo ERROR: Failed to install better-sqlite3
    echo Try running: npm install better-sqlite3 --build-from-source
    pause
    exit /b 1
)
echo [OK] better-sqlite3 installed
echo.

echo Step 2: Setting up database tables...
node setup-database.js
if errorlevel 1 (
    echo ERROR: Database setup failed
    pause
    exit /b 1
)
echo [OK] Database created
echo.

echo Step 3: Migrating community voices...
node migrate-supabase.js
echo [OK] Migration complete
echo.

echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Your local database is ready.
echo.
echo To start the server:
echo   npm start
echo.
echo To use the updated server with local DB:
echo   copy serve-updated.js serve.js
echo   npm start
echo.
pause
