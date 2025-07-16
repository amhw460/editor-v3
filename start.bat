@echo off
echo Starting Text Editor...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

REM Install frontend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

REM Setup backend if virtual environment doesn't exist
if not exist "backend\venv" (
    echo Setting up Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
)

REM Create .env file if it doesn't exist
if not exist "backend\.env" (
    echo Creating backend .env file...
    echo GEMINI_API_KEY=your_gemini_api_key_here > backend\.env
    echo Please add your Gemini API key to backend\.env file
)

echo Starting servers...

REM Start backend in background
cd backend
call venv\Scripts\activate
start /b python main.py
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
start /b npm start

echo Servers started!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000
echo.
echo Press any key to stop servers and exit...
pause >nul

REM Kill processes (this is basic - in production you'd want better process management)
taskkill /f /im node.exe >nul 2>nul
taskkill /f /im python.exe >nul 2>nul 