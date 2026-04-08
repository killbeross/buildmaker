// Item data is loaded from items.js (286 items from Fandom Wiki)


const state = {
    equipped: { head: null, chest: null, acc1: null, acc2: null, acc3: null, acc4: null, acc5: null },
    activeTab: 'Head',
    activeSlotId: null,
    activeSlotType: null,
    musicPlaying: true,
    activeView: 'build',
    activePage: 0,
    loadouts: new Array(30).fill(null),
    communityBuilds: [],
    currentSort: 'popular'
};

// UI Elements
const itemGrid = document.getElementById('itemGrid');
const hoverInfo = document.getElementById('hoverInfo');
const tabBtns = document.querySelectorAll('.tab-btn');
const slots = document.querySelectorAll('.slot');
const unequipAllBtn = document.getElementById('unequipAllBtn');
const musicPlayer = document.getElementById('musicPlayer');
const musicText = document.getElementById('musicText');

function init() {
    loadLoadoutsFromDisk();
    loadCommunityBuilds();
    renderItemGrid(state.activeTab);
    attachEventListeners();
    initMusic();
    calculateStats();
}

function attachEventListeners() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.activeTab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderItemGrid(state.activeTab);
        });
    });

    slots.forEach(slot => {
        slot.addEventListener('click', () => {
            state.activeSlotId = slot.dataset.slotId;
            state.activeSlotType = slot.dataset.type;
            const targetTab = state.activeSlotType;
            const targetBtn = Array.from(tabBtns).find(b => b.dataset.tab === targetTab);
            if (targetBtn) targetBtn.click();
            slots.forEach(s => s.classList.remove('active-slot'));
            slot.classList.add('active-slot');
        });
    });

    unequipAllBtn.addEventListener('click', unequipAll);
    
    document.getElementById('loadoutsNavBtn').onclick = () => switchView('loadouts');
    document.getElementById('findBuildNavBtn').onclick = () => switchView('community');

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            state.currentSort = btn.dataset.sort;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCommunityBuilds();
        };
    });
}

function switchView(view) {
    state.activeView = view;
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('loadoutsView').classList.add('hidden');
    document.getElementById('communityView').classList.add('hidden');

    if (view === 'build') document.getElementById('appContainer').classList.remove('hidden');
    else if (view === 'loadouts') {
        document.getElementById('loadoutsView').classList.remove('hidden');
        renderLoadouts();
    } else if (view === 'community') {
        document.getElementById('communityView').classList.remove('hidden');
        renderCommunityBuilds();
    }
}

function initMusic() {
    const widgetIframe = document.getElementById('sc-widget');
    const widget = SC.Widget(widgetIframe);
    musicPlayer.onclick = () => {
        widget.toggle();
        state.musicPlaying = !state.musicPlaying;
        musicText.innerText = state.musicPlaying ? 'Playing: Sweet Jomes' : 'Paused: Sweet Jomes';
    };
}

function renderItemGrid(type) {
    itemGrid.innerHTML = '';
    const filteredItems = MOCK_ITEMS.filter(item => item.type === type);
    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.addEventListener('mouseenter', () => displayHoverStats(item));
        card.addEventListener('mouseleave', () => hoverInfo.innerText = 'Hover over an item to see its stats.');
        card.addEventListener('click', () => equipItem(item));
        const hasImg = item.imgUrl && item.imgUrl.trim() !== '';
        card.innerHTML = `
            <div class="item-icon" style="${hasImg ? `background-image: url('${item.imgUrl}');` : ''}"></div>
            <span class="item-name">${item.name}</span>
        `;
        itemGrid.appendChild(card);
    });
}

function displayHoverStats(item) {
    const excludedKeys = ['id', 'type', 'name', 'imgUrl', 'Description'];
    let stats = [];
    Object.keys(item).forEach(key => {
        if (!excludedKeys.includes(key)) stats.push(`${key}: ${item[key]}`);
    });
    let html = `<strong>${item.name}</strong><br>${stats.join(' | ') || 'No special stats'}`;
    if (item.Description) {
        html += `<span class="hover-desc">${item.Description}</span>`;
    }
    hoverInfo.innerHTML = html;
}

function equipItem(item) {
    const alreadyEquippedSlotId = Object.keys(state.equipped).find(slotId => state.equipped[slotId] && state.equipped[slotId].id === item.id);
    if (alreadyEquippedSlotId) {
        if (alreadyEquippedSlotId === state.activeSlotId) return;
        state.equipped[alreadyEquippedSlotId] = null;
        updateSlotUI(alreadyEquippedSlotId, null);
    }
    if (!state.activeSlotId) {
        const slot = Array.from(slots).find(s => s.dataset.type === item.type && !state.equipped[s.dataset.slotId]);
        if (slot) state.activeSlotId = slot.dataset.slotId;
        else return;
    }
    state.equipped[state.activeSlotId] = item;
    updateSlotUI(state.activeSlotId, item);
    calculateStats();
}

