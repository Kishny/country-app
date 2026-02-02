// ============================================
// GLOBAL EXPLORER PREMIUM - Application Main
// ============================================
const API_BASE =
  location.hostname.includes("localhost") ||
  location.hostname.includes("127.0.0.1")
    ? "http://localhost:5050"
    : "https://globalexplorer-proxy.onrender.com";

class GlobalExplorer {
  constructor() {
    this.countries = [];
    this.filteredCountries = [];
    this.favorites = new Set();
    this.regions = new Set();
    this.subregions = new Set();

    this.countryDetailsCache = new Map();
    this.detailsAbortController = null;

    // Configuration
    this.config = {
      itemsPerPage: 24,
      currentPage: 1,
      sortMethod: "population-desc",
      currentView: "grid",
      favoritesOnly: false,
      theme: localStorage.getItem("theme") || "light",
      apiEndpoint: "https://restcountries.com/v3.1/all",
    };

    // Éléments DOM
    this.elements = {
      countriesContainer: document.getElementById("countriesContainer"),
      inputSearch: document.getElementById("inputSearch"),
      inputRange: document.getElementById("inputRange"),
      rangeValue: document.getElementById("rangeValue"),
      searchClear: document.getElementById("searchClear"),
      totalCountries: document.getElementById("totalCountries"),
      totalPopulation: document.getElementById("totalPopulation"),
      resultsCount: document.getElementById("resultsCount"),
      visibleCount: document.getElementById("visibleCount"),
      lastUpdate: document.getElementById("lastUpdate"),
      apiUpdateTime: document.getElementById("apiUpdateTime"),
      favToggle: document.getElementById("favToggle"),
      favCount: document.getElementById("favCount"),
      favModeLabel: document.getElementById("favModeLabel"),
      themeToggle: document.getElementById("themeToggle"),
      exportBtn: document.getElementById("exportBtn"),
      refreshBtn: document.getElementById("refreshBtn"),
      regionFilter: document.getElementById("regionFilter"),
      subregionFilter: document.getElementById("subregionFilter"),
      sortButtons: document.querySelectorAll(".btnSort"),
      viewButtons: document.querySelectorAll(".view-btn"),
      pagination: {
        prev: document.getElementById("prevPage"),
        next: document.getElementById("nextPage"),
        current: document.getElementById("currentPage"),
        total: document.getElementById("totalPages"),
      },
      drawer: {
        overlay: document.getElementById("drawerOverlay"),
        element: document.getElementById("countryDrawer"),
        close: document.getElementById("drawerClose"),
        content: document.getElementById("drawerContent"),
      },
      loading: document.getElementById("loading"),
      progressBar: document.getElementById("progressBar"),
    };

    // Initialisation
    this.init();
  }

  // ===== INITIALISATION =====
  async init() {
    this.setupEventListeners();
    this.loadFavorites();
    this.applyTheme();
    await this.fetchCountries();
    this.updateFilters();
    this.renderCountries();
  }

