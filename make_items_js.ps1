$json = Get-Content 'items_data_full.json' -Raw -Encoding UTF8
$output = "const MOCK_ITEMS = " + $json + ";"
$output | Set-Content 'items.js' -Encoding UTF8
Write-Host "Done. items.js size:" (Get-Item 'items.js').Length "bytes"
