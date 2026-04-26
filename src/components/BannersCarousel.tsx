"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface Banner {
  id: string;
  title: string;
  imageDesktop: string;
  imageMobile: string;
  link?: string | null;
}

// Fallback estático enquanto não há banners no banco
const FALLBACK: Banner[] = [];

interface BannersCarouselProps {
  onBannerClick?: (bannerTitle: string) => void;
}

export function BannersCarousel({ onBannerClick }: BannersCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>(FALLBACK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setBanners(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset index when banners change
  useEffect(() => { setCurrentIndex(0); }, [banners.length]);

  if (banners.length === 0) return null;

  const nextSlide = () => setCurrentIndex((p) => (p + 1) % banners.length);
  const prevSlide = () => setCurrentIndex((p) => (p - 1 + banners.length) % banners.length);

  const handleClick = (banner: Banner) => {
    onBannerClick?.(banner.title);
    if (banner.link) {
      window.open(banner.link, "_blank", "noopener,noreferrer");
    } else {
      document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" });
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
              onClick={() => handleClick(banner)}
            >
              <div className="relative w-full h-full rounded-3xl overflow-hidden group">
                <img
                  src={isMobile ? banner.imageMobile : banner.imageDesktop}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-white text-xl md:text-2xl font-bold">
                      {banner.title}
                    </h3>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigation */}
        {banners.length > 1 && (
          <>
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

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Ir para banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-zinc-500">Clique nos banners para ver ofertas exclusivas</p>
      </div>
    </section>
  );
}
