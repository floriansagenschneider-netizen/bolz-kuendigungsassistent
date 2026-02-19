import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────
//  ADRESSSUCHE via OpenStreetMap Nominatim (100% kostenlos)
// ─────────────────────────────────────────────────────────
async function findAddress(query, type) {
  const url = `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      countrycodes: "de",
      limit: "1",
    });

  const res = await fetch(url, {
    headers: { "Accept-Language": "de", "User-Agent": "BolzEntsorgungApp/1.0" }
  });
  const results = await res.json();
  if (!results || results.length === 0) throw new Error("Nicht gefunden");

  const r = results[0];
  const a = r.address || {};

  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const zip    = a.postcode || "";
  const city   = a.city || a.town || a.village || a.municipality || "";
  const name   = a.name || a.company || query;

  if (!street || !zip || !city) throw new Error("Adresse unvollständig");

  if (type === "customer") {
    return { companyName: name, firstName: "", lastName: "", street, zip, city };
  } else {
    return { name, street, zip, city, country: "Deutschland" };
  }
}

// ─────────────────────────────────────────────────────────
//  KONSTANTEN & STARTWERTE
// ─────────────────────────────────────────────────────────
const STEPS = ["Kundendaten", "Entsorger", "Vorschau", "Unterschrift", "Fertig"];

const emptyCustomer = {
  companyName: "", firstName: "", lastName: "", street: "", zip: "", city: "",
  customerNumber: "", contractNumber: "", phone: "", email: "",
  terminationDate: "", terminationType: "ordentlich", terminationImmediate: false,
};
const emptyDisposer = { name: "", street: "", zip: "", city: "", country: "Deutschland" };

// ─────────────────────────────────────────────────────────
//  GOOGLE FONTS LADEN
// ─────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap";
    l.rel = "stylesheet";
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);
  return null;
}

// ─────────────────────────────────────────────────────────
//  DESIGN-TOKENS
// ─────────────────────────────────────────────────────────
const C = {
  bg:        "#0a0d0f",
  surface:   "#0e1410",
  border:    "#1a2a1a",
  borderIn:  "#1e2e1e",
  green:     "#22c55e",
  greenDark: "#16a34a",
  textMain:  "#f0f7f0",
  textSub:   "#e8ede8",
  textMuted: "#4a7a4a",
  textDim:   "#2a4a2a",
  inputBg:   "#080b09",
  error:     "#f87171",
};

const S = {
  app:      { fontFamily: "'DM Sans', system-ui, sans-serif", background: C.bg, minHeight: "100vh", color: C.textSub },
  header:   { background: "linear-gradient(135deg,#0d1a12,#0a0d0f)", borderBottom: `1px solid ${C.border}`, padding: "18px 40px", display: "flex", alignItems: "center", gap: "16px" },
  logo:     { height: "42px", objectFit: "contain" },
  dividerV: { width: "1px", height: "36px", background: "#1a3a1a" },
  hTitle:   { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "20px", color: C.textMain, margin: 0 },
  hSub:     { fontSize: "11px", color: "#4a9a5a", fontWeight: 300, letterSpacing: "0.3px" },
  main:     { maxWidth: "780px", margin: "0 auto", padding: "40px 24px" },
  stepBar:  { display: "flex", alignItems: "center", marginBottom: "36px" },

  card:     { background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px", padding: "36px 40px", boxShadow: "0 8px 48px rgba(0,0,0,0.6)" },
  title:    { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "24px", color: C.textMain, marginBottom: "6px" },
  sub:      { fontSize: "13px", color: C.textMuted, marginBottom: "26px", lineHeight: 1.5 },
  divider:  { height: "1px", background: C.border, margin: "22px 0" },
  grid2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  fGroup:   span => ({ display: "flex", flexDirection: "column", gap: "5px", ...(span ? { gridColumn: `span ${span}` } : {}) }),
  label:    { fontSize: "10px", fontWeight: 500, color: C.textMuted, letterSpacing: "0.8px", textTransform: "uppercase" },
  labelDim: { fontSize: "10px", fontWeight: 500, color: C.textDim,   letterSpacing: "0.8px", textTransform: "uppercase" },

  input:    { background: C.inputBg, border: `1px solid ${C.borderIn}`, borderRadius: "10px", padding: "11px 14px", color: C.textSub, fontSize: "14px", outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', system-ui, sans-serif", transition: "border-color .2s, box-shadow .2s" },
  inputOn:  { borderColor: C.green, boxShadow: "0 0 0 3px rgba(34,197,94,.1)" },
  inputOff: { opacity: .35, cursor: "not-allowed" },
  select:   { background: C.inputBg, border: `1px solid ${C.borderIn}`, borderRadius: "10px", padding: "11px 14px", color: C.textSub, fontSize: "14px", outline: "none", width: "100%", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer" },

  searchRow: { display: "flex", gap: "10px", marginTop: "6px" },
  searchBtn: { padding: "11px 18px", background: `linear-gradient(135deg,${C.green},${C.greenDark})`, border: "none", borderRadius: "10px", color: "#000", fontWeight: 600, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'DM Sans',system-ui,sans-serif" },

  chip: ok => ({ display: "inline-flex", alignItems: "center", gap: "8px", background: ok ? "#0d1a0d" : "#0d1a12", border: `1px solid ${ok ? C.green : "#1a3a1a"}`, borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: C.green, marginTop: "10px" }),
  errMsg:   { marginTop: "10px", fontSize: "12px", color: C.error },

  checkRow: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" },
  checkBox: on => ({ width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0, background: on ? C.green : "transparent", border: on ? "none" : `2px solid ${C.textDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#000", transition: "all .2s" }),

  nav:      { display: "flex", justifyContent: "space-between", marginTop: "28px", gap: "12px" },
  btnP:     { padding: "13px 28px", background: `linear-gradient(135deg,${C.green},${C.greenDark})`, border: "none", borderRadius: "10px", color: "#000", fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif" },
  btnS:     { padding: "13px 24px", background: "transparent", border: `1px solid #2a3a2a`, borderRadius: "10px", color: "#6a9a6a", fontWeight: 400, fontSize: "14px", cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif" },
};

// ─────────────────────────────────────────────────────────
//  HILFSFUNKTIONEN
// ─────────────────────────────────────────────────────────
function getLetterData(customer) {
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const senderName = [
    customer.companyName,
    customer.firstName && customer.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : customer.firstName || customer.lastName || ""
  ].filter(Boolean).join(" · ");
  const dateStr = customer.terminationImmediate
    ? "zum nächstmöglichen Zeitpunkt, hilfsweise fristgerecht zum nächstmöglichen Termin"
    : customer.terminationDate
      ? `zum ${customer.terminationDate}`
      : "zum nächstmöglichen Termin unter Einhaltung der vertraglichen Kündigungsfrist";
  const artMap = { ordentlich: "ordentliche Kündigung", ausserordentlich: "außerordentliche Kündigung", fristlos: "fristlose Kündigung" };
  const artText = artMap[customer.terminationType] || "Kündigung";
  const contactLine = [customer.email, customer.phone].filter(Boolean).join(" oder ");
  return { today, senderName, dateStr, artText, contactLine };
}

function letterHTML(customer, disposer, sig) {
  const { today, senderName, dateStr, artText, contactLine } = getLetterData(customer);
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Kündigung</title>
<style>
  @page { size: A4; margin: 20mm 25mm 20mm 25mm; }
  body { font-family:'Times New Roman',Times,serif; font-size:12pt; line-height:1.5; color:#111; margin:0; }
  .sl  { font-size:7.5pt; color:#666; border-bottom:.5pt solid #ddd; padding-bottom:1.5mm; margin-bottom:8mm; }
  .rcp { margin-bottom:17mm; line-height:1.7; }
  .dt  { text-align:right; margin-bottom:10mm; font-size:11pt; color:#444; }
  .sbj { font-weight:bold; font-size:13pt; margin-bottom:1mm; }
  .sd  { font-size:11pt; font-weight:normal; margin-bottom:1mm; }
  p    { margin:0 0 5mm 0; }
  .sig { margin-top:12mm; }
  .sig img { height:20mm; max-width:75mm; display:block; }
  .sl2 { width:75mm; height:20mm; border-bottom:.5pt solid #555; }
  .sn  { margin-top:2mm; font-size:11pt; line-height:1.6; }
</style></head><body>
<div class="sl">${senderName} · ${customer.street} · ${customer.zip} ${customer.city}</div>
<div class="rcp"><strong>${disposer.name}</strong><br>${disposer.street}<br>${disposer.zip} ${disposer.city}${disposer.country && disposer.country !== "Deutschland" ? `<br>${disposer.country}` : ""}</div>
<div class="dt">${customer.city}, den ${today}</div>
<div class="sbj">Kündigung des Entsorgungsvertrages</div>
${customer.customerNumber ? `<div class="sd">Kundennummer: ${customer.customerNumber}</div>` : ""}
${customer.contractNumber ? `<div class="sd">Vertragsnummer: ${customer.contractNumber}</div>` : ""}
<div style="margin-bottom:8mm"></div>
<p>Sehr geehrte Damen und Herren,</p>
<p>hiermit erkläre ich die <strong>${artText}</strong> meines mit Ihnen bestehenden Entsorgungsvertrages${customer.contractNumber ? ` (Vertragsnummer: ${customer.contractNumber})` : ""} ${dateStr}.</p>
<p>Ich bitte Sie, den Eingang dieser Kündigung schriftlich zu bestätigen sowie mir das genaue Beendigungsdatum des Vertragsverhältnisses mitzuteilen.</p>
<p>Darüber hinaus bitte ich Sie, alle überlassenen Behälter, Geräte und sonstigen Gegenstände rechtzeitig abzuholen und sicherzustellen, dass zum Vertragsende keine offenen Forderungen zwischen uns bestehen.</p>
${contactLine ? `<p>Für Rückfragen stehe ich Ihnen gerne unter ${contactLine} zur Verfügung.</p>` : ""}
<p>Ich untersage ausdrücklich jede weitere Kontaktaufnahme zu Werbe-, Rückgewinnungs- oder sonstigen Marketingzwecken. Eine Kontaktaufnahme nach Zugang dieser Kündigung wird als unerwünschte Werbung gemäß §7 UWG betrachtet und entsprechend behandelt. Ich erwarte, dass Sie diese Anweisung vollumfänglich respektieren.</p>
<p style="margin-top:4mm">Mit freundlichen Grüßen</p>
<div class="sig">
${sig ? `<img src="${sig}" alt="Unterschrift">` : `<div class="sl2"></div>`}
<div class="sn">${senderName}<br>${customer.street}<br>${customer.zip} ${customer.city}</div>
</div>
</body></html>`;
}

// ─────────────────────────────────────────────────────────
//  BASIS-KOMPONENTEN
// ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", span, optional, disabled }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={S.fGroup(span)}>
      <label style={S.label}>{label}{optional && <span style={{ color: C.textDim, marginLeft: 4 }}> (optional)</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ ...S.input, ...(focus && !disabled ? S.inputOn : {}), ...(disabled ? S.inputOff : {}) }} />
    </div>
  );
}

function StepBar({ current, onGoTo }) {
  return (
    <div style={S.stepBar}>
      {STEPS.map((name, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", cursor: done ? "pointer" : "default" }} onClick={() => done && onGoTo(i)}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600,
                background: done ? C.green : active ? "transparent" : "#1a1a1a",
                border: done ? "none" : active ? `2px solid ${C.green}` : "2px solid #2a2a2a",
                color: done ? "#000" : active ? C.green : "#3a3a3a",
                boxShadow: active ? "0 0 14px rgba(34,197,94,.35)" : "none",
              }}>{done ? "✓" : i + 1}</div>
              <span style={{ fontSize: 11, marginLeft: 7, whiteSpace: "nowrap", color: done ? C.green : active ? C.textSub : "#3a3a3a", fontWeight: active ? 500 : 400 }}>{name}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: done ? C.green : "#1e1e1e", margin: "0 6px", transition: "background .5s" }} />}
          </div>
        );
      })}
    </div>
  );
}

function SearchBlock({ label, placeholder, onResult, type }) {
  const [q, setQ]           = useState("");
  const [loading, setLoading] = useState(false);
  const [found, setFound]   = useState(false);
  const [err, setErr]       = useState("");

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true); setErr(""); setFound(false);
    try {
      const r = await findAddress(q, type);
      onResult(r);
      setFound(true);
    } catch {
      setErr("Adresse nicht gefunden – bitte manuell eingeben.");
    }
    setLoading(false);
  };

  return (
    <div style={S.fGroup()}>
      <label style={S.label}>{label}</label>
      <div style={S.searchRow}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder={placeholder}
          style={{ ...S.input, flex: 1 }} />
        <button style={S.searchBtn} onClick={search} disabled={loading || !q.trim()}>
          {loading ? "⏳" : "🔍 Suchen"}
        </button>
      </div>
      {loading && <div style={S.chip(false)}><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Suche läuft…</div>}
      {found   && <div style={S.chip(true)}>✓ Adresse gefunden und eingetragen</div>}
      {err     && <div style={S.errMsg}>{err}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCHRITT 1 – KUNDENDATEN
// ─────────────────────────────────────────────────────────
function Step1({ data, setData, onNext }) {
  const u = f => v => setData(d => ({ ...d, [f]: v }));

  const handleFound = r => setData(d => ({ ...d, ...r }));

  const canNext = data.companyName || data.lastName;

  return (
    <div style={S.card}>
      <div style={S.title}>Kundendaten</div>
      <div style={S.sub}>Betriebsname eingeben und automatisch suchen – oder Felder manuell ausfüllen.</div>

      <SearchBlock
        label="Schnellsuche – Betrieb / Restaurant"
        placeholder="z.B. Pizzeria Roma Köln, Gasthof Sonne München…"
        type="customer"
        onResult={handleFound}
      />

      <div style={S.divider} />
      <label style={S.labelDim}>Adresse prüfen / manuell eingeben</label>
      <div style={{ height: 14 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Firmenname / Betrieb" value={data.companyName} onChange={u("companyName")} placeholder="Pizzeria Roma GmbH" />
        <div style={S.grid2}>
          <Field label="Vorname Inhaber" value={data.firstName} onChange={u("firstName")} placeholder="Max" optional />
          <Field label="Nachname Inhaber" value={data.lastName} onChange={u("lastName")} placeholder="Mustermann" optional />
        </div>
        <Field label="Straße & Hausnummer" value={data.street} onChange={u("street")} placeholder="Musterstraße 1" />
        <div style={S.grid2}>
          <Field label="PLZ" value={data.zip} onChange={u("zip")} placeholder="12345" />
          <Field label="Stadt" value={data.city} onChange={u("city")} placeholder="Musterstadt" />
        </div>

        <div style={S.divider} />
        <div style={S.grid2}>
          <Field label="Kundennummer" value={data.customerNumber} onChange={u("customerNumber")} placeholder="KD-123456" optional />
          <Field label="Vertragsnummer" value={data.contractNumber} onChange={u("contractNumber")} placeholder="VT-789012" optional />
        </div>
        <div style={S.grid2}>
          <Field label="E-Mail" value={data.email} onChange={u("email")} placeholder="info@firma.de" type="email" optional />
          <Field label="Telefon" value={data.phone} onChange={u("phone")} placeholder="+49 123 456789" optional />
        </div>

        <div style={S.divider} />
        <div style={S.grid2}>
          <div style={S.fGroup()}>
            <label style={S.label}>Kündigungsart</label>
            <select style={S.select} value={data.terminationType}
              onChange={e => setData(d => ({ ...d, terminationType: e.target.value, terminationImmediate: e.target.value === "fristlos" ? true : d.terminationImmediate }))}>
              <option value="ordentlich">Ordentliche Kündigung</option>
              <option value="ausserordentlich">Außerordentliche Kündigung</option>
              <option value="fristlos">Fristlose Kündigung</option>
            </select>
          </div>
          <Field label="Kündigungsdatum" value={data.terminationImmediate ? "" : data.terminationDate}
            onChange={u("terminationDate")} placeholder="z.B. 31.12.2025"
            disabled={data.terminationImmediate} />
        </div>

        <div style={S.checkRow} onClick={() => setData(d => ({ ...d, terminationImmediate: !d.terminationImmediate }))}>
          <div style={S.checkBox(data.terminationImmediate)}>{data.terminationImmediate ? "✓" : ""}</div>
          <span style={{ fontSize: 13, color: "#8aaa8a" }}>Kündigung zum sofortigen Zeitpunkt (nächstmöglicher Termin)</span>
        </div>
      </div>

      <div style={S.nav}>
        <div />
        <button style={S.btnP} disabled={!canNext} onClick={onNext}>Weiter →</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCHRITT 2 – ENTSORGER
// ─────────────────────────────────────────────────────────
function Step2({ data, setData, onNext, onBack }) {
  const u = f => v => setData(d => ({ ...d, [f]: v }));

  return (
    <div style={S.card}>
      <div style={S.title}>Aktueller Entsorger</div>
      <div style={S.sub}>Entsorgerfirma eingeben – wir suchen die Adresse automatisch für das Kündigungsschreiben.</div>

      <SearchBlock
        label="Entsorger-Suche"
        placeholder="z.B. Refood Hamburg, Konermann Entsorgung, AWB Köln…"
        type="disposer"
        onResult={r => setData(d => ({ ...d, ...r }))}
      />

      <div style={S.divider} />
      <label style={S.labelDim}>Adresse prüfen / manuell eingeben</label>
      <div style={{ height: 14 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Firmenname" value={data.name || ""} onChange={u("name")} placeholder="Musterfirma GmbH" />
        <Field label="Straße & Hausnummer" value={data.street || ""} onChange={u("street")} placeholder="Industriestraße 10" />
        <div style={S.grid2}>
          <Field label="PLZ" value={data.zip || ""} onChange={u("zip")} placeholder="12345" />
          <Field label="Stadt" value={data.city || ""} onChange={u("city")} placeholder="Musterstadt" />
        </div>
      </div>

      <div style={S.nav}>
        <button style={S.btnS} onClick={onBack}>← Zurück</button>
        <button style={S.btnP} disabled={!data.name || !data.street || !data.city} onClick={onNext}>Vorschau →</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  DIN A4 BRIEF-VORSCHAU
// ─────────────────────────────────────────────────────────
function Letter({ customer, disposer, sig }) {
  const { today, senderName, dateStr, artText, contactLine } = getLetterData(customer);
  const p = { margin: "0 0 5mm 0", fontSize: "12pt", fontFamily: "'Times New Roman',Times,serif", lineHeight: 1.6 };

  return (
    <div style={{
      background: "#fff", color: "#111",
      width: "210mm", maxWidth: "100%", minHeight: "297mm",
      margin: "0 auto", padding: "20mm 25mm",
      boxSizing: "border-box", fontFamily: "'Times New Roman',Times,serif",
      fontSize: "12pt", lineHeight: 1.5,
      boxShadow: "0 8px 48px rgba(0,0,0,.6)", borderRadius: 2,
    }}>
      {/* Absenderzeile */}
      <div style={{ fontSize: "7.5pt", color: "#666", borderBottom: ".5pt solid #ddd", paddingBottom: "1.5mm", marginBottom: "8mm" }}>
        {senderName} · {customer.street} · {customer.zip} {customer.city}
      </div>

      {/* Empfänger */}
      <div style={{ marginBottom: "17mm", lineHeight: 1.7 }}>
        <strong>{disposer.name}</strong><br />
        {disposer.street}<br />
        {disposer.zip} {disposer.city}
        {disposer.country && disposer.country !== "Deutschland" && <><br />{disposer.country}</>}
      </div>

      {/* Datum */}
      <div style={{ textAlign: "right", marginBottom: "10mm", fontSize: "11pt", color: "#444" }}>
        {customer.city}, den {today}
      </div>

      {/* Betreff */}
      <div style={{ fontWeight: "bold", fontSize: "13pt", marginBottom: "1mm" }}>Kündigung des Entsorgungsvertrages</div>
      {customer.customerNumber && <div style={{ fontSize: "11pt", marginBottom: "1mm" }}>Kundennummer: {customer.customerNumber}</div>}
      {customer.contractNumber  && <div style={{ fontSize: "11pt", marginBottom: "1mm" }}>Vertragsnummer: {customer.contractNumber}</div>}
      <div style={{ marginBottom: "8mm" }} />

      {/* Text */}
      <p style={p}>Sehr geehrte Damen und Herren,</p>
      <p style={p}>
        hiermit erkläre ich die <strong>{artText}</strong> meines mit Ihnen bestehenden Entsorgungsvertrages
        {customer.contractNumber ? ` (Vertragsnummer: ${customer.contractNumber})` : ""} {dateStr}.
      </p>
      <p style={p}>
        Ich bitte Sie, den Eingang dieser Kündigung schriftlich zu bestätigen sowie mir das genaue
        Beendigungsdatum des Vertragsverhältnisses mitzuteilen.
      </p>
      <p style={p}>
        Darüber hinaus bitte ich Sie, alle überlassenen Behälter, Geräte und sonstigen Gegenstände
        rechtzeitig abzuholen und sicherzustellen, dass zum Vertragsende keine offenen Forderungen
        zwischen uns bestehen.
      </p>
      {contactLine && <p style={p}>Für Rückfragen stehe ich Ihnen gerne unter {contactLine} zur Verfügung.</p>}
      <p style={p}>
        Ich untersage ausdrücklich jede weitere Kontaktaufnahme zu Werbe-, Rückgewinnungs- oder
        sonstigen Marketingzwecken. Eine Kontaktaufnahme nach Zugang dieser Kündigung wird als
        unerwünschte Werbung gemäß §7 UWG betrachtet und entsprechend behandelt. Ich erwarte,
        dass Sie diese Anweisung vollumfänglich respektieren.
      </p>
      <p style={{ ...p, marginTop: "4mm" }}>Mit freundlichen Grüßen</p>

      {/* Unterschrift */}
      <div style={{ marginTop: "12mm" }}>
        {sig
          ? <img src={sig} alt="Unterschrift" style={{ height: "20mm", maxWidth: "75mm", display: "block" }} />
          : <div style={{ width: "75mm", height: "20mm", borderBottom: ".5pt solid #555" }} />}
        <div style={{ marginTop: "2mm", fontSize: "11pt", lineHeight: 1.6 }}>
          {senderName}<br />{customer.street}<br />{customer.zip} {customer.city}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCHRITT 3 – VORSCHAU
// ─────────────────────────────────────────────────────────
function Step3({ customer, disposer, sig, onNext, onBack }) {
  return (
    <div>
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={S.title}>Briefvorschau</div>
        <div style={{ ...S.sub, marginBottom: 0 }}>Bitte prüfen Sie das DIN-A4-Schreiben sorgfältig vor der Unterschrift.</div>
      </div>
      <Letter customer={customer} disposer={disposer} sig={sig} />
      <div style={S.nav}>
        <button style={S.btnS} onClick={onBack}>← Zurück</button>
        <button style={S.btnP} onClick={onNext}>Unterschreiben →</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCHRITT 4 – UNTERSCHRIFT
// ─────────────────────────────────────────────────────────
function Step4({ onNext, onBack, onSig }) {
  const ref = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig]   = useState(false);
  const last = useRef(null);

  const getXY = (e, cv) => {
    const r = cv.getBoundingClientRect();
    const [cx, cy] = e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
    return { x: (cx - r.left) * (cv.width / r.width), y: (cy - r.top) * (cv.height / r.height) };
  };
  const start = e => { e.preventDefault(); setDrawing(true); last.current = getXY(e, ref.current); };
  const move  = e => {
    e.preventDefault(); if (!drawing) return;
    const cv = ref.current, ctx = cv.getContext("2d"), p = getXY(e, cv);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#0a1a0a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(); last.current = p; setHasSig(true);
  };
  const stop  = () => setDrawing(false);
  const clear = () => { ref.current.getContext("2d").clearRect(0, 0, 700, 200); setHasSig(false); };
  const done  = () => { onSig(ref.current.toDataURL("image/png")); onNext(); };

  return (
    <div style={S.card}>
      <div style={S.title}>Unterschrift</div>
      <div style={S.sub}>Im weißen Feld mit Maus oder Finger unterschreiben.</div>
      <canvas ref={ref} width={700} height={200}
        style={{ background: "#fff", borderRadius: 10, cursor: "crosshair", display: "block", width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop} />
      <button style={{ ...S.btnS, marginTop: 12, fontSize: 12, padding: "8px 14px" }} onClick={clear}>✕ Löschen</button>
      <div style={S.nav}>
        <button style={S.btnS} onClick={onBack}>← Zurück</button>
        <button style={S.btnP} disabled={!hasSig} onClick={done}>Abschließen ✓</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  SCHRITT 5 – FERTIG
// ─────────────────────────────────────────────────────────
function Step5({ customer, disposer, sig }) {
  const print = () => {
    const w = window.open("", "_blank");
    w.document.write(letterHTML(customer, disposer, sig));
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div style={S.card}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", margin: "0 auto 20px", background: "rgba(34,197,94,.08)", border: `2px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 0 32px rgba(34,197,94,.2)" }}>✓</div>
        <div style={{ fontFamily: "'DM Serif Display',Georgia,serif", fontSize: 28, color: C.textMain, marginBottom: 10 }}>Kündigung fertig!</div>
        <div style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Das Kündigungsschreiben an <strong style={{ color: C.green }}>{disposer.name}</strong><br />
          ist vollständig ausgefüllt und unterschrieben.
        </div>
        <button style={S.btnP} onClick={print}>🖨 Drucken / Als PDF speichern</button>
        <div style={{ marginTop: 22, padding: "14px 18px", background: "#0a110a", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.textMuted, lineHeight: 1.6, textAlign: "left" }}>
          💡 <strong style={{ color: "#6aaa6a" }}>Tipp:</strong> Senden Sie das Schreiben per <strong>Einschreiben mit Rückschein</strong> für einen rechtssicheren Zustellungsnachweis.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [disposer, setDisposer] = useState(emptyDisposer);
  const [sig, setSig]           = useState(null);

  return (
    <div style={S.app}>
      <FontLoader />
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: #2a3a2a; }
        select option { background: #0a0d0f; }
        button:hover:not(:disabled) { opacity: .82; }
        button:disabled { opacity: .4; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* HEADER */}
      <div style={S.header}>
        <img src="https://www.bolz-entsorgung.de/static/css/img/logo.svg"
          alt="BOLZ Entsorgung" style={S.logo}
          onError={e => { e.target.style.display = "none"; }} />
        <div style={S.dividerV} />
        <div>
          <div style={S.hTitle}>Kündigungsassistent</div>
          <div style={S.hSub}>Ihr kostenloser Service der Bolz Entsorgung</div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={S.main}>
        <StepBar current={step} onGoTo={setStep} />
        {step === 0 && <Step1 data={customer} setData={setCustomer} onNext={() => setStep(1)} />}
        {step === 1 && <Step2 data={disposer}  setData={setDisposer}  onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <Step3 customer={customer} disposer={disposer} sig={sig} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step4 onNext={() => setStep(4)} onBack={() => setStep(2)} onSig={setSig} />}
        {step === 4 && <Step5 customer={customer} disposer={disposer} sig={sig} />}
      </div>
    </div>
  );
}
