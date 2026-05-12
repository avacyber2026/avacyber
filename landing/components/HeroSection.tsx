import Link from "next/link";
import { IconArrowForward } from "./Icons";

export function HeroSection() {
  return (
    <header className="relative pt-28 pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-primary/20 text-[#3FFFA3] text-xs font-bold uppercase tracking-widest mb-6">
            The New Editorial Standard
          </span>
          <h1 className="font-serif text-5xl md:text-7xl text-[#F4F3F4] leading-[1.1] mb-8">
            Security operations, <span className="italic text-[#50BFA0]">redefined</span> for elite teams.
          </h1>
          <p className="text-xl text-[#50BFA0] leading-relaxed mb-10 max-w-xl">
            Experience a premium platform where technical precision meets elegant communication. Designed specifically for high-impact engineering environments.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="https://app.ava-cyber.com"
              className="bg-primary text-[#1C1E1C] font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 group"
            >
              Start Securely
              <IconArrowForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-transform duration-700">
            <div className="bg-slate-900 p-3 flex items-center gap-2 border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="mx-auto text-[10px] text-slate-500 font-mono tracking-tighter">
                AVA cyber // OPS_DASHBOARD_V2
              </div>
            </div>
            <div className="p-4 bg-slate-50">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="h-20 bg-white border border-slate-200 rounded-lg p-2">
                  <div className="w-8 h-1 bg-primary/20 rounded mb-2" />
                  <div className="w-full h-8 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-20 bg-white border border-slate-200 rounded-lg p-2">
                  <div className="w-8 h-1 bg-emerald-500/20 rounded mb-2" />
                  <div className="w-full h-8 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-20 bg-white border border-slate-200 rounded-lg p-2">
                  <div className="w-8 h-1 bg-amber-500/20 rounded mb-2" />
                  <div className="w-full h-8 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-48 bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-24 h-2 bg-slate-200 rounded" />
                  <div className="w-12 h-4 bg-primary/10 rounded" />
                </div>
                <div className="space-y-3">
                  <div className="h-1 bg-slate-100 w-full rounded" />
                  <div className="h-1 bg-slate-100 w-3/4 rounded" />
                  <div className="h-1 bg-slate-100 w-5/6 rounded" />
                  <div className="h-1 bg-slate-100 w-2/3 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
