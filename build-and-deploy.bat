@echo off
echo Building Next.js application...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b %ERRORLEVEL%
)

echo Build successful!
echo.
echo Deploying to Firebase...
call firebase deploy

if %ERRORLEVEL% NEQ 0 (
    echo Deployment failed!
    exit /b %ERRORLEVEL%
)

echo.
echo Deployment complete!

