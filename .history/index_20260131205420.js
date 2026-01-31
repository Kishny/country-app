// ===============================
// GlobalExplorer — index.js (Premium + Drawer + Favoris + FIX 400)
// ===============================

// ---- DOM ----
const countriesContainer = document.querySelector(".countries-container");
const btnSort = document.querySelectorAll(".btnSort");
const totalCountries = document.getElementById("totalCountries");
const totalPopulation = document.getElementById("totalPopulation");
const resultsCount = document.getElementById("resultsCount");
const lastUpdate = document.getElementById("lastUpdate");
const loadingOverlay = document.getElementById("loading");
const viewButtons = document.querySelectorAll(".view-btn");

const inputSearch = document.getElementById("inputSearch");
const inputRange = document.getElementById("inputRange");
const rangeValue = document.getElementById("rangeValue");

const favToggle = document.getElementById("favToggle");
const favCount = document.getElementById("favCount");
const favModeLabel = document.getElementById("favModeLabel");

const drawer = document.getElementById("countryDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const drawerClose = document.getElementById("drawerClose");
const drawerContent = document.getElementById("drawerContent");

const toast = document.getElementById("toast");

// ---- State ----
let countriesData = [];
let sortMethod = "maxToMin";
let currentView = "grid";
let favoritesOnly = false;
let lastFocusedElement = null;

// ✅ FIX: /all doit rester LIGHT sinon 400
const LIST_FIELDS =
  "cca3,name,translations,flags,capital,region,population,area";
const API_LIST_DIRECT = `https://restcountries.com/v3.1/all?fields=${LIST_FIELDS}`;
const API_LIST_PROXY = `https://api.allorigins.win/raw?url=${encodeURIComponent(
  API_LIST_DIRECT
)}`;

// ✅ Détails chargés au clic (premium + perf)
const DETAIL_FIELDS =
  "cca3,name,translations,flags,coatOfArms,capital,region,subregion,population,area,languages,currencies,timezones,tld,borders,maps,unMember,independent,car";
function API_DETAIL_DIRECT(code) {
  return `https://restcountries.com/v3.1/alpha/${code}?fields=${DETAIL_FIELDS}`;
}
function API_DETAIL_PROXY(code) {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(
    API_DETAIL_DIRECT(code)
  )}`;
}

// ---- Favoris storage ----
const FAVORITES_KEY = "globalexplorer_favorites_cca3";
function getFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveFavorites(set) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}
let favorites = getFavorites();

// ===============================
// UI helpers
// ===============================
function showLoading() {
  loadingOverlay.style.display = "flex";
}
function hideLoading() {
  loadingOverlay.style.display = "none";
}

function toastShow(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 1100);
}

function formatNumber(n) {
  return (n || 0).toLocaleString("fr-FR");
}

function safeNameFR(country) {
  return (
    country?.translations?.fra?.common || country?.name?.common || "Nom inconnu"
  );
}

function safeCapital(country) {
  const cap = country?.capital;
  if (Array.isArray(cap) && cap.length) return cap[0];
  if (typeof cap === "string" && cap.trim()) return cap;
  return "Non spécifié";
}

function safeFlag(country) {
  return country?.flags?.svg || country?.flags?.png || "";
}

function safeCoat(country) {
  return country?.coatOfArms?.svg || country?.coatOfArms?.png || "";
}

function setLastUpdateNow() {
  const now = new Date();
  lastUpdate.textContent = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showError(message) {
  countriesContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Impossible de charger les données</h3>
      <p>${message}</p>
    </div>
  `;
}

