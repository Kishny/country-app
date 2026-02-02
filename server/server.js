import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5050;

/* ==============================
   ROUTE RACINE
============================== */
app.get("/", (req, res) => {
  res
    .type("text")
    .send(
      "✅ GlobalExplorer Proxy OK\n\nEndpoints:\n- GET /api/countries\n- GET /api/countries/:code\n"
    );
});

/* ==============================
   LISTE DES PAYS (LIGHT)
============================== */
app.get("/api/countries", async (req, res) => {
  try {
    const FIELDS =
      "cca3,name,translations,flags,capital,region,subregion,population,area";

    const url = `https://restcountries.com/v3.1/all?fields=${FIELDS}`;

    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json({ error: "RESTCountries error" });
    }

    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "proxy error", details: e.message });
  }
});

/* ==============================
   DÉTAIL D’UN PAYS
============================== */
app.get("/api/countries/:code", async (req, res) => {
  try {
    const code = req.params.code;
    const FIELDS =
      "cca3,name,translations,flags,coatOfArms,capital,region,subregion,population,area,languages,currencies,timezones,tld,borders,maps,unMember,independent,car";

    const url = `https://restcountries.com/v3.1/alpha/${code}?fields=${FIELDS}`;

    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json({ error: "RESTCountries error" });
    }

    const data = await r.json();
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    res.status(500).json({ error: "proxy error", details: e.message });
  }
});

/* ==============================
   LANCEMENT SERVEUR
============================== */
app.listen(PORT, () => {
  console.log(`✅ Proxy API running on port ${PORT}`);
});
