import { cn } from "@/lib/cn";
import "./credit-card-art.css";

const BANK_COLORS: { match: string; color: string }[] = [
  { match: "nubank", color: "#820AD1" },
  { match: "inter", color: "#FF7A00" },
  { match: "c6", color: "#121212" },
  { match: "itaú", color: "#EC7000" },
  { match: "itau", color: "#EC7000" },
  { match: "bradesco", color: "#CC092F" },
  { match: "santander", color: "#EA1D25" },
  { match: "next", color: "#00BFA5" },
  { match: "picpay", color: "#21C25E" },
  { match: "will", color: "#FFDD00" },
];

export function resolveCardColor(name: string, color: string) {
  const n = name.toLowerCase();
  const known = BANK_COLORS.find((b) => n.includes(b.match));
  if (known) return known.color;
  return color || "#0c8a5d";
}

function isLight(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

function last4FromId(seed: string) {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return String(n % 10000).padStart(4, "0");
}

function BrandMark({ brand, light }: { brand: string; light: boolean }) {
  if (brand === "mastercard") {
    return (
      <div className="flex items-center" aria-label="Mastercard">
        <span className="h-8 w-8 rounded-full bg-[#eb001b]" />
        <span className="-ml-4 h-8 w-8 rounded-full bg-[#f79e1b]/90" />
      </div>
    );
  }
  if (brand === "visa") {
    return (
      <span className="text-xl font-black italic tracking-tight" style={{ color: light ? "#1a1f71" : "#fff" }}>
        VISA
      </span>
    );
  }
  if (brand === "amex") {
    return <span className="text-xs font-bold tracking-[0.2em]">AMEX</span>;
  }
  if (brand === "elo") {
    return <span className="text-sm font-black tracking-widest">ELO</span>;
  }
  if (brand === "hipercard") {
    return <span className="text-sm font-black">HIPERCARD</span>;
  }
  return <span className="text-xs font-semibold uppercase tracking-widest">{brand}</span>;
}

export function CreditCardArt({
  name,
  brand,
  color,
  holder,
  className,
}: {
  name: string;
  brand: string;
  color: string;
  holder?: string;
  className?: string;
}) {
  const face = resolveCardColor(name, color);
  const light = isLight(face);
  const ink = light ? "#1c241f" : "#fff";
  const muted = light ? "rgba(28,36,31,0.7)" : "rgba(255,255,255,0.72)";
  const last4 = last4FromId(name + brand);

  return (
    <div
      className={cn("plastic-card", className)}
      style={{
        background: `linear-gradient(145deg, ${face} 0%, ${face} 58%, color-mix(in srgb, ${face} 72%, #000) 100%)`,
        color: ink,
      }}
    >
      <div className="plastic-card__shine" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: muted }}>
            {brand}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">{name}</p>
        </div>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 8c2.5-2.5 6.5-2.5 9 0M6 6c3.8-3.8 10.2-3.8 14 0"
            stroke={ink}
            strokeOpacity="0.85"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="7" cy="16" r="1.4" fill={ink} fillOpacity="0.85" />
        </svg>
      </div>

      <div className="relative z-10 mt-7 flex items-center gap-4">
        <div className="plastic-card__chip" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p className="font-mono text-[15px] tracking-[0.28em]" style={{ color: ink }}>
          ••••  ••••  ••••  {last4}
        </p>
      </div>

      <div className="relative z-10 mt-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: muted }}>
            Titular
          </p>
          <p className="mt-0.5 text-sm font-medium uppercase tracking-wide">{holder || "Titular"}</p>
        </div>
        <BrandMark brand={brand} light={light} />
      </div>
    </div>
  );
}
