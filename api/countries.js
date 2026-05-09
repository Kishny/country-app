export default async function handler(req, res) {
  try {
    const FIELDS =
      "cca3,name,translations,flags,capital,region,subregion,population,area";
    const r = await fetch(
      `https://restcountries.com/v3.1/all?fields=${FIELDS}`
    );
    if (!r.ok) return res.status(r.status).json({ error: "RESTCountries error" });
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "proxy error", details: e.message });
  }
}
