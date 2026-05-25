import React from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏪 SVGs VETORIAIS DE ALTA QUALIDADE PARA AS LOJAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AmazonLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* Representação Estilizada de Alta Qualidade do Wordmark da Amazon */}
      <text
        x="15"
        y="38"
        fill="#111111"
        fontSize="34"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-1.5px"
      >
        amazon
      </text>
      {/* Seta do Sorriso da Amazon */}
      <path
        d="M32 46C55 54.5 105 54.5 125 46.5"
        stroke="#FF9900"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M120 42.5C122.5 44 125.2 46.2 125.2 46.2C125.2 46.2 122.8 49 121 51.5"
        stroke="#FF9900"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MercadoLivreLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* Logo Apertando as Mãos Mercado Livre */}
      <g transform="translate(10, 5)">
        <circle cx="25" cy="25" r="22" fill="#FFE600" />
        {/* Mão Esquerda */}
        <path
          d="M14 27C17 24 21 21 26 25C28.5 27 32 27.5 35 25"
          stroke="#2D3277"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Mão Direita */}
        <path
          d="M36 23C33 26 29 29 24 25C21.5 23 18 22.5 15 25"
          stroke="#2D3277"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
      <text
        x="70"
        y="35"
        fill="#2D3277"
        fontSize="21"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        mercado
      </text>
      <text
        x="70"
        y="51"
        fill="#2D3277"
        fontSize="21"
        fontWeight="400"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        livre
      </text>
    </svg>
  );
}

export function ShopeeLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      <g transform="translate(15, 8)">
        {/* Sacola de Compras Shopee */}
        <path
          d="M14 18V40C14 42.2 15.8 44 18 44H38C40.2 44 42 42.2 42 40V18H14Z"
          fill="#EE4D2D"
        />
        {/* Alças */}
        <path
          d="M21 18V13C21 9.1 24.1 6 28 6C31.9 6 35 9.1 35 13V18"
          stroke="#EE4D2D"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Letra S no meio da sacola */}
        <path
          d="M25.5 24C24 24.8 23 25.8 23 27C23 29 26 29.5 28 30C31 30.8 33 32 33 34.5C33 37.5 29.5 38.5 28 38.5C25.5 38.5 24 37.5 24 37.5"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="72"
        y="42"
        fill="#EE4D2D"
        fontSize="34"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        Shopee
      </text>
    </svg>
  );
}

export function AliExpressLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* AliExpress Stylized representation */}
      <g transform="translate(12, 10)">
        <rect width="40" height="40" rx="12" fill="#E62E04" />
        {/* Sacola branca estilizada */}
        <path
          d="M12 18H28M16 18V14C16 11.8 17.8 10 20 10V10C22.2 10 24 11.8 24 14V18"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Símbolo central */}
        <circle cx="20" cy="28" r="5" fill="#FFFFFF" />
      </g>
      <text
        x="65"
        y="40"
        fill="#E62E04"
        fontSize="24"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-1px"
      >
        AliExpress
      </text>
    </svg>
  );
}

export function TikTokShopLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* Nota Musical TikTok */}
      <g transform="translate(15, 8)">
        <circle cx="20" cy="20" r="16" fill="#000000" />
        {/* Nota em si com sombra Ciano/Rosa */}
        <path
          d="M25 10H21V22C21 24.2 19.2 26 17 26C14.8 26 13 24.2 13 22C13 19.8 14.8 18 17 18V14C12.6 14 9 17.6 9 22C9 26.4 12.6 30 17 30C21.4 30 25 26.4 25 22V15C27 16.5 29.5 17 31 17V13C28 13 26 11.5 25 10Z"
          fill="#FFFFFF"
        />
        {/* Glow ciano sutil */}
        <path
          d="M24 10H20V22C20 24.2 18.2 26 16 26C13.8 26 12 24.2 12 22C12 19.8 13.8 18 16 18"
          stroke="#00F2FE"
          strokeWidth="1.5"
          fill="none"
        />
      </g>
      <text
        x="68"
        y="32"
        fill="#000000"
        fontSize="17"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        TikTok
      </text>
      <text
        x="68"
        y="49"
        fill="#FF0050"
        fontSize="16"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0px"
      >
        Shop
      </text>
    </svg>
  );
}

export function KaBuMLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* KaBuM! Logo Azul Dinâmico */}
      <rect width="200" height="60" rx="14" fill="#0060FF" />
      <text
        x="18"
        y="41"
        fill="#FFFFFF"
        fontSize="34"
        fontWeight="950"
        fontStyle="italic"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-1.5px"
      >
        KaBuM!
      </text>
    </svg>
  );
}

export function MagaluLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      {...props}
    >
      {/* Círculo Magalu */}
      <g transform="translate(15, 10)">
        <circle cx="20" cy="20" r="20" fill="#0086ff" />
        <text
          x="11"
          y="27"
          fill="#FFFFFF"
          fontSize="22"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          m
        </text>
      </g>
      <text
        x="68"
        y="40"
        fill="#0086ff"
        fontSize="30"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-1px"
      >
        magalu
      </text>
    </svg>
  );
}
