import React from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏪 LOGOS VETORIAIS DE ALTA QUALIDADE E CONTRASTE (32x32 VIEWBOX)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AmazonLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#131921" />
      {/* Amazon letter 'a' in crisp white */}
      <path
        d="M19.8 19.3c-.9.8-2.1 1.2-3.5 1.2-3.1 0-4.9-2-4.9-5.2 0-3.5 2.3-5.4 6.2-5.4h1.9v-.8c0-1.5-.8-2.4-2.5-2.4-1.6 0-3.2.7-4.2 1.3l-.9-1.9c1.4-.9 3.5-1.4 5.5-1.4 3.7 0 5.6 2 5.6 5.4v6.9c0 1.6.2 2.5.6 3.1h-2.6c-.3-.5-.4-1.2-.5-1.8zm-.2-7.3h-1.7c-2.3 0-3.6.9-3.6 3 0 1.7.9 2.7 2.5 2.7 1.7 0 2.8-1 2.8-3v-2.7z"
        fill="#FFFFFF"
      />
      {/* Amazon Smile Arrow in vibrant orange */}
      <path
        d="M9 22.5c5.8 2.8 14.5 2.8 18.4 0"
        stroke="#FF9900"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M26.2 21.6c.6.5 1.2 1 1.2 1l-.3 1.2"
        stroke="#FF9900"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MercadoLivreLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#FFE600" />
      {/* Shaking Hands Icon */}
      <g transform="translate(6, 6) scale(0.62)">
        <path
          d="M7 17C10.5 13 15 10 20.5 14C23.5 16.5 27.5 17 31 14"
          stroke="#2D3277"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path
          d="M32 12C28.5 15.5 24 18.5 18.5 14.5C15.5 12 11.5 11.5 8 14"
          stroke="#2D3277"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function ShopeeLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#EE4D2D" />
      {/* Shopee Bag */}
      <g transform="translate(7.5, 5.5) scale(0.53)">
        <path
          d="M4 12V31C4 32.7 5.3 34 7 34H25C26.7 34 28 32.7 28 31V12H4Z"
          fill="#FFFFFF"
        />
        <path
          d="M10 12V8C10 4.7 12.7 2 16 2V2C19.3 2 22 4.7 22 8V12"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Letter S in Orange */}
        <path
          d="M19.5 18C18.2 18.7 17.3 19.5 17.3 20.5C17.3 22.2 19.8 22.6 21.5 23C24 23.7 25.7 24.7 25.7 26.8C25.7 29.3 22.7 30.2 21.4 30.2C19.3 30.2 18 29.3 18 29.3"
          stroke="#EE4D2D"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(-4, -1)"
        />
      </g>
    </svg>
  );
}

export function AliExpressLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#FF4747" />
      {/* AliExpress bag + loop */}
      <g transform="translate(6, 6) scale(0.62)">
        <path
          d="M10 12V9C10 5.7 12.7 3 16 3C19.3 3 22 5.7 22 9V12"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <rect x="5" y="11" width="22" height="18" rx="3" fill="#FFFFFF" />
        <path
          d="M11 21C11 18.2 13.2 16 16 16C18.8 16 21 18.2 21 21"
          stroke="#FF4747"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function TikTokShopLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#000000" />
      {/* TikTok note with chromatic accent */}
      <g transform="translate(8, 6.5) scale(0.55)">
        <path
          d="M20 7H17V17C17 18.7 15.7 20 14 20C12.3 20 11 18.7 11 17C11 15.3 12.3 14 14 14V11C10.7 11 8 13.7 8 17C8 20.3 10.7 23 14 23C17.3 23 20 20.3 20 17V11C21.6 12.1 23.5 12.5 24.7 12.5V9.5C22.4 9.5 20.8 8.4 20 7Z"
          fill="#FFFFFF"
        />
        <path
          d="M19 8H16V17.5C16 19 14.8 20.2 13.3 20.2C11.8 20.2 10.6 19 10.6 17.5C10.6 16 11.8 14.8 13.3 14.8"
          stroke="#00F2FE"
          strokeWidth="1.2"
          fill="none"
        />
      </g>
    </svg>
  );
}

export function MagaluLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#0086FF" />
      {/* Magalu 'lu' icon style */}
      <g transform="translate(5, 7) scale(0.68)">
        <path
          d="M6 3V17C6 20.3 8.7 23 12 23H17"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="23" cy="20" r="3" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export function KaBuMLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#0060FF" />
      {/* KaBuM "K!" mark */}
      <text
        x="12"
        y="22"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="17"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        K
      </text>
      <text
        x="23"
        y="22"
        textAnchor="middle"
        fill="#FF6000"
        fontSize="17"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        !
      </text>
    </svg>
  );
}

export function NetshoesLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#562883" />
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="19"
        fontWeight="900"
        fontStyle="italic"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        N
      </text>
    </svg>
  );
}

export function CasasBahiaLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect width="32" height="32" rx="7" fill="#003399" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="12"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        CB
      </text>
    </svg>
  );
}

