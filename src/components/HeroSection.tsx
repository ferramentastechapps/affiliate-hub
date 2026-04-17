"use client";

import { motion } from "framer-motion";
import { BannersCarousel } from "./BannersCarousel";

export function HeroSection() {
  return (
    <section className="relative w-full max-w-[1400px] mx-auto flex flex-col items-center px-4 md:px-8 pt-4 pb-8 overflow-hidden">
      
      {/* Mesh Gradient Background */}
      <div className="absolute top-0 right-0 -z-10 w-[80vw] md:w-[50vw] h-[50vh] bg-accent/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      {/* Banners Carousel */}
      <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        <BannersCarousel />
      </motion.div>

    </section>
  );
}
