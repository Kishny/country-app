// ===============================
// GlobalExplorer — index.js (COMPLET)
// Compatible avec ton HTML (IDs ok)
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

// ---- State ----
let countriesData = [];
let sortMethod = "maxToMin"; // maxToMin | minToMax | alpha
let currentView = "grid"; // grid | list

// ===============================
// Helpers
// ===============================
const API_DIRECT = "https://restcountries.com/v3.1/all";
const API_PROXY =
  "https://api.allorigins.win/raw?url=https://restcountries.com/v3.1/all";

function showLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "flex";
}
function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
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
      <p>Essayez de modifier votre recherche ou le nombre de pays affichés.</p>
    </div>
  `;
}

// Timeout fetch pour éviter d’attendre 3 ans
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

// ===============================
// Fetch principal + fallback proxy
// ===============================
async function fetchCountries() {
  showLoading();

  try {
    // 1) Essai direct
    let response = await fetchWithTimeout(API_DIRECT, 12000);

    // Si direct échoue -> fallback proxy (souvent CORS)
    if (!response.ok) {
      console.warn("Direct API failed:", response.status, response.statusText);
      response = await fetchWithTimeout(API_PROXY, 12000);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} — ${response.statusText}`);
    }

    const data = await response.json();

    // Micro délai pour ton overlay
    await new Promise((r) => setTimeout(r, 400));

    countriesData = Array.isArray(data) ? data : [];

    updateStats();
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
// Stats
// ===============================
function updateStats() {
  totalCountries.textContent = formatNumber(countriesData.length);

  const totalPop = countriesData.reduce(
    (sum, c) => sum + (c?.population || 0),
    0
  );
  totalPopulation.textContent = formatNumber(totalPop);
}

// ===============================
// Display
// ===============================
function updateActiveSortButtons() {
  btnSort.forEach((btn) => {
    if (btn.id === sortMethod) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

function countriesDisplay() {
  const search = (inputSearch.value || "").trim().toLowerCase();
  const limit = Number(inputRange.value || 24);

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

// ===============================
// Events
// ===============================
window.addEventListener("load", () => {
  // Sync de départ
  rangeValue.textContent = inputRange.value;

  fetchCountries();
});

// Debounce recherche (une seule fois)
let searchTimeout;
inputSearch.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    countriesDisplay();
  }, 250);
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
    const view = e.currentTarget.id.replace("View", ""); // gridView -> grid, listView -> list
    currentView = view;

    viewButtons.forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");

    countriesDisplay();
  });
});

// ===============================
// Styles erreurs (inject)
// ===============================
const style = document.createElement("style");
style.textContent = `
  .error-message {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,.08);
  }

  .error-message i {
    font-size: 3rem;
    color: #ef4444;
    margin-bottom: 1rem;
  }

  .error-message h3 {
    color: #0b0d12;
    margin-bottom: .75rem;
  }

  .error-message p {
    color: #64748b;
  }
`;
document.head.appendChild(style);
