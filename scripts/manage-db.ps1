param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "status", "init")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
$DataDir = Join-Path $RootDir "apps\api\pgdata"
$PgBin = "C:\Program Files\PostgreSQL\18\bin"
$PgPort = "5433"
$DbName = "pharmacy_db"

if (-not (Test-Path $PgBin)) {
    Write-Error "PostgreSQL binaries not found at $PgBin"
    exit 1
}

$InitDb = Join-Path $PgBin "initdb.exe"
$PgCtl = Join-Path $PgBin "pg_ctl.exe"
$CreateDb = Join-Path $PgBin "createdb.exe"
$Psql = Join-Path $PgBin "psql.exe"

switch ($Action) {
    "init" {
        if (-not (Test-Path $DataDir)) {
            Write-Host "Initializing PostgreSQL cluster in $DataDir..."
            & $InitDb -D $DataDir -U postgres -A trust --encoding=UTF8 --locale=C
            Write-Host "Configuring port $PgPort..."
            Add-Content (Join-Path $DataDir "postgresql.conf") "`nport = $PgPort`nlisten_addresses = '127.0.0.1'`n"
            Write-Host "PostgreSQL cluster initialized."
        } else {
            Write-Host "PostgreSQL cluster already exists at $DataDir."
        }
    }
    "start" {
        if (-not (Test-Path $DataDir)) {
            & $MyInvocation.MyCommand.Definition -Action "init"
        }
        $status = & $PgCtl -D $DataDir status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PostgreSQL is already running on port $PgPort."
        } else {
            Write-Host "Starting PostgreSQL on port $PgPort..."
            $logFile = Join-Path $DataDir "server.log"
            & $PgCtl -D $DataDir -l $logFile -o "-p $PgPort" start
            Start-Sleep -Seconds 2
        }

        # Ensure pharmacy_db exists
        $checkDb = & $Psql -U postgres -p $PgPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName';" 2>&1
        if ($checkDb -ne "1") {
            Write-Host "Creating database $DbName..."
            & $CreateDb -U postgres -p $PgPort $DbName
            Write-Host "Database $DbName created successfully."
        } else {
            Write-Host "Database $DbName is ready."
        }
    }
    "stop" {
        if (Test-Path $DataDir) {
            Write-Host "Stopping PostgreSQL..."
            & $PgCtl -D $DataDir stop
        }
    }
    "status" {
        if (Test-Path $DataDir) {
            & $PgCtl -D $DataDir status
        } else {
            Write-Host "Cluster not initialized."
        }
    }
}
