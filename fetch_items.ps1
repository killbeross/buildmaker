# Pilgrammed Full Item Fetcher - Uses Fandom API directly
# No dependency on local HTML files
Set-Location $PSScriptRoot
$ErrorActionPreference = "SilentlyContinue"

$BASE = "https://pilgrammed-rblx.fandom.com/api.php"
$IGNORED_KEYS = @('name','image','type','recipe','drop','cost','sell','source','rarity','title',
                   'category','obtained_from','mutual_exclusives','tier','level','caption',
                   'image2','image3','set')

function CleanImageUrl($url) {
    if (!$url) { return "" }
    return ($url -split '/revision/')[0]
}

function Get-CategoryMembers($category) {
    $members = @()
    $cmcontinue = $null
    do {
        $params = "action=query&list=categorymembers&cmtitle=Category:$([uri]::EscapeDataString($category))&cmlimit=500&cmnamespace=0&format=json"
        if ($cmcontinue) { $params += "&cmcontinue=$([uri]::EscapeDataString($cmcontinue))" }
        $url = "$BASE`?$params"
        try {
            $resp = Invoke-RestMethod -Uri $url -TimeoutSec 20 -UseBasicParsing
            $members += $resp.query.categorymembers | Select-Object -ExpandProperty title
            $cmcontinue = $resp.continue.cmcontinue
        } catch { $cmcontinue = $null; break }
    } while ($cmcontinue)
    return $members
}

function Get-PageImage($title) {
    $t = [uri]::EscapeDataString($title -replace ' ','_')
    $url = "$BASE`?action=query&titles=$t&prop=pageimages&pithumbsize=200&format=json&redirects=1"
    try {
        $resp = Invoke-RestMethod -Uri $url -TimeoutSec 15 -UseBasicParsing
        $pages = $resp.query.pages
        $pageId = ($pages.PSObject.Properties | Select-Object -First 1).Name
        if ($pageId -ne "-1" -and $pages.$pageId.thumbnail) {
            return CleanImageUrl $pages.$pageId.thumbnail.source
        }
    } catch {}
    return ""
}

function Get-WikiStats($title) {
    $t = [uri]::EscapeDataString($title -replace ' ','_')
    $url = "$BASE`?action=query&prop=revisions&rvprop=content&titles=$t&redirects=1&format=json"
    try {
        $resp = Invoke-RestMethod -Uri $url -TimeoutSec 15 -UseBasicParsing
        $pages = $resp.query.pages
        $pageId = ($pages.PSObject.Properties | Select-Object -First 1).Name
        if ($pageId -eq "-1") { return @{} }
        $wikitext = $pages.$pageId.revisions[0].'*'
        if (!$wikitext) { return @{} }
        
        $stats = @{}
        $inInfobox = $false
        foreach ($line in ($wikitext -split "`n")) {
            $lower = $line.ToLower()
            if ($lower -match '\{\{armor|\{\{accessory|\{\{equipment|\{\{weapon|\{\{pilgrammed|\{\{item') {
                $inInfobox = $true
            }
            if ($inInfobox -and $line.Trim().StartsWith('|')) {
                $eqIdx = $line.IndexOf('=', 1)
                if ($eqIdx -gt 0) {
                    $key = $line.Substring(1, $eqIdx-1).Trim().ToLower() -replace '_',' '
                    $val = $line.Substring($eqIdx+1).Trim()
                    $val = $val -replace '\[\[|\]\]','' -replace '&#43;','+' -replace '&amp;','&'
                    $val = ($val -split '\<ref')[0].Trim()  # strip references
                    $val = [regex]::Replace($val, '\{\{[^}]+\}\}', '') # strip templates
                    $val = $val.Trim().Trim('|').Trim()

                    # Rename common aliases
                    if ($key -eq 'health regen') { $key = 'Health Regeneration' }
                    elseif ($key -eq 'mana regen') { $key = 'Mana Regeneration' }
                    elseif ($key -eq 'crit') { $key = 'Crit Chance' }
                    elseif ($key -eq 'def') { $key = 'Defense' }
                    elseif ($key -eq 'agi') { $key = 'Agility' }
                    elseif ($key -eq 'str') { $key = 'Strength' }
                    elseif ($key -eq 'int') { $key = 'Intellect' }
                    elseif ($key -eq 'dex') { $key = 'Dexterity' }

                    if ($IGNORED_KEYS -notcontains $key -and $val -ne '' -and $val.Length -lt 200) {
                        $properKey = ($key -split ' ' | ForEach-Object {
                            if ($_.Length -gt 0) { $_.Substring(0,1).ToUpper() + $_.Substring(1) } else { "" }
                        }) -join ' '
                        if ($val -match '^-?\d+(\.\d+)?$') { $stats[$properKey] = [double]$val }
                        else { $stats[$properKey] = $val }
                    }
                }
            }
            if ($inInfobox -and $line -match '^\}\}') { $inInfobox = $false }
        }
        return $stats
    } catch { return @{} }
}

# ---- MAIN ----
Write-Host "=== Pilgrammed Full Item Fetcher ===" -ForegroundColor Cyan
Write-Host "Fetching category members from Fandom API..." -ForegroundColor Yellow

$categories = @(
    @{ Name="Helmets";     Type="Head"      },
    @{ Name="Armor";       Type="Chest"     },
    @{ Name="Accessories"; Type="Accessory" }
)

$allItems = [System.Collections.Generic.List[object]]::new()
$seen = @{}

foreach ($cat in $categories) {
    Write-Host "  Category: $($cat.Name)" -ForegroundColor Yellow
    $members = Get-CategoryMembers $cat.Name
    Write-Host "    -> $($members.Count) pages found" -ForegroundColor Gray
    foreach ($title in $members) {
        # Skip meta-pages
        if ($title -match 'Category:|Template:|File:|User:|Talk:') { continue }
        if (!$seen.ContainsKey($title)) {
            $seen[$title] = $true
            $id = ($title -replace '[^a-zA-Z0-9]','').ToLower()
            $allItems.Add([PSCustomObject]@{ id=$id; type=$cat.Type; name=$title; imgUrl='' })
        }
    }
}

$total = $allItems.Count
Write-Host "`nTotal unique items: $total" -ForegroundColor Green
Write-Host "Estimated time: ~$([math]::Round($total * 1.2 / 60, 1)) minutes`n" -ForegroundColor Cyan

$results = [System.Collections.Generic.List[hashtable]]::new()
$delayMs = 600  # be polite to Fandom API

for ($i = 0; $i -lt $total; $i++) {
    $item = $allItems[$i]
    $num  = $i + 1
    Write-Host "[$num/$total] $($item.name)" -ForegroundColor Gray

    $imgUrl = Get-PageImage $item.name
    $stats  = Get-WikiStats $item.name

    $obj = [ordered]@{
        id     = $item.id
        type   = $item.type
        name   = $item.name
        imgUrl = $imgUrl
    }
    foreach ($k in $stats.Keys) { $obj[$k] = $stats[$k] }
    $results.Add($obj)

    Start-Sleep -Milliseconds $delayMs

    # Save progress every 10 items
    if (($results.Count % 10 -eq 0) -or ($results.Count -eq $total)) {
        $results | ConvertTo-Json -Depth 5 | Set-Content -Path "items_data_full.json" -Encoding UTF8
        Write-Host "  -- Saved: $($results.Count)/$total --" -ForegroundColor Cyan
    }
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Path "items_data_full.json" -Encoding UTF8
Write-Host "`n=== DONE! $($results.Count) items written to items_data_full.json ===" -ForegroundColor Green
