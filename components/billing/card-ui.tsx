import type { StripeCardNumberElementOptions } from "@stripe/stripe-js";

export const cardElementStyle: StripeCardNumberElementOptions["style"] = {
  base: {
    fontSize: "15px",
    color: "#0f172a",
    fontFamily: "inherit",
    "::placeholder": { color: "#9ca3af" },
  },
  invalid: { color: "#dc2626" },
};

export const cardFieldClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 transition-colors focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/15";

export const cardInputClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-[15px] text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15";

// Applied on top of the input/field classes to flag an invalid field.
export const cardErrorClass =
  "border-red-400 focus:border-red-500 focus:ring-red-500/15 focus-within:border-red-500 focus-within:ring-red-500/15";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

// ISO 3166-1 alpha-2 codes for the vast majority of the world's countries.
const COUNTRY_CODES = [
  "AF","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BH","BD","BB","BY",
  "BE","BZ","BJ","BT","BO","BA","BW","BR","BN","BG","BF","BI","KH","CM","CA","CV",
  "CF","TD","CL","CN","CO","KM","CG","CD","CR","CI","HR","CU","CY","CZ","DK","DJ",
  "DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FJ","FI","FR","GA","GM","GE",
  "DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IR","IQ",
  "IE","IL","IT","JM","JP","JO","KZ","KE","KI","KW","KG","LA","LV","LB","LS","LR",
  "LY","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","FM","MD",
  "MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","KP","MK",
  "NO","OM","PK","PW","PA","PG","PY","PE","PH","PL","PT","QA","RO","RU","RW","KN",
  "LC","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO","ZA",
  "KR","SS","ES","LK","SD","SR","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TO",
  "TT","TN","TR","TM","TV","UG","UA","AE","GB","US","UY","UZ","VU","VA","VE","VN",
  "YE","ZM","ZW",
];

const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["pt-BR"], { type: "region" })
    : null;

export const BILLING_COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  label: regionNames?.of(code) ?? code,
})).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

export function BrandLogos() {
  return (
    <div className="flex items-center gap-1">
      <span className="flex h-5 w-8 items-center justify-center rounded border border-slate-200 bg-white text-[9px] font-bold italic text-[#1a1f71]">
        VISA
      </span>
      <span className="flex h-5 w-8 items-center justify-center rounded border border-slate-200 bg-white">
        <svg viewBox="0 0 24 16" className="h-3.5" aria-hidden="true">
          <circle cx="9.5" cy="8" r="5.5" fill="#EB001B" />
          <circle cx="14.5" cy="8" r="5.5" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
      </span>
      <span className="flex h-5 w-8 items-center justify-center rounded bg-[#2E77BC] text-[7px] font-bold tracking-tight text-white">
        AMEX
      </span>
      <span className="flex h-5 w-8 items-center justify-center rounded bg-black text-[9px] font-bold lowercase text-white">
        elo
      </span>
    </div>
  );
}
