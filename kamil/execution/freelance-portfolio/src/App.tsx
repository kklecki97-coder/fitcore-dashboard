import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Globe,
  Smartphone,
  Search,
  Zap,
  Shield,
  BarChart3,
  Code2,
  Palette,
  Rocket,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Monitor,
  ShoppingCart,
  Megaphone,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react'
import './App.css'

/* ─── Animate on scroll wrapper ─── */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Data ─── */
const services = [
  {
    icon: <Monitor size={28} />,
    title: 'Strony wizytówki',
    desc: 'Profesjonalna strona Twojej firmy — informacje, usługi, dane kontaktowe. Wszystko czego potrzebuje klient żeby Cię znaleźć.',
    color: 'accent',
  },
  {
    icon: <ShoppingCart size={28} />,
    title: 'Sklepy internetowe',
    desc: 'Sprzedawaj produkty online. Koszyk, płatności, zarządzanie zamówieniami — gotowe do zarabiania.',
    color: 'purple',
  },
  {
    icon: <Smartphone size={28} />,
    title: 'Aplikacje webowe',
    desc: 'Panele klienta, dashboardy, systemy rezerwacji — wszystko co wykracza poza zwykłą stronę.',
    color: 'blue',
  },
  {
    icon: <Search size={28} />,
    title: 'SEO & Google Maps',
    desc: 'Optymalizacja pod wyszukiwarki. Twoja firma na szczycie wyników Google w Twoim mieście.',
    color: 'accent',
  },
  {
    icon: <Megaphone size={28} />,
    title: 'Social media',
    desc: 'Profesjonalne profile, spójny branding, integracja z Facebookiem i Instagramem.',
    color: 'purple',
  },
  {
    icon: <Palette size={28} />,
    title: 'Rebranding & Logo',
    desc: 'Nowe logo, identyfikacja wizualna, materiały graficzne. Spójna marka od A do Z.',
    color: 'blue',
  },
]

const features = [
  { icon: <Zap size={20} />, text: 'Błyskawiczne ładowanie' },
  { icon: <Smartphone size={20} />, text: 'Działa na telefonie i komputerze' },
  { icon: <Shield size={20} />, text: 'Certyfikat SSL (https)' },
  { icon: <Search size={20} />, text: 'Zoptymalizowana pod Google' },
  { icon: <BarChart3 size={20} />, text: 'Statystyki odwiedzin' },
  { icon: <Globe size={20} />, text: 'Domena i hosting w cenie' },
]

const process = [
  { step: '01', title: 'Rozmowa', desc: 'Poznajemy Twoje potrzeby, branżę i klientów. Ustalamy co strona ma robić.' },
  { step: '02', title: 'Projekt', desc: 'Przygotowuję projekt graficzny. Widzisz jak będzie wyglądać zanim zacznę kodować.' },
  { step: '03', title: 'Realizacja', desc: 'Koduję stronę od zera. Żadne szablony — wszystko szyte na miarę.' },
  { step: '04', title: 'Uruchomienie', desc: 'Strona ląduje w internecie. Pomagam z domeną, mailem i Google Maps.' },
]

