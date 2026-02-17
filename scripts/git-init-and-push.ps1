<#
Usage:
  Open PowerShell in the repo root and run:
    .\scripts\git-init-and-push.ps1
  Or to run without interactive confirmation:
    .\scripts\git-init-and-push.ps1 -Run

This script:
- reads global git user.name and user.email
- finds a secret GPG key (long key id) if present
- configures the local repo to use that signing key
- runs the git commands to init, add, signed commit, set branch, add remote and push
#>

param(
    [switch]$Run
)

function ExitWith($code, $msg){ Write-Host $msg; exit $code }

# Ensure git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { ExitWith 2 "git not found in PATH." }

# Get global git user info
$gitName = (& git config --global user.name) -join "" | ForEach-Object { $_.Trim() }
$gitEmail = (& git config --global user.email) -join "" | ForEach-Object { $_.Trim() }

if (-not $gitName -or -not $gitEmail) {
    Write-Host "Global git user.name or user.email is not set."
    Write-Host "Set them now (recommended) or the script will abort."
    Write-Host "Commands to run:"
    Write-Host "  git config --global user.name \"Your Name\""
    Write-Host "  git config --global user.email \"you@example.com\""
    ExitWith 3 "Missing global git user info." 
}

Write-Host "Using global git user:" $gitName "<" $gitEmail ">"

# Try to find a secret GPG key (long key id)
$gpgCmd = Get-Command gpg -ErrorAction SilentlyContinue
if ($gpgCmd) {
    $gpgOut = & gpg --list-secret-keys --keyid-format LONG --with-colons 2>$null
    if ($LASTEXITCODE -eq 0 -and $gpgOut) {
        $lines = $gpgOut -split "`n"
        $gpgKey = $null
        foreach ($l in $lines) {
            if ($l.StartsWith('sec:')) {
                $parts = $l.Split(':')
                if ($parts.Length -ge 5) { $gpgKey = $parts[4].Trim(); break }
            }
        }
    }
}

if ($gpgKey) {
    Write-Host "Found GPG key id:" $gpgKey
    # If gpg executable is available, set git to use it explicitly (helps on Windows)
    $gpgCmdInfo = Get-Command gpg -ErrorAction SilentlyContinue
    if ($gpgCmdInfo) {
        $gpgPath = $gpgCmdInfo.Source
        Write-Host "Configuring local git to use GPG program: $gpgPath"
        & git config --local gpg.program $gpgPath
    }
} else {
    Write-Host "No secret GPG key found on this machine. A signed commit is required by this script."
    Write-Host "Create a key with: gpg --full-generate-key" 
    Write-Host "After creating a key, re-run this script."
    ExitWith 4 "Aborting: no secret GPG key available for signing." 
}

Write-Host "Planned actions in repository:" (Get-Location)
Write-Host "  1) git init"
Write-Host "  2) git add README.md"
if ($gpgKey) { Write-Host "  3) configure local signing key and make signed commit (-S)" } else { Write-Host "  3) make unsigned commit (no GPG key)" }
Write-Host "  4) git branch -M master"
Write-Host "  5) git remote add origin https://github.com/GioLauria/myDietApp.git"
Write-Host "  6) git push -u origin master"

if (-not $Run) {
    $resp = Read-Host "Proceed with these actions? (Y/N)"
    if ($resp -notin @('Y','y','Yes','yes')) { ExitWith 0 "Aborted by user." }
}

try {
    & git init | Write-Host
    if (-not (Test-Path README.md)) { Write-Host "README.md not found in repo root." }
    & git add README.md | Write-Host

    if ($gpgKey) {
        & git config --local user.signingkey $gpgKey
        & git config --local commit.gpgsign true
        Write-Host "Local git configured to sign commits with $gpgKey"
        & git commit -S -m "first commit" | Write-Host
    } else {
        & git commit -m "first commit" | Write-Host
    }

    & git branch -M master | Write-Host

    # Add remote (if origin exists, report and offer to replace)
    $existing = (& git remote get-url origin 2>$null) -join "" 
    if ($existing) {
        Write-Host "Remote 'origin' already exists: $existing"
        $ans = $null
        if ($Run) { $ans = 'Y' } else { $ans = Read-Host "Replace it with https://github.com/GioLauria/myDietApp.git ? (Y/N)" }
        if ($ans -in @('Y','y','Yes','yes')) { & git remote set-url origin https://github.com/GioLauria/myDietApp.git | Write-Host }
    } else {
        & git remote add origin https://github.com/GioLauria/myDietApp.git | Write-Host
    }

    Write-Host "About to push to origin master. This will require network authentication."
    if (-not $Run) {
        $p = Read-Host "Proceed to push now? (Y/N)"
        if ($p -notin @('Y','y','Yes','yes')) { ExitWith 0 "Skipping push as requested." }
    }

    & git push -u origin master | Write-Host

    Write-Host "Done. If push failed, check authentication (GitHub PAT or credential helper)."
} catch {
    Write-Host "Error during operations: $_"
    exit 5
}
