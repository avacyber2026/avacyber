export function WorkflowSection() {
  return (
    <section className="py-32 bg-[#103E36]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold text-[#F4F3F4] mb-4 tracking-tight">
            Smart Request Routing Workflow
          </h2>
          <p className="text-[#50BFA0] max-w-2xl mx-auto">
            A technical deep-dive into our automated validation and routing infrastructure.
          </p>
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#1F6A5C] -translate-y-1/2 hidden lg:block" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="relative z-10 bg-[#1F6A5C] p-8 rounded-2xl border border-[#50BFA0]/30 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#1C1E1C] text-[#3FFFA3] flex items-center justify-center mb-6 font-bold">
                01
              </div>
              <h4 className="text-lg font-bold text-[#F4F3F4] mb-2">Initiate Request</h4>
              <p className="text-[#50BFA0] text-sm mb-4">
                Client node handshake starts with dynamic token exchange.
              </p>
              <div className="bg-[#103E36] p-3 rounded font-mono text-[10px] text-[#50BFA0] border border-[#1F6A5C]">
                AES-256 | SHA-3 | SECP256K1
              </div>
            </div>
            <div className="relative z-10 bg-[#1F6A5C] p-8 rounded-2xl border border-[#50BFA0] shadow-sm ring-4 ring-primary/20">
              <div className="w-12 h-12 rounded-full bg-primary text-[#1C1E1C] flex items-center justify-center mb-6 font-bold">
                02
              </div>
              <h4 className="text-lg font-bold text-[#F4F3F4] mb-2">Automated Validation</h4>
              <p className="text-[#50BFA0] text-sm mb-4">
                AI-driven heuristic analysis checks for anomalies and spoofing.
              </p>
              <div className="bg-[#103E36] p-3 rounded font-mono text-[10px] text-[#3FFFA3] font-bold border border-primary/30">
                STATUS: VALIDATING [..................] 100%
              </div>
            </div>
            <div className="relative z-10 bg-[#1F6A5C] p-8 rounded-2xl border border-[#50BFA0]/30 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#1C1E1C] text-[#3FFFA3] flex items-center justify-center mb-6 font-bold">
                03
              </div>
              <h4 className="text-lg font-bold text-[#F4F3F4] mb-2">Smart Routing</h4>
              <p className="text-[#50BFA0] text-sm mb-4">
                Payload routed to optimized admin node for final execution.
              </p>
              <div className="bg-[#103E36] p-3 rounded font-mono text-[10px] text-[#50BFA0] border border-[#1F6A5C]">
                DEST: NODE_ALPHA_09 | LATENCY: 12ms
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
