$json = Get-Content 'items_data_full.json' -Raw -Encoding UTF8
$items = $json | ConvertFrom-Json
Write-Host "Total items: $($items.Count)"
Write-Host "Head:      $(($items | Where-Object { $_.type -eq 'Head' }).Count)"
Write-Host "Chest:     $(($items | Where-Object { $_.type -eq 'Chest' }).Count)"
Write-Host "Accessory: $(($items | Where-Object { $_.type -eq 'Accessory' }).Count)"
Write-Host "First item: $($items[0].name) - imgUrl: $($items[0].imgUrl)"
