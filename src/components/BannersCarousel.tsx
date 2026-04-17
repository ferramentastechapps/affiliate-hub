"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface Banner {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  description: string;
}

const banners: Banner[] = [
  {
    id: "lg-memberdays",
    name: "LG Member Days",
    imageUrl: "/banners/lg-memberdays.jpg",
    category: "eletrodomesticos",
    description: "Até 60% OFF em produtos LG"
  },
  {
    id: "netshoes",
    name: "Netshoes",
    imageUrl: "/banners/netshoes.jpg",
    category: "esportes",
    description: "Cupom de até 15% OFF"
  },
  {
    id: "elets-cadeiras",
    name: "Elets Cadeiras",
    imageUrl: "/banners/elets-cadeiras.jpg",
    category: "escritorio",
    description: "Cadeiras com 8% OFF aplicando cupom exclusivo"
  },
  {
    id: "samsung-aniversario",
    name: "Samsung Aniversário",
    imageUrl: "/banners/samsung-aniversario.jpg",
    category: "tecnologia",
    description: "Aniversário Samsung com até 50% OFF + Parcele em até 18x"
  },
  {
    id: "aliexpress-outono",
    name: "AliExpress Saldão de Outono",
    imageUrl: "/banners/aliexpress-outono.jpg",
    category: "moda",
    description: "Saldão de Outono com até 70% OFF"
  }
];

interface BannersCarouselProps {
  onBannerClick?: (category: string, bannerName: string) => void;
}

export function BannersCarousel({ onBannerClick }: BannersCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleBannerClick = (banner: Banner) => {
    if (onBannerClick) {
      onBannerClick(banner.category, banner.name);
    }
    // Scroll suave para a seção de produtos
    const productsSection = document.getElementById("ofertas");
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full max-w-[1400px] mx-auto px-4 md:px-8 py-12">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Banners Container */}
        <div className="relative h-[200px] md:h-[280px]">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              className="absolute inset-0 cursor-pointer"
              initial={false}
              animate={{
                opacity: index === currentIndex ? 1 : 0,
                scale: index === currentIndex ? 1 : 0.95,
                zIndex: index === currentIndex ? 1 : 0,
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              onClick={() => handleBannerClick(banner)}
            >
              <div className="relative w-full h-full rounded-3xl overflow-hidden group">
                <img
                  src={banner.imageUrl}
                  alt={banner.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Overlay com informações */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-white text-xl md:text-2xl font-bold mb-2">
                      {banner.name}
                    </h3>
                    <p className="text-white/90 text-sm md:text-base">
                      {banner.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-3 rounded-full transition-all duration-300 hover:scale-110"
          aria-label="Banner anterior"
        >
          <CaretLeft size={24} weight="bold" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-3 rounded-full transition-all duration-300 hover:scale-110"
          aria-label="Próximo banner"
        >
          <CaretRight size={24} weight="bold" />
        </button>

        {/* Dots Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Auto-play indicator */}
      <div className="mt-4 text-center">
        <p className="text-xs text-zinc-500">
          Clique nos banners para ver ofertas exclusivas
        </p>
      </div>
    </section>
  );
}
