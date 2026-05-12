import Link from "next/link";

export function CtaSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <h2 className="font-serif text-4xl md:text-5xl mb-8 text-[#1C1E1C]">
          Ready to upgrade your security posture?
        </h2>
        <p className="text-xl text-[#1F6A5C] mb-12">
          Join the elite engineering teams who have moved beyond legacy reporting.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="https://app.ava-cyber.com"
            className="bg-[#50BFA0] text-white font-bold px-10 py-4 rounded-xl hover:opacity-90 transition-all shadow-xl"
          >
            Get Started Now
          </Link>
          <a
            href="#contact"
            className="bg-white border-2 border-[#50BFA0] text-[#1F6A5C] font-bold px-10 py-4 rounded-xl hover:bg-[#50BFA0]/10 transition-all"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </section>
  );
}
