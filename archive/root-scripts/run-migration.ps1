# Add PostgreSQL to PATH temporarily
$env:PATH += ";C:\Program Files\PostgreSQL\18\bin"

# Get database URL from Railway
$dbUrl = railway variables --service Postgres-gk3Q --json | ConvertFrom-Json | Where-Object { $_.name -eq "DATABASE_PUBLIC_URL" } | Select-Object -ExpandProperty value

# Run migration
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" $dbUrl -f migrations/008_webhook_logs.sql

Write-Host "`nMigration completed! Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