function updateSlotUI(slotId, item) {
    const slotEl = document.querySelector(`.slot[data-slot-id="${slotId}"]`);
    if (!item) {
        slotEl.classList.add('empty');
        slotEl.style.backgroundImage = '';
        const label = slotEl.querySelector('.slot-equipped-name');
        if (label) slotEl.removeChild(label);
        return;
    }
    slotEl.classList.remove('empty');
    slotEl.style.backgroundImage = `url('${item.imgUrl}')`;
    let label = slotEl.querySelector('.slot-equipped-name');
    if (!label) {
        label = document.createElement('div');
        label.className = 'slot-equipped-name';
        slotEl.appendChild(label);
    }
    label.innerText = item.name;
}

function unequipAll() {
    Object.keys(state.equipped).forEach(slotId => {
        state.equipped[slotId] = null;
        updateSlotUI(slotId, null);
    });
    calculateStats();
}

function calculateStats() {
    const totals = { Strength: 0, Dexterity: 0, Defense: 0, Agility: 0, Intellect: 0, "Crit Chance": 0 };
    let otherStats = {};
    Object.values(state.equipped).forEach(item => {
        if (!item) return;
        Object.keys(item).forEach(key => {
            if (['id', 'type', 'name', 'imgUrl', 'Description'].includes(key)) return;
            let val = item[key];
            let numericVal = (typeof val === 'string') ? parseFloat(val.replace(/[^\d.-]/g, '')) : val;
            if (totals.hasOwnProperty(key)) totals[key] += numericVal;
            else {
                if (!otherStats[key]) otherStats[key] = 0;
                otherStats[key] += numericVal;
            }
        });
    });
    const statElements = { Strength: 'stat-strength', Dexterity: 'stat-dexterity', Defense: 'stat-defense', Agility: 'stat-agility', Intellect: 'stat-intellect', "Crit Chance": 'stat-crit-chance' };
    Object.keys(statElements).forEach(key => {
        const el = document.getElementById(statElements[key]);
        const newVal = key === "Crit Chance" ? totals[key] + '%' : totals[key];
        if (el.innerText !== String(newVal)) {
            el.innerText = newVal;
            el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
        }
    });
    const secondaryStatsDiv = document.getElementById('secondaryStats');
    secondaryStatsDiv.innerHTML = '';
    Object.keys(otherStats).forEach(key => {
        const span = document.createElement('span');
        span.innerText = `${key}: +${otherStats[key]}`;
        secondaryStatsDiv.appendChild(span);
    });
}


// --- Persistence & Community ---
function saveLoadoutsToDisk() { localStorage.setItem('pilgrammed_loadouts', JSON.stringify(state.loadouts)); }
function loadLoadoutsFromDisk() { const saved = localStorage.getItem('pilgrammed_loadouts'); if (saved) state.loadouts = JSON.parse(saved); }

function loadCommunityBuilds() {
    const saved = localStorage.getItem('pilgrammed_shared_builds');
    state.communityBuilds = saved ? JSON.parse(saved) : [
        { id: 'b1', name: 'Ultimate Tank', maker: 'Pwnsalot', votes: 42, items: ['Knight Helmet', 'Viking Plate'], timestamp: Date.now() - 100000 },
        { id: 'b2', name: 'The Flash', maker: 'SonicFan', votes: 15, items: ['Jester Cap', 'Archer Garb'], timestamp: Date.now() - 50000 }
    ];
}

