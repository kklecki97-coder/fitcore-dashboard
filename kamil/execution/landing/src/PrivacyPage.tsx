import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLang } from './i18n';

export default function PrivacyPage() {
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
          {lang === 'pl' ? 'Polityka Prywatności' : 'Privacy Policy'}
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 40 }}>
          {lang === 'pl' ? 'Ostatnia aktualizacja: 18 marca 2026' : 'Last updated: March 18, 2026'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Section title={lang === 'pl' ? '1. Wprowadzenie' : '1. Introduction'}>
            {lang === 'pl'
              ? 'FitCore ("my", "nas", "nasz") szanuje Twoją prywatność. Niniejsza Polityka Prywatności wyjaśnia, jak zbieramy, wykorzystujemy i chronimy Twoje dane osobowe, gdy korzystasz z naszej platformy na fitcore.tech i powiązanych usług.'
              : 'FitCore ("we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform at fitcore.tech and related services.'}
          </Section>

          <Section title={lang === 'pl' ? '2. Jakie dane zbieramy' : '2. Information We Collect'}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong>{lang === 'pl' ? 'Dane konta:' : 'Account information:'}</strong> {lang === 'pl' ? 'Imię, adres email, hasło (zaszyfrowane) podane podczas rejestracji.' : 'Name, email address, and password (encrypted) provided during registration.'}</li>
              <li><strong>{lang === 'pl' ? 'Dane klientów:' : 'Client data:'}</strong> {lang === 'pl' ? 'Informacje o klientach dodane przez trenerów (imiona, dane kontaktowe, postępy, programy treningowe).' : 'Information about clients added by coaches (names, contact details, progress data, workout programs).'}</li>
              <li><strong>{lang === 'pl' ? 'Dane płatności:' : 'Payment information:'}</strong> {lang === 'pl' ? 'Przetwarzane przez Stripe. Nie przechowujemy danych kart kredytowych na naszych serwerach.' : 'Processed through Stripe. We do not store credit card details on our servers.'}</li>
              <li><strong>{lang === 'pl' ? 'Dane komunikacyjne:' : 'Communication data:'}</strong> {lang === 'pl' ? 'Wiadomości wymieniane między trenerami a klientami w naszej platformie.' : 'Messages exchanged between coaches and clients within our platform.'}</li>
              <li><strong>{lang === 'pl' ? 'Dane techniczne:' : 'Usage data:'}</strong> {lang === 'pl' ? 'Adres IP, typ przeglądarki, dane analityczne w celu poprawy usługi.' : 'IP address, browser type, and analytics data to improve our service.'}</li>
            </ul>
          </Section>

          <Section title={lang === 'pl' ? '3. Jak wykorzystujemy dane' : '3. How We Use Your Information'}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{lang === 'pl' ? 'Dostarczanie i utrzymanie naszej platformy' : 'To provide and maintain our platform'}</li>
              <li>{lang === 'pl' ? 'Przetwarzanie płatności przez Stripe Connect' : 'To process payments through Stripe Connect'}</li>
              <li>{lang === 'pl' ? 'Umożliwienie komunikacji coach-klient' : 'To enable coach-client communication'}</li>
              <li>{lang === 'pl' ? 'Wysyłanie powiadomień związanych z usługą' : 'To send service-related notifications'}</li>
              <li>{lang === 'pl' ? 'Poprawa i optymalizacja naszych usług' : 'To improve and optimize our services'}</li>
            </ul>
          </Section>

          <Section title={lang === 'pl' ? '4. Bezpieczeństwo danych' : '4. Data Security'}>
            {lang === 'pl'
              ? 'Stosujemy standardowe środki bezpieczeństwa w celu ochrony Twoich danych. Obejmują one szyfrowanie TLS/SSL dla wszystkich połączeń, szyfrowane przechowywanie danych, bezpieczne przetwarzanie płatności przez Stripe (zgodne z PCI-DSS Level 1) oraz kontrolę dostępu opartą na rolach.'
              : 'We implement industry-standard security measures to protect your data. This includes TLS/SSL encryption for all connections, encrypted data storage, secure payment processing through Stripe (PCI-DSS Level 1 compliant), and role-based access controls.'}
          </Section>

          <Section title={lang === 'pl' ? '5. Udostępnianie danych' : '5. Data Sharing'}>
            {lang === 'pl'
              ? 'Nie sprzedajemy Twoich danych. Udostępniamy dane wyłącznie: Stripe (przetwarzanie płatności), dostawcom usług hostingowych (Supabase, Vercel) oraz gdy wymaga tego prawo.'
              : 'We do not sell your data. We only share data with: Stripe (payment processing), hosting providers (Supabase, Vercel), and when required by law.'}
          </Section>

          <Section title={lang === 'pl' ? '6. Twoje prawa' : '6. Your Rights'}>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>{lang === 'pl' ? 'Dostęp do swoich danych osobowych' : 'Access your personal data'}</li>
              <li>{lang === 'pl' ? 'Żądanie poprawienia lub usunięcia danych' : 'Request correction or deletion of your data'}</li>
              <li>{lang === 'pl' ? 'Eksport danych w dowolnym momencie' : 'Export your data at any time'}</li>
              <li>{lang === 'pl' ? 'Rezygnacja z komunikacji marketingowej' : 'Opt out of marketing communications'}</li>
              <li>{lang === 'pl' ? 'Usunięcie konta i wszystkich powiązanych danych' : 'Delete your account and all associated data'}</li>
            </ul>
          </Section>

          <Section title={lang === 'pl' ? '7. Pliki cookie' : '7. Cookies'}>
            {lang === 'pl'
              ? 'Używamy niezbędnych plików cookie do uwierzytelniania i preferencji sesji. Nie używamy śledzących plików cookie stron trzecich do celów reklamowych.'
              : 'We use essential cookies for authentication and session preferences. We do not use third-party tracking cookies for advertising purposes.'}
          </Section>

          <Section title={lang === 'pl' ? '8. Kontakt' : '8. Contact'}>
            {lang === 'pl'
              ? 'W przypadku pytań dotyczących niniejszej Polityki Prywatności, skontaktuj się z nami pod adresem: contact@fitcore.tech'
              : 'For any questions about this Privacy Policy, please contact us at: contact@fitcore.tech'}
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
