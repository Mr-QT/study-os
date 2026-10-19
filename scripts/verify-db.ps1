# Verify PostgreSQL via Docker Compose and run DB integration tests.
# Usage: pnpm verify:db
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$composeFile = "infra/docker/docker-compose.yml"

Write-Host "== checking Docker engine ==" -ForegroundColor Cyan
docker version --format '{{.Server.Version}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker engine is not running. Start Docker Desktop (WSL2 backend) and retry."
}

Write-Host "== starting PostgreSQL ==" -ForegroundColor Cyan
docker compose -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

Write-Host "== waiting for healthy container ==" -ForegroundColor Cyan
$healthy = $false
for ($i = 0; $i -lt 40; $i++) {
  $status = docker inspect --format '{{.State.Health.Status}}' study-os-postgres 2>$null
  if ($status -eq "healthy") { $healthy = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $healthy) { throw "postgres container did not become healthy in time" }

$env:DATABASE_URL = "postgres://studyos:studyos@127.0.0.1:5432/studyos"
Write-Host "== running API tests against real PostgreSQL ==" -ForegroundColor Cyan
pnpm --filter @study-os/api test
if ($LASTEXITCODE -ne 0) { throw "database integration tests failed" }

Write-Host "OK: PostgreSQL is healthy and integration tests passed." -ForegroundColor Green