function showEmpty(message = "Aucun pays trouvé") {
  countriesContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-info-circle"></i>
      <h3>${message}</h3>
      <p>Modifie la recherche, le nombre de pays affichés, ou désactive le mode favoris.</p>
    </div>
  `;
}

// ===============================
// Drawer
// ===============================
function openDrawer() {
  // mémorise l’élément qui avait le focus avant d’ouvrir
  lastFocusedElement = document.activeElement;

  drawer.classList.add("open");
  drawerOverlay.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // focus sur le bouton fermer (accessibilité)
  setTimeout(() => {
    drawerClose.focus();
  }, 0);
}

function closeDrawer() {
  // IMPORTANT: déplacer le focus AVANT de cacher le drawer
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  } else {
    // fallback : focus sur body
    document.body.focus?.();
  }

  drawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ===============================
// Fetch helpers
// ===============================
async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonSmart(directUrl, proxyUrl) {
  // 1) try direct
  let res = await fetchWithTimeout(directUrl, 15000);
  if (!res.ok) {
    console.warn("Direct failed:", res.status, directUrl);
    // 2) proxy
    res = await fetchWithTimeout(proxyUrl, 15000);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  return res.json();
}

// ===============================
// Load list (light)
// ===============================
async function fetchCountries() {
  showLoading();

  try {
    const data = await fetchJsonSmart(API_LIST_DIRECT, API_LIST_PROXY);

    // data should be array
    countriesData = Array.isArray(data) ? data : [];

    updateStats();
    updateFavUI();
    countriesDisplay();
    setLastUpdateNow();
  } catch (error) {
    console.error("Erreur fetchCountries:", error);

    if (error.name === "AbortError") {
      showError(
        "Timeout : la requête a mis trop de temps. Vérifie ta connexion."
      );
    } else {
      showError(error.message || "Erreur inconnue.");
    }
  } finally {
    hideLoading();
  }
}

// ===============================
// Load details (heavy, on demand)
// ===============================
async function fetchCountryDetails(code) {
  // mini loader dans le drawer
  drawerContent.innerHTML = `
    <div class="drawer-section">
      <h4>Chargement…</h4>
      <p>On récupère les infos premium pour <strong>${code}</strong>.</p>
    </div>
  `;
  openDrawer();

  try {
    const data = await fetchJsonSmart(
      API_DETAIL_DIRECT(code),
      API_DETAIL_PROXY(code)
    );

    // /alpha/{code} renvoie souvent un tableau [country]
    const country = Array.isArray(data) ? data[0] : data;

    if (!country) throw new Error("Pays introuvable.");

    renderCountryDetails(country);
  } catch (error) {
    console.error("Erreur fetchCountryDetails:", error);

    drawerContent.innerHTML = `
      <div class="drawer-section">
        <h4>Impossible de charger les détails</h4>
        <p>${error.message || "Erreur inconnue"}</p>
      </div>
    `;
  }
}

// ===============================
// Stats + favoris UI
// ===============================
function updateStats() {
  totalCountries.textContent = formatNumber(countriesData.length);

  const totalPop = countriesData.reduce(
    (sum, c) => sum + (c?.population || 0),
    0
  );
  totalPopulation.textContent = formatNumber(totalPop);
}

function updateFavUI() {
  favCount.textContent = formatNumber(favorites.size);
  favModeLabel.textContent = favoritesOnly ? "Activé" : "Désactivé";
  favToggle.classList.toggle("active", favoritesOnly);
}

// ===============================
// Favorites
// ===============================
function toggleFavorite(cca3) {
  if (!cca3) return;
  if (favorites.has(cca3)) {
    favorites.delete(cca3);
    toastShow("Retiré des favoris");
  } else {
    favorites.add(cca3);
    toastShow("Ajouté aux favoris ⭐");
  }
  saveFavorites(favorites);
  updateFavUI();
}

// ===============================
// Drawer render details
// ===============================
function renderCountryDetails(country) {
  const name = safeNameFR(country);
  const flag = safeFlag(country);
  const coat = safeCoat(country);

  const region = country?.region || "—";
  const subregion = country?.subregion || "—";
  const capital = safeCapital(country);
  const pop = formatNumber(country?.population || 0);
  const area = country?.area ? `${formatNumber(country.area)} km²` : "—";
  const cca3 = country?.cca3 || "";

  const languages = country?.languages ? Object.values(country.languages) : [];
  const currencies = country?.currencies
    ? Object.values(country.currencies).map((c) => c.name)
    : [];
  const timezones = country?.timezones || [];
  const tld = country?.tld || [];
  const borders = country?.borders || [];
  const maps = country?.maps?.googleMaps || "";

  const unMember = country?.unMember ? "Oui" : "Non";
  const independent = country?.independent ? "Oui" : "Non";
  const drivingSide = country?.car?.side ? country.car.side.toUpperCase() : "—";

  const isFav = favorites.has(cca3);

  drawerContent.innerHTML = `
    <div class="drawer-hero">
      ${flag ? `<img src="${flag}" alt="Drapeau ${name}">` : ""}
      <div class="drawer-title">
        <h2>${name}</h2>
        <p>${region} • ${subregion} • <strong>${cca3}</strong></p>
      </div>
    </div>

    <div class="drawer-actions">
      ${
        maps
          ? `<button class="action-btn" id="btnMaps"><i class="fas fa-map"></i> Carte</button>`
          : ""
      }
      <button class="action-btn" id="btnCopy"><i class="fas fa-copy"></i> Copier</button>
      <button class="action-btn" id="btnShare"><i class="fas fa-share"></i> Partager</button>
      <button class="action-btn" id="btnFavDetail">
        <i class="fas fa-star"></i> ${isFav ? "Retirer" : "Favori"}
      </button>
    </div>

    <div class="drawer-section">
      <h4>Informations</h4>
      <p><i class="fas fa-landmark"></i> <strong>Capitale :</strong> ${capital}</p>
      <p><i class="fas fa-users"></i> <strong>Population :</strong> ${pop}</p>
      <p><i class="fas fa-expand-arrows-alt"></i> <strong>Superficie :</strong> ${area}</p>
    </div>

    <div class="drawer-section">
      <h4>Langues</h4>
      <div class="chips">
        ${(languages.length ? languages : ["—"])
          .map((l) => `<span class="chip">${l}</span>`)
          .join("")}
      </div>
    </div>

    <div class="drawer-section">
      <h4>Monnaies</h4>
      <div class="chips">
        ${(currencies.length ? currencies : ["—"])
          .map((m) => `<span class="chip">${m}</span>`)
          .join("")}
      </div>
    </div>

    <div class="drawer-section">
      <h4>Tech & géographie</h4>
      <p><strong>Membre ONU :</strong> ${unMember}</p>
      <p><strong>Indépendant :</strong> ${independent}</p>
      <p><strong>Conduite :</strong> ${drivingSide}</p>
      <div style="margin-top:10px" class="chips">
        ${(timezones.length ? timezones : ["—"])
          .slice(0, 10)
          .map((tz) => `<span class="chip">${tz}</span>`)
          .join("")}
      </div>
    </div>

    <div class="drawer-section">
      <h4>Domaines internet</h4>
      <div class="chips">
        ${(tld.length ? tld : ["—"])
          .map((d) => `<span class="chip">${d}</span>`)
          .join("")}
      </div>
    </div>

    <div class="drawer-section">
      <h4>Pays voisins (codes)</h4>
      <div class="chips">
        ${(borders.length ? borders : ["—"])
          .slice(0, 14)
          .map((b) => `<span class="chip">${b}</span>`)
          .join("")}
      </div>
    </div>

    ${
      coat
        ? `
      <div class="drawer-section">
        <h4>Blason</h4>
        <img src="${coat}" alt="Blason ${name}" style="width:120px; max-width:100%; border-radius:14px; box-shadow: 0 12px 30px rgba(0,0,0,.12);" />
      </div>`
        : ""
    }
  `;

  // Actions
  const btnMaps = document.getElementById("btnMaps");
  if (btnMaps && maps)
    btnMaps.addEventListener("click", () => window.open(maps, "_blank"));

  document.getElementById("btnCopy").addEventListener("click", async () => {
    const text = `${name} (${cca3})
Capitale: ${capital}
Population: ${pop}
Région: ${region} / ${subregion}
Superficie: ${area}`;
    await navigator.clipboard.writeText(text);
    toastShow("Copié ✅");
  });

  document.getElementById("btnShare").addEventListener("click", async () => {
    const shareData = {
      title: name,
      text: `Infos sur ${name}`,
      url: maps || location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(maps || name);
      toastShow("Lien copié ✅");
    }
  });

  document.getElementById("btnFavDetail").addEventListener("click", () => {
    toggleFavorite(cca3);
    renderCountryDetails(country); // refresh label
    countriesDisplay(); // refresh icons
  });

  openDrawer();
}

// ===============================
// Display list/grid
// ===============================
function updateActiveSortButtons() {
  btnSort.forEach((btn) =>
    btn.classList.toggle("active", btn.id === sortMethod)
  );
}

function countriesDisplay() {
  const search = (inputSearch.value || "").trim().toLowerCase();
  const limit = Number(inputRange.value || 24);

  let filtered = countriesData.filter((country) => {
    const name = safeNameFR(country).toLowerCase();
    const matchSearch = name.includes(search);

    const cca3 = country?.cca3 || "";
    const matchFav = favoritesOnly ? favorites.has(cca3) : true;

    return matchSearch && matchFav;
  });

  filtered.sort((a, b) => {
    if (sortMethod === "maxToMin")
      return (b.population || 0) - (a.population || 0);
    if (sortMethod === "minToMax")
      return (a.population || 0) - (b.population || 0);
    if (sortMethod === "alpha")
      return safeNameFR(a).localeCompare(safeNameFR(b), "fr");
    return 0;
  });

  filtered = filtered.slice(0, limit);

  resultsCount.textContent = formatNumber(filtered.length);
  countriesContainer.className = `countries-container ${currentView}-view`;

  if (!filtered.length) {
    showEmpty();
    updateActiveSortButtons();
    return;
  }

  countriesContainer.innerHTML = filtered
    .map((country) => {
      const name = safeNameFR(country);
      const capital = safeCapital(country);
      const region = country?.region || "Non spécifié";
      const flag = safeFlag(country);
      const cca3 = country?.cca3 || "";
      const isFav = favorites.has(cca3);

      const areaKm2 = country?.area
        ? country.area.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        : "—";

      const pop = formatNumber(country?.population || 0);

      return `
        <div class="card" data-code="${cca3}" role="button" tabindex="0">
          <button class="fav-corner ${
            isFav ? "active" : ""
          }" data-fav="${cca3}" title="Favori">
            <i class="fas fa-star"></i>
          </button>

          ${
            flag
              ? `<img src="${flag}" alt="Drapeau ${name}" loading="lazy">`
              : ""
          }

          <div class="card-content">
            <h2>${name}</h2>
            <h4><i class="fas fa-landmark"></i> ${capital}</h4>
            <p><i class="fas fa-globe-americas"></i> ${region}</p>
            <p><i class="fas fa-expand-arrows-alt"></i> ${areaKm2} km²</p>
            <div class="population">
              <i class="fas fa-users"></i>
              Population : ${pop}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // clic card -> fetch details -> drawer
  countriesContainer.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const code = card.dataset.code;
      if (code) fetchCountryDetails(code);
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // étoile -> favoris (sans ouvrir)
  countriesContainer.querySelectorAll(".fav-corner").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.fav);
      countriesDisplay();
    });
  });

  updateActiveSortButtons();
}

// ===============================
// Events
// ===============================
window.addEventListener("load", () => {
  rangeValue.textContent = inputRange.value;
  updateFavUI();
  fetchCountries();
});

// Debounce recherche
let searchTimeout;
inputSearch.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(countriesDisplay, 250);
});

inputRange.addEventListener("input", () => {
  rangeValue.textContent = inputRange.value;
  countriesDisplay();
});

btnSort.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    sortMethod = e.currentTarget.id;
    countriesDisplay();
  });
});

viewButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    currentView = e.currentTarget.id.replace("View", "");
    viewButtons.forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    countriesDisplay();
  });
});

favToggle.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  updateFavUI();
  countriesDisplay();
});
