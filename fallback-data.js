// Données de secours pour 50 pays principaux
export const FALLBACK_COUNTRIES = [
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
    languages: { fra: "French" },
    currencies: { EUR: { name: "Euro", symbol: "€" } },
  },
  {
    cca3: "USA",
    name: { common: "United States" },
    translations: { fra: { common: "États-Unis" } },
    capital: ["Washington, D.C."],
    region: "Americas",
    subregion: "North America",
    population: 329484123,
    area: 9372610,
    flags: {
      png: "https://flagcdn.com/w320/us.png",
      svg: "https://flagcdn.com/us.svg",
    },
    languages: { eng: "English" },
    currencies: { USD: { name: "United States dollar", symbol: "$" } },
  },
  // Ajouter 48 autres pays...
];

export const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];
export const SUBREGIONS = [
  "Northern Africa",
  "Eastern Africa",
  "Middle Africa",
  "Southern Africa",
  "Western Africa",
  "Caribbean",
  "Central America",
  "North America",
  "South America",
  "Central Asia",
  "Eastern Asia",
  "Southern Asia",
  "Southeast Asia",
  "Western Asia",
  "Eastern Europe",
  "Northern Europe",
  "Southern Europe",
  "Western Europe",
  "Australia and New Zealand",
  "Melanesia",
  "Micronesia",
  "Polynesia",
];
