import { IconTableChart, IconToggleOn, IconHistory, IconKey, IconSpeed, IconTerminal } from "./Icons";

export function FeatureGrid() {
  return (
    <section className="py-24 bg-[#e8f7f4] border-y border-[#50BFA0]/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-[#1C1E1C] tracking-tight">
            Data &amp; Control Infrastructure
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-[#103E36] p-6 rounded-xl border border-[#50BFA0]/30 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="w-6 h-6 text-[#50BFA0]">
                <IconTableChart />
              </div>
              <span className="text-[10px] font-bold text-[#50BFA0] uppercase tracking-widest">
                Excel Export
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex gap-2">
                <div className="h-4 w-12 bg-[#1F6A5C] rounded" />
                <div className="h-4 w-24 bg-[#1F6A5C] rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-4 w-12 bg-[#1C1E1C] rounded" />
                <div className="h-4 w-24 bg-[#1C1E1C] rounded" />
              </div>
            </div>
            <h4 className="font-bold text-[#F4F3F4] mb-2">Seamless Exports</h4>
            <p className="text-sm text-[#50BFA0]">
              Generate cryptographically signed audit logs in .xlsx or .csv formats.
            </p>
          </div>
          <div className="bg-[#103E36] p-6 rounded-xl border border-[#50BFA0]/30 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="w-6 h-6 text-[#3FFFA3]">
                <IconToggleOn />
              </div>
              <span className="text-[10px] font-bold text-[#50BFA0] uppercase tracking-widest">
                Admin Control
              </span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-4 bg-primary/20 rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-primary rounded-full" />
              </div>
              <div className="text-[10px] font-mono text-[#50BFA0] uppercase">Override Mode</div>
            </div>
            <h4 className="font-bold text-[#F4F3F4] mb-2">Granular Approvals</h4>
            <p className="text-sm text-[#50BFA0]">
              Multi-signature admin toggles for high-stakes configuration changes.
            </p>
          </div>
          <div className="bg-[#103E36] p-6 rounded-xl border border-[#50BFA0]/30 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="w-6 h-6 text-[#50BFA0]">
                <IconHistory />
              </div>
              <span className="text-[10px] font-bold text-[#50BFA0] uppercase tracking-widest">
                Version History
              </span>
            </div>
            <div className="border-l-2 border-primary/30 pl-3 py-1 mb-4">
              <div className="text-[10px] text-[#50BFA0]">v4.2.1 DEPLOYED</div>
            </div>
            <h4 className="font-bold text-[#F4F3F4] mb-2">Immutable History</h4>
            <p className="text-sm text-[#50BFA0]">
              Every change is tracked with a permanent, verifiable hash.
            </p>
          </div>
          <div className="bg-[#103E36] p-6 rounded-xl border border-[#50BFA0]/30 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="w-6 h-6 text-[#50BFA0]">
                <IconKey />
              </div>
              <span className="text-[10px] font-bold text-[#50BFA0] uppercase tracking-widest">
                IAM Integration
              </span>
            </div>
            <div className="flex -space-x-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#1F6A5C] border-2 border-[#103E36]" />
              <div className="w-6 h-6 rounded-full bg-primary/30 border-2 border-[#103E36]" />
              <div className="w-6 h-6 rounded-full bg-[#1F6A5C] border-2 border-[#103E36]" />
            </div>
            <h4 className="font-bold text-[#F4F3F4] mb-2">Identity Governance</h4>
            <p className="text-sm text-[#50BFA0]">
              Deep integration with Okta, Azure AD, and Custom SAML providers.
            </p>
          </div>
          <div className="bg-[#103E36] p-6 rounded-xl border border-[#50BFA0]/30 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="w-6 h-6 text-[#50BFA0]">
                <IconSpeed />
              </div>
              <span className="text-[10px] font-bold text-[#50BFA0] uppercase tracking-widest">
                Performance
              </span>
            </div>
            <div className="h-12 flex items-end gap-1 mb-4">
              <div className="w-2 h-4 bg-[#1F6A5C] rounded" />
              <div className="w-2 h-8 bg-[#1F6A5C] rounded" />
              <div className="w-2 h-10 bg-primary/40 rounded" />
              <div className="w-2 h-6 bg-[#1F6A5C] rounded" />
            </div>
            <h4 className="font-bold text-[#F4F3F4] mb-2">Latency Management</h4>
            <p className="text-sm text-[#50BFA0]">
              Edge-based processing ensures sub-10ms validation worldwide.
            </p>
          </div>
          <div className="bg-[#103E36] p-6 rounded-xl border border-[#50BFA0]/30 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="w-6 h-6 text-[#50BFA0]">
                <IconTerminal />
              </div>
              <span className="text-[10px] font-bold text-[#50BFA0] uppercase tracking-widest">
                Developer SDK
              </span>
            </div>
            <div className="bg-[#1C1E1C] rounded p-2 text-[10px] font-mono text-[#3FFFA3] mb-4">
              $ sc init --env prod
            </div>
            <h4 className="font-bold text-[#F4F3F4] mb-2">Native CLI</h4>
            <p className="text-sm text-[#50BFA0]">
              Powerful command line tools for DevOps and SRE automation workflows.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
