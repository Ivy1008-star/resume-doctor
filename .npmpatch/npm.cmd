@echo off
if "%1"=="--version" (
  echo 10.8.2
  exit /b 0
)
"%~dp0..\..\..\Program Files\nodejs\npm.cmd" %*
