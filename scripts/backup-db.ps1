<#
.SYNOPSIS
    Sauvegarde quotidienne de la base PromoComm (dump pg_dump -Fc) + rotation + copie hors machine.

.DESCRIPTION
    Les visuels d'opération sont stockés en bytea dans Postgres : ce dump est donc
    la sauvegarde complète des données. Le code est couvert par Git (GitHub + miroir VPS),
    le .env est à copier une fois à la main sur le VPS (il ne change quasiment jamais).

.EXAMPLE
    # Voir ce que la rotation supprimerait, sans rien supprimer :
    .\scripts\backup-db.ps1 -WhatIf

.EXAMPLE
    # Sauvegarde locale + copie sur le VPS :
    .\scripts\backup-db.ps1 -VpsTarget 'vps:/srv/backups/promocomm/'

.EXAMPLE
    # Tâche planifiée quotidienne à 12h30 (à lancer une fois, PowerShell admin) :
    $a = New-ScheduledTaskAction -Execute 'powershell.exe' `
         -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\Users\gonza\ProjetsClaudeCode\saas\promocom\scripts\backup-db.ps1'
    $t = New-ScheduledTaskTrigger -Daily -At 12:30
    Register-ScheduledTask -TaskName 'PromoComm-Backup' -Action $a -Trigger $t -RunLevel Highest
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    # Dossier de destination des dumps. Vide = <projet>\data\backups (résolu
    # dans le corps : $PSScriptRoot est vide dans les défauts de param() sous
    # `powershell -File`, le mode d'appel de la tâche planifiée).
    [string] $BackupDir = '',
    # Nom du conteneur Postgres.
    [string] $Container = 'promocomm-db',
    # Nombre de jours de dumps conservés localement.
    [int]    $KeepDays = 14,
    # Cible scp hors machine, ex. 'vps:/srv/backups/promocomm/'. Vide = pas de copie.
    [string] $VpsTarget = ''
)

$ErrorActionPreference = 'Stop'

if (-not $BackupDir) { $BackupDir = Join-Path $PSScriptRoot '..\data\backups' }

# -WhatIf ne doit gouverner que la rotation (la seule opération destructive).
New-Item -ItemType Directory -Force -Path $BackupDir -WhatIf:$false | Out-Null
$stamp  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$name   = "promocomm-$stamp.dump"
$target = Join-Path $BackupDir $name

# Le dump est écrit DANS le conteneur puis récupéré par docker cp : PowerShell corrompt
# le binaire s'il transite par le pipeline (réencodage texte).
docker exec $Container sh -c "PGPASSWORD=`"`$POSTGRES_PASSWORD`" pg_dump -Fc -U `"`$POSTGRES_USER`" `"`$POSTGRES_DB`" > /tmp/$name"
if ($LASTEXITCODE -ne 0) { throw "pg_dump a échoué (code $LASTEXITCODE)" }

docker cp "${Container}:/tmp/$name" $target
if ($LASTEXITCODE -ne 0) { throw "docker cp a échoué (code $LASTEXITCODE)" }
docker exec $Container rm -f "/tmp/$name"

# Un dump vide ou minuscule = échec silencieux : on refuse de continuer et on garde
# les anciennes sauvegardes (pas de rotation sur une base potentiellement perdue).
$size = (Get-Item $target).Length
if ($size -lt 100KB) { throw "Dump suspect ($size octets) : $target — rotation annulée" }
Write-Verbose "Dump OK : $target ($([math]::Round($size / 1MB, 1)) Mo)"

if ($VpsTarget) {
    scp $target $VpsTarget
    if ($LASTEXITCODE -ne 0) { Write-Warning "Copie vers $VpsTarget échouée (code $LASTEXITCODE) — le dump local est conservé" }
}

# Rotation : ne s'exécute qu'après un dump valide.
$limit = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem -Path $BackupDir -Filter 'promocomm-*.dump' |
    Where-Object { $_.LastWriteTime -lt $limit } |
    Remove-Item -Confirm:$false
