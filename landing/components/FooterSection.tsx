import Image from "next/image";

const productLinks = [
  { href: "#platform", label: "Dashboard" },
  { href: "#workflow", label: "Automations" },
  { href: "#platform", label: "Integrations" },
  { href: "#platform", label: "API Docs" },
];

const companyLinks = [
  { href: "#solutions", label: "About Us" },
  { href: "#solutions", label: "Security" },
  { href: "#solutions", label: "Compliance" },
  { href: "#cta", label: "Contact" },
];

const legalLinks = [
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms of Service" },
  { href: "#", label: "Cookie Policy" },
];

export function FooterSection() {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-[#1C1E1C] border-t border-[#1F6A5C] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <Image src="/icon2.png" alt="AVA cyber" width={120} height={30} className="h-8 w-auto" />
            </div>
            <p className="text-[#50BFA0] text-sm leading-relaxed">
              Clarity in Security and Compliance. SecureConnect platform for high-performance teams.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-[#F4F3F4] mb-6">Product</h5>
            <ul className="space-y-4 text-sm text-[#50BFA0]">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a className="hover:text-[#3FFFA3] hover:underline underline-offset-2 decoration-2 transition-all py-1 inline-block" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#F4F3F4] mb-6">Company</h5>
            <ul className="space-y-4 text-sm text-[#50BFA0]">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a className="hover:text-[#3FFFA3] hover:underline underline-offset-2 decoration-2 transition-all py-1 inline-block" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#F4F3F4] mb-6">Legal</h5>
            <ul className="space-y-4 text-sm text-[#50BFA0]">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a className="hover:text-[#3FFFA3] hover:underline underline-offset-2 decoration-2 transition-all py-1 inline-block" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-[#1F6A5C] pt-8">
          <p className="text-xs text-[#50BFA0]">
            © {year} AVA cyber. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
