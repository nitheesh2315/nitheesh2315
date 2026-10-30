import fs from "node:fs";

const { user, weeks } = JSON.parse(fs.readFileSync("data/contributions.json", "utf8"));

// ---------- theme ----------
const BG1 = "#12060d", BG2 = "#2a0b1b";
const PINK = "#f4a6c8", SOFT = "#e879a9", TXT = "#f6e9ef", MUTE = "#a98a9a";
const LEVELS = ["#1e0b15", "#4a1530", "#7a2d52", "#b04477", "#f4a6c8"];
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', monospace";
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---------- data ----------
const days = [];
weeks.forEach((w, c) => w.forEach((d) => {
  const dt = new Date(d.date + "T00:00:00Z");
  days.push({ ...d, col: c, row: dt.getUTCDay(), dt });
}));
const fmt = (dt) => `${dt.getUTCDate()} ${MON[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
const total = days.reduce((s, d) => s + d.count, 0);
const active = days.filter((d) => d.count > 0).length;
const max = Math.max(1, ...days.map((d) => d.count));
const busiest = days.reduce((b, d) => (d.count > b.count ? d : b), days[0]);
let best = { len: 0, s: 0, e: 0 }, cur = 0, start = 0;
days.forEach((d, i) => {
  if (d.count > 0) { if (cur === 0) start = i; cur++; if (cur > best.len) best = { len: cur, s: start, e: i }; }
  else cur = 0;
});
const level = (c) => (c === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * c) / max))));

// ---------- layout ----------
const W = 1000, H = 420, CELL = 12, PITCH = 15, GX = 130, GY = 215;
const cols = weeks.length;
const cx = (c) => GX + c * PITCH + CELL / 2;
const cy = (r) => GY + r * PITCH + CELL / 2;

// snake timing: one zig-zag pass through every column
const SEGS = 9, LAG = 0.05, T = 26;
const P = T + SEGS * LAG + 1.2;
const stepLen = PITCH;
const totalLen = (cols * 7 - 1) * stepLen;
const dist = (c, r) => c * 7 * stepLen + (c % 2 === 0 ? r : 6 - r) * stepLen;
const timeAt = (c, r) => (dist(c, r) / totalLen) * T;

let pathD = "";
for (let c = 0; c < cols; c++) {
  const a = c % 2 === 0 ? 0 : 6, b = c % 2 === 0 ? 6 : 0;
  pathD += `${c === 0 ? "M" : "L"}${cx(c)} ${cy(a)} L${cx(c)} ${cy(b)} `;
}

let out = "";
const add = (s) => (out += s + "\n");

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
add(`<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BG1}"/><stop offset="1" stop-color="${BG2}"/></linearGradient>
<radialGradient id="glow" cx="0.9" cy="0.05" r="0.7"><stop offset="0" stop-color="${SOFT}" stop-opacity="0.25"/><stop offset="1" stop-color="${SOFT}" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>`);
add(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="url(#bg)" stroke="#5a1f3b" stroke-width="1.5"/>`);
add(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="url(#glow)"/>`);

// header
add(`<text x="40" y="52" font-family="${MONO}" font-size="11" letter-spacing="2.5" fill="${MUTE}">COMMIT LOG  ·  REAL GITHUB ACTIVITY</text>`);
add(`<text x="40" y="100" font-family="${SERIF}" font-size="28" fill="${TXT}">A year of building, <tspan font-style="italic" fill="${PINK}">one square</tspan> at a time.</text>`);
const first = days[0].dt, last = days[days.length - 1].dt;
const stats = [
  [560, "CONTRIBUTIONS", total.toLocaleString("en-US"), `${MON[first.getUTCMonth()]} ${first.getUTCFullYear()} - ${MON[last.getUTCMonth()]} ${last.getUTCFullYear()}`],
  [672, "ACTIVE DAYS", String(active), `of ${days.length} days`],
  [782, "LONGEST STREAK", String(best.len), "consecutive days"],
  [900, "BUSIEST DAY", String(busiest.count), fmt(busiest.dt)],
];
for (const [x, label, num, sub] of stats) {
  add(`<text x="${x}" y="50" font-family="${MONO}" font-size="9" letter-spacing="1.5" fill="${MUTE}">${label}</text>`);
  add(`<text x="${x}" y="95" font-family="${SERIF}" font-size="36" fill="${TXT}">${num}</text>`);
  add(`<text x="${x}" y="115" font-family="${MONO}" font-size="9" fill="${MUTE}">${sub}</text>`);
}

// month labels
let lastMonth = -1, lastCol = -10;
weeks.forEach((w, c) => {
  const m = new Date(w[0].date + "T00:00:00Z").getUTCMonth();
  if (m !== lastMonth && c - lastCol >= 3) {
    add(`<text x="${GX + c * PITCH}" y="${GY - 10}" font-family="${MONO}" font-size="10" fill="${MUTE}">${MON[m]}</text>`);
    lastCol = c;
  }
  lastMonth = m;
});
[["Mon", 1], ["Wed", 3], ["Fri", 5]].forEach(([t, r]) =>
  add(`<text x="${GX - 14}" y="${cy(r) + 3}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${MUTE}">${t}</text>`));

// cells
for (const d of days) {
  const lv = level(d.count);
  const x = GX + d.col * PITCH, y = GY + d.row * PITCH;
  const rect = (extra = "") => `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${LEVELS[lv]}"${extra}`;
  if (lv === 4) add(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${PINK}" opacity="0.55" filter="url(#blur)"/>`);
  if (lv === 0) { add(rect() + `/>`); continue; }
  const te = timeAt(d.col, d.row), restore = T + SEGS * LAG + 0.3;
  const k = [0, te / P, Math.min(te / P + 0.4 / P, restore / P), restore / P, Math.min((restore + 0.6) / P, 1), 1].map((v) => v.toFixed(4)).join(";");
  add(rect() + `><title>${d.count} contribution${d.count === 1 ? "" : "s"} on ${fmt(d.dt)}</title><animate attributeName="opacity" dur="${P.toFixed(2)}s" repeatCount="indefinite" values="1;1;0.12;0.12;1;1" keyTimes="${k}"/></rect>`);
}

// longest streak marker
if (best.len > 0) {
  const sx = cx(days[best.s].col);
  add(`<line x1="${sx}" y1="${GY + 7 * PITCH + 2}" x2="${sx}" y2="${GY + 7 * PITCH + 12}" stroke="${MUTE}"/>`);
  const tx = Math.min(Math.max(sx, 330), 760);
  add(`<text x="${tx}" y="${GY + 7 * PITCH + 28}" text-anchor="middle" font-family="${MONO}" font-size="10" letter-spacing="1.5" fill="${TXT}">LONGEST STREAK  ·  ${best.len} DAY${best.len === 1 ? "" : "S"}  ·  ${fmt(days[best.s].dt).toUpperCase()} - ${fmt(days[best.e].dt).toUpperCase()}</text>`);
}

// snake
for (let i = SEGS - 1; i >= 0; i--) {
  const a = (i * LAG) / P, b = (i * LAG + T) / P;
  const r = i === 0 ? 7.5 : Math.max(2.2, 6.5 - i * 0.55);
  const fill = i === 0 ? "#fff1f7" : PINK;
  const op = i === 0 ? 1 : Math.max(0.3, 1 - i * 0.09);
  add(`<g opacity="0"><circle r="${r}" fill="${fill}" fill-opacity="${op}"/>` +
    (i === 0 ? `<circle cx="-2.6" cy="-1.2" r="1.5" fill="#12060d"/><circle cx="2.6" cy="-1.2" r="1.5" fill="#12060d"/>` : "") +
    `<animate attributeName="opacity" dur="${P.toFixed(2)}s" repeatCount="indefinite" calcMode="discrete" values="0;1;0" keyTimes="0;${a.toFixed(5)};${b.toFixed(5)}"/>` +
    `<animateMotion dur="${P.toFixed(2)}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${a.toFixed(5)};${b.toFixed(5)};1" path="${pathD.trim()}"/></g>`);
}

// legend + footer
const today = new Date();
add(`<text x="40" y="${H - 28}" font-family="${MONO}" font-size="10" fill="${MUTE}">Source: public GitHub contribution calendar for @${user}  ·  snapshot ${fmt(today)}  ·  refreshed daily</text>`);
add(`<text x="${W - 190}" y="${H - 28}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${MUTE}">Less</text>`);
LEVELS.slice(1).forEach((c, i) => add(`<rect x="${W - 180 + i * 16}" y="${H - 38}" width="11" height="11" rx="3" fill="${c}"/>`));
add(`<text x="${W - 108}" y="${H - 28}" font-family="${MONO}" font-size="10" fill="${MUTE}">More</text>`);
add(`</svg>`);

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/heatmap.svg", out);
console.log(`Wrote assets/heatmap.svg (${(out.length / 1024).toFixed(1)} KB): ${total} contributions, ${active} active days, streak ${best.len}`);
