import { HeroVisual } from "@/components/HeroVisual";
import { ProjectCubeJourney } from "@/components/ProjectCubeJourney";
import { BookScrollScene } from "@/components/BookScrollScene";
import { ContactVisual } from "@/components/ContactVisual";
import { SoundControl } from "@/components/SoundControl";
import { HeaderResources } from "@/components/HeaderResources";

export default function Home() {
  return (
    <div className="site-scroll-container">
      <main>
        <header className="site-header">
          <div className="site-header-left">
            <a className="wordmark" href="#top" aria-label="Back to top">kikihan.design</a>
            <HeaderResources />
          </div>
          <nav aria-label="Primary navigation">
            <a href="#work" aria-label="Work">
              <span className="site-nav-label">Work</span>
              <img className="site-nav-icon" src="/icons/header/work.svg" alt="" aria-hidden="true" />
            </a>
            <a href="#contact" aria-label="Contact">
              <span className="site-nav-label">Contact</span>
              <img className="site-nav-icon" src="/icons/header/contact.svg" alt="" aria-hidden="true" />
            </a>
            <SoundControl />
          </nav>
        </header>

        <section className="hero" id="top">
          <div className="hero-image">
            <HeroVisual />
          </div>
        </section>

        <ProjectCubeJourney />

        <BookScrollScene />

        <section className="contact-hero" id="contact" aria-label="Contact">
          <div className="contact-hero-image">
            <ContactVisual />
          </div>
        </section>
      </main>
    </div>
  );
}
