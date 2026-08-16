// "Who is online" strip in the header + your own name.
const COLORS = ["#7A2C2A", "#4A5637", "#5B4A8A", "#2E6E8E", "#B8975F", "#8A3B3B", "#3B6E5A"];
const colorFor = (s) => COLORS[[...(s || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export default function Presence({ presence, myKey, who, setWho, email, signOut }) {
  const others = presence.filter((p) => p.key !== myKey);
  return (
    <div className="row" style={{ gap: 8 }}>
      <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Your name" style={{ width: 130, padding: "6px 9px", fontSize: 13 }} title="Shown in History and to teammates" />
      {others.map((p) => (
        <span key={p.key} className="chip" title={`${p.name} · on ${p.tab}${p.sku ? " · editing " + p.sku : ""}`} style={{ borderColor: colorFor(p.name) }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: colorFor(p.name), display: "inline-block" }} />
          {p.name}{p.sku ? <span className="note"> · editing {p.sku}</span> : <span className="note"> · {p.tab}</span>}
        </span>
      ))}
      {others.length === 0 && <span className="note">only you online</span>}
      {email && <button className="btn small" onClick={signOut} title={email}>Sign out</button>}
    </div>
  );
}
