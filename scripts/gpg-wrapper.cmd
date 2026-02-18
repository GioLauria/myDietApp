@echo off
REM Wrapper to force loopback pinentry so git commits can be signed from terminal
"C:\Program Files\GnuPG\bin\gpg.exe" --pinentry-mode loopback %*
