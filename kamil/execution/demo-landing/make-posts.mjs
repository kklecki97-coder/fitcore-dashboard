import puppeteer from 'puppeteer';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const OUT = resolve('instagram-posts');
const SCREENSHOTS = resolve('screenshots');

// Map page names to screenshot files in ./screenshots/
const screenshotFiles = {
  overview:  '1-overview.png',
  clients:   '2-clients.png',
  programs:  '3-programs.png',
  messages:  '4-messages.png',
  analytics: '5-analytics.png',
};

// ═══════════════════════════════════════════════════════════
// 6 CAROUSEL POSTS (Polish) — Each has Slide A (text hook) + Slide B (dashboard)
// ═══════════════════════════════════════════════════════════

const carousels = [
  // ── POST 1: INTRO ──
  {
    id: 'post1',
    page: 'overview',
    hook: {
      topLabel: 'FITCORE',
      topLabelColor: '#00e5c8',
      headline: '6 aplikacji.\nCodziennie.\nŻeby ogarnąć to,\nco powinno\nbyć proste.',
      subtext: 'WhatsApp. Excel. Notatki. Bank.\nMaile. Kalendarz. Brzmi znajomo?',
      bottomText: 'Przesuń, żeby zobaczyć rozwiązanie →',
    },
    slide: {
      label: 'POZNAJ FITCORE',
      labelColor: '#00e5c8',
      title: 'Twój Biznes Coachingowy.\nJeden Dashboard.',
      subtitle: 'Zarządzaj klientami, twórz programy treningowe, śledź płatności i komunikuj się — z jednego miejsca.',
      badge: 'Stworzone dla Trenerów',
      bottomText: 'fitcorehq@gmail.com',
    },
    caption: `Używasz 6 aplikacji do prowadzenia biznesu coachingowego?\n\n📱 WhatsApp — wiadomości od klientów\n📊 Google Sheets — śledzenie postępów\n📝 Notatnik — programy treningowe\n🏦 Aplikacja bankowa — sprawdzanie płatności\n📧 Mail — check-iny\n📅 Kalendarz — harmonogram\n\nTo 6 aplikacji. Każdego. Dnia.\n\nCo gdybyś mógł zastąpić je wszystkie jednym dashboardem?\n\nTo jest FitCore. Stworzony specjalnie dla trenerów personalnych.\n\n🔗 Link w bio — przekonaj się sam.\n\n#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools`,
  },

  // ── POST 2: CLIENTS ──
  {
    id: 'post2',
    page: 'clients',
    hook: {
      topLabel: 'BĄDŹ SZCZERY',
      topLabelColor: '#f59e0b',
      headline: 'Gdzie są postępy\nTwojej klientki?\nNie wiesz.\nI to jest problem.',
      subtext: 'Google Sheet? WhatsApp? Notatki?\nNie powinno to wymagać szukania.',
      bottomText: 'Przesuń, żeby zobaczyć jak to zmienić →',
    },
    slide: {
      label: 'ZARZĄDZANIE KLIENTAMI',
      labelColor: '#00e5c8',
      title: 'Każdy Klient.\nJedno Miejsce. Pełna Kontrola.',
      subtitle: 'Kompletne profile klientów z śledzeniem postępów, historią metryk, celami i zarządzaniem statusem.',
      badge: null,
      bottomText: 'Każdy klient. Jeden dashboard. Zero arkuszy.',
    },
    caption: `Szybkie pytanie dla trenerów:\n\nGdzie są najnowsze postępy Twojej klientki Ani?\n\nA) Wiersz 47 w Google Sheet, który zapomniałeś zaktualizować\nB) Gdzieś w historii czatu na WhatsApp\nC) W aplikacji Notatki, której nie możesz znaleźć\nD) Wszystkie powyższe\n\nJeśli wybrałeś D... nie jesteś sam.\n\nFitCore zbiera wszystko — postępy, plany, cele i status każdego klienta — w jednym dashboardzie.\n\nKoniec z szukaniem. Koniec z zgadywaniem.\n\n🔗 Link w bio — 14 dni za darmo.\n\n#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools`,
  },

  // ── POST 3: PROGRAMS ──
  {
    id: 'post3',
    page: 'programs',
    hook: {
      topLabel: 'BRUTALNA PRAWDA',
      topLabelColor: '#ef4444',
      headline: 'Napisałeś idealny\nprogram. Klient:\n"Możesz wysłać\njeszcze raz?"',
      subtext: 'Za. Każdym. Razem.',
      bottomText: 'Przesuń, żeby zobaczyć lepszy sposób →',
    },
    slide: {
      label: 'PROGRAMY TRENINGOWE',
      labelColor: '#6366f1',
      title: 'Twórz Programy.\nPrzypisuj Natychmiast.',
      subtitle: '70+ ćwiczeń. Serie, powtórzenia, RPE, tempo, przerwy. Zbuduj raz, przypisz każdemu klientowi w sekundach.',
      badge: null,
      bottomText: 'Od szablonu do przypisania — w sekundach.',
    },
    caption: `Niedzielny wieczór, klasyk:\n\n⏰ 3 godziny projektowania idealnego programu\n📧 Wysyłasz mailem\n💬 Poniedziałek rano: "Trenerze, możesz wysłać jeszcze raz ten program?"\n\nZa. Każdym. Razem.\n\nW FitCore programy żyją w dashboardzie — zawsze dostępne, zawsze aktualne. Klient otwiera aplikację i program jest na miejscu.\n\nŻadnych PDF-ów. Żadnych maili. Żadnego "możesz wysłać jeszcze raz?"\n\nBuduj → przypisz → gotowe.\n\n🔗 Link w bio\n\n#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools`,
  },

  // ── POST 4: MESSAGES ──
  {
    id: 'post4',
    page: 'messages',
    hook: {
      topLabel: 'BRZMI ZNAJOMO?',
      topLabelColor: '#E1306C',
      headline: '"Pisał na WhatsApp\nczy Telegram?"\n— Ty, codziennie\no 23:00',
      subtext: 'Musisz odpisać jednemu klientowi.\nSzukasz w 4 aplikacjach. To nie powinno\nbyć takie trudne.',
      bottomText: 'Przesuń, żeby zobaczyć rozwiązanie →',
    },
    slide: {
      label: 'SKRZYNKA MULTI-KANAŁOWA',
      labelColor: '#29ABE2',
      title: 'Każdy Kanał.\nJedna Skrzynka. Zero Pominiętych.',
      subtitle: 'Telegram, WhatsApp, Email, Instagram — wszystkie rozmowy z klientami w jednym miejscu.',
      badge: null,
      bottomText: 'Jedna skrzynka. Każdy kanał. Każdy klient.',
    },
    caption: `23:00. Leżysz w łóżku. Telefon wibruje.\n\n"Marek pisał na WhatsApp czy Telegram?"\n"Ania wysłała zdjęcia check-in na Instagram..."\n"A mail od Dawida z rana — odpisałem?"\n\n4 aplikacje. 12 rozmów. Zero organizacji.\n\nTak większość trenerów obsługuje komunikację z klientami. I to kosztuje Was klientów.\n\nFitCore zbiera każdą wiadomość — WhatsApp, Telegram, Email, Instagram — w jednej skrzynce.\n\nJedno miejsce. Każdy klient. Nic nie umknie.\n\n🔗 Link w bio — 14 dni za darmo.\n\n#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools`,
  },

  // ── POST 5: ANALYTICS ──
  {
    id: 'post5',
    page: 'analytics',
    hook: {
      topLabel: 'PYTANIE, KTÓRE SIĘ LICZY',
      topLabelColor: '#22c55e',
      headline: 'Ile zarobiłeś\nw tym miesiącu?\nJeśli musisz\nsprawdzić —\nmasz problem.',
      subtext: 'Twój biznes powinien mieścić się\nna jednym ekranie.',
      bottomText: 'Przesuń, żeby zobaczyć dane →',
    },
    slide: {
      label: 'ANALITYKA I INSIGHTS',
      labelColor: '#f59e0b',
      title: 'Coaching Oparty\nna Danych. Realne Wyniki.',
      subtitle: 'Trendy przychodów, wskaźniki retencji, rozkład klientów i insights wspierane AI.',
      badge: null,
      bottomText: '14 dni za darmo · Bez karty · fitcore.tech',
    },
    caption: `Odpowiedz szczerze:\n\n"Jak radzi sobie Twój biznes coachingowy?"\n\nJeśli musiałeś sprawdzić 3 różne miejsca żeby odpowiedzieć... coś jest nie tak.\n\nFitCore daje Ci jeden dashboard z:\n\n💰 Dokładnie ile zarobiłeś w tym miesiącu\n📊 Którzy klienci są zaangażowani, a którzy odpadają\n📈 Czy rośniesz czy stajesz w miejscu\n🎯 Na czym się skupić dalej (insights AI)\n\nOtwierasz aplikację. Wiesz wszystko. W 5 sekund.\n\nTo nie jest feature. To przewaga biznesowa.\n\n🔗 14 dni za darmo. Bez karty. Link w bio.\n\n#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools`,
  },

  // ── POST 6: CTA / CLOSING ──
  {
    id: 'post6',
    page: 'overview',
    hook: {
      topLabel: 'CZAS TO ZMIENIĆ',
      topLabelColor: '#00e5c8',
      headline: 'Excel. WhatsApp.\nNotatki. Chaos.\nCzas to zmienić.',
      subtext: 'Jeden dashboard. Wszystko w jednym miejscu.\nKlienci. Treningi. Płatności. Wiadomości.',
      bottomText: 'Przesuń, żeby zobaczyć dashboard →',
    },
    slide: {
      label: 'ZACZNIJ ZA DARMO',
      labelColor: '#00e5c8',
      title: '14 Dni Za Darmo.\nBez Karty Kredytowej.',
      subtitle: 'Dołącz do trenerów, którzy poważnie traktują swój biznes. Jeden dashboard do zarządzania wszystkim.',
      badge: 'Zacznij Teraz',
      bottomText: 'DM lub Fitcorehq@gmail.com',
    },
    caption: `Twój biznes coachingowy zasługuje na lepsze narzędzia.\n\nNie kolejny arkusz kalkulacyjny.\nNie kolejną aplikację do notatek.\nNie kolejny chat na WhatsApp.\n\nJeden dashboard. Wszystko w jednym miejscu:\n\n✅ Zarządzanie klientami\n✅ Programy treningowe\n✅ Płatności i faktury\n✅ Wiadomości ze wszystkich kanałów\n✅ Analityka i insights AI\n✅ Check-iny klientów\n\nFitCore — stworzony przez trenerów, dla trenerów.\n\n🔗 14 dni za darmo. Bez karty kredytowej. Link w bio.\n\nNapisz DM lub wyślij mail: Fitcorehq@gmail.com\n\n#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools`,
  },
];

