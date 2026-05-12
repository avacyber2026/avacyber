import { IconVerifiedUser, IconMonitoring, IconDynamicFeed } from "./Icons";

export function ContrastSection() {
  return (
    <section className="bg-white py-32 text-[#1C1E1C]">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="font-serif text-4xl md:text-5xl mb-12 max-w-3xl mx-auto leading-tight text-[#1C1E1C]">
          High-impact security infrastructure for the modern enterprise.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20">
          <div className="p-8 border border-[#50BFA0]/30 rounded-2xl bg-[#F4F3F4]">
            <div className="text-[#50BFA0] w-10 h-10 mb-6 mx-auto">
              <IconVerifiedUser />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[#1C1E1C]">Atomic Encryption</h3>
            <p className="text-[#1F6A5C] leading-relaxed">
              End-to-end 256-bit AES encryption at every layer of the communication stack.
            </p>
          </div>
          <div className="p-8 border border-[#50BFA0]/30 rounded-2xl bg-[#F4F3F4]">
            <div className="text-[#50BFA0] w-10 h-10 mb-6 mx-auto">
              <IconMonitoring />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[#1C1E1C]">Real-time Audits</h3>
            <p className="text-[#1F6A5C] leading-relaxed">
              Automated logging and tamper-proof trails for compliance and risk mitigation.
            </p>
          </div>
          <div className="p-8 border border-[#50BFA0]/30 rounded-2xl bg-[#F4F3F4]">
            <div className="text-[#50BFA0] w-10 h-10 mb-6 mx-auto">
              <IconDynamicFeed />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[#1C1E1C]">Protocol Agility</h3>
            <p className="text-[#1F6A5C] leading-relaxed">
              Seamlessly switch between security protocols without downtime or performance loss.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
