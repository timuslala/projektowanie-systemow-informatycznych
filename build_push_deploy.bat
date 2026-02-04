@echo off
setlocal EnableDelayedExpansion

REM ==============================
REM KONFIGURACJA
REM ==============================
set AWS_REGION=eu-central-1
set ACCOUNT_ID=683745271938
set CLUSTER_NAME=studia-cluster
set ECR_BASE=%ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com

REM ==============================
REM LOGIN DO ECR
REM ==============================
echo Logging into ECR...
aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_BASE%
if errorlevel 1 (
    echo ❌ ECR login failed
    exit /b 1
)

REM ==============================
REM WYBÓR SERWISU
REM ==============================
if "%1"=="" (
    call :deploy frontend frontend frontend
    call :deploy backend backend backend
    call :deploy postgres postgres postgres
    echo.
    echo ✅ ALL SERVICES DEPLOYED
) else (
    if /i "%1"=="frontend" (
        call :deploy frontend frontend frontend
    ) else if /i "%1"=="backend" (
        call :deploy backend backend backend
    ) else if /i "%1"=="postgres" (
        call :deploy postgres postgres postgres
    ) else (
        echo ❌ Unknown service: %1
        echo Available services: frontend backend postgres
        exit /b 1
    )
    echo.
    echo ✅ SERVICE %1 DEPLOYED
)

endlocal
exit /b 0

REM ==============================
REM DEPLOY FUNCTION
REM ==============================
:deploy
set NAME=%1
set FOLDER=%2
set ECS_SERVICE=%3

echo.
echo ==============================
echo BUILDING %NAME%
echo ==============================

docker build -t %NAME%:latest %FOLDER%
if errorlevel 1 exit /b 1

docker tag %NAME%:latest %ECR_BASE%/studia-%NAME%:latest
docker push %ECR_BASE%/studia-%NAME%:latest
if errorlevel 1 exit /b 1

echo.
echo REDEPLOYING ECS SERVICE: %ECS_SERVICE%

aws ecs update-service ^
  --cluster %CLUSTER_NAME% ^
  --service %ECS_SERVICE% ^
  --force-new-deployment

exit /b 0
