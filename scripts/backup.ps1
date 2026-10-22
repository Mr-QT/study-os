param(
  [string]$OutDir = "backups",
  [int]$Keep = 7
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutDir "studyos-$stamp.dump"

docker exec study-os-postgres pg_dump -U studyos -d studyos -Fc -f /tmp/studyos-backup.dump
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
docker cp "study-os-postgres:/tmp/studyos-backup.dump" $file
if ($LASTEXITCODE -ne 0) { throw "docker cp failed" }
docker exec study-os-postgres rm -f /tmp/studyos-backup.dump | Out-Null

$size = (Get-Item $file).Length
if ($size -lt 1024) { throw "backup file is too small ($size bytes)" }

Get-ChildItem $OutDir -Filter "studyos-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Keep |
  Remove-Item -Force

Write-Output "BACKUP=$file SIZE=$size"
