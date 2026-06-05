// Vygeneruje CSV skupinové fáze MS 2026 pro hromadný import v admin panelu.
// Formát: datum;čas;domácí;hosté;skupina  (časy v pražském čase)
// Použití: node scripts/generate-wc2026-csv.mjs > supabase/import/wc2026_skupiny.csv
import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync(new URL("./wc2026_raw.json", import.meta.url), "utf8"),
);

const CZ = {
  Algeria: "Alžírsko", Argentina: "Argentina", Australia: "Austrálie",
  Austria: "Rakousko", Belgium: "Belgie",
  "Bosnia & Herzegovina": "Bosna a Hercegovina", Brazil: "Brazílie",
  Canada: "Kanada", "Cape Verde": "Kapverdy", Colombia: "Kolumbie",
  Croatia: "Chorvatsko", "Curaçao": "Curaçao", "Czech Republic": "Česko",
  "DR Congo": "DR Kongo", Ecuador: "Ekvádor", Egypt: "Egypt",
  England: "Anglie", France: "Francie", Germany: "Německo", Ghana: "Ghana",
  Haiti: "Haiti", Iran: "Írán", Iraq: "Irák",
  "Ivory Coast": "Pobřeží slonoviny", Japan: "Japonsko", Jordan: "Jordánsko",
  Mexico: "Mexiko", Morocco: "Maroko", Netherlands: "Nizozemsko",
  "New Zealand": "Nový Zéland", Norway: "Norsko", Panama: "Panama",
  Paraguay: "Paraguay", Portugal: "Portugalsko", Qatar: "Katar",
  "Saudi Arabia": "Saúdská Arábie", Scotland: "Skotsko", Senegal: "Senegal",
  "South Africa": "Jihoafrická republika", "South Korea": "Jižní Korea",
  Spain: "Španělsko", Sweden: "Švédsko", Switzerland: "Švýcarsko",
  Tunisia: "Tunisko", Turkey: "Turecko", USA: "USA", Uruguay: "Uruguay",
  Uzbekistan: "Uzbekistán",
};

function toUtc(date, time) {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})$/);
  const [, hh, mm, off] = m;
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, Number(hh) - Number(off), Number(mm)));
}

function prague(d) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const cz = (n) => CZ[n] ?? n;

const lines = ["datum;čas;domácí;hosté;skupina"];
for (const m of data.matches.filter((x) => x.group)) {
  const { date, time } = prague(toUtc(m.date, m.time));
  const stage = "Skupina " + m.group.replace("Group ", "");
  lines.push(`${date};${time};${cz(m.team1)};${cz(m.team2)};${stage}`);
}

process.stdout.write(lines.join("\n") + "\n");
process.stderr.write(`Vygenerováno ${lines.length - 1} zápasů.\n`);
