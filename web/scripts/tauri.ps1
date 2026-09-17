param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'build')]
    [string]$Mode
)

$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$cargoExe = Join-Path $cargoBin 'cargo.exe'

if (-not (Test-Path -LiteralPath $cargoExe)) {
    throw 'No se encontró Cargo. Instalá Rust con rustup y volvé a ejecutar este comando.'
}

$env:Path = "$cargoBin;$env:Path"
& pnpm exec tauri $Mode
exit $LASTEXITCODE
