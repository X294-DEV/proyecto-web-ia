const API = "https://rickandmortyapi.com/api/character";
const FAV_KEY = "rm_favorites";

const $ = (id) => document.getElementById(id);
const els = {
  grid: $("grid"), message: $("message"), loader: $("loader"),
  search: $("search"), status: $("filter-status"), gender: $("filter-gender"),
  species: $("filter-species"), sort: $("sort"), reset: $("reset"),
  prev: $("prev"), next: $("next"), pageInfo: $("page-info"), pager: $("pager"),
  tabAll: $("tab-all"), tabFav: $("tab-fav"), favCount: $("fav-count"),
  modal: $("modal"), modalBody: $("modal-body"), modalClose: $("modal-close"),
};

const state = { page: 1, pages: 1, view: "all", characters: [] };
let favorites = loadFavorites();
let debounceTimer;
let requestId = 0;

const labels = {
  Alive: "Vivo", Dead: "Muerto", unknown: "Desconocido",
  Male: "Masculino", Female: "Femenino", Genderless: "Sin género",
};
const t = (v) => labels[v] || v;

/* ---------- Favoritos (localStorage) ---------- */
function loadFavorites() {
  try {
    const data = JSON.parse(localStorage.getItem(FAV_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function saveFavorites() {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  } catch {
    showMessage("No se pudieron guardar los favoritos en este navegador.", true);
  }
  els.favCount.textContent = favorites.length;
}
const isFav = (id) => favorites.some((c) => c.id === id);
function toggleFav(char) {
  favorites = isFav(char.id)
    ? favorites.filter((c) => c.id !== char.id)
    : [...favorites, char];
  saveFavorites();
  render();
}

/* ---------- API ---------- */
async function fetchCharacters() {
  const id = ++requestId;
  const params = new URLSearchParams({ page: state.page });
  if (els.search.value.trim()) params.set("name", els.search.value.trim());
  if (els.status.value) params.set("status", els.status.value);
  if (els.gender.value) params.set("gender", els.gender.value);
  if (els.species.value) params.set("species", els.species.value);

  els.loader.hidden = false;
  hideMessage();
  try {
    const res = await fetch(`${API}?${params}`);
    if (id !== requestId) return;
    if (res.status === 404) {
      state.characters = [];
      state.pages = 1;
      showMessage("No se encontraron personajes con esos criterios.");
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      const data = await res.json();
      state.characters = data.results;
      state.pages = data.info.pages;
    }
  } catch (err) {
    if (id !== requestId) return;
    state.characters = [];
    state.pages = 1;
    showMessage("Error al consultar la API. Revisa tu conexión e inténtalo de nuevo.", true);
  } finally {
    if (id === requestId) {
      els.loader.hidden = true;
      render();
    }
  }
}

/* ---------- Render ---------- */
function sorted(list) {
  const copy = [...list];
  if (els.sort.value === "az") copy.sort((a, b) => a.name.localeCompare(b.name));
  if (els.sort.value === "za") copy.sort((a, b) => b.name.localeCompare(a.name));
  return copy;
}

function favoritesFiltered() {
  const q = els.search.value.trim().toLowerCase();
  return favorites.filter((c) =>
    (!q || c.name.toLowerCase().includes(q)) &&
    (!els.status.value || c.status.toLowerCase() === els.status.value) &&
    (!els.gender.value || c.gender.toLowerCase() === els.gender.value) &&
    (!els.species.value || c.species === els.species.value)
  );
}

function describe(c) {
  return `${c.species} ·${t(c.gender)}. Origen: ${c.origin.name}. Última ubicación: ${c.location.name}.`;
}

function cardHTML(c) {
  const fav = isFav(c.id);
  return `
    <article class="card">
      <button class="fav-btn ${fav ? "on" : ""}" data-fav="${c.id}"
        aria-label="${fav ? "Quitar de favoritos" : "Añadir a favoritos"}">${fav ? "♥" : "♡"}</button>
      <img src="${c.image}" alt="${escapeHTML(c.name)}" loading="lazy" data-info="${c.id}">
      <div class="card-body">
        <h3 data-info="${c.id}">${escapeHTML(c.name)}</h3>
        <span class="status"><span class="dot ${c.status.toLowerCase()}"></span>${t(c.status)}</span>
        <p>${escapeHTML(describe(c))}</p>
      </div>
    </article>`;
}

function render() {
  const inFav = state.view === "favorites";
  const list = inFav ? sorted(favoritesFiltered()) : sorted(state.characters);

  els.grid.innerHTML = list.map(cardHTML).join("");
  els.pager.hidden = inFav;
  els.prev.disabled = state.page <= 1;
  els.next.disabled = state.page >= state.pages;
  els.pageInfo.textContent = `Página ${state.page} de ${state.pages}`;

  if (inFav) {
    if (!favorites.length) showMessage("Aún no tienes favoritos. Pulsa ♡ en un personaje para guardarlo.");
    else if (!list.length) showMessage("Ningún favorito coincide con la búsqueda o filtros.");
    else hideMessage();
  }
}

function showMessage(text, isError = false) {
  els.message.textContent = text;
  els.message.className = "message" + (isError ? " error" : "");
  els.message.hidden = false;
}
function hideMessage() { els.message.hidden = true; }

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

/* ---------- Modal ---------- */
function openModal(char) {
  els.modalBody.innerHTML = `
    <img src="${char.image}" alt="${escapeHTML(char.name)}">
    <div class="modal-inner">
      <h2>${escapeHTML(char.name)}</h2>
      <dl>
        <dt>Estado</dt><dd>${t(char.status)}</dd>
        <dt>Especie</dt><dd>${escapeHTML(char.species)}</dd>
        <dt>Tipo</dt><dd>${escapeHTML(char.type || "—")}</dd>
        <dt>Género</dt><dd>${t(char.gender)}</dd>
        <dt>Origen</dt><dd>${escapeHTML(char.origin.name)}</dd>
        <dt>Ubicación</dt><dd>${escapeHTML(char.location.name)}</dd>
        <dt>Episodios</dt><dd>${char.episode.length}</dd>
      </dl>
    </div>`;
  els.modal.hidden = false;
}
function closeModal() { els.modal.hidden = true; }

/* ---------- Eventos ---------- */
function refresh(resetPage = true) {
  if (resetPage) state.page = 1;
  if (state.view === "favorites") render();
  else fetchCharacters();
}

els.search.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => refresh(), 350);
});
[els.status, els.gender, els.species].forEach((el) => el.addEventListener("change", () => refresh()));
els.sort.addEventListener("change", render);

