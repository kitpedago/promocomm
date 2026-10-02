# Après un changement de structure de la base miroir : actualise les tables liées
# ODBC de fichiers Access (comme le Gestionnaire de tables liées) et retire des
# champs redevenus « texte court » la propriété TextFormat, propre aux champs
# Mémo, qu'Access garde sinon et refuse à l'affichage (« Le paramètre entré
# n'est pas valide pour cette propriété »).
# Usage, Access fermé :
#   powershell -File scripts\access-liens-miroir.ps1 C:\...\base1.accdb C:\...\base2.accdb
#   powershell -File scripts\access-liens-miroir.ps1 C:\...\*.accdb
# Un fichier en échec (encore ouvert, introuvable) n'empêche pas les suivants.
param([Parameter(Mandatory, Position = 0, ValueFromRemainingArguments)][string[]]$Fichier)
$moteur = New-Object -ComObject DAO.DBEngine.120
$echecs = 0
$chemins = @()
foreach ($motif in ($Fichier -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
  $trouves = @(Resolve-Path $motif -ErrorAction SilentlyContinue | ForEach-Object { $_.Path })
  if ($trouves.Count) { $chemins += $trouves } else { "$motif : introuvable."; $echecs++ }
}
foreach ($chemin in $chemins) {
  try { $base = $moteur.OpenDatabase($chemin) }
  catch { "$chemin : impossible d'ouvrir, fermer Access (vérifier qu'aucun MSACCESS.EXE ne reste dans le Gestionnaire des tâches)."; $echecs++; continue }
  $tables = 0; $champs = 0
  foreach ($table in $base.TableDefs) {
    if ($table.Connect -notlike 'ODBC;*') { continue }
    $table.RefreshLink()
    $tables++
    foreach ($champ in $table.Fields) {
      if ($champ.Type -ne 10) { continue }   # dbText
      try { $champ.Properties.Delete('TextFormat'); $champs++ } catch { <# absente #> }
    }
  }
  $base.Close()
  "$chemin : $tables tables liées actualisées, $champs champs texte nettoyés."
}
if ($echecs) { "$echecs fichier(s) non traité(s)." }