// ═══════════════════════════════════════════════════════════
// HTML TEMPLATES
// ═══════════════════════════════════════════════════════════

function hookSlideHtml(hook, logoBase64) {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px; overflow: hidden;
    font-family: 'Outfit', sans-serif;
    background: #07090e;
    position: relative;
  }
  /* Ambient orbs */
  .orb1 {
    position: absolute; top: -180px; right: -180px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(0,229,200,0.08) 0%, transparent 70%);
  }
  .orb2 {
    position: absolute; bottom: -150px; left: -150px;
    width: 420px; height: 420px;
    background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
  }
  .orb3 {
    position: absolute; top: 40%; left: 50%;
    width: 600px; height: 600px; transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(0,229,200,0.03) 0%, transparent 60%);
  }
  /* Subtle grid pattern */
  .grid-bg {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 60px 60px;
  }
  .content {
    position: relative; z-index: 1;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    justify-content: center;
    padding: 80px 72px;
  }
  .header {
    display: flex; align-items: center; gap: 14px;
    position: absolute; top: 48px; left: 72px;
  }
  .logo-img {
    width: 50px; height: 50px; border-radius: 50%;
    object-fit: cover;
  }
  .brand { font-weight: 700; font-size: 26px; color: #f0f2f5; letter-spacing: -0.3px; }
  .brand span { color: #00e5c8; }
  .top-label {
    font-size: 13px; font-weight: 700; letter-spacing: 3px;
    color: ${hook.topLabelColor};
    margin-bottom: 28px;
  }
  .headline {
    font-size: 62px; font-weight: 800; line-height: 1.08;
    color: #f0f2f5; letter-spacing: -2px;
    margin-bottom: 32px;
    white-space: pre-line;
  }
  .subtext {
    font-size: 20px; color: #8b92a5; line-height: 1.6;
    white-space: pre-line;
    max-width: 700px;
  }
  .bottom-bar {
    position: absolute; bottom: 48px; left: 72px; right: 72px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .bottom-text {
    font-size: 15px; color: #525a6e; font-weight: 500;
    letter-spacing: 0.5px;
  }
  .bottom-brand { font-size: 14px; color: #525a6e; font-weight: 600; }
  .bottom-brand span { color: #00e5c8; }
  /* Accent line */
  .accent-line {
    position: absolute; top: 48px; right: 72px;
    width: 60px; height: 4px; border-radius: 2px;
    background: linear-gradient(90deg, ${hook.topLabelColor}, transparent);
  }
</style>
</head>
<body>
  <div class="orb1"></div>
  <div class="orb2"></div>
  <div class="orb3"></div>
  <div class="grid-bg"></div>
  <div class="content">
    <div class="header">
      <img class="logo-img" src="data:image/png;base64,${logoBase64}" />
      <div class="brand">Fit<span>Core</span></div>
    </div>
    <div class="accent-line"></div>
    <div class="top-label">${hook.topLabel}</div>
    <div class="headline">${hook.headline}</div>
    <div class="subtext">${hook.subtext}</div>
  </div>
  <div class="bottom-bar">
    <div class="bottom-text">${hook.bottomText}</div>
    <div class="bottom-brand">Fit<span>Core</span></div>
  </div>
</body>
</html>`;
}

function dashSlideHtml(slide, screenshotBase64, logoBase64) {
  const titleHtml = slide.title.replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px; overflow: hidden;
    font-family: 'Outfit', sans-serif;
    background: #07090e;
    position: relative;
  }
  .orb1 {
    position: absolute; top: -120px; right: -120px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(0,229,200,0.07) 0%, transparent 70%);
  }
  .orb2 {
    position: absolute; bottom: -100px; left: -100px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%);
  }
  .content {
    position: relative; z-index: 1;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    padding: 48px 56px 40px;
  }
  .header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px;
  }
  .logo-img {
    width: 46px; height: 46px; border-radius: 50%;
    object-fit: cover;
  }
  .brand { font-weight: 700; font-size: 24px; color: #f0f2f5; letter-spacing: -0.3px; }
  .brand span { color: #00e5c8; }
  .label {
    font-size: 12px; font-weight: 600; letter-spacing: 2px;
    color: ${slide.labelColor}; margin-bottom: 10px;
  }
  .title {
    font-size: 38px; font-weight: 800; line-height: 1.12;
    color: #f0f2f5; letter-spacing: -1.2px; margin-bottom: 10px;
  }
  .subtitle {
    font-size: 15px; color: #8b92a5; line-height: 1.55;
    max-width: 540px; margin-bottom: 20px;
  }
  ${slide.badge ? `
  .badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(0,229,200,0.1); border: 1px solid rgba(0,229,200,0.2);
    border-radius: 100px; padding: 7px 18px; margin-bottom: 16px;
    font-size: 12px; font-weight: 600; color: #00e5c8; letter-spacing: 0.5px;
    width: fit-content;
  }
  ` : ''}
  .frame {
    flex: 1; min-height: 0;
    background: rgba(14,18,27,0.85);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    position: relative;
  }
  .browser-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: rgba(12,16,23,0.95);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .dots { display: flex; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #ef4444; }
  .dot-y { background: #f59e0b; }
  .dot-g { background: #22c55e; }
  .url-bar {
    flex: 1; background: rgba(22,28,42,0.7); border-radius: 6px;
    padding: 5px 12px; font-size: 11px; color: #525a6e;
    font-family: 'JetBrains Mono', monospace;
  }
  .screenshot-img {
    width: 100%;
    display: block;
  }
  .fade-bottom {
    position: absolute; bottom: 0; left: 0; right: 0; height: 70px;
    background: linear-gradient(transparent, rgba(7,9,14,0.95));
  }
  .bottom {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 16px; padding-top: 4px;
  }
  .bottom-text { font-size: 14px; color: #8b92a5; }
  .bottom-brand { font-size: 13px; color: #525a6e; font-weight: 600; }
  .bottom-brand span { color: #00e5c8; }
</style>
</head>
<body>
  <div class="orb1"></div>
  <div class="orb2"></div>
  <div class="content">
    <div class="header">
      <img class="logo-img" src="data:image/png;base64,${logoBase64}" />
      <div class="brand">Fit<span>Core</span></div>
    </div>
    <div class="label">${slide.label}</div>
    ${slide.badge ? `<div class="badge">⚡ ${slide.badge}</div>` : ''}
    <div class="title">${titleHtml}</div>
    <div class="subtitle">${slide.subtitle}</div>
    <div class="frame">
      <div class="browser-bar">
        <div class="dots">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
        </div>
        <div class="url-bar">app.fitcore.tech</div>
      </div>
      <img class="screenshot-img" src="data:image/png;base64,${screenshotBase64}" />
      <div class="fade-bottom"></div>
    </div>
    <div class="bottom">
      <div class="bottom-text">${slide.bottomText}</div>
      <div class="bottom-brand">Fit<span>Core</span></div>
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function run() {
  await mkdir(OUT, { recursive: true });

  // ─── STEP 1: Load screenshots from ./screenshots/ ───
  console.log('=== STEP 1: Loading screenshots from disk ===');
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1080, height: 1080 },
    args: ['--no-sandbox'],
  });

  const screenshots = {};
  for (const [name, file] of Object.entries(screenshotFiles)) {
    try {
      const buf = (await readFile(resolve(SCREENSHOTS, file))).toString('base64');
      screenshots[name] = buf;
      console.log(`  Loaded ${file} (${(buf.length / 1024).toFixed(0)}KB base64)`);
    } catch {
      console.log(`  SKIP: ${file} not found`);
    }
  }

  // ─── STEP 2: Load logo ───
  const logoBase64 = (await readFile(resolve('public', 'fitcore-logo.png'))).toString('base64');
  console.log(`Logo loaded (${(logoBase64.length / 1024).toFixed(0)}KB base64)`);

  // ─── STEP 3: Generate all 12 slides (6 carousels × 2 slides) ───
  console.log('\n=== STEP 3: Generating 12 slides (6 carousels) ===');

  for (const carousel of carousels) {
    const screenshotBase64 = screenshots[carousel.page];
    if (!screenshotBase64) {
      console.error(`  ERROR: No screenshot for page "${carousel.page}"`);
      continue;
    }

    // Slide A — Text hook
    console.log(`  Generating ${carousel.id}-slide1-hook...`);
    const hookHtml = hookSlideHtml(carousel.hook, logoBase64);
    const hookPage = await browser.newPage();
    await hookPage.setContent(hookHtml, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));
    await hookPage.screenshot({
      path: resolve(OUT, `${carousel.id}-slide1-hook.png`),
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    });
    await hookPage.close();

    // Slide B — Dashboard screenshot
    console.log(`  Generating ${carousel.id}-slide2-dashboard...`);
    const dashHtml = dashSlideHtml(carousel.slide, screenshotBase64, logoBase64);
    const dashPage = await browser.newPage();
    await dashPage.setContent(dashHtml, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));
    await dashPage.screenshot({
      path: resolve(OUT, `${carousel.id}-slide2-dashboard.png`),
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    });
    await dashPage.close();

    console.log(`  ✓ ${carousel.id} done (2 slides)`);
  }

  // ─── STEP 4: Save captions ───
  console.log('\n=== STEP 4: Saving captions ===');
  const captionsText = carousels.map((c, i) => {
    return `${'═'.repeat(60)}\nPOST ${i + 1}: ${c.id.toUpperCase()}\nSlide 1: Hook (text) | Slide 2: Dashboard\n${'═'.repeat(60)}\n\n${c.caption}\n`;
  }).join('\n');

  await writeFile(resolve(OUT, 'captions-pl.txt'), captionsText, 'utf-8');
  console.log('Saved: captions-pl.txt');

  await browser.close();
  console.log('\n✅ Done! 12 slides (6 carousels) + captions saved to ./instagram-posts/');
}

run().catch(e => { console.error(e); process.exit(1); });
