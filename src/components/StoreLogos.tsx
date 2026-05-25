import React from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏪 SVGs VETORIAIS DE ALTA QUALIDADE PARA AS LOJAS (MOCKUP DESIGN)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AmazonLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* Lowercase 'a' in Amazon style */}
      <path
        d="M45.5 45.8c-1.8 1.5-4.4 2.2-7.2 2.2-6.5 0-10.2-4.2-10.2-10.8 0-7.3 4.8-11.2 13-11.2h4v-1.6c0-3.2-1.7-5-5.2-5-3.3 0-6.6 1.4-8.8 2.8l-1.8-4C32.3 16 36.7 15 40.8 15c7.8 0 11.7 4.2 11.7 11.2v14.4c0 3.3.4 5.3 1.2 6.4h-5.4c-.6-1.1-.9-2.6-1-3.6zM45.1 30.6h-3.6c-4.8 0-7.4 1.8-7.4 6.2 0 3.6 1.8 5.6 5.2 5.6 3.6 0 5.8-2 5.8-6.2v-5.6z"
        fill="#111111"
      />
      {/* Sorriso (Smile) */}
      <path
        d="M23 54c12 5.5 30 5.5 38 0"
        stroke="#FF9900"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M58.5 52c1.2 1 2.5 2 2.5 2L59 56.5"
        stroke="#FF9900"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MercadoLivreLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <circle cx="40" cy="26" r="18" fill="#FFE600" />
      {/* Shaking Hands */}
      <g transform="translate(25, 12) scale(0.6)">
        <path
          d="M14 27C17 24 21 21 26 25C28.5 27 32 27.5 35 25"
          stroke="#2D3277"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M36 23C33 26 29 29 24 25C21.5 23 18 22.5 15 25"
          stroke="#2D3277"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      {/* Texto mercado livre */}
      <text
        x="40"
        y="56"
        textAnchor="middle"
        fill="#2D3277"
        fontSize="9"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.2px"
      >
        mercado
      </text>
      <text
        x="40"
        y="65"
        textAnchor="middle"
        fill="#2D3277"
        fontSize="9"
        fontWeight="500"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.2px"
      >
        livre
      </text>
    </svg>
  );
}

export function ShopeeLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <g transform="translate(20, 15)">
        {/* Sacola de Compras Shopee */}
        <path
          d="M4 14V38C4 40.2 5.8 42 8 42H32C34.2 42 36 40.2 36 38V14H4Z"
          fill="#EE4D2D"
        />
        {/* Alças */}
        <path
          d="M10 14V9C10 5.1 13.1 2 17 2V2C20.9 2 24 5.1 24 9V14"
          stroke="#EE4D2D"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Letra S */}
        <path
          d="M21 21C19.5 21.8 18.5 22.8 18.5 24C18.5 26 21.5 26.5 23.5 27C26.5 27.8 28.5 29 28.5 31.5C28.5 34.5 25 35.5 23.5 35.5C21 35.5 19.5 34.5 19.5 34.5"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function AliExpressLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <g transform="translate(20, 16)">
        <rect width="40" height="40" rx="12" fill="#E62E04" />
        {/* Alça branca da sacola */}
        <path
          d="M12 16V13C12 8.6 15.6 5 20 5C24.4 5 28 8.6 28 13V16"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Sacola AliExpress em si */}
        <path
          d="M8 16H32V32C32 34.2 30.2 36 28 36H12C9.8 36 8 34.2 8 32V16Z"
          fill="#FF4612"
        />
        {/* Loop branco central */}
        <circle cx="20" cy="26" r="4.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export function TikTokShopLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect x="16" y="16" width="48" height="48" rx="12" fill="#000000" />
      {/* Nota Musical TikTok */}
      <g transform="translate(20, 20) scale(0.85)">
        <path
          d="M25 10H21V22C21 24.2 19.2 26 17 26C14.8 26 13 24.2 13 22C13 19.8 14.8 18 17 18V14C12.6 14 9 17.6 9 22C9 26.4 12.6 30 17 30C21.4 30 25 26.4 25 22V15C27 16.5 29.5 17 31 17V13C28 13 26 11.5 25 10Z"
          fill="#FFFFFF"
        />
        <path
          d="M24 10H20V22C20 24.2 18.2 26 16 26C13.8 26 12 24.2 12 22C12 19.8 13.8 18 16 18"
          stroke="#00F2FE"
          strokeWidth="1.5"
          fill="none"
        />
      </g>
    </svg>
  );
}

export function KaBuMLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <g transform="translate(8, 0)">
        <text
          x="0"
          y="28"
          fill="#0060FF"
          fontSize="24"
          fontWeight="950"
          fontStyle="italic"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-1px"
        >
          KaBuM
        </text>
        <text
          x="80"
          y="28"
          fill="#FF6000"
          fontSize="24"
          fontWeight="950"
          fontStyle="italic"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          !
        </text>
      </g>
    </svg>
  );
}

export function MagaluLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <rect x="8" y="20" width="64" height="40" rx="10" fill="#0086ff" />
      <text
        x="40"
        y="48"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="13.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        magalu
      </text>
    </svg>
  );
}

