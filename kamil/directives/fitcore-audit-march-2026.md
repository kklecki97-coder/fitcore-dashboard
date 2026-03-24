# Kompleksowy Audyt FitCore — Marzec 2026

---

## 1. ZROZUMIENIE SYSTEMU

**Architektura:** Dwie osobne aplikacje React + Supabase backend:
- **Coach Dashboard** (app.fitcore.tech) — zarządzanie klientami, programy, wiadomości, płatności, analityka
- **Client Portal** (client.fitcore.tech) — klient trenuje, robi check-iny, płaci, pisze do coacha
- **Landing Page** (fitcore.tech) — marketing, pricing, CTA

**Flow coacha:**
1. Loguje się → Overview z AI Briefing + Smart Coach triggerami + Activity Feed
2. Widzi kto potrzebuje uwagi (overdue check-in, inactive, unanswered msg)
3. Może: dodać klienta, napisać program (ręcznie lub AI), wysłać wiadomość, sprawdzić check-in, wystawić fakturę
4. Analityka: revenue, retention, engagement per client

**Flow klienta:**
1. Dostaje invite code → rejestracja → 5-krokowy onboarding (waga, PRy, cele)
2. Widzi program treningowy → Workout Mode z timerem, logowanie setów
3. Cotygodniowy check-in (waga, mood, energia, stres, sen, zdjęcia)
4. Śledzi postępy (wykresy, zdjęcia before/after, PRy)
5. Chat z coachem, opłaca faktury

---

## 2. AUDYT PRODUKTU

### Czy rozwiązuje realny problem?
**TAK, w 100%.** Chaos trenera (WhatsApp + Excel + Google Forms + Instagram DM + Revolut) to prawdziwy ból. FitCore konsoliduje to w jedno miejsce.

### Czy flow jest prosty?
**W większości tak.** Onboarding dla coacha (0 klientów = walkthrough) jest dobrze przemyślany. Ale:

- **Problem:** Pierwszy coach musi dodać klienta → wygenerować invite code → klient musi się zarejestrować → dopiero wtedy coach widzi dane. To jest OK ale wymaga instrukcji "jak zacząć".
- **Problem:** Brak demo data przy starcie. Nowy coach widzi puste dashboardy. Powinien zobaczyć jednego fake klienta z danymi, żeby zrozumieć wartość.

### Czy funkcje są użyteczne?
**Tak, prawie wszystkie.** Nie ma "feature bloat" — każda funkcja rozwiązuje konkretny problem trenera:
- Programy (AI + manual) → oszczędza czas
- Check-iny z wellness metrics → wykrywa problemy
- Messaging → zero WhatsAppa
- Payments → zero Revoluta
- Analytics → widzi kto odchodzi, ile zarabia

### Ocena: **8/10**

---

## 3. SMART COACH — KLUCZOWA OCENA

### Co jest dobrze:
- 16 typów triggerów pokrywa wszystkie scenariusze coachingowe
- Priorytetyzacja (HIGH/MEDIUM/LOW) jest trafna
- Dismissal system z expiry (24h/72h) — nie spamuje
- Template-based drafts (zero kosztów API w Phase 1)

### Co jest źle:

**A) Komunikaty są za ogólne:**
- Aktualnie: "Sarah hasn't checked in for 8 days"
- Powinno być: "Sarah hasn't checked in for 8 days — her mood was declining (4→3→2). Tap to send a check-in message."

**B) CTA nie prowadzą do konkretnej akcji:**
- Aktualnie: `actionType: 'message' | 'view' | 'review'` — kliknięcie otwiera ogólną stronę klienta
- Powinno: Kliknięcie "Send Message" otwiera chat z tym klientem z wklejonym draftem

**C) Brak kontekstu w draftach:**
- Template drafty typu "Hey {name}, just checking in..." są zbyt generyczne
- Powinny zawierać konkretne dane klienta — ostatni trening, wynik check-inu, streak

### Propozycje ulepszeń:

| Obecny komunikat | Lepszy komunikat | CTA |
|---|---|---|
| "Sarah inactive 4 days" | "Sarah inactive 4 days — last workout: Push Day (Mon). Streak was 12." | → Open chat with draft: "Hey Sarah, noticed you missed a few sessions. Everything ok? Your 12-day streak was impressive, let's keep it going" |
| "Marcus overdue invoice" | "Marcus owes $199 (Elite plan, due Mar 15). Last payment was on time." | → Send payment reminder (pre-filled) |
| "Jake's program ends in 5 days" | "Jake finishes 'Strength Block 8wk' in 5 days. He's made 3 PRs this cycle." | → Open AI Program Creator pre-filled with Jake's data |

