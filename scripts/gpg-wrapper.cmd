@echo off
REM Minimal GPG wrapper for Git on Windows
REM Forwards all arguments to gpg.exe found in PATH.
SETLOCAL
set GPGCMD=gpg
where %GPGCMD% >nul 2>&1
if errorlevel 1 (
  echo gpg.exe not found in PATH. Install GPG or adjust PATH.
  exit /b 1
)
%GPGCMD% %*
exit /b %ERRORLEVEL%