function App() {
  useEffect(() => {
    document.title = 'Kamil Klecki — Strony Internetowe'
  }, [])

  return (
    <div className="app">
      {/* ═══ Background Effects ═══ */}
      <div className="bg-grid" />
      <div className="bg-glow bg-glow--1" />
      <div className="bg-glow bg-glow--2" />

      {/* ═══ Nav ═══ */}
      <nav className="nav">
        <div className="nav__inner">
          <a href="#" className="nav__logo">
            <Code2 size={24} className="nav__logo-icon" />
            <span>Kamil Klecki</span>
          </a>
          <div className="nav__links">
            <a href="#uslugi">Usługi</a>
            <a href="#proces">Proces</a>
            <a href="#realizacje">Realizacje</a>
            <a href="#kontakt" className="nav__cta">Kontakt</a>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="hero">
        <div className="hero__content">
          <motion.div
            className="hero__badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Rocket size={14} />
            <span>Dostępny — przyjmuję zlecenia</span>
          </motion.div>

          <motion.h1
            className="hero__title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Tworzę strony<br />
            <span className="hero__title--accent">które zarabiają</span>
          </motion.h1>

          <motion.p
            className="hero__subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            Profesjonalne strony internetowe dla firm z&nbsp;Brzeska i&nbsp;okolic.
            Nowoczesny design, szybkość, widoczność w&nbsp;Google.
          </motion.p>

          <motion.div
            className="hero__actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <a href="#kontakt" className="btn btn--primary">
              Darmowa wycena
              <ArrowRight size={18} />
            </a>
            <a href="#realizacje" className="btn btn--ghost">
              Zobacz realizacje
            </a>
          </motion.div>

          <motion.div
            className="hero__stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="hero__stat">
              <span className="hero__stat-num">7+</span>
              <span className="hero__stat-label">lat doświadczenia</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-num">100%</span>
              <span className="hero__stat-label">responsywność</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-num">24h</span>
              <span className="hero__stat-label">czas odpowiedzi</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* ═══ Services ═══ */}
      <section className="section" id="uslugi">
        <div className="container">
          <FadeIn>
            <div className="section__header">
              <span className="section__tag">Usługi</span>
              <h2 className="section__title">Wszystko czego potrzebuje<br />Twoja firma w internecie</h2>
              <p className="section__desc">Od prostej wizytówki po zaawansowaną aplikację — dostajesz kompletne rozwiązanie.</p>
            </div>
          </FadeIn>

          <div className="services-grid">
            {services.map((s, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className={`service-card service-card--${s.color}`}>
                  <div className="service-card__icon">{s.icon}</div>
                  <h3 className="service-card__title">{s.title}</h3>
                  <p className="service-card__desc">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features strip ═══ */}
      <section className="features-strip">
        <div className="container">
          <FadeIn>
            <div className="features-strip__inner">
              <h3 className="features-strip__title">Każda strona zawiera</h3>
              <div className="features-strip__list">
                {features.map((f, i) => (
                  <div key={i} className="feature-item">
                    <span className="feature-item__icon">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ Process ═══ */}
      <section className="section" id="proces">
        <div className="container">
          <FadeIn>
            <div className="section__header">
              <span className="section__tag">Proces</span>
              <h2 className="section__title">Od pomysłu do gotowej strony<br />w 4 prostych krokach</h2>
            </div>
          </FadeIn>

          <div className="process-grid">
            {process.map((p, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="process-card">
                  <span className="process-card__step">{p.step}</span>
                  <h3 className="process-card__title">{p.title}</h3>
                  <p className="process-card__desc">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Portfolio / Realizacje ═══ */}
      <section className="section" id="realizacje">
        <div className="container">
          <FadeIn>
            <div className="section__header">
              <span className="section__tag">Realizacje</span>
              <h2 className="section__title">Przykłady mojej pracy</h2>
              <p className="section__desc">Projekty które zbudowałem — od landing page po kompleksowe aplikacje webowe.</p>
            </div>
          </FadeIn>

          <div className="portfolio-grid">
            <FadeIn delay={0.1}>
              <div className="portfolio-card">
                <div className="portfolio-card__preview portfolio-card__preview--fitcore">
                  <div className="portfolio-card__browser">
                    <div className="browser-dots">
                      <span /><span /><span />
                    </div>
                    <span className="browser-url">fitcore.tech</span>
                  </div>
                  <img src="/fitcore-landing.png" alt="FitCore Landing Page" className="portfolio-card__screenshot" />
                </div>
                <div className="portfolio-card__info">
                  <div className="portfolio-card__tags">
                    <span className="tag">Landing Page</span>
                    <span className="tag">React</span>
                    <span className="tag">Animacje</span>
                  </div>
                  <h3>FitCore — Platforma dla trenerów</h3>
                  <p>Landing page + panel zarządzania klientami. Ciemny, nowoczesny design z animacjami.</p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="portfolio-card">
                <div className="portfolio-card__preview portfolio-card__preview--dashboard">
                  <div className="portfolio-card__browser">
                    <div className="browser-dots">
                      <span /><span /><span />
                    </div>
                    <span className="browser-url">app.fitcore.tech</span>
                  </div>
                  <img src="/fitcore-dashboard.png" alt="FitCore Dashboard" className="portfolio-card__screenshot" />
                </div>
                <div className="portfolio-card__info">
                  <div className="portfolio-card__tags">
                    <span className="tag">Aplikacja webowa</span>
                    <span className="tag">Dashboard</span>
                    <span className="tag">TypeScript</span>
                  </div>
                  <h3>FitCore — Dashboard trenerski</h3>
                  <p>Panel zarządzania: klienci, treningi, płatności, czat, postępy — wszystko w jednym miejscu.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ Why me ═══ */}
      <section className="section section--alt">
        <div className="container">
          <FadeIn>
            <div className="section__header">
              <span className="section__tag">Dlaczego ja</span>
              <h2 className="section__title">Co zyskujesz wybierając mnie</h2>
            </div>
          </FadeIn>

          <div className="why-grid">
            <FadeIn delay={0.1}>
              <div className="why-card">
                <div className="why-card__icon"><Zap size={24} /></div>
                <h3>Szybka realizacja</h3>
                <p>Strona gotowa w 5–7 dni. Nie czekasz tygodniami — działam od razu.</p>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="why-card">
                <div className="why-card__icon"><Code2 size={24} /></div>
                <h3>Kod, nie szablony</h3>
                <p>Każda strona pisana od zera. Żadne gotowce z WordPress — czysty, szybki kod.</p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="why-card">
                <div className="why-card__icon"><Star size={24} /></div>
                <h3>Uczciwa cena</h3>
                <p>Bez ukrytych kosztów i niepotrzebnych dodatków. Płacisz za to co dostajesz.</p>
              </div>
            </FadeIn>
            <FadeIn delay={0.25}>
              <div className="why-card">
                <div className="why-card__icon"><Phone size={24} /></div>
                <h3>Lokalny kontakt</h3>
                <p>Jestem z Brzeska — możemy spotkać się na żywo i pogadać o Twoim projekcie.</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta-section" id="kontakt">
        <div className="container">
          <FadeIn>
            <div className="cta-box">
              <div className="cta-box__glow" />
              <h2 className="cta-box__title">Gotowy na swoją stronę?</h2>
              <p className="cta-box__desc">
                Zadzwoń lub napisz — wycena jest darmowa i&nbsp;niezobowiązująca.
                Powiedz mi czego potrzebujesz, a&nbsp;ja powiem Ci ile to będzie kosztować.
              </p>

              <div className="cta-box__contacts">
                <a href="tel:+48576612068" className="cta-contact">
                  <div className="cta-contact__icon"><Phone size={22} /></div>
                  <div>
                    <span className="cta-contact__label">Telefon</span>
                    <span className="cta-contact__value">576 612 068</span>
                  </div>
                </a>

                <a href="mailto:kklecki97@gmail.com" className="cta-contact">
                  <div className="cta-contact__icon"><Mail size={22} /></div>
                  <div>
                    <span className="cta-contact__label">Email</span>
                    <span className="cta-contact__value">kklecki97@gmail.com</span>
                  </div>
                </a>

                <div className="cta-contact cta-contact--location">
                  <div className="cta-contact__icon"><MapPin size={22} /></div>
                  <div>
                    <span className="cta-contact__label">Lokalizacja</span>
                    <span className="cta-contact__value">Brzesko, Małopolska</span>
                  </div>
                </div>
              </div>

              <div className="cta-box__guarantees">
                <div className="guarantee"><Check size={16} /> Darmowa wycena</div>
                <div className="guarantee"><Check size={16} /> Bez zobowiązań</div>
                <div className="guarantee"><Check size={16} /> Odpowiedź w 24h</div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="footer">
        <div className="container">
          <div className="footer__inner">
            <div className="footer__brand">
              <Code2 size={20} className="footer__icon" />
              <span>Kamil Klecki</span>
            </div>
            <p className="footer__copy">© 2026 Kamil Klecki. Strony internetowe dla firm.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
