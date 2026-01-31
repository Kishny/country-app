import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const PORT = 5050;

// ✅ endpoint liste (light)
app.get("/api/countries", async (req, res) => {
  try {
    const FIELDS =
      "cca3,name,translations,flags,capital,region,subregion,population,area";
    const url = `https://restcountries.com/v3.1/all?fields=${FIELDS}`;

    const r = await fetch(url);
    if (!r.ok)
      return res.status(r.status).json({ error: "RESTCountries error" });

    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "proxy error", details: e.message });
  }
});

// ✅ endpoint détails
app.get("/api/countries/:code", async (req, res) => {
  try {
    const code = req.params.code;
    const FIELDS =
      "cca3,name,translations,flags,coatOfArms,capital,region,subregion,population,area,languages,currencies,timezones,tld,borders,maps,unMember,independent,car";

    const url = `https://restcountries.com/v3.1/alpha/${code}?fields=${FIELDS}`;
    const r = await fetch(url);
    if (!r.ok)
      return res.status(r.status).json({ error: "RESTCountries error" });

    const data = await r.json();
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    res.status(500).json({ error: "proxy error", details: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy API running on http://localhost:${PORT}`);
});
