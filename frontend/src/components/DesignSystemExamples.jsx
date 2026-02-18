import React from "react";

// Premium Button
export function PremiumButton({ children = "Book Elite Session" }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-lg bg-brand-gold px-3 py-1.5 text-sm font-semibold tracking-wide text-brand-bg shadow-glow transition-all duration-300 ease-luxury hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
    >
      {children}
    </button>
  );
}

// Guide Card
export function GuideCard() {
  return (
    <article className="premium-card gold-glow-hover p-3 md:p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="luxury-heading text-xl">Arin V.</h3>
        <span className="gold-border rounded-md px-1 py-0.5 text-xs text-brand-gold">Elite</span>
      </div>
      <p className="mb-2 text-sm text-brand-muted">Premium Male Therapist • Bangkok</p>
      <p className="mb-3 text-sm leading-relaxed text-brand-text/90">
        Private wellness sessions designed for discerning clients who value discretion,
        refinement, and premium service.
      </p>
      <div className="flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-sm text-brand-gold">From ฿6,500</span>
        <PremiumButton>View Profile</PremiumButton>
      </div>
    </article>
  );
}

// Hero Section Container
export function HeroSection() {
  return (
    <section className="section-padding bg-brand-bg">
      <div className="container-premium">
        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <p className="mb-1 text-xs uppercase tracking-[0.18em] text-brand-gold">MaleBangkok</p>
          <h1 className="luxury-heading text-4xl md:text-5xl">
            Premium Male Therapy & Elite Lifestyle Guide
          </h1>
          <p className="mt-2 max-w-3xl text-base text-brand-muted">
            Experience curated luxury companionship and therapeutic guidance in Bangkok with
            absolute privacy and world-class standards.
          </p>
          <div className="mt-3">
            <PremiumButton>Explore Guides</PremiumButton>
          </div>
        </div>
      </div>
    </section>
  );
}

// Glass Navbar
export function GlassNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-bg/70">
      <nav className="container-premium py-1.5">
        <div className="glass-panel rounded-xl px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="luxury-heading text-lg">MaleBangkok</span>
            <div className="flex items-center gap-2 text-sm">
              <a href="#" className="text-brand-muted hover:text-brand-gold">
                Guides
              </a>
              <a href="#" className="text-brand-muted hover:text-brand-gold">
                Booking
              </a>
              <a href="#" className="text-brand-muted hover:text-brand-gold">
                Contact
              </a>
              <PremiumButton>Sign In</PremiumButton>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function DesignSystemExamples() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <GlassNavbar />
      <HeroSection />
      <main className="container-premium section-padding">
        <GuideCard />
      </main>
    </div>
  );
}
