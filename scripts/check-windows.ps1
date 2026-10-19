# Windows PowerShell 环境检查脚本（只读，不安装软件）
$ErrorActionPreference = "Continue"
Write-Host "=== Study OS Windows 开发环境检查 ===" -ForegroundColor Cyan
Write-Host "PowerShell: $($PSVersionTable.PSVersion)"
$commands = @("git", "node", "npm", "python", "py", "docker", "wsl", "codex")
foreach ($command in $commands) {
  $found = Get-Command $command -ErrorAction SilentlyContinue
  if ($found) {
    Write-Host "[OK] $command : $($found.Source)" -ForegroundColor Green
  } else {
    Write-Host "[MISSING/OPTIONAL] $command" -ForegroundColor Yellow
  }
}
Write-Host "`n--- 版本信息（如可用） ---"
try { git --version } catch {}
try { node --version } catch {}
try { npm --version } catch {}
try { python --version } catch {}
try { docker --version } catch {}
try { wsl --status } catch {}
Write-Host "`n此脚本不安装依赖、不更改系统配置、不访问付费服务。"
