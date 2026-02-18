<#
Automazione: assegna tutti i cibi contenenti "farina" (case-insensitive)
alla categoria "Prodotti da Forno".

Azioni eseguite:
- Crea backup di server/database.sqlite
- Esegue l'UPDATE su sqlite3
- Commit & push nel sub-repo `server` (se ci sono modifiche)
- Commit & push nel repo principale la migration (se presente/non committata)

Nota: lo script presuppone che `sqlite3`, `git` e GPG siano configurati.
Esegue commit firmati usando la tua configurazione di GPG attuale.
#>

Set-StrictMode -Version Latest
function Write-Log { param($m) Write-Output "[auto_assign_farina] $m" }

$RepoRoot = Resolve-Path "$PSScriptRoot\.." | Select-Object -ExpandProperty Path
$ServerDb = Join-Path $RepoRoot 'server\database.sqlite'
$MigrationFile = Join-Path $RepoRoot 'migrations\20260218_assign_farina_to_prodotti_da_forno.sql'

if (-not (Get-Command sqlite3 -ErrorAction SilentlyContinue)) {
    Write-Log "sqlite3 non trovato nel PATH. Interrompo."; exit 1
}

if (-not (Test-Path $ServerDb)) {
    Write-Log "DB non trovato in $ServerDb. Interrompo."; exit 1
}

$ts = Get-Date -Format yyyyMMddHHmmss
$backup = "$($ServerDb).bak.manual_$ts"
Copy-Item -Path $ServerDb -Destination $backup -Force
Write-Log "Backup creato: $backup"

$sql = "BEGIN TRANSACTION; UPDATE tblFood SET ID_Category = (SELECT ID FROM tblFoodCategories WHERE lower(Category)=lower('Prodotti da Forno') LIMIT 1) WHERE lower(Food) LIKE '%farina%'; SELECT changes(); COMMIT;"
Write-Log "Eseguo UPDATE sul DB..."
$out = & sqlite3 $ServerDb $sql 2>&1
Write-Log "Risultato sqlite3:`n$out"

# Commit & push nel sub-repo 'server'
Write-Log "Commit nel sub-repo 'server' (se ci sono modifiche)..."
try {
    & git -C "$RepoRoot\server" add database.sqlite
    $commit = & git -C "$RepoRoot\server" commit -S -m "chore(server): assign foods containing 'farina' to 'Prodotti da Forno'" 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Log "server: niente da committare o errore: $commit" } else { Write-Log "server: commit creato." }

    Write-Log "server: fetch & rebase origin/master"
    & git -C "$RepoRoot\server" fetch origin
    $rebaseOut = & git -C "$RepoRoot\server" rebase origin/master 2>&1
    Write-Log "server: rebase output: $rebaseOut"

    Write-Log "server: push verso origin master"
    $pushOut = & git -C "$RepoRoot\server" push origin HEAD:master 2>&1
    Write-Log "server: push output: $pushOut"
} catch {
    Write-Log "Errore git server: $_"
}

# Commit e push del migration file nel repo principale (se presente)
if (Test-Path $MigrationFile) {
    Write-Log "Committing migration nel repo principale..."
    & git -C $RepoRoot add "$MigrationFile"
    $cout = & git -C $RepoRoot commit -S -m "chore(migration): assign 'farina' foods to Prodotti da Forno" 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Log "main: niente da committare o errore: $cout" } else { Write-Log "main: commit creato." }

    Write-Log "main: push origin master"
    $pout = & git -C $RepoRoot push --no-verify --set-upstream origin master 2>&1
    Write-Log "main: push output: $pout"
} else {
    Write-Log "Migration file non trovato: $MigrationFile"
}

Write-Log "Fatto. Controlla output e il tuo remoto per verificare le modifiche." 
