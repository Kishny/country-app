const countriesContainer = document.querySelector(".countries-container");
const btnSort = document.querySelectorAll(".btnSort");
const totalCountries = document.getElementById("totalCountries");
const totalPopulation = document.getElementById("totalPopulation");
const resultsCount = document.getElementById("resultsCount");
const lastUpdate = document.getElementById("lastUpdate");
const loadingOverlay = document.getElementById("loading");
const viewButtons = document.querySelectorAll(".view-btn");

let countriesData = [];
let sortMethod = "maxToMin";
let currentView = "grid";

async function fetchCountries() {
  showLoading();

  try {
    const response = await fetch("https://restcountries.com/v3.1/all");
    const data = await response.json();

    // Simuler un délai pour voir l'animation de chargement
    await new Promise((resolve) => setTimeout(resolve, 800));

    countriesData = data;
    updateStats();
    countriesDisplay();

    // Mettre à jour la date de dernière mise à jour
    const now = new Date();
    lastUpdate.textContent = now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
    countriesContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Impossible de charger les données</h3>
        <p>Veuillez vérifier votre connexion internet et réessayer.</p>
      </div>
    `;
  } finally {
    hideLoading();
  }
}

function updateStats() {
  totalCountries.textContent = countriesData.length.toLocaleString();

  const totalPop = countriesData.reduce(
    (sum, country) => sum + country.population,
    0
  );
  totalPopulation.textContent = totalPop.toLocaleString();
}

function countriesDisplay() {
  const filteredCountries = countriesData
    .filter((country) =>
      country.translations?.fra?.common
        ?.toLowerCase()
        .includes(inputSearch.value.toLowerCase())
    )
    .sort((a, b) => {
      if (sortMethod === "maxToMin") {
        return b.population - a.population;
      } else if (sortMethod === "minToMax") {
        return a.population - b.population;
      } else if (sortMethod === "alpha") {
        return a.translations.fra.common.localeCompare(
          b.translations.fra.common
        );
      }
      return 0;
    })
    .slice(0, inputRange.value);

  resultsCount.textContent = filteredCountries.length.toLocaleString();

  countriesContainer.className = `countries-container ${currentView}-view`;

  countriesContainer.innerHTML = filteredCountries
    .map(
      (country) => `
        <div class="card">
          <img src=${country.flags.svg} alt="Drapeau ${
        country.translations.fra.common
      }" loading="lazy">
          <div class="card-content">
            <h2>${country.translations.fra.common}</h2>
            <h4><i class="fas fa-landmark"></i> ${
              country.capital || "Non spécifié"
            }</h4>
            <p><i class="fas fa-globe-americas"></i> ${country.region}</p>
            <p><i class="fas fa-expand-arrows-alt"></i> ${(
              country.area / 1000
            ).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} km²</p>
            <div class="population">
              <i class="fas fa-users"></i>
              Population : ${country.population.toLocaleString()}
            </div>
          </div>
        </div>
      `
    )
    .join("");

  // Ajouter l'état actif au bouton de tri
  btnSort.forEach((btn) => {
    if (btn.id === sortMethod) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function showLoading() {
  loadingOverlay.style.display = "flex";
}

function hideLoading() {
  loadingOverlay.style.display = "none";
}

// Événements
window.addEventListener("load", fetchCountries);

inputSearch.addEventListener("input", () => {
  countriesDisplay();
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

// Gestion des vues
viewButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const view = e.currentTarget.id.replace("View", "");

    viewButtons.forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");

    currentView = view;
    countriesDisplay();
  });
});

// Recherche avec debounce pour les performances
let searchTimeout;
inputSearch.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    countriesDisplay();
  }, 300);
});

// Ajout de styles pour les messages d'erreur
const style = document.createElement("style");
style.textContent = `
  .error-message {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
  }
  
  .error-message i {
    font-size: 3rem;
    color: #ef4444;
    margin-bottom: 1rem;
  }
  
  .error-message h3 {
    color: var(--secondary);
    margin-bottom: 1rem;
  }
  
  .error-message p {
    color: var(--gray);
  }
`;
document.head.appendChild(style);
