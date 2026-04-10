$html = Get-Content jeds_live.html -Raw
$scriptStart = $html.IndexOf('<script>') + 8
$scriptEnd = $html.LastIndexOf('</script>')
$script = $html.Substring($scriptStart, $scriptEnd - $scriptStart)
$tmp = "$env:TEMP\voxjs_$PID.js"
[System.IO.File]::WriteAllText($tmp, $script, [System.Text.Encoding]::UTF8)
$err = $null
try {
    node --check $tmp 2>&1
} catch {
    $err = $_
}
Remove-Item $tmp -EA SilentlyContinue
if ($err) { Write-Host "ERROR: $err" } else { Write-Host "JS syntax OK" }
