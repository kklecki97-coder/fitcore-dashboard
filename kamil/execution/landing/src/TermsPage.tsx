import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLang } from './i18n';

export default function TermsPage() {
  const { lang } = useLang();
  const homeUrl = lang === 'pl' ? '/pl/' : '/';

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 24px 100px' }}>
        <Link to={homeUrl} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 14,
          fontWeight: 600, marginBottom: 40,
        }}>
          <ArrowLeft size={16} /> {lang === 'pl' ? 'Wróć do FitCore' : 'Back to FitCore'}
        </Link>

        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>
          {lang === 'pl' ? 'Regulamin' : 'Terms of Service'}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 40 }}>
          {lang === 'pl' ? 'Ostatnia aktualizacja: 18 marca 2026' : 'Last updated: March 18, 2026'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Section title={lang === 'pl' ? '1. Akceptacja warunków' : '1. Acceptance of Terms'}>
            {lang === 'pl'
              ? 'Korzystając z FitCore ("Usługa"), zgadzasz się na niniejsze Warunki korzystania z usługi. Jeśli nie zgadzasz się z którymkolwiek z warunków, nie korzystaj z naszej platformy.'
              : 'By using FitCore ("Service"), you agree to these Terms of Service. If you do not agree with any of these terms, please do not use our platform.'}
          </Section>

          <Section title={lang === 'pl' ? '2. Opis usługi' : '2. Description of Service'}>
            {lang === 'pl'
              ? 'FitCore to platforma SaaS zaprojektowana dla trenerów fitness, zapewniająca narzędzia do zarządzania klientami, komunikacji, programów treningowych, fakturowania i przetwarzania płatności. Usługa obejmuje panel trenera i portal klienta.'
              : 'FitCore is a SaaS platform designed for fitness coaches, providing tools for client management, communication, workout programming, invoicing, and payment processing. The Service includes a coach dashboard and a client portal.'}
          </Section>

          <Section title={lang === 'pl' ? '3. Konta' : '3. Accounts'}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{lang === 'pl' ? 'Musisz podać dokładne i kompletne informacje podczas rejestracji.' : 'You must provide accurate and complete information when creating an account.'}</li>
              <li>{lang === 'pl' ? 'Jesteś odpowiedzialny za bezpieczeństwo swoich danych logowania.' : 'You are responsible for maintaining the security of your login credentials.'}</li>
              <li>{lang === 'pl' ? 'Musisz mieć ukończone 18 lat, aby korzystać z tej usługi.' : 'You must be at least 18 years old to use this Service.'}</li>
              <li>{lang === 'pl' ? 'Jedno konto na osobę lub organizację.' : 'One account per person or organization.'}</li>
            </ul>
          </Section>

          <Section title={lang === 'pl' ? '4. Płatności i rozliczenia' : '4. Payments & Billing'}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{lang === 'pl' ? 'FitCore oferuje 14-dniowy bezpłatny okres próbny bez konieczności podawania karty kredytowej.' : 'FitCore offers a 14-day free trial with no credit card required.'}</li>
              <li>{lang === 'pl' ? 'Po okresie próbnym obowiązuje jednorazowa opłata konfiguracyjna 360 zł i miesięczna subskrypcja 170 zł/miesiąc.' : 'After the trial, a one-time $100 setup fee and $49/month subscription fee applies.'}</li>
              <li>{lang === 'pl' ? 'Prowizja platformy: 5% od każdej płatności klienta przetwarzanej przez Stripe Connect.' : 'Platform fee: 5% on every client payment processed through Stripe Connect.'}</li>
              <li>{lang === 'pl' ? 'Płatności klientów trafiają bezpośrednio na Twoje połączone konto Stripe minus prowizja platformy.' : 'Client payments go directly to your connected Stripe account minus the platform fee.'}</li>
              <li>{lang === 'pl' ? 'Wszystkie opłaty są podane w polskich złotych (PLN).' : 'All fees are listed in US Dollars (USD).'}</li>
            </ul>
          </Section>

          <Section title={lang === 'pl' ? '5. Anulowanie i zwroty' : '5. Cancellation & Refunds'}>
            {lang === 'pl'
              ? 'Możesz anulować subskrypcję w dowolnym momencie z ustawień konta. Po anulowaniu zachowasz dostęp do końca bieżącego okresu rozliczeniowego. Opłata konfiguracyjna nie podlega zwrotowi. Opłaty za subskrypcję podlegają proporcjonalnemu zwrotowi w przypadku anulowania w ciągu pierwszych 7 dni okresu rozliczeniowego.'
              : 'You may cancel your subscription at any time from your account settings. Upon cancellation, you retain access until the end of your current billing period. Setup fees are non-refundable. Subscription fees are eligible for prorated refunds if cancelled within the first 7 days of a billing period.'}
          </Section>

          <Section title={lang === 'pl' ? '6. Dopuszczalne użytkowanie' : '6. Acceptable Use'}>
            <p style={{ marginBottom: 8 }}>{lang === 'pl' ? 'Zgadzasz się nie:' : 'You agree not to:'}</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{lang === 'pl' ? 'Korzystać z usługi w celach niezgodnych z prawem' : 'Use the Service for any unlawful purpose'}</li>
              <li>{lang === 'pl' ? 'Przesyłać złośliwego kodu lub próbować uzyskać nieautoryzowany dostęp' : 'Upload malicious code or attempt unauthorized access'}</li>
              <li>{lang === 'pl' ? 'Odsprzedawać lub redystrybuować usługi bez zgody' : 'Resell or redistribute the Service without permission'}</li>
              <li>{lang === 'pl' ? 'Naruszać prywatności swoich klientów lub osób trzecich' : 'Violate the privacy of your clients or third parties'}</li>
            </ul>
          </Section>

          <Section title={lang === 'pl' ? '7. Własność intelektualna' : '7. Intellectual Property'}>
            {lang === 'pl'
              ? 'FitCore i jego oryginalna zawartość, funkcje i funkcjonalność są własnością FitCore i są chronione prawami autorskimi. Zachowujesz pełne prawa własności do danych, które przesyłasz na platformę (dane klientów, programy, wiadomości itp.).'
              : 'FitCore and its original content, features, and functionality are owned by FitCore and are protected by copyright. You retain full ownership of the data you upload to the platform (client data, programs, messages, etc.).'}
          </Section>

          <Section title={lang === 'pl' ? '8. Ograniczenie odpowiedzialności' : '8. Limitation of Liability'}>
            {lang === 'pl'
              ? 'FitCore nie ponosi odpowiedzialności za jakiekolwiek szkody pośrednie, przypadkowe, specjalne, wynikowe lub karne wynikające z korzystania z usługi. Nasza łączna odpowiedzialność nie przekroczy kwoty, którą zapłaciłeś za usługę w ciągu ostatnich 12 miesięcy.'
              : 'FitCore shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. Our total liability shall not exceed the amount you have paid for the Service in the past 12 months.'}
          </Section>

          <Section title={lang === 'pl' ? '9. Zmiany warunków' : '9. Changes to Terms'}>
            {lang === 'pl'
              ? 'Zastrzegamy sobie prawo do zmiany niniejszych warunków w dowolnym momencie. O istotnych zmianach powiadomimy Cię drogą mailową lub przez powiadomienie na platformie. Dalsze korzystanie z usługi po zmianach oznacza akceptację nowych warunków.'
              : 'We reserve the right to modify these terms at any time. We will notify you of material changes via email or a notice on the platform. Your continued use of the Service after changes constitutes acceptance of the new terms.'}
          </Section>

          <Section title={lang === 'pl' ? '10. Kontakt' : '10. Contact'}>
            {lang === 'pl'
              ? 'W przypadku pytań dotyczących niniejszego Regulaminu, skontaktuj się z nami pod adresem: contact@fitcore.tech'
              : 'For any questions about these Terms, please contact us at: contact@fitcore.tech'}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: -0.3 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}