### Uproszczenie logiki:
Aktualnie Smart Coach Engine generuje triggery → Autopilot generuje drafty → Widget wyświetla. Trzy warstwy to za dużo dla MVP. Powinno być: **Engine → Card z draftem → Send.** Jeden klik.

---

## 4. UX / FLOW

### Gdzie user może się zgubić:

1. **Overview Page overload** — AI Briefing + Smart Coach Widget + Activity Feed + Stats + Quote. Zbyt dużo na raz. Nowy user nie wie gdzie patrzeć.
2. **Program Builder vs AI Creator vs Program Import** — 3 sposoby tworzenia programu. Nie jest jasne kiedy użyć którego. Powinien być jeden entry point "Create Program" z opcją AI/Manual/Import.
3. **Check-ins page** — widok pending/flagged/reviewed jest jasny dla power usera, ale nowy coach nie rozumie workflow. Potrzeba tooltip/onboarding.
4. **Client Detail Page** — tabbed interface (Metrics, Calendar, Check-ins, Activity) jest gęsty. Na mobile to dużo scrollowania.
5. **Payments** — brak Stripe onboardingu w UI. Coach musi manualnie skonfigurować Stripe Connect.

### Zbędne kroki:
- **Invite flow** jest za długi: Create client → Generate code → Copy code → Send to client → Client registers → Client onboards. Powinno być: Enter email → Auto-send invite → Done.
- **Message templates** — coach musi kliknąć template → edytować → wysłać. Za dużo kroków.

### Onboarding:
- Coach: **Dobry** — walkthrough z 0 klientami jest OK
- Client: **Bardzo dobry** — 5-step wizard jest czysty i prosty

---

## 5. TECH / STABILNOŚĆ

### Potencjalne bugi:

1. **App.tsx w Client Portal to 1500+ linii** — monolityczny plik. Jeden błąd = cały portal pada. Nie blocker ale zwiększa ryzyko regresji.
2. **Signed URLs 24h expiry** — zdjęcia z check-inów wygasają po 24h. Coach otwiera stary check-in = broken images. Trzeba re-fetch URLs przy otwarciu.
3. **Brak error boundary per-page** — w Client Portal crash na jednej stronie = biały ekran.
4. **Testy są puste** — pliki testowe istnieją ale bez realnych testów. Zero coverage.
5. **MFA flow** — kod istnieje ale nie jest w pełni podłączony. AAL level check może zablokować login.
6. **Stripe integration scaffolded** — Edge Function wywołana w Settings ale flow nie jest kompletny.

### Czy to blocker?
- Stripe: **TAK** — bez płatności to demo, nie produkt
- Puste testy: **NIE** dla MVP, ale ryzykowne przy zmianach
- Signed URLs: **TAK** — broken images to bad UX
- MFA: **NIE** — wyłącz do czasu pełnej implementacji

### Stabilność jako MVP: **7/10** — działa, ale kruche w edge case'ach

---

## 6. PORÓWNANIE DO KONKURENCJI

| Feature | FitCore | Trainerize | TrueCoach | My PT Hub | Trainero | Rezult |
|---|---|---|---|---|---|---|
| **Cena** | $49/mo flat | $350/mo+ | $179/mo+ | $225/mo+ | ~$20/mo | €19-49/mo |
| **Per-client limit** | Brak | Tak | Tak | Tak | Tak | Tak |
| **AI Program Gen** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Smart Coach AI** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Messaging** | ✅ Built-in | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Payments** | Scaffolded | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Mobile App** | PWA (basic) | ✅ Native | ✅ Native | ✅ Native | ✅ | ✅ |
| **Desktop UX** | ✅ Excellent | ❌ Mobile-first | OK | Dated | OK | OK |
| **White Label** | Planned | ✅ | ❌ | ✅ | ❌ | ❌ |
| **i18n (PL)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Design** | Modern/Premium | Functional | Clean | Dated | Basic | Basic |
| **Maturity** | Early MVP | 10+ years | 8+ years | 10+ years | 5+ years | 3+ years |

