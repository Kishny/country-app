export default async function handler(req, res) {
  const { code } = req.query;
  try {
    const FIELDS =
      "cca3,name,translations,flags,coatOfArms,capital,region,subregion,population,area,languages,currencies,timezones,tld,borders,maps,unMember,independent,car";
    const r = await fetch(
      `https://restcountries.com/v3.1/alpha/${code}?fields=${FIELDS}`
    );
    if (!r.ok) return res.status(r.status).json({ error: "RESTCountries error" });
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    res.status(500).json({ error: "proxy error", details: e.message });
  }
}
