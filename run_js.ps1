$html = Get-Content jeds_live.html -Raw
$scriptStart = $html.IndexOf('<script>') + 8
$scriptEnd = $html.LastIndexOf('</script>')
$script = $html.Substring($scriptStart, $scriptEnd - $scriptStart)
$tmp = "$env:TEMP\voxjs_test.js"
[System.IO.File]::WriteAllText($tmp, $script, [System.Text.Encoding]::UTF8)

# Run with node
$result = node $tmp 2>&1
if ($result) {
    Write-Host "NODE OUTPUT:"
    $result | ForEach-Object { Write-Host $_ }
}

Remove-Item $tmp -EA SilentlyContinue
