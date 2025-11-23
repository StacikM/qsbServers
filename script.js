// script.js
const API = "https://server.ctksystem.com/lobby/list";
const AUTO_REFRESH_INTERVAL = 5000; // ms (when Auto enabled)
const PAGE_SIZE = 12;

let state = {
  items: [],
  filtered: [],
  page: 1,
  sort: "players_desc"
};

const el = {
  list: document.getElementById("list"),
  stats: document.getElementById("stats"),
  refreshBtn: document.getElementById("refreshBtn"),
  search: document.getElementById("search"),
  regionFilter: document.getElementById("regionFilter"),
  sortBy: document.getElementById("sortBy"),
  autoRefresh: document.getElementById("autoRefresh"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo")
};

async function fetchLobbies() {
  try {
    const r = await fetch(API);
    if (!r.ok) throw new Error("Network error " + r.status);
    const data = await r.json();

    state.items = Array.isArray(data) ? data : [];

    applyFiltersAndRender();
    populateRegions(); // ensure dropdown reflects updated list
  } catch (err) {
    el.stats.textContent = "Failed to load lobbies: " + err.message;
    el.list.innerHTML = "";
  }
}

function applyFiltersAndRender() {
  const region = el.regionFilter.value.trim();
  const q = el.search.value.trim().toLowerCase();

  let items = state.items.slice();

  if (region)
    items = items.filter(
      i => (i.region || "").toLowerCase() === region.toLowerCase()
    );

  if (q) {
    items = items.filter(i =>
      (i.ip || "").includes(q) ||
      (i.port || "").toString().includes(q) ||
      (i.steamId || "").toLowerCase().includes(q)
    );
  }

  if (state.sort === "players_desc") {
    items.sort((a, b) => (b.players || 0) - (a.players || 0));
  } else if (state.sort === "players_asc") {
    items.sort((a, b) => (a.players || 0) - (b.players || 0));
  }

  state.filtered = items;
  state.page = Math.max(
    1,
    Math.min(state.page, Math.ceil(state.filtered.length / PAGE_SIZE) || 1)
  );

  render();
}

function render() {
  el.stats.textContent = `Showing ${state.filtered.length} server(s). Total discovered: ${state.items.length}. Page ${state.page}.`;

  const totalPages = Math.max(
    1,
    Math.ceil(state.filtered.length / PAGE_SIZE)
  );

  el.prevPage.disabled = state.page <= 1;
  el.nextPage.disabled = state.page >= totalPages;
  el.pageInfo.textContent = `Page ${state.page} / ${totalPages}`;

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

  el.list.innerHTML = pageItems.map(renderCard).join("\n");
}

function renderCard(i) {
  const ip = i.ip || "unknown";
  const port = i.port || "";
  const players = i.players || 0;
  const maxPlayers = i.maxPlayers || 0;
  const region = i.region || "global";
  const steam = i.steamId || "unknown";

  return `
    <div class="card">
      <h3>${ip}:${port}</h3>
      <div class="meta">
        <div class="badge">${players} / ${maxPlayers}</div>
        <div class="small">Region: ${region}</div>
        <div class="small">Host SteamID (use this to connect): ${steam}</div>
        <div class="small">Lobby ID: ${i.lobbyId}</div>
      </div>
      <p class="small">Version: ${i.version || "unknown"}</p>
      <div class="joinRow">
        <div class="small">Players: ${players}/${maxPlayers}</div>
        <div>
          <button class="joinBtn" onclick="onJoin('${steam}')">Show / Copy</button>
        </div>
      </div>
    </div>
  `;
}

function onJoin(steamId) {
  if (!steamId || steamId === "unknown") {
    alert("No Steam ID available for this lobby.");
    return;
  }

  navigator.clipboard?.writeText(steamId)
    .then(() => {
      alert(`Steam ID copied:\n${steamId}\nUse this Steam ID in-game to connect.`);
    })
    .catch(() => {
      prompt("Copy Steam ID manually:", steamId);
    });
}

function populateRegions() {
  const regions = Array.from(
    new Set(state.items.map(i => i.region || "global"))
  ).sort();

  const cur = el.regionFilter.value;

  el.regionFilter.innerHTML =
    `<option value="">All regions</option>` +
    regions.map(r => `<option value="${r}">${r}</option>`).join("");

  if (regions.includes(cur)) el.regionFilter.value = cur;
}

function wire() {
  el.refreshBtn.addEventListener("click", fetchLobbies);
  el.search.addEventListener("input", () => {
    state.page = 1;
    applyFiltersAndRender();
  });
  el.regionFilter.addEventListener("change", () => {
    state.page = 1;
    applyFiltersAndRender();
  });
  el.sortBy.addEventListener("change", e => {
    state.sort = e.target.value;
    applyFiltersAndRender();
  });
  el.autoRefresh.addEventListener("change", toggleAutoRefresh);
  el.prevPage.addEventListener("click", () => {
    state.page--;
    render();
  });
  el.nextPage.addEventListener("click", () => {
    state.page++;
    render();
  });

  state.sort = el.sortBy.value;
}

let autoTimer = null;
function toggleAutoRefresh() {
  if (el.autoRefresh.checked) {
    autoTimer = setInterval(fetchLobbies, AUTO_REFRESH_INTERVAL);
  } else {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

async function init() {
  wire();
  await fetchLobbies();
  if (el.autoRefresh.checked) toggleAutoRefresh();
}

init();
