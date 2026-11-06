import Link from "next/link";
import { messages } from "@/lib/messages";
import { Icon } from "@/features/translator/components/Icon";
import { ThemeToggle } from "@/features/translator/components/ThemeToggle";
import { TranslatorForm } from "@/features/translator/components/TranslatorForm";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#traductor">
        {messages.skip}
      </a>
      <header className="site-header page-width">
        <Link href="/" className="brand" aria-label={messages.brand}>
          <span className="brand-mark">
            <Icon name="translate" />
          </span>
          {messages.brand}
          <span className="brand-dot">.</span>
        </Link>
        <nav aria-label={messages.navigation.translator}>
          <a className="nav-active" href="#traductor">
            {messages.navigation.translator}
          </a>
          <a href="#como-funciona">{messages.navigation.how}</a>
        </nav>
        <div className="header-end">
          <span>{messages.navigation.note}</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="page-width">
        <section className="hero" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">
              <span />
              {messages.hero.eyebrow}
            </p>
            <h1 id="page-title">
              {messages.hero.title} <em>{messages.hero.emphasis}</em>
            </h1>
            <p className="hero-description">{messages.hero.description}</p>
          </div>
          <div className="hero-aside" aria-hidden="true">
            <span className="hello-bubble">
              {messages.hero.greeting}
              <span>!</span>
            </span>
            <span className="hello-arrow">↗</span>
            <span className="hello-caption">{messages.hero.badge}</span>
          </div>
        </section>
        <TranslatorForm />
        <section
          className="how-section"
          id="como-funciona"
          aria-labelledby="how-title"
        >
          <div className="how-heading">
            <p className="eyebrow">{messages.how.eyebrow}</p>
            <h2 id="how-title">{messages.how.title}</h2>
          </div>
          <div className="how-steps">
            {messages.how.steps.map((step) => (
              <article key={step.number}>
                <span className="step-number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer page-width">
        <span className="footer-brand">
          {messages.brand}
          <span>.</span>
          <small>{messages.footer.tagline}</small>
        </span>
        <span>{messages.footer.signature}</span>
      </footer>
    </>
  );
}