### Gdzie FitCore wygrywa:
1. **Cena** — $49 flat vs $179-350/mo u konkurencji
2. **AI** — jedyna platforma z AI program generation + Smart Coach
3. **Design** — dark luxe theme wygląda premium
4. **Polski rynek** — zero konkurencji z pełnym PL support
5. **Desktop-first** — coachowie pracują na laptopie

### Gdzie FitCore przegrywa:
1. **Brak natywnej aplikacji mobilnej** — PWA to nie to samo
2. **Brak działających płatności** — Stripe scaffolded
3. **Brak social proof** — zero reviews, zero case studies
4. **Brak integracji** — MyFitnessPal, Apple Health, Garmin — nic
5. **Jednosobowy dev team** — bus factor = 1

---

## 7. GOTOWOŚĆ DO LAUNCHU

### Czy można zacząć zdobywać klientów?
**TAK, ale z zastrzeżeniami.** Produkt działa, wygląda profesjonalnie, ma realną wartość.

### Czy ktoś zapłaciłby dziś?
**TAK** — pod warunkiem że:
1. Coach dostanie 1-on-1 onboarding (video call)
2. Payments działają (Stripe lub manual invoicing)
3. Coach rozumie że to early access

### Co MUSI być przed pierwszym klientem:
1. **Stripe Connect musi działać** — lub manual invoice tracking
2. **Signed URL refresh** — zdjęcia nie mogą wygasać
3. **Invite flow uproszczony** — email auto-send zamiast manual code
4. **Wyłączyć MFA UI** — dopóki nie jest w pełni wired
5. **Demo data dla nowego coacha** — jeden przykładowy klient

---

## 8. PRIORYTETY

### A) MUST FIX — blokuje sprzedaż

| # | Problem | Wysiłek |
|---|---|---|
| 1 | Stripe payments lub manual invoice tracking | 2-3 dni |
| 2 | Invite flow — auto-send email zamiast manual code | 1 dzień |
| 3 | Signed URL refresh dla zdjęć check-in | 0.5 dnia |
| 4 | Demo/sample client przy onboardingu coacha | 1 dzień |
| 5 | Ukryć MFA w Settings dopóki nie działa | 0.5 dnia |

### B) SHOULD FIX — poprawić w trakcie

| # | Problem | Wysiłek |
|---|---|---|
| 1 | Smart Coach — konkretniejsze komunikaty + inline CTA | 1-2 dni |
| 2 | Overview page — uprościć layout | 1 dzień |
| 3 | Program creation — jeden entry point zamiast trzech | 0.5 dnia |
| 4 | Client Portal ErrorBoundary per-page | 0.5 dnia |
| 5 | Podstawowe testy dla critical paths | 2 dni |

### C) NICE TO HAVE — na później

| # | Feature |
|---|---|
| 1 | Natywna mobilna aplikacja (React Native) |
| 2 | Integracje (MyFitnessPal, Apple Health) |
| 3 | White labeling |
| 4 | Video calls w portalu |
| 5 | Zaawansowana analityka ML (churn prediction) |
| 6 | Multi-channel messaging (email + SMS) |

---

## 9. FINALNA OCENA

### Czy projekt jest gotowy na pierwszych klientów?
**TAK — warunkowo.** Po naprawieniu 5 MUST FIX itemów (ok. tydzień pracy).

### Największe ryzyko:
**Brak działających płatności.** Platforma do zarządzania coachingowym biznesem, która nie obsługuje płatności, to jak samochód bez silnika.

### Największy potencjał:
**AI + Cena + Polski rynek.** Jedyna platforma z AI-assisted coaching na rynku PL, w cenie 5x niższej niż konkurencja EN. Smart Coach Engine to killer feature.

---

## 10. DECYZJA DLA FOUNDERA

### **B) PRZEJŚĆ DO MARKETINGU I SPRZEDAŻY**

Uzasadnienie:
1. **Produkt jest gotowy na 85%.** Brakujące 15% to tydzień pracy.
2. **Feedback od realnych userów > kolejne features.** Nie wiecie czy coachowie używają Smart Coach, czy Check-iny są za skomplikowane, czy Analytics ktoś otwiera.
3. **Największe ryzyko to nie produkt, to brak klientów.** Każdy dzień bez sprzedaży to dzień stracony.
4. **Plan:** Tydzień na MUST FIX → Jakub startuje outreach → Kamil naprawia to co klienci zgłaszają.

**Podsumowanie: Produkt jest solidny. Czas go sprzedać.**
