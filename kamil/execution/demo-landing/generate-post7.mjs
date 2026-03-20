import puppeteer from 'puppeteer';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const OUT = resolve('instagram-posts');

async function run() {
  await mkdir(OUT, { recursive: true });

  const logoBase64 = (await readFile(resolve('public', 'fitcore-logo.png'))).toString('base64');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1080, height: 1080 },
    args: ['--no-sandbox'],
  });

  // ═══════════════════════════════════════════════════
  // SLIDE 1: Hook text
  // ═══════════════════════════════════════════════════
  const hookHtml = `<!DOCTYPE html>
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
  .logo-img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
  .brand { font-weight: 700; font-size: 26px; color: #f0f2f5; letter-spacing: -0.3px; }
  .brand span { color: #00e5c8; }
  .top-label {
    font-size: 13px; font-weight: 700; letter-spacing: 3px;
    color: #a855f7;
    margin-bottom: 28px;
  }
  .headline {
    font-size: 60px; font-weight: 800; line-height: 1.08;
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
  .bottom-text { font-size: 15px; color: #525a6e; font-weight: 500; letter-spacing: 0.5px; }
  .bottom-brand { font-size: 14px; color: #525a6e; font-weight: 600; }
  .bottom-brand span { color: #00e5c8; }
  .accent-line {
    position: absolute; top: 48px; right: 72px;
    width: 60px; height: 4px; border-radius: 2px;
    background: linear-gradient(90deg, #a855f7, transparent);
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
    <div class="top-label">TWORZYSZ PROGRAMY OD ZERA?</div>
    <div class="headline">3 godziny na program.\nKlient: "Fajne,\nale możesz zmienić\nćwiczenia na nogi?"</div>
    <div class="subtext">Projektowanie. Formatowanie. Wysyłanie.\nA potem poprawki. I jeszcze raz poprawki.\nCo gdyby AI zrobiło to w 30 sekund?</div>
  </div>
  <div class="bottom-bar">
    <div class="bottom-text">Przesuń, żeby zobaczyć jak →</div>
    <div class="bottom-brand">Fit<span>Core</span></div>
  </div>
</body>
</html>`;

  // ═══════════════════════════════════════════════════
  // SLIDE 2: Infographic — 3 ways to create programs
  // ═══════════════════════════════════════════════════
  const infoHtml = `<!DOCTYPE html>
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
    margin-bottom: 20px;
  }
  .logo-img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; }
  .brand { font-weight: 700; font-size: 24px; color: #f0f2f5; letter-spacing: -0.3px; }
  .brand span { color: #00e5c8; }
  .label {
    font-size: 12px; font-weight: 600; letter-spacing: 2px;
    color: #a855f7; margin-bottom: 10px;
  }
  .title {
    font-size: 36px; font-weight: 800; line-height: 1.12;
    color: #f0f2f5; letter-spacing: -1.2px; margin-bottom: 8px;
  }
  .subtitle {
    font-size: 15px; color: #8b92a5; line-height: 1.55;
    max-width: 540px; margin-bottom: 12px;
  }

  /* Cards */
  .cards {
    display: flex; flex-direction: column; gap: 20px;
    flex: 1;
  }
  .card { flex: 1; }
  .card {
    display: flex; align-items: center; gap: 28px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 36px 36px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 4px; border-radius: 4px 0 0 4px;
  }
  .card-1::before { background: #00e5c8; }
  .card-2::before { background: #a855f7; }
  .card-3::before { background: #f59e0b; }

  .card-icon {
    width: 72px; height: 72px; border-radius: 18px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 34px;
  }
  .card-1 .card-icon { background: rgba(0,229,200,0.1); border: 1px solid rgba(0,229,200,0.2); }
  .card-2 .card-icon { background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2); }
  .card-3 .card-icon { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); }

  .card-text { flex: 1; }
  .card-title {
    font-size: 24px; font-weight: 700; color: #f0f2f5;
    margin-bottom: 8px; letter-spacing: -0.3px;
  }
  .card-desc {
    font-size: 16px; color: #8b92a5; line-height: 1.5;
  }
  .card-badge {
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    padding: 5px 14px; border-radius: 100px;
    position: absolute; top: 24px; right: 28px;
  }
  .card-1 .card-badge { background: rgba(0,229,200,0.1); color: #00e5c8; }
  .card-2 .card-badge { background: rgba(168,85,247,0.1); color: #a855f7; }
  .card-3 .card-badge { background: rgba(245,158,11,0.1); color: #f59e0b; }

  /* Time indicators */
  .card-time {
    display: flex; align-items: center; gap: 6px;
    margin-top: 8px;
  }
  .card-time-dot {
    width: 6px; height: 6px; border-radius: 50%;
  }
  .card-1 .card-time-dot { background: #00e5c8; }
  .card-2 .card-time-dot { background: #a855f7; }
  .card-3 .card-time-dot { background: #f59e0b; }
  .card-time-text {
    font-size: 13px; font-weight: 600; letter-spacing: 0.3px;
  }
  .card-1 .card-time-text { color: #00e5c8; }
  .card-2 .card-time-text { color: #a855f7; }
  .card-3 .card-time-text { color: #f59e0b; }

  .bottom {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 20px; padding-top: 4px;
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
    <div class="label">3 SPOSOBY NA PROGRAM</div>
    <div class="title">Buduj. Generuj. Importuj.</div>
    <div class="subtitle">Twórz programy treningowe dokładnie tak, jak chcesz. Ręcznie, z pomocą AI, albo z gotowego pliku.</div>

    <div class="cards">
      <!-- Card 1: Manual Builder -->
      <div class="card card-1">
        <div class="card-icon">🏗️</div>
        <div class="card-text">
          <div class="card-title">Buduj Ręcznie</div>
          <div class="card-desc">70+ ćwiczeń. Serie, powtórzenia, RPE, tempo, przerwy. Pełna kontrola nad każdym detalem programu.</div>
          <div class="card-time">
            <div class="card-time-dot"></div>
            <div class="card-time-text">~15 min na program</div>
          </div>
        </div>
        <div class="card-badge">KONTROLA</div>
      </div>

      <!-- Card 2: AI Generator -->
      <div class="card card-2">
        <div class="card-icon">🤖</div>
        <div class="card-text">
          <div class="card-title">AI Generuje za Ciebie</div>
          <div class="card-desc">Powiedz: "Push/Pull/Legs na 8 tygodni dla zaawansowanego". AI stworzy kompletny program z periodyzacją.</div>
          <div class="card-time">
            <div class="card-time-dot"></div>
            <div class="card-time-text">~30 sekund</div>
          </div>
        </div>
        <div class="card-badge">SZYBKOŚĆ</div>
      </div>

      <!-- Card 3: Excel Import -->
      <div class="card card-3">
        <div class="card-icon">📊</div>
        <div class="card-text">
          <div class="card-title">Importuj z Excel / CSV</div>
          <div class="card-desc">Masz gotowe programy w Excelu? Wrzuć plik — FitCore automatycznie rozpozna ćwiczenia, serie i powtórzenia.</div>
          <div class="card-time">
            <div class="card-time-dot"></div>
            <div class="card-time-text">~10 sekund</div>
          </div>
        </div>
        <div class="card-badge">MIGRACJA</div>
      </div>
    </div>

    <div class="bottom">
      <div class="bottom-text">Buduj → przypisz klientowi → gotowe. | fitcore.tech</div>
      <div class="bottom-brand">Fit<span>Core</span></div>
    </div>
  </div>
</body>
</html>`;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  console.log('Generating post7-slide1-hook...');
  const page1 = await browser.newPage();
  await page1.setContent(hookHtml, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page1.screenshot({
    path: resolve(OUT, 'post7-slide1-hook.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });
  await page1.close();

  console.log('Generating post7-slide2-infographic...');
  const page2 = await browser.newPage();
  await page2.setContent(infoHtml, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page2.screenshot({
    path: resolve(OUT, 'post7-slide2-infographic.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1080 },
  });
  await page2.close();

  // Caption
  const caption = `Tworzysz programy treningowe od zera? Za każdym razem?

⏰ 3 godziny projektowania
📧 Wysyłasz mailem
💬 "Trenerze, możesz zmienić ćwiczenia na nogi?"
⏰ Kolejna godzina poprawek...

Stop. Jest lepszy sposób.

FitCore daje Ci 3 sposoby tworzenia programów:

🏗️ Buduj ręcznie — 70+ ćwiczeń, pełna kontrola nad każdym detalem
🤖 AI generuje — opisz program słowami, AI stworzy go w 30 sekund
📊 Importuj z Excel — masz gotowe programy? Wrzuć plik i gotowe

Buduj → przypisz klientowi → program od razu w jego aplikacji.

Żadnych PDF-ów. Żadnych maili. Żadnego "wyślij jeszcze raz".

🔗 Link w bio — 14 dni za darmo.

#trenerpersonalny #treneronline #onlinecoaching #treningpersonalny #biznesfitness #fitness #fitcore #coachingtools #AI #programtreningowy`;

  await writeFile(resolve(OUT, 'post7-caption.txt'), caption, 'utf-8');
  console.log('Saved: post7-caption.txt');

  await browser.close();
  console.log('\n✅ Done! Post 7: 2 slides + caption saved.');
}

run().catch(e => { console.error(e); process.exit(1); });