export type StoreKey =
  | "amazon"
  | "mercadolivre"
  | "shopee"
  | "aliexpress"
  | "tiktok"
  | "magalu"
  | "kabum"
  | "netshoes"
  | "casasbahia"
  | "default";

export interface StoreInfo {
  key: StoreKey;
  label: string;
  color: string;
  bgGlow: string;
}

export const STORE_INFOS: Record<StoreKey, StoreInfo> = {
  amazon: {
    key: "amazon",
    label: "Amazon",
    color: "#ff9900",
    bgGlow: "rgba(255, 153, 0, 0.15)",
  },
  mercadolivre: {
    key: "mercadolivre",
    label: "Mercado Livre",
    color: "#3483FA",
    bgGlow: "rgba(52, 131, 250, 0.15)",
  },
  shopee: {
    key: "shopee",
    label: "Shopee",
    color: "#ee4d2d",
    bgGlow: "rgba(238, 77, 45, 0.15)",
  },
  aliexpress: {
    key: "aliexpress",
    label: "AliExpress",
    color: "#ff4747",
    bgGlow: "rgba(255, 71, 71, 0.15)",
  },
  tiktok: {
    key: "tiktok",
    label: "TikTok Shop",
    color: "#00f2fe",
    bgGlow: "rgba(0, 242, 254, 0.15)",
  },
  magalu: {
    key: "magalu",
    label: "Magalu",
    color: "#0086ff",
    bgGlow: "rgba(0, 134, 255, 0.15)",
  },
  kabum: {
    key: "kabum",
    label: "KaBuM!",
    color: "#0060ff",
    bgGlow: "rgba(0, 96, 255, 0.15)",
  },
  netshoes: {
    key: "netshoes",
    label: "Netshoes",
    color: "#562883",
    bgGlow: "rgba(86, 40, 131, 0.15)",
  },
  casasbahia: {
    key: "casasbahia",
    label: "Casas Bahia",
    color: "#003399",
    bgGlow: "rgba(0, 51, 153, 0.15)",
  },
  default: {
    key: "default",
    label: "Loja Parceira",
    color: "#8e92a4",
    bgGlow: "rgba(142, 146, 164, 0.15)",
  },
};

export function detectStoreKey(item?: {
  storeName?: string | null;
  source?: string | null;
  platformType?: string | null;
  links?: Record<string, any> | null;
  platform?: string | null;
} | string | null): StoreKey {
  if (!item) return "default";

  // Se passou string direta como "amazon" ou "mercadolivre"
  if (typeof item === "string") {
    const s = item.toLowerCase().trim();
    if (s in STORE_INFOS) return s as StoreKey;
    return detectStoreKey({ storeName: s });
  }

  const normalize = (v?: string | null) =>
    (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const candidates = [
    normalize(item.storeName),
    normalize(item.source),
    normalize(item.platformType),
    normalize(item.platform),
  ];

  for (const c of candidates) {
    if (!c) continue;
    if (c.includes("amazon") || c === "amz") return "amazon";
    if (c.includes("mercado") || c.includes("meli") || c.includes("livre"))
      return "mercadolivre";
    if (c.includes("shopee") || c.includes("shp")) return "shopee";
    if (c.includes("aliexpress") || c.includes("ali")) return "aliexpress";
    if (c.includes("tiktok")) return "tiktok";
    if (c.includes("magalu") || c.includes("luiza")) return "magalu";
    if (c.includes("kabum")) return "kabum";
    if (c.includes("netshoes")) return "netshoes";
    if (c.includes("bahia") || c.includes("casasbahia")) return "casasbahia";
  }

  // Verificar links legados
  if (item.links) {
    if (item.links.amazon) return "amazon";
    if (item.links.mercadoLivre || item.links.mercadolivre)
      return "mercadolivre";
    if (item.links.shopee) return "shopee";
    if (item.links.aliexpress) return "aliexpress";
    if (item.links.tiktok) return "tiktok";
    if (item.links.magalu) return "magalu";
    if (item.links.kabum) return "kabum";
    if (item.links.netshoes) return "netshoes";
    if (item.links.casasbahia) return "casasbahia";
  }

  return "default";
}

const LOGO_COMPONENTS: Record<StoreKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  amazon: AmazonLogo,
  mercadolivre: MercadoLivreLogo,
  shopee: ShopeeLogo,
  aliexpress: AliExpressLogo,
  tiktok: TikTokShopLogo,
  kabum: KaBuMLogo,
  magalu: MagaluLogo,
  netshoes: NetshoesLogo,
  casasbahia: CasasBahiaLogo,
  default: AmazonLogo, // fallback token
};

export function StoreLogo({
  store,
  className = "w-5 h-5",
}: {
  store?: string | null;
  className?: string;
}) {
  const key = detectStoreKey(store);

  if (key !== "default") {
    const Component = LOGO_COMPONENTS[key];
    if (Component) return <Component className={className} />;
  }

  return (
    <div
      className={`rounded-lg bg-white/10 text-white flex items-center justify-center font-bold text-[9px] uppercase border border-white/15 shrink-0 ${className}`}
    >
      {store && store.length > 0 ? store.substring(0, 2).toUpperCase() : "🏷️"}
    </div>
  );
}