  // ===== THÈME =====
  applyTheme() {
    if (this.config.theme === "dark") {
      document.body.classList.add("dark-mode");
      this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.body.classList.remove("dark-mode");
      this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }

  toggleTheme() {
    this.config.theme = this.config.theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", this.config.theme);
    this.applyTheme();
    this.showToast(
      `Thème ${this.config.theme === "dark" ? "sombre" : "clair"} activé`,
      "success"
    );
  }

  // ===== GESTION DES ÉVÉNEMENTS =====
  setupEventListeners() {
    // Recherche
    this.elements.inputSearch.addEventListener("input", () =>
      this.debounceSearch()
    );
    this.elements.searchClear.addEventListener("click", () => {
      this.elements.inputSearch.value = "";
      this.renderCountries();
    });

    // Pagination
    this.elements.inputRange.addEventListener("input", (e) => {
      this.config.itemsPerPage = parseInt(e.target.value);
      this.elements.rangeValue.textContent = e.target.value;
      this.config.currentPage = 1;
      this.renderCountries();
    });

    // Tris
    this.elements.sortButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.config.sortMethod = e.currentTarget.dataset.sort;
        this.elements.sortButtons.forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.renderCountries();
      });
    });

    // Vues
    this.elements.viewButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.config.currentView = e.currentTarget.id.replace("View", "");
        this.elements.viewButtons.forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.renderCountries();
      });
    });

    // Filtres
    this.elements.regionFilter.addEventListener("change", () =>
      this.renderCountries()
    );
    this.elements.subregionFilter.addEventListener("change", () =>
      this.renderCountries()
    );

    // Favoris
    this.elements.favToggle.addEventListener("click", () =>
      this.toggleFavoritesMode()
    );

    // Thème
    this.elements.themeToggle.addEventListener("click", () =>
      this.toggleTheme()
    );

    // Export
    this.elements.exportBtn.addEventListener("click", () =>
      this.showExportModal()
    );

    // Actualisation
    this.elements.refreshBtn.addEventListener("click", () =>
      this.refreshData()
    );

    // Pagination
    this.elements.pagination.prev.addEventListener("click", () =>
      this.previousPage()
    );
    this.elements.pagination.next.addEventListener("click", () =>
      this.nextPage()
    );

    // Drawer
    this.elements.drawer.close.addEventListener("click", () =>
      this.closeDrawer()
    );
    this.elements.drawer.overlay.addEventListener("click", () =>
      this.closeDrawer()
    );

    // Touches clavier
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeDrawer();
    });
  }

  // ===== CHARGEMENT DES DONNÉES =====
  async fetchCountries() {
    this.showLoading();

    try {
      const response = await fetch(`${API_BASE}/api/countries`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const parsed = await response.json();

      if (!Array.isArray(parsed)) {
        console.error("Réponse API non-tableau:", parsed);
        throw new Error("Réponse API invalide : pas un tableau.");
      }

      this.countries = parsed;

      this.extractRegions();
      this.updateFilters();
      this.updateStatistics();
      this.saveUpdateTime();

      this.showToast("Données chargées avec succès !", "success");
    } catch (error) {
      console.error("Erreur lors du chargement des pays:", error);
      this.showToast("Erreur de chargement des données", "error");
      await this.loadFallbackData();
    } finally {
      this.hideLoading();
    }
  }

  extractRegions() {
    this.regions.clear();
    this.subregions.clear();

    this.countries.forEach((country) => {
      if (country.region) this.regions.add(country.region);
      if (country.subregion) this.subregions.add(country.subregion);
    });
  }

  updateFilters() {
    // Régions
    this.elements.regionFilter.innerHTML = `
            <option value="">Toutes les régions</option>
            ${Array.from(this.regions)
              .sort()
              .map((region) => `<option value="${region}">${region}</option>`)
              .join("")}
        `;

    // Sous-régions
    this.elements.subregionFilter.innerHTML = `
            <option value="">Toutes les sous-régions</option>
            ${Array.from(this.subregions)
              .sort()
              .map(
                (subregion) =>
                  `<option value="${subregion}">${subregion}</option>`
              )
              .join("")}
        `;
  }

  // ===== FILTRAGE ET TRI =====
  filterCountries() {
    const searchTerm = this.elements.inputSearch.value.toLowerCase();
    const selectedRegion = this.elements.regionFilter.value;
    const selectedSubregion = this.elements.subregionFilter.value;

    this.filteredCountries = this.countries.filter((country) => {
      // Recherche par nom (français si disponible)
      const name = country.translations?.fra?.common || country.name.common;
      const matchesSearch =
        name.toLowerCase().includes(searchTerm) ||
        country.capital?.[0]?.toLowerCase().includes(searchTerm) ||
        country.region?.toLowerCase().includes(searchTerm);

      // Filtre région
      const matchesRegion =
        !selectedRegion || country.region === selectedRegion;

      // Filtre sous-région
      const matchesSubregion =
        !selectedSubregion || country.subregion === selectedSubregion;

      // Filtre favoris
      const matchesFavorites =
        !this.config.favoritesOnly || this.favorites.has(country.cca3);

      return (
        matchesSearch && matchesRegion && matchesSubregion && matchesFavorites
      );
    });

    // Tri
    this.sortCountries();
  }

  sortCountries() {
    const [field, order] = this.config.sortMethod.split("-");

    this.filteredCountries.sort((a, b) => {
      let valueA, valueB;

      switch (field) {
        case "population":
          valueA = a.population || 0;
          valueB = b.population || 0;
          break;
        case "area":
          valueA = a.area || 0;
          valueB = b.area || 0;
          break;
        case "name":
          valueA = (a.translations?.fra?.common || a.name.common).toLowerCase();
          valueB = (b.translations?.fra?.common || b.name.common).toLowerCase();
          return order === "desc"
            ? valueB.localeCompare(valueA, "fr")
            : valueA.localeCompare(valueB, "fr");
      }

      if (order === "desc") {
        return valueB - valueA;
      } else {
        return valueA - valueB;
      }
    });
  }

  // ===== RENDU DES PAYS =====
  renderCountries() {
    this.filterCountries();

    const totalPages = Math.ceil(
      this.filteredCountries.length / this.config.itemsPerPage
    );
    const startIndex = (this.config.currentPage - 1) * this.config.itemsPerPage;
    const endIndex = startIndex + this.config.itemsPerPage;
    const countriesToShow = this.filteredCountries.slice(startIndex, endIndex);
    this.elements.visibleCount.textContent = this.formatNumber(
      countriesToShow.length
    );

    // Mise à jour des statistiques
    this.updateDisplayStats();

    // Mise à jour de la pagination
    this.updatePagination(totalPages);

    // Rendu des pays
    this.elements.countriesContainer.innerHTML = countriesToShow
      .map((country) => this.createCountryCard(country))
      .join("");

    // Ajout des événements aux cartes
    this.attachCardEvents();
  }

  createCountryCard(country) {
    const name = country.translations?.fra?.common || country.name.common;
    const capital = country.capital?.[0] || "Non spécifié";
    const region = country.region || "Non spécifié";
    const subregion = country.subregion || "Non spécifié";
    const population = this.formatNumber(country.population || 0);
    const area = country.area
      ? this.formatNumber(country.area) + " km²"
      : "Non spécifié";
    const flag = country.flags?.png || country.flags?.svg || "";
    const isFavorite = this.favorites.has(country.cca3);
    const isPremium = country.population > 50000000; // Exemple de critère premium

    return `
            <div class="country-card ${
              isPremium ? "premium" : ""
            }" data-code="${country.cca3}">
                <button class="fav-btn ${
                  isFavorite ? "active" : ""
                }" data-fav="${country.cca3}">
                    <i class="fas fa-star"></i>
                </button>
                
                <img src="${flag}" alt="Drapeau de ${name}" class="country-flag" loading="lazy">
                
                <div class="country-content">
                    <div class="country-header">
                        <h3>${name}</h3>
                        <span class="country-code">${country.cca3}</span>
                    </div>
                    
                    <div class="country-meta">
                        <div class="meta-item">
                            <i class="fas fa-landmark"></i>
                            <span>Capitale:</span>
                            <span>${capital}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-globe-americas"></i>
                            <span>Région:</span>
                            <span>${region}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>Sous-région:</span>
                            <span>${subregion}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>Population:</span>
                            <span>${population}</span>
                        </div>
                    </div>
                    
                    <div class="country-stats">
                        <div class="stat-row">
                            <span class="stat-label">Superficie:</span>
                            <span class="stat-value">${area}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Densité:</span>
                            <span class="stat-value">
                                ${
                                  country.population && country.area
                                    ? this.formatNumber(
                                        Math.round(
                                          country.population / country.area
                                        )
                                      ) + "/km²"
                                    : "—"
                                }
                            </span>
                        </div>
                    </div>
                    
                    <div class="country-actions">
                        <button class="action-btn primary" data-action="details" data-code="${
                          country.cca3
                        }">
                            <i class="fas fa-info-circle"></i> Détails
                        </button>
                        <button class="action-btn secondary" data-action="compare" data-code="${
                          country.cca3
                        }">
                            <i class="fas fa-balance-scale"></i> Comparer
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  attachCardEvents() {
    // Boutons favoris
    document.querySelectorAll(".fav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const code = e.currentTarget.dataset.fav;
        this.toggleFavorite(code);
        e.currentTarget.classList.toggle("active");
      });
    });

    // Boutons détails
    document.querySelectorAll('[data-action="details"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const code = e.currentTarget.dataset.code;
        this.showCountryDetails(code);
      });
    });

    // Clic sur la carte
    document.querySelectorAll(".country-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (!e.target.closest(".fav-btn") && !e.target.closest(".action-btn")) {
          const code = card.dataset.code;
          this.showCountryDetails(code);
        }
      });
    });
  }

  // ===== DÉTAILS DU PAYS =====
  async showCountryDetails(code) {
    // Ouvre direct le drawer (UX premium) + petit "chargement"
    this.openDrawer();
    this.elements.drawer.content.innerHTML = `
    <div style="padding:20px">
      <p style="opacity:.8;margin:0 0 10px">Chargement des détails…</p>
      <div style="height:10px;border-radius:999px;background:rgba(0,0,0,.08);overflow:hidden">
        <div style="width:55%;height:100%;background:rgba(0,0,0,.12)"></div>
      </div>
    </div>
  `;

    // Annule la requête précédente si l’utilisateur clique vite
    if (this.detailsAbortController) this.detailsAbortController.abort();
    this.detailsAbortController = new AbortController();

    try {
      // ✅ Cache
      if (this.countryDetailsCache.has(code)) {
        this.renderCountryDetails(this.countryDetailsCache.get(code));
        return;
      }

      // ✅ Ton proxy (local ou Render)
      const response = await fetch(`${API_BASE}/api/countries/${code}`, {
        signal: this.detailsAbortController.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const country = await response.json();

      // Cache + rendu
      this.countryDetailsCache.set(code, country);
      this.renderCountryDetails(country);
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Erreur lors du chargement des détails:", error);
      this.showToast("Impossible de charger les détails", "error");

      this.elements.drawer.content.innerHTML = `
      <div style="padding:20px">
        <h4 style="margin:0 0 6px">Oups 😅</h4>
        <p style="margin:0 0 14px;opacity:.85">Impossible de charger les détails pour l’instant.</p>
        <button class="action-btn primary" id="retryDetails" style="width:100%">
          Réessayer
        </button>
      </div>
    `;

      document.getElementById("retryDetails")?.addEventListener("click", () => {
        this.showCountryDetails(code);
      });
    }
  }

  renderCountryDetails(country) {
    const name = country.translations?.fra?.common || country.name.common;
    const nativeName =
      Object.values(country.name.nativeName || {})[0]?.common || name;
    const capital = country.capital?.[0] || "Non spécifié";
    const region = country.region || "Non spécifié";
    const subregion = country.subregion || "Non spécifié";
    const population = this.formatNumber(country.population || 0);
    const area = country.area
      ? this.formatNumber(country.area) + " km²"
      : "Non spécifié";
    const density =
      country.population && country.area
        ? this.formatNumber(Math.round(country.population / country.area)) +
          "/km²"
        : "—";

    const languages =
      Object.values(country.languages || {}).join(", ") || "Non spécifié";
    const currencies =
      Object.values(country.currencies || {})
        .map((c) => c.name)
        .join(", ") || "Non spécifié";
    const timezones = country.timezones?.join(", ") || "Non spécifié";
    const tld = country.tld?.join(", ") || "Non spécifié";
    const borders = country.borders?.join(", ") || "Aucun";

    const isFavorite = this.favorites.has(country.cca3);
    const flag = country.flags?.png || country.flags?.svg || "";

    this.elements.drawer.content.innerHTML = `
            <div class="drawer-header">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${flag}" alt="${name}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.5rem;">${name}</h2>
                        <p style="margin: 5px 0 0; color: var(--text-light);">${nativeName}</p>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <div>
                            <h4>Population</h4>
                            <p>${population}</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-expand"></i>
                        <div>
                            <h4>Superficie</h4>
                            <p>${area}</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <h4>Densité</h4>
                            <p>${density}</p>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; gap: 20px;">
                    <div>
                        <h4 style="margin-bottom: 10px; color: var(--text-light);">Informations générales</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div>
                                <strong>Capitale:</strong><br>
                                <span>${capital}</span>
                            </div>
                            <div>
                                <strong>Région:</strong><br>
                                <span>${region} / ${subregion}</span>
                            </div>
                            <div>
                                <strong>Langues:</strong><br>
                                <span>${languages}</span>
                            </div>
                            <div>
                                <strong>Monnaies:</strong><br>
                                <span>${currencies}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin-bottom: 10px; color: var(--text-light);">Informations techniques</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div>
                                <strong>Fuseaux horaires:</strong><br>
                                <span>${timezones}</span>
                            </div>
                            <div>
                                <strong>Domaine internet:</strong><br>
                                <span>${tld}</span>
                            </div>
                            <div>
                                <strong>Pays frontaliers:</strong><br>
                                <span>${borders}</span>
                            </div>
                            <div>
                                <strong>Code pays:</strong><br>
                                <span>${country.cca3}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 30px; display: flex; gap: 10px;">
                    <button class="action-btn primary" id="toggleFavoriteDrawer" style="flex: 1;">
                        <i class="fas fa-star"></i>
                        ${
                          isFavorite
                            ? "Retirer des favoris"
                            : "Ajouter aux favoris"
                        }
                    </button>
                    <button class="action-btn secondary" id="openMap" style="flex: 1;">
                        <i class="fas fa-map"></i>
                        Voir sur la carte
                    </button>
                </div>
            </div>
        `;

    // Événements du drawer
    document
      .getElementById("toggleFavoriteDrawer")
      .addEventListener("click", () => {
        this.toggleFavorite(country.cca3);
        this.renderCountryDetails(country); // Refresh
      });

    document.getElementById("openMap").addEventListener("click", () => {
      if (country.maps?.googleMaps) {
        window.open(country.maps.googleMaps, "_blank");
      }
    });
  }

  // ===== FAVORIS =====
  loadFavorites() {
    const saved = localStorage.getItem("globalexplorer_favorites");
    if (saved) {
      this.favorites = new Set(JSON.parse(saved));
      this.updateFavoritesUI();
    }
  }

  saveFavorites() {
    localStorage.setItem(
      "globalexplorer_favorites",
      JSON.stringify([...this.favorites])
    );
    this.updateFavoritesUI();
  }

  toggleFavorite(code) {
    if (this.favorites.has(code)) {
      this.favorites.delete(code);
      this.showToast("Retiré des favoris", "info");
    } else {
      this.favorites.add(code);
      this.showToast("Ajouté aux favoris", "success");
    }
    this.saveFavorites();
    this.renderCountries();
  }

  toggleFavoritesMode() {
    this.config.favoritesOnly = !this.config.favoritesOnly;
    this.config.currentPage = 1;

    this.elements.favToggle.classList.toggle(
      "active",
      this.config.favoritesOnly
    );
    this.elements.favModeLabel.textContent = this.config.favoritesOnly
      ? "Activé"
      : "Désactivé";

    this.renderCountries();
    this.showToast(
      `Mode favoris ${this.config.favoritesOnly ? "activé" : "désactivé"}`,
      "info"
    );
  }

  updateFavoritesUI() {
    this.elements.favCount.textContent = this.favorites.size;
  }

  // ===== PAGINATION =====
  updatePagination(totalPages) {
    this.elements.pagination.current.textContent = this.config.currentPage;
    this.elements.pagination.total.textContent = totalPages;

    this.elements.pagination.prev.disabled = this.config.currentPage === 1;
    this.elements.pagination.next.disabled =
      this.config.currentPage === totalPages;
  }

  previousPage() {
    if (this.config.currentPage > 1) {
      this.config.currentPage--;
      this.renderCountries();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(
      this.filteredCountries.length / this.config.itemsPerPage
    );
    if (this.config.currentPage < totalPages) {
      this.config.currentPage++;
      this.renderCountries();
    }
  }

  // ===== STATISTIQUES =====
  updateStatistics() {
    const totalPopulation = this.countries.reduce(
      (sum, country) => sum + (country.population || 0),
      0
    );
    this.elements.totalCountries.textContent = this.formatNumber(
      this.countries.length
    );
    this.elements.totalPopulation.textContent =
      this.formatNumber(totalPopulation);
  }

  updateDisplayStats() {
    this.elements.resultsCount.textContent = this.formatNumber(
      this.filteredCountries.length
    );

    const start = (this.config.currentPage - 1) * this.config.itemsPerPage + 1;
    const end = Math.min(
      start + this.config.itemsPerPage - 1,
      this.filteredCountries.length
    );
    this.elements.visibleCount.textContent = this.formatNumber(
      this.filteredCountries.length
    );
  }

  // ===== DRAWER =====
  openDrawer() {
    this.elements.drawer.element.classList.add("active");
    this.elements.drawer.overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  closeDrawer() {
    this.elements.drawer.element.classList.remove("active");
    this.elements.drawer.overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  // ===== EXPORT =====
  showExportModal() {
    // Implémentation simplifiée - à étendre avec une librairie d'export
    const exportData = {
      countries: this.filteredCountries.length,
      favorites: this.favorites.size,
      timestamp: new Date().toISOString(),
    };

    const modal = document.getElementById("exportModal");
    modal.classList.add("active");

    modal.querySelector(".modal-close").addEventListener("click", () => {
      modal.classList.remove("active");
    });

    modal.querySelectorAll(".export-option").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const format = e.currentTarget.dataset.format;
        this.exportData(format);
      });
    });
  }

  exportData(format) {
    let content, mimeType, filename;

    switch (format) {
      case "json":
        content = JSON.stringify(this.filteredCountries, null, 2);
        mimeType = "application/json";
        filename = `global-explorer-${
          new Date().toISOString().split("T")[0]
        }.json`;
        break;
      case "csv":
        content = this.convertToCSV(this.filteredCountries);
        mimeType = "text/csv";
        filename = `global-explorer-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        break;
      case "pdf":
        this.showToast("Export PDF bientôt disponible", "info");
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast(`Export ${format.toUpperCase()} réussi`, "success");
  }

  convertToCSV(countries) {
    const headers = [
      "Nom",
      "Capitale",
      "Région",
      "Population",
      "Superficie",
      "Code",
    ];
    const rows = countries.map((country) => [
      `"${(country.translations?.fra?.common || country.name.common).replace(
        /"/g,
        '""'
      )}"`,
      `"${(country.capital?.[0] || "").replace(/"/g, '""')}"`,
      `"${(country.region || "").replace(/"/g, '""')}"`,
      country.population || "",
      country.area || "",
      country.cca3,
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  // ===== UTILITAIRES =====
  formatNumber(num) {
    return new Intl.NumberFormat("fr-FR").format(num);
  }

  debounceSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.config.currentPage = 1;
      this.renderCountries();
    }, 300);
  }

  showLoading() {
    this.elements.loading.style.display = "flex";
    let progress = 0;
    this.progressInterval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 10, 90);
      this.elements.progressBar.style.width = `${progress}%`;
    }, 100);
  }

  hideLoading() {
    clearInterval(this.progressInterval);
    this.elements.progressBar.style.width = "100%";
    setTimeout(() => {
      this.elements.loading.style.display = "none";
      this.elements.progressBar.style.width = "0%";
    }, 300);
  }

  showToast(message, type = "info") {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: this.getToastColor(type) },
      className: `toastify ${type}`,
      stopOnFocus: true,
    }).showToast();
  }

  getToastColor(type) {
    const colors = {
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    };
    return colors[type] || colors.info;
  }

  saveUpdateTime() {
    const now = new Date();
    this.elements.lastUpdate.textContent = now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    this.elements.apiUpdateTime.textContent = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async refreshData() {
    this.showToast("Actualisation des données...", "info");
    await this.fetchCountries();
    this.renderCountries();
  }

  // ===== DONNÉES DE SECOURS =====
  async loadFallbackData() {
    // Données de secours pour 20 pays majeurs
    const fallbackCountries = [
      {
        cca3: "FRA",
        name: { common: "France" },
        translations: { fra: { common: "France" } },
        capital: ["Paris"],
        region: "Europe",
        subregion: "Western Europe",
        population: 67391582,
        area: 551695,
        flags: {
          png: "https://flagcdn.com/w320/fr.png",
          svg: "https://flagcdn.com/fr.svg",
        },
      },
      // Ajouter d'autres pays de secours...
    ];

    this.countries = fallbackCountries;
    this.extractRegions();
    this.updateStatistics();
    this.showToast("Données de secours chargées", "warning");
  }
}

// ===== INITIALISATION DE L'APPLICATION =====
document.addEventListener("DOMContentLoaded", () => {
  window.globalExplorer = new GlobalExplorer();
});
