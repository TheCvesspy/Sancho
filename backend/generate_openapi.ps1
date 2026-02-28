param(
    [Parameter(Mandatory = $true)][string]$ApiProject,
    [Parameter(Mandatory = $true)][string]$OutputFile,
    [string]$Url = "http://127.0.0.1:5099"
)

$ErrorActionPreference = "Stop"
$env:ASPNETCORE_ENVIRONMENT = "Development"

$apiProjectFull = [System.IO.Path]::GetFullPath($ApiProject)
$outputFileFull = [System.IO.Path]::GetFullPath($OutputFile)
$outputDir = Split-Path -Parent $outputFileFull
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$startArgs = "run --project `"$apiProjectFull`" --no-build --urls $Url"
$proc = Start-Process -FilePath dotnet -ArgumentList $startArgs -PassThru -WindowStyle Hidden

try {
    $openApiUrl = "$Url/openapi/v1.json"
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 250
        try {
            Invoke-WebRequest -Uri $openApiUrl -UseBasicParsing -OutFile $outputFileFull
            $ready = $true
            break
        }
        catch {
            # retry until timeout
        }
    }

    if (-not $ready) {
        throw "OpenAPI endpoint did not become available at $openApiUrl in time."
    }
}
finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
    }
}
