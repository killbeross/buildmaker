const fs = require('fs');
const https = require('https');

const files = ['accessories.html', 'armour.html', 'helmets.html'];

async function fetchWikiStats(itemName) {
    return new Promise((resolve, reject) => {
        const title = encodeURIComponent(itemName.trim().replace(/ /g, '_'));
        const url = `https://pilgrammed-rblx.fandom.com/api.php?action=query&prop=revisions&rvprop=content&titles=${title}&redirects=1&format=json`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const pages = json.query.pages;
                    const pageId = Object.keys(pages)[0];
                    if (pageId === "-1") return resolve(null);
                    
                    const wikitext = pages[pageId].revisions[0]['*'];
                    const stats = {};
                    const lines = wikitext.split('\n');
                    let inInfobox = false;
                    
                    lines.forEach(line => {
                        const l = line.toLowerCase();
                        if (l.includes('{{armor') || l.includes('{{accessory') || l.includes('{{equipment') || l.includes('{{weapon')) {
                            inInfobox = true;
                        }

                        if (inInfobox && line.trim().startsWith('|')) {
                            const parts = line.substring(1).split('=');
                            if (parts.length >= 2) {
                                let key = parts[0].trim().toLowerCase().replace(/_/g, ' ');
                                let valStr = parts.slice(1).join('=').trim();
                                
                                valStr = valStr.replace(/&#43;/g, '+').replace(/&amp;/g, '&').replace(/\[\[|\]\]/g, '');
                                
                                if (key === 'health regen') key = 'Health Regeneration';
                                if (key === 'mana regen') key = 'Mana Regeneration';
                                
                                const properKey = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                
                                let num = parseFloat(valStr.replace(/[^\d.-]/g, ''));
                                if (valStr.includes('%') || valStr.includes('+') || valStr.includes('-')) {
                                    stats[properKey] = valStr;
                                } else if (!isNaN(num)) {
                                    stats[properKey] = num;
                                } else {
                                    stats[properKey] = valStr;
                                }
                            }
                        }
                        if (inInfobox && line.includes('}}')) inInfobox = false;
                    });
                    resolve(stats);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (err) => resolve(null));
    });
}

function cleanImageUrl(url) {
    if (!url) return '';
    return url.split('/revision/')[0];
}

async function start() {
    let allItems = [];
    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        let type = 'Accessory';
        if (file.includes('armour')) type = 'Chest';
        if (file.includes('helmet')) type = 'Head';

        // Very simple regex to get names and images from category-page members
        // Looking for: <a href="..." title="Item Name" class="category-page__member-link">Item Name</a>
        const linkRegex = /class="category-page__member-link">([^<]+)<\/a>/g;
        // Looking for: <img alt="..." src="..." class="category-page__member-thumbnail"
        const imgRegex = /class="category-page__member-thumbnail"[^>]*src="([^"]+)"/g;

        // Better: Search for chunks that contain both
        const memberRegex = /<li class="category-page__member">([\s\S]*?)<\/li>/g;
        let match;
        while ((match = memberRegex.exec(text)) !== null) {
            const memberHtml = match[1];
            const nameMatch = memberHtml.match(/class="category-page__member-link">([^<]+)<\/a>/);
            const imgMatch = memberHtml.match(/class="category-page__member-thumbnail"[^>]*src="([^"]+)"/);
            
            if (nameMatch) {
                const name = nameMatch[1].trim();
                const imgUrl = imgMatch ? cleanImageUrl(imgMatch[1]) : '';
                allItems.push({
                    id: name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
                    type: type,
                    name: name,
                    imgUrl: imgUrl
                });
            }
        }
    }

    // Deduplicate
    const uniqueItemsMap = new Map();
    allItems.forEach(item => uniqueItemsMap.set(item.name, item));
    const uniqueItems = Array.from(uniqueItemsMap.values());

    console.log(`Found ${uniqueItems.length} unique items. Fetching stats...`);

    // Batch fetch stats
    const results = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
        const batch = uniqueItems.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (item) => {
            const stats = await fetchWikiStats(item.name);
            if (stats) Object.assign(item, stats);
            results.push(item);
        }));
        console.log(`Processed ${results.length}/${uniqueItems.length}`);
    }

    fs.writeFileSync('items_data_full.json', JSON.stringify(results, null, 4));
    console.log('Done! Generated items_data_full.json');
}

start();