function renderCommunityBuilds() {
    const grid = document.getElementById('communityGrid');
    grid.innerHTML = '';
    const sorted = [...state.communityBuilds].sort((a,b) => state.currentSort === 'popular' ? b.votes - a.votes : b.timestamp - a.timestamp);
    const myVotes = getMyVotes();

    sorted.forEach(build => {
        const card = document.createElement('div');
        card.className = 'community-card';
        const myVote = myVotes[build.id]; // 'up', 'down', or undefined
        card.innerHTML = `
            <h3>${build.name}</h3>
            <p class="minor-text">by ${build.maker}</p>
            <p style="font-size: 0.8rem; color: #888; margin: 10px 0;">${build.items.join(', ')}</p>
            <div class="vote-controls">
                <button class="vote-btn ${myVote === 'up' ? 'upvoted' : ''}" onclick="vote('${build.id}', 'up')">▲</button>
                <span class="vote-count">${build.votes}</span>
                <button class="vote-btn ${myVote === 'down' ? 'downvoted' : ''}" onclick="vote('${build.id}', 'down')">▼</button>
                <button class="load-btn" onclick="loadCommunityBuild_byId('${build.id}')">Load</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Expose loadCommunityBuild via ID so onclick strings can call it
window.loadCommunityBuild_byId = (id) => {
    const build = state.communityBuilds.find(b => b.id === id);
    if (build) loadCommunityBuild(build);
};

function loadCommunityBuild(build) {
    // Unequip everything first
    Object.keys(state.equipped).forEach(slotId => {
        state.equipped[slotId] = null;
        updateSlotUI(slotId, null);
    });

    // Track which slots are free per type
    const slotsByType = {
        Head:      ['head'],
        Chest:     ['chest'],
        Accessory: ['acc1', 'acc2', 'acc3', 'acc4', 'acc5']
    };
    const usedCount = { Head: 0, Chest: 0, Accessory: 0 };

    build.items.forEach(itemName => {
        const item = MOCK_ITEMS.find(i => i.name === itemName);
        if (!item) return;
        const available = slotsByType[item.type];
        const idx = usedCount[item.type];
        if (available && idx < available.length) {
            const slotId = available[idx];
            state.equipped[slotId] = item;
            updateSlotUI(slotId, item);
            usedCount[item.type]++;
        }
    });

    calculateStats();
    switchView('build');
}


function uploadCurrentBuild() {
    const buildItems = Object.values(state.equipped).filter(i => i !== null);
    if (buildItems.length === 0) { alert('Equip some items first!'); return; }

    const name = prompt('Enter a name for your build:', 'My Build');
    if (!name || !name.trim()) return;

    const maker = prompt('Enter your username:', 'Anonymous');
    if (!maker || !maker.trim()) return;

    const newShared = {
        id: 'cb' + Date.now(),
        name: name.trim(),
        maker: maker.trim(),
        votes: 0,
        items: buildItems.map(i => i.name),
        timestamp: Date.now()
    };
    state.communityBuilds.push(newShared);
    localStorage.setItem('pilgrammed_shared_builds', JSON.stringify(state.communityBuilds));
    alert(`✓ Build "${name.trim()}" uploaded to the community!`);
}

// --- Vote helpers ---
function getMyVotes() {
    const saved = localStorage.getItem('pilgrammed_my_votes');
    return saved ? JSON.parse(saved) : {};
}

function saveMyVotes(votes) {
    localStorage.setItem('pilgrammed_my_votes', JSON.stringify(votes));
}

window.vote = (id, direction) => {
    const build = state.communityBuilds.find(b => b.id === id);
    if (!build) return;

    const myVotes = getMyVotes();
    const current = myVotes[id]; // 'up', 'down', or undefined
    const amt = direction === 'up' ? 1 : -1;

    if (current === direction) {
        // Already voted this way — cancel vote
        build.votes -= amt;
        delete myVotes[id];
    } else {
        // Switch vote or fresh vote
        if (current) build.votes -= (current === 'up' ? 1 : -1); // undo old
        build.votes += amt;
        myVotes[id] = direction;
    }

    saveMyVotes(myVotes);
    localStorage.setItem('pilgrammed_shared_builds', JSON.stringify(state.communityBuilds));
    renderCommunityBuilds();
};

function renderLoadouts() {
    const loadoutsGrid = document.getElementById('loadoutsGrid');
    loadoutsGrid.innerHTML = '';
    const startIdx = state.activePage * 10;
    const pageLoadouts = state.loadouts.slice(startIdx, startIdx + 10);
    const nameColors = ['#ff0000', '#ff9900', '#ffd700', '#00ff00', '#00ffff', '#0077ff', '#9900ff', '#555555', '#cccccc', '#ff00ff'];

    pageLoadouts.forEach((loadout, i) => {
        const slotIdx = startIdx + i;
        const card = document.createElement('div');
        card.className = 'loadout-card';
        let content = '';
        if (loadout) {
            const head = loadout.equipped.head ? loadout.equipped.head.name : '';
            const chest = loadout.equipped.chest ? loadout.equipped.chest.name : '';
            const accs = ['acc1', 'acc2', 'acc3', 'acc4', 'acc5']
                .map(a => loadout.equipped[a] ? loadout.equipped[a].name : '')
                .filter(n => n !== '');
            content = `
                <h3 style="color: ${nameColors[i]}">${loadout.name}</h3>
                <div class="loadout-main-items">
                    <p class="minor-text">${head}</p>
                    <p class="minor-text">${chest}</p>
                </div>
                <div class="loadout-acc-list">
                    ${accs.map(name => `<p>${name}</p>`).join('')}
                </div>
            `;
        } else {
            content = `
                <h3 style="color: #666">Loadout ${slotIdx + 1}</h3>
                <p>Empty Slot</p>
            `;
        }
        card.innerHTML = `
            ${content}
            <div class="loadout-btns">
                <button class="load-btn" onclick="handleLoad(${slotIdx})">Load</button>
                <button class="save-btn" onclick="handleSave(${slotIdx})">Save</button>
            </div>
        `;
        loadoutsGrid.appendChild(card);
    });
}

window.handleSave = (idx) => {
    const name = prompt('Enter a name for this loadout:', 'New Build');
    if (name && name.trim()) {
        const buildItems = Object.values(state.equipped).filter(i => i !== null);
        if (buildItems.length === 0) { alert('Equip some items first!'); return; }
        state.loadouts[idx] = { name: name.trim(), equipped: { ...state.equipped } };
        saveLoadoutsToDisk();
        renderLoadouts();
    }
};

window.handleLoad = (idx) => {
    if (state.loadouts[idx]) {
        state.equipped = { ...state.loadouts[idx].equipped };
        Object.keys(state.equipped).forEach(id => updateSlotUI(id, state.equipped[id]));
        calculateStats(); switchView('build');
    }
};

window.handlePage = (num) => { state.activePage = num - 1; renderLoadouts(); };

init();
