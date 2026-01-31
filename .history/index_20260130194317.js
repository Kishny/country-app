// ===============================
// GlobalExplorer — script.js
// ===============================

// ---- DOM ----
const countriesContainer = document.querySelector(".countries-container");

const btnSort = document.querySelectorAll(".btnSort");
const viewButtons = document.querySelectorAll(".view-btn");

const totalCountries = document.getElementById("totalCountries");
const totalPopulation = document.getElementById("totalPopulation");
const resultsCount = document.getElementById("resultsCount");
const lastUpdate = document.getElementById("lastUpdate");
const loadingOverlay = document.getElementById("loading");

// Inputs (IMPORTANT)
const inputSearch = document.getElementById("inputSearch");
const inputRange = document.getElementById("inputRange");
const rangeValue = document.getElementById("rangeValue");

// ---- State ----
let countriesData = [];
let sortMethod = "maxToMin"; // maxToMin | minToMax | alpha
let currentView = "grid"; // grid | list

// ===============================
// Utils
// ===============================
function showLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "flex";
}

function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
}

function safeNameFR(country) {
  return (
    country?.translations?.fra?.common || country?.name?.common || "Nom inconnu"
  );
}

function safeCapital(country) {
  if (Array.isArray(country?.capital) && country.capital.length)
    return country.capital[0];
  return "Non spécifié";
}

function formatNumber(n) {
  return (n || 0).toLocaleString("fr-FR");
}

function setLastUpdateNow() {
  if (!lastUpdate) return;
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
  if (!countriesContainer) return;
  countriesContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Impossible de charger les données</h3>
      <p>${message}</p>
    </div>
  `;
}

function showEmpty(message = "Aucun résultat.") {
  if (!countriesContainer) return;
  countriesContainer.innerHTML = `
    <div class="error-message">
      <i class="fas fa-info-circle"></i>
      <h3>${message}</h3>
      <p>Essayez de modifier votre recherche ou le nombre de pays affichés.</p>
    </div>
  `;
}

// ===============================
// Fetch (avec timeout + response.ok)
// ===============================
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchCountries() {
  showLoading();

  try {
    // API
    const url =
      "https://api.allorigins.win/raw?url=https://restcountries.com/v3.1/all";

    const response = await fetchWithTimeout(url, {}, 12000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} — ${response.statusText}`);
    }

    const data = await response.json();

    // Petit délai pour ton animation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Sécurise: on veut un tableau
    countriesData = Array.isArray(data) ? data : [];

    updateStats();
    countriesDisplay();
    setLastUpdateNow();
  } catch (error) {
    console.error("Erreur fetchCountries:", error);

    if (error.name === "AbortError") {
      showError("Temps de réponse trop long (timeout). Vérifie ta connexion.");
      return;
    }

    // Souvent utile si CORS
    showError(error.message || "Erreur inconnue.");
  } finally {
    hideLoading();
  }
}

// ===============================
// Stats
// ===============================
function updateStats() {
  if (!totalCountries || !totalPopulation) return;

  totalCountries.textContent = formatNumber(countriesData.length);

  const totalPop = countriesData.reduce((sum, country) => {
    return sum + (country?.population || 0);
  }, 0);

  totalPopulation.textContent = formatNumber(totalPop);
}

// ===============================
// Display
// ===============================
function countriesDisplay() {
  if (!countriesContainer) return;

  const search = (inputSearch?.value || "").trim().toLowerCase();
  const limit = Number(inputRange?.value || 50);

  let filtered = countriesData.filter((country) => {
    const name = safeNameFR(country).toLowerCase();
    return name.includes(search);
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

  if (resultsCount) resultsCount.textContent = formatNumber(filtered.length);

  countriesContainer.className = `countries-container ${currentView}-view`;

  if (!filtered.length) {
    showEmpty("Aucun pays trouvé");
    updateActiveSortButtons();
    return;
  }

  countriesContainer.innerHTML = filtered
    .map((country) => {
      const name = safeNameFR(country);
      const capital = safeCapital(country);
      const region = country?.region || "Non spécifié";
      const flag = country?.flags?.svg || country?.flags?.png || "";
      const areaKm2 = country?.area
        ? country.area.toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        : "—";
      const pop = formatNumber(country?.population || 0);

      return `
        <div class="card">
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

  updateActiveSortButtons();
}

function updateActiveSortButtons() {
  btnSort.forEach((btn) => {
    if (btn.id === sortMethod) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

// ===============================
// Events
// ===============================
window.addEventListener("load", () => {
  // Petit garde-fou si tes inputs n'existent pas
  if (!inputSearch || !inputRange || !rangeValue) {
    console.warn("⚠️ Inputs manquants: #inputSearch, #inputRange, #rangeValue");
  } else {
    rangeValue.textContent = inputRange.value;
  }

  fetchCountries();
});

// Debounce recherche
let searchTimeout;
if (inputSearch) {
  inputSearch.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      countriesDisplay();
    }, 250);
  });
}

if (inputRange) {
  inputRange.addEventListener("input", () => {
    if (rangeValue) rangeValue.textContent = inputRange.value;
    countriesDisplay();
  });
}

btnSort.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    sortMethod = e.currentTarget.id;
    countriesDisplay();
  });
});

// Views (grid/list)
viewButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const view = e.currentTarget.id.replace("View", ""); // gridView -> grid, listView -> list
    currentView = view;

    viewButtons.forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");

    countriesDisplay();
  });
});

// ===============================
// Styles erreurs (optionnel)
// ===============================
const style = document.createElement("style");
style.textContent = `
  .error-message{
    grid-column: 1 / -1;
    text-align:center;
    padding:4rem 2rem;
    background:white;
    border-radius:16px;
    box-shadow:0 10px 30px rgba(0,0,0,.08);
  }
  .error-message i{
    font-size:3rem;
    color:#ef4444;
    margin-bottom:1rem;
  }
  .error-message h3{
    margin:0 0 .75rem 0;
    color:#0b0d12;
  }
  .error-message p{
    margin:0;
    color:#64748b;
  }
`;
document.head.appendChild(style);
