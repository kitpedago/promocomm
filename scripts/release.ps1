<#
.SYNOPSIS
    Construit l'image de production et la pousse sur le registry Gitea (git.gd.solutions).

.DESCRIPTION
    Tags poussés : latest + sha court du commit courant. Chez le client,
    deploy/update.sh récupère le tag PROMOCOMM_TAG (latest par défaut).
    Prérequis, une fois : docker login git.gd.solutions (jeton Gitea write:package).

.EXAMPLE
    .\scripts\release.ps1            # build + push
.EXAMPLE
    .\scripts\release.ps1 -NoPush    # build seulement (vérifier que l'image se construit)
#>
param(
    [string] $Image = 'git.gd.solutions/gducos/promocomm',
    [switch] $NoPush
)
# Pas de 'Stop' : docker écrit sa progression sur stderr, ce que PowerShell 5.1
# transformerait en erreur. Les échecs sont détectés via $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
$root = Join-Path $PSScriptRoot '..'

if (git -C $root status --porcelain) {
    Write-Warning "Arbre de travail modifié : le tag sha ne reflétera pas exactement l'image."
}
$sha = (git -C $root rev-parse --short HEAD).Trim()

docker build -t "${Image}:latest" -t "${Image}:$sha" $root
if ($LASTEXITCODE -ne 0) { throw "docker build a échoué (code $LASTEXITCODE)" }

if ($NoPush) { Write-Host "Image construite : ${Image}:$sha (pas de push)"; exit 0 }

docker push "${Image}:$sha"
if ($LASTEXITCODE -ne 0) { throw "docker push $sha a échoué (code $LASTEXITCODE)" }
docker push "${Image}:latest"
if ($LASTEXITCODE -ne 0) { throw "docker push latest a échoué (code $LASTEXITCODE)" }
Write-Host "Publié : ${Image}:latest et ${Image}:$sha"
