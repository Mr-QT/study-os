param(
  [Parameter(Mandatory = $true)][string]$File,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path $File)) { throw "backup file not found: $File" }
if (-not $Force) {
  Write-Output "This will overwrite the current studyos database."
  $answer = Read-Host "Type RESTORE to continue"
  if ($answer -ne "RESTORE") { throw "cancelled" }
}

docker cp $File "study-os-postgres:/tmp/studyos-restore.dump"
if ($LASTEXITCODE -ne 0) { throw "docker cp failed" }

docker exec study-os-postgres psql -U studyos -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='studyos' and pid <> pg_backend_pid();" | Out-Null
docker exec study-os-postgres pg_restore -U studyos -d studyos --clean --if-exists --no-owner /tmp/studyos-restore.dump
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }

docker exec study-os-postgres rm -f /tmp/studyos-restore.dump | Out-Null
Write-Output "RESTORED=$File"
