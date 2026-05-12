"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconMenu, IconMenuClose } from "./Icons";

const navLinks = [
  { href: "#solutions", label: "Solutions" },
  { href: "#platform", label: "Platform" },
  { href: "#workflow", label: "Workflow" },
  { href: "#comparison", label: "Pricing" },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      if (y < 10) {
        setVisible(true);
      } else if (y > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(y);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-[#1F6A5C]/95 backdrop-blur-md border-b border-ava-primary transition-transform duration-300 ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icon2.png" alt="AVA cyber" width={140} height={36} className="h-9 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                className="text-sm font-semibold text-[#F4F3F4] hover:text-[#3FFFA3] hover:underline underline-offset-4 decoration-2 transition-all"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="https://app.ava-cyber.com"
              className="hidden sm:block text-sm font-bold text-[#F4F3F4] px-4 py-2 hover:bg-white/10 rounded-lg transition-all"
            >
              Log In
            </Link>
            <Link
              href="https://app.ava-cyber.com"
              className="hidden md:inline-flex bg-primary text-[#1C1E1C] text-sm font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition-all shadow-lg"
            >
              Get Started
            </Link>
            {/* Burger button */}
            <button
              type="button"
              className="md:hidden p-2 -mr-2 text-[#F4F3F4] hover:text-[#3FFFA3]"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <IconMenuClose className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu: overlay + slide from right */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-[60] transition-opacity"
            onClick={handleNavClick}
            aria-hidden
          />
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-[60%] max-w-sm bg-[#1C1E1C] shadow-xl z-[70] flex flex-col px-6 pt-8 pb-6 mobile-menu-slide border-l border-[#1F6A5C]">
            <div className="flex items-center gap-3 mb-8">
              <Image src="/icon2.png" alt="AVA cyber" width={140} height={36} className="h-9 w-auto" />
            </div>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleNavClick}
                className="py-4 text-base font-semibold text-[#F4F3F4] hover:text-[#3FFFA3] transition-colors border-b border-[#1F6A5C]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://app.ava-cyber.com"
              onClick={handleNavClick}
              className="py-4 text-base font-bold text-[#F4F3F4] hover:text-[#3FFFA3]"
            >
              Log In
            </a>
            <div className="mt-auto pt-6">
              <Link
                href="https://app.ava-cyber.com"
                onClick={handleNavClick}
                className="block w-full text-center bg-primary text-[#1C1E1C] text-sm font-bold py-3 rounded-lg hover:opacity-90 transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
