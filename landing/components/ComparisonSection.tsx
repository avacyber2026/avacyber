import { IconClose, IconCheckCircle } from "./Icons";

export function ComparisonSection() {
  return (
    <section className="py-32 bg-[#103E36]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl text-[#F4F3F4] mb-4">
            The New Standard
          </h2>
          <p className="text-[#50BFA0]">Legacy security vs. Modern Editorial Operations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1F6A5C] overflow-hidden rounded-2xl border border-[#1F6A5C]">
          <div className="bg-[#1C1E1C] p-10">
            <h4 className="text-[#50BFA0] text-sm font-bold uppercase tracking-widest mb-8">
              Old-School Security
            </h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-3 text-[#F4F3F4]">
                <div className="w-5 h-5 flex-shrink-0 text-[#50BFA0]"><IconClose /></div>
                <span>Reactive, ticket-based reporting silos</span>
              </li>
              <li className="flex items-start gap-3 text-[#F4F3F4]">
                <div className="w-5 h-5 flex-shrink-0 text-[#50BFA0]"><IconClose /></div>
                <span>Fragmented communication via email/Slack</span>
              </li>
              <li className="flex items-start gap-3 text-[#F4F3F4]">
                <div className="w-5 h-5 flex-shrink-0 text-[#50BFA0]"><IconClose /></div>
                <span>Manual compliance auditing (Weeks)</span>
              </li>
              <li className="flex items-start gap-3 text-[#F4F3F4]">
                <div className="w-5 h-5 flex-shrink-0 text-[#50BFA0]"><IconClose /></div>
                <span>No technical-to-executive translation</span>
              </li>
            </ul>
          </div>
          <div className="bg-[#1F6A5C] p-10">
            <h4 className="text-[#3FFFA3] text-sm font-bold uppercase tracking-widest mb-8">
              AVA cyber Platform
            </h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-3 text-[#F4F3F4] font-medium">
                <div className="w-5 h-5 flex-shrink-0 text-[#3FFFA3]"><IconCheckCircle /></div>
                <span>Proactive, editorialized operation feeds</span>
              </li>
              <li className="flex items-start gap-3 text-[#F4F3F4] font-medium">
                <div className="w-5 h-5 flex-shrink-0 text-[#3FFFA3]"><IconCheckCircle /></div>
                <span>Unified, encrypted command center</span>
              </li>
              <li className="flex items-start gap-3 text-[#F4F3F4] font-medium">
                <div className="w-5 h-5 flex-shrink-0 text-[#3FFFA3]"><IconCheckCircle /></div>
                <span>Real-time continuous auditing (Seconds)</span>
              </li>
              <li className="flex items-start gap-3 text-[#F4F3F4] font-medium">
                <div className="w-5 h-5 flex-shrink-0 text-[#3FFFA3]"><IconCheckCircle /></div>
                <span>Elegant narratives for technical stakeholders</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
