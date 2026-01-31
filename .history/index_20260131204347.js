// ===============================
// GlobalExplorer — index.js (Premium + Drawer + Favoris)
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
let sortMethod = "maxToMin"; // maxToMin | minToMax | alpha
let currentView = "grid"; // grid | list
let favoritesOnly = false;

// ✅ REST Countries: fields obligatoires sinon 400
const FIELDS =
  "name,translations,flags,coatOfArms,capital,region,subregion,population,area,languages,currencies,timezones,tld,borders,maps,unMember,independent,car,cca3";
const API_DIRECT = `https://restcountries.com/v3.1/all?fields=${FIELDS}`;
const API_PROXY = `https://api.allorigins.win/raw?url=${encodeURIComponent(
  API_DIRECT
)}`;

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
      <p>Essayez de modifier votre recherche, le nombre de pays affichés, ou désactivez le mode favoris.</p>
    </div>
  `;
}

// ===============================
// Drawer
// ===============================
function openDrawer() {
  drawer.classList.add("open");
  drawerOverlay.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

drawerOverlay.addEventListener("click", closeDrawer);
drawerClose.addEventListener("click", closeDrawer);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// ===============================
// Fetch
// ===============================
async function fetchWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCountries() {
  showLoading();

  try {
    let response = await fetchWithTimeout(API_DIRECT, 12000);

    if (!response.ok) {
      console.warn("Direct API failed:", response.status);
      response = await fetchWithTimeout(API_PROXY, 12000);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} — ${response.statusText}`);
    }

    const data = await response.json();

    await new Promise((r) => setTimeout(r, 250));

    countriesData = Array.isArray(data) ? data : [];

    updateStats();
    countriesDisplay();
    setLastUpdateNow();
    updateFavUI();
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
// Render drawer details
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
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(maps || name);
      toastShow("Lien copié ✅");
    }
  });

  document.getElementById("btnFavDetail").addEventListener("click", () => {
    toggleFavorite(cca3);
    renderCountryDetails(country); // refresh button label
    countriesDisplay(); // refresh cards icon
  });

  openDrawer();
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
// Display list/grid
// ===============================
function updateActiveSortButtons() {
  btnSort.forEach((btn) => {
    btn.classList.toggle("active", btn.id === sortMethod);
  });
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

  // 1) clic card -> drawer
  countriesContainer.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const code = card.dataset.code;
      const country = countriesData.find((c) => c.cca3 === code);
      if (country) renderCountryDetails(country);
    });

    // accessibilité clavier
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // 2) clic étoile -> toggle favori (sans ouvrir le drawer)
  countriesContainer.querySelectorAll(".fav-corner").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.dataset.fav;
      toggleFavorite(code);
      countriesDisplay(); // refresh icons
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

// Toggle favoris only
favToggle.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  updateFavUI();
  countriesDisplay();
});

// ===============================
// Small error styles (fallback)
// ===============================
const style = document.createElement("style");
style.textContent = `
  .error-message{
    grid-column:1 / -1;
    text-align:center;
    padding:4rem 2rem;
    background:white;
    border-radius:16px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
    border: 1px solid rgba(0,0,0,.06);
  }
  .error-message i{
    font-size:3rem;
    color:#ef4444;
    margin-bottom:1rem;
  }
  .error-message h3{ margin:0 0 .75rem; color:#0b0d12; }
  .error-message p{ margin:0; color:#64748b; }
`;
document.head.appendChild(style);
