import {
  NavBar,
  HeroSection,
  ContrastSection,
  WorkflowSection,
  FeatureGrid,
  ComparisonSection,
  CtaSection,
  FooterSection,
} from "@/components";

export default function Home() {
  return (
    <div className="bg-ava-page font-display text-ava-light overflow-x-hidden min-h-screen">
      <NavBar />
      <HeroSection />
      <section id="solutions">
        <ContrastSection />
      </section>
      <section id="workflow">
        <WorkflowSection />
      </section>
      <section id="platform">
        <FeatureGrid />
      </section>
      <section id="comparison">
        <ComparisonSection />
      </section>
      <section id="cta">
        <CtaSection />
      </section>
      <FooterSection />
    </div>
  );
}