els.reset.addEventListener("click", () => {
  els.search.value = els.status.value = els.gender.value = els.species.value = els.sort.value = "";
  refresh();
});

els.prev.addEventListener("click", () => { state.page--; fetchCharacters(); window.scrollTo({ top: 0, behavior: "smooth" }); });
els.next.addEventListener("click", () => { state.page++; fetchCharacters(); window.scrollTo({ top: 0, behavior: "smooth" }); });

function setView(view) {
  state.view = view;
  els.tabAll.classList.toggle("active", view === "all");
  els.tabFav.classList.toggle("active", view === "favorites");
  els.tabAll.setAttribute("aria-selected", view === "all");
  els.tabFav.setAttribute("aria-selected", view === "favorites");
  hideMessage();
  if (view === "all") refresh(false);
  else { requestId++; els.loader.hidden = true; render(); }
}
els.tabAll.addEventListener("click", () => setView("all"));
els.tabFav.addEventListener("click", () => setView("favorites"));

els.grid.addEventListener("click", (e) => {
  const favBtn = e.target.closest("[data-fav]");
  const info = e.target.closest("[data-info]");
  const findChar = (id) => [...state.characters, ...favorites].find((c) => c.id === Number(id));
  if (favBtn) toggleFav(findChar(favBtn.dataset.fav));
  else if (info) openModal(findChar(info.dataset.info));
});

els.modalClose.addEventListener("click", closeModal);
els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

/* ---------- Tema (claro/oscuro y color personalizado) ---------- */
const root = document.documentElement;
const themeBtn = $("theme-toggle");
const customBtn = $("custom-toggle");

function syncThemeButtons() {
  const light = root.dataset.theme === "light";
  themeBtn.textContent = light ? "☾" : "☀";
  customBtn.setAttribute("aria-pressed", root.dataset.custom === "on");
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
themeBtn.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  store("rm_theme", root.dataset.theme);
  syncThemeButtons();
});
customBtn.addEventListener("click", () => {
  root.dataset.custom = root.dataset.custom === "on" ? "off" : "on";
  store("rm_custom", root.dataset.custom);
  syncThemeButtons();
});
syncThemeButtons();

/* ---------- Inicio ---------- */
els.favCount.textContent = favorites.length;
fetchCharacters();
