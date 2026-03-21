/**
 * Exercise info lookup — maps exercise names to their instructions, tips, and muscles.
 * Supports EN + PL with automatic language selection.
 */

export interface ExerciseInfo {
  instructions: string[];
  tips: string[];
  primaryMuscle: string;
  secondaryMuscles: string[];
  description: string;
}

interface BilingualExerciseInfo {
  en: ExerciseInfo;
  pl: ExerciseInfo;
}

const raw: Record<string, BilingualExerciseInfo> = {
  // ═══ LEGS ═══
  'barbell back squat': {
    en: { instructions: ['Position the bar on your upper traps, grip slightly wider than shoulder width', 'Unrack and step back with feet shoulder-width apart, toes slightly out', 'Brace your core, take a deep breath', 'Break at hips and knees simultaneously, descend until thighs are at least parallel', 'Drive up through your whole foot, keeping chest up'], tips: ['Keep your chest up throughout the movement', 'Push knees out over your toes', 'Maintain a neutral spine'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings', 'core'], description: 'The king of lower body exercises. A compound movement targeting the entire lower body.' },
    pl: { instructions: ['Umieść sztangę na górnej części trapezów, chwyć nieco szerzej niż barki', 'Zdejmij sztangę i cofnij się, stopy na szerokość barków, palce lekko na zewnątrz', 'Napnij brzuch, weź głęboki oddech', 'Zginaj biodra i kolana jednocześnie, schodź aż uda będą co najmniej równolegle do podłogi', 'Wstawaj napierając całą stopą, utrzymuj klatkę w górze'], tips: ['Utrzymuj klatkę piersiową w górze przez cały ruch', 'Wypychaj kolana na zewnątrz', 'Zachowaj neutralną pozycję kręgosłupa'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'dwugłowe ud', 'brzuch'], description: 'Król ćwiczeń na nogi. Ćwiczenie wielostawowe angażujące całe nogi.' },
  },
  'front squat': {
    en: { instructions: ['Set up the bar in front rack position on your front delts', 'Keep elbows high, upper arms parallel to the floor', 'Squat down keeping torso as upright as possible', 'Drive up through your heels, maintaining elbow position'], tips: ['Work on wrist and thoracic mobility', 'Stay more upright than back squat'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'core', 'upper back'], description: 'A squat variation with the barbell in front rack, emphasizing quads and core.' },
    pl: { instructions: ['Umieść sztangę w pozycji front rack na przednich naramiennych', 'Trzymaj łokcie wysoko, ramiona równolegle do podłogi', 'Przysiądź utrzymując tułów jak najbardziej pionowo', 'Wstawaj napierając piętami, utrzymując pozycję łokci'], tips: ['Pracuj nad mobilnością nadgarstków i kręgosłupa piersiowego', 'Trzymaj tułów bardziej pionowo niż przy back squat'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'brzuch', 'górne plecy'], description: 'Wariant przysiadu ze sztangą z przodu, akcentujący czworogłowe i brzuch.' },
  },
  'goblet squat': {
    en: { instructions: ['Hold a dumbbell or kettlebell at chest height with both hands', 'Stand with feet shoulder-width apart', 'Squat down between your legs, keeping the weight close', 'Push knees out and keep torso upright', 'Stand back up to starting position'], tips: ['Great exercise for warming up before heavy squats', 'Use your elbows to push knees out at the bottom'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'core'], description: 'A beginner-friendly squat using a dumbbell held at chest level.' },
    pl: { instructions: ['Trzymaj hantel lub kettlebell obiema rękami na wysokości klatki', 'Stań w rozkroku na szerokość barków', 'Przysiądź między nogami, trzymając ciężar blisko ciała', 'Wypychaj kolana na zewnątrz, trzymaj tułów prosto', 'Wróć do pozycji startowej'], tips: ['Świetne ćwiczenie na rozgrzewkę przed ciężkimi przysiadami', 'Użyj łokci do wypychania kolan na dole'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'brzuch'], description: 'Przysiad przyjazny dla początkujących z hantlem przy klatce.' },
  },
  'bulgarian split squat': {
    en: { instructions: ['Stand about 2 feet in front of a bench', 'Place the top of your rear foot on the bench', 'Lower your hips until your front thigh is parallel to the floor', 'Drive through your front foot to return to start'], tips: ['Keep most of your weight on the front foot', 'Lean slightly forward to target glutes more'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], description: 'A unilateral squat with rear foot elevated on a bench.' },
    pl: { instructions: ['Stań ok. 60 cm przed ławką', 'Połóż wierzch tylnej stopy na ławce', 'Opuść biodra aż przednie udo będzie równolegle do podłogi', 'Naciśnij przednią stopą, aby wrócić do góry'], tips: ['Większość ciężaru utrzymuj na przedniej nodze', 'Lekko pochyl się do przodu, aby bardziej zaangażować pośladki'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'dwugłowe ud'], description: 'Jednostronny przysiad z tylną nogą na ławce.' },
  },
  'leg press': {
    en: { instructions: ['Sit in the leg press machine with your back flat against the pad', 'Place feet shoulder-width apart on the platform', 'Release the safety handles and lower the platform', 'Push through your heels to extend your legs without locking out'], tips: ['Higher placement = more glutes/hamstrings', 'Lower placement = more quadriceps'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], description: 'Machine compound exercise targeting lower body without spinal loading.' },
    pl: { instructions: ['Usiądź w maszynie z plecami płasko przylegającymi do oparcia', 'Postaw stopy na szerokość barków na platformie', 'Zwolnij blokady i opuść platformę', 'Naciśnij piętami, prostując nogi bez blokowania kolan'], tips: ['Wyższe ustawienie stóp = więcej pośladków/dwugłowych', 'Niższe ustawienie = więcej czworogłowych'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'dwugłowe ud'], description: 'Ćwiczenie maszynowe na nogi bez obciążania kręgosłupa.' },
  },
  'romanian deadlift': {
    en: { instructions: ['Hold the barbell with an overhand grip at hip level', 'Push your hips back while keeping the bar close to your legs', 'Lower until you feel a deep stretch in your hamstrings', 'Drive hips forward to return to standing'], tips: ['Keep the bar close to your body throughout', 'Think about pushing your hips back, not bending forward'], primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'spinal erectors'], description: 'A hip hinge targeting hamstrings through controlled eccentric lowering.' },
    pl: { instructions: ['Trzymaj sztangę nachwytem na wysokości bioder', 'Cofaj biodra, trzymając sztangę blisko nóg', 'Opuszczaj aż poczujesz silne rozciągnięcie dwugłowych', 'Wypchnij biodra do przodu, aby wrócić do stania'], tips: ['Trzymaj sztangę blisko ciała przez cały ruch', 'Myśl o cofaniu bioder, nie o pochylaniu się'], primaryMuscle: 'dwugłowe ud', secondaryMuscles: ['pośladki', 'prostowniki grzbietu'], description: 'Ćwiczenie zawiasowe na dwugłowe ud z kontrolowaną fazą ekscentryczną.' },
  },
  'conventional deadlift': {
    en: { instructions: ['Stand with feet hip-width apart, bar over mid-foot', 'Grip the bar just outside your knees', 'Drop hips, brace core, flatten back', 'Drive through the floor, keeping bar close', 'Lock out hips and knees simultaneously at the top'], tips: ['Set up with the bar over mid-foot', 'Take the slack out of the bar before pulling'], primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'spinal erectors', 'quadriceps', 'traps'], description: 'The ultimate full-body strength exercise.' },
    pl: { instructions: ['Stań ze stopami na szerokość bioder, sztanga nad środkiem stopy', 'Chwyć sztangę tuż na zewnątrz kolan', 'Obniż biodra, napnij brzuch, wyprostuj plecy', 'Napieraj na podłogę, trzymając sztangę blisko ciała', 'Zablokuj biodra i kolana jednocześnie na górze'], tips: ['Ustaw sztangę nad środkiem stopy', 'Wyjmij luz ze sztangi przed ciągnięciem'], primaryMuscle: 'dwugłowe ud', secondaryMuscles: ['pośladki', 'prostowniki grzbietu', 'czworogłowe', 'trapezy'], description: 'Najlepsze ćwiczenie siłowe na całe ciało.' },
  },
  'sumo deadlift': {
    en: { instructions: ['Stand with a wide stance, toes pointed out 30-45 degrees', 'Grip the bar inside your knees', 'Drop hips, chest up, push knees out', 'Drive through the floor, extending hips and knees'], tips: ['Push your knees out hard over your toes', 'Think about spreading the floor with your feet'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'adductors', 'hamstrings'], description: 'A deadlift with wide stance, emphasizing quads and adductors.' },
    pl: { instructions: ['Stań w szerokim rozkroku, palce skierowane na zewnątrz 30-45 stopni', 'Chwyć sztangę wewnątrz kolan', 'Obniż biodra, klatka do góry, kolana na zewnątrz', 'Napieraj na podłogę, prostując biodra i kolana'], tips: ['Mocno wypychaj kolana nad palce stóp', 'Myśl o rozszerzaniu podłogi stopami'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'przywodziciele', 'dwugłowe ud'], description: 'Martwy ciąg w szerokim rozkroku, akcentujący czworogłowe i przywodziciele.' },
  },
  'hip thrust': {
    en: { instructions: ['Sit on the floor with upper back against a bench', 'Roll a barbell over your hips, use a pad for comfort', 'Plant feet flat, hip-width apart', 'Drive through your heels to thrust hips up until fully extended', 'Squeeze glutes hard at the top'], tips: ['Tuck your chin to look at the bar at the top', 'Feet should be positioned so shins are vertical at the top'], primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings', 'core'], description: 'The best exercise for glute isolation and development.' },
    pl: { instructions: ['Usiądź na podłodze z górną częścią pleców opartą o ławkę', 'Przetocz sztangę przez biodra, użyj podkładki', 'Postaw stopy płasko, na szerokość bioder', 'Naciśnij piętami, unosząc biodra do pełnego wyprostu', 'Mocno ściśnij pośladki na górze'], tips: ['Schowaj brodę, patrząc na sztangę na górze', 'Stopy powinny być ustawione tak, by golenie były pionowe na górze'], primaryMuscle: 'pośladki', secondaryMuscles: ['dwugłowe ud', 'brzuch'], description: 'Najlepsze ćwiczenie na izolację i rozwój pośladków.' },
  },
  'leg extension': {
    en: { instructions: ['Sit in the leg extension machine with back against the pad', 'Hook your ankles under the roller pad', 'Extend your legs until straight', 'Lower back with control'], tips: ['Squeeze the quads hard at the top', 'Use slow negatives for more tension'], primaryMuscle: 'quadriceps', secondaryMuscles: [], description: 'An isolation exercise targeting the quadriceps.' },
    pl: { instructions: ['Usiądź w maszynie z plecami opartymi o oparcie', 'Zahacz kostki pod wałkiem', 'Wyprostuj nogi do końca', 'Opuść z kontrolą'], tips: ['Mocno ściśnij czworogłowe na górze', 'Stosuj wolne fazy negatywne'], primaryMuscle: 'czworogłowe', secondaryMuscles: [], description: 'Ćwiczenie izolowane na czworogłowe uda.' },
  },
  'leg curl': {
    en: { instructions: ['Lie face down on the leg curl machine', 'Hook your heels under the roller pad', 'Curl your legs up toward your glutes', 'Lower with control'], tips: ['Point your toes slightly to increase hamstring activation'], primaryMuscle: 'hamstrings', secondaryMuscles: ['calves'], description: 'An isolation exercise for the hamstrings.' },
    pl: { instructions: ['Połóż się twarzą w dół na maszynie', 'Zahacz pięty pod wałkiem', 'Zginaj nogi w kierunku pośladków', 'Opuść z kontrolą'], tips: ['Lekko wyprostuj palce stóp, aby zwiększyć aktywację dwugłowych'], primaryMuscle: 'dwugłowe ud', secondaryMuscles: ['łydki'], description: 'Ćwiczenie izolowane na dwugłowe uda.' },
  },
  'calf raise': {
    en: { instructions: ['Stand on the edge of a step or calf raise machine', 'Lower your heels below the platform for a full stretch', 'Push up onto your toes as high as possible', 'Hold the top position briefly, then lower with control'], tips: ['Full range of motion is key', 'Pause at the top and bottom'], primaryMuscle: 'calves', secondaryMuscles: [], description: 'Isolation exercise for the calves.' },
    pl: { instructions: ['Stań na krawędzi stopnia lub maszyny do łydek', 'Opuść pięty poniżej platformy na pełne rozciągnięcie', 'Wspnij się na palce jak najwyżej', 'Przytrzymaj na górze, potem opuść z kontrolą'], tips: ['Pełny zakres ruchu jest kluczowy', 'Zatrzymaj się na górze i na dole'], primaryMuscle: 'łydki', secondaryMuscles: [], description: 'Ćwiczenie izolowane na łydki.' },
  },
  'walking lunges': {
    en: { instructions: ['Stand upright holding dumbbells at your sides', 'Step forward with one leg and lower your hips', 'Lower until both knees are at 90 degrees', 'Push off your front foot and step forward with the other leg'], tips: ['Keep your torso upright', 'Take long steps to target glutes more'], primaryMuscle: 'quadriceps', secondaryMuscles: ['glutes', 'hamstrings'], description: 'Dynamic unilateral leg exercise.' },
    pl: { instructions: ['Stań prosto trzymając hantle po bokach', 'Zrób krok do przodu jedną nogą i opuść biodra', 'Opuść się aż oba kolana będą pod kątem 90 stopni', 'Odepchnij się przednią stopą i zrób krok drugą nogą'], tips: ['Utrzymuj tułów prosto', 'Dłuższe kroki bardziej angażują pośladki'], primaryMuscle: 'czworogłowe', secondaryMuscles: ['pośladki', 'dwugłowe ud'], description: 'Dynamiczne jednostronne ćwiczenie na nogi.' },
  },
  'good morning': {
    en: { instructions: ['Place a barbell on your upper back like a squat', 'Slight bend in knees', 'Hinge at the hips, pushing them back', 'Lower torso until parallel, then return to standing'], tips: ['Start with light weight to learn the movement'], primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'spinal erectors'], description: 'A hip hinge exercise with barbell on your back.' },
    pl: { instructions: ['Umieść sztangę na górnej części pleców jak do przysiadu', 'Lekko ugnij kolana', 'Wykonaj skłon w biodrach, cofając je', 'Opuść tułów do poziomu, potem wróć do stania'], tips: ['Zacznij z lekkim ciężarem, żeby nauczyć się ruchu'], primaryMuscle: 'dwugłowe ud', secondaryMuscles: ['pośladki', 'prostowniki grzbietu'], description: 'Ćwiczenie zawiasowe ze sztangą na plecach.' },
  },
  'kettlebell swing': {
    en: { instructions: ['Stand with feet shoulder-width apart, kettlebell on the floor', 'Hike the kettlebell back between your legs', 'Snap your hips forward to swing the kettlebell to chest height', 'Let it swing back and repeat'], tips: ['Power comes from the hips, not the arms', 'Squeeze glutes hard at the top'], primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings', 'core', 'shoulders'], description: 'Dynamic hip hinge for power and conditioning.' },
    pl: { instructions: ['Stań w rozkroku na szerokość barków, kettlebell na podłodze', 'Zahuśtaj kettlebell do tyłu między nogami', 'Gwałtownie wypchnij biodra do przodu, huśtając kettlebell na wysokość klatki', 'Pozwól mu wrócić i powtórz'], tips: ['Siła pochodzi z bioder, nie z rąk', 'Mocno ściśnij pośladki na górze'], primaryMuscle: 'pośladki', secondaryMuscles: ['dwugłowe ud', 'brzuch', 'barki'], description: 'Dynamiczne ćwiczenie zawiasowe na siłę i kondycję.' },
  },

  // ═══ CHEST ═══
  'barbell bench press': {
    en: { instructions: ['Lie on a flat bench, feet flat on the floor', 'Grip the bar slightly wider than shoulder width', 'Unrack and lower the bar to your mid-chest', 'Press back up to lockout, keeping shoulder blades pinched'], tips: ['Retract and depress your shoulder blades', 'Maintain an arch in your back', 'Drive your feet into the floor for leg drive'], primaryMuscle: 'pectorals', secondaryMuscles: ['front delts', 'triceps'], description: 'The most popular upper body exercise.' },
    pl: { instructions: ['Połóż się na płaskiej ławce, stopy płasko na podłodze', 'Chwyć sztangę nieco szerzej niż barki', 'Zdejmij i opuść sztangę do środka klatki', 'Wyciśnij do pełnego wyprostu, utrzymując ściągnięte łopatki'], tips: ['Ściągnij i opuść łopatki', 'Utrzymuj łuk w plecach', 'Napieraj stopami o podłogę dla napędu nóg'], primaryMuscle: 'klatka piersiowa', secondaryMuscles: ['przednie naramienne', 'triceps'], description: 'Najpopularniejsze ćwiczenie na górną część ciała.' },
  },
  'incline bench press': {
    en: { instructions: ['Set bench to 30-45 degree incline', 'Grip bar slightly wider than shoulder width', 'Lower bar to upper chest', 'Press back up to lockout'], tips: ['30 degrees is optimal for upper chest', 'Keep elbows at about 45 degrees'], primaryMuscle: 'upper chest', secondaryMuscles: ['front delts', 'triceps'], description: 'Bench press on incline, emphasizing upper chest.' },
    pl: { instructions: ['Ustaw ławkę pod kątem 30-45 stopni', 'Chwyć sztangę nieco szerzej niż barki', 'Opuść sztangę do górnej części klatki', 'Wyciśnij do pełnego wyprostu'], tips: ['30 stopni jest optymalne dla górnej klatki', 'Utrzymuj łokcie pod kątem ok. 45 stopni'], primaryMuscle: 'górna klatka', secondaryMuscles: ['przednie naramienne', 'triceps'], description: 'Wyciskanie na ławce skośnej, akcentujące górną klatkę.' },
  },
  'incline dumbbell press': {
    en: { instructions: ['Set bench to 30-45 degrees', 'Press dumbbells up from chest level', 'Lower with control, feeling a stretch in the upper chest', 'Press back up, squeezing chest at the top'], tips: ['Keep a slight arch in your back'], primaryMuscle: 'upper chest', secondaryMuscles: ['front delts', 'triceps'], description: 'Incline press with dumbbells for upper chest.' },
    pl: { instructions: ['Ustaw ławkę pod kątem 30-45 stopni', 'Wyciśnij hantle z poziomu klatki', 'Opuść z kontrolą, czując rozciągnięcie górnej klatki', 'Wyciśnij do góry, ściskając klatkę na górze'], tips: ['Utrzymuj lekki łuk w plecach'], primaryMuscle: 'górna klatka', secondaryMuscles: ['przednie naramienne', 'triceps'], description: 'Wyciskanie hantli na skosie na górną klatkę.' },
  },
  'dumbbell bench press': {
    en: { instructions: ['Sit on the bench with dumbbells on your thighs', 'Kick them up as you lie back', 'Lower dumbbells to chest level with elbows at 45 degrees', 'Press back up, bringing dumbbells together at the top'], tips: ['Greater range of motion than barbell', 'Helps fix imbalances between sides'], primaryMuscle: 'pectorals', secondaryMuscles: ['front delts', 'triceps'], description: 'Bench press with dumbbells for greater ROM.' },
    pl: { instructions: ['Usiądź na ławce z hantlami na udach', 'Podrzuć je do góry kładąc się', 'Opuść hantle do poziomu klatki z łokciami pod kątem 45 stopni', 'Wyciśnij do góry, zbliżając hantle na górze'], tips: ['Większy zakres ruchu niż ze sztangą', 'Pomaga wyrównać dysbalanse między stronami'], primaryMuscle: 'klatka piersiowa', secondaryMuscles: ['przednie naramienne', 'triceps'], description: 'Wyciskanie hantli leżąc na większy zakres ruchu.' },
  },
  'dumbbell fly': {
    en: { instructions: ['Lie on a flat bench with dumbbells above your chest', 'With a slight bend in your elbows, lower the dumbbells in a wide arc', 'Lower until you feel a stretch in your chest', 'Bring the dumbbells back up in the same arc pattern'], tips: ['Keep a slight bend in elbows throughout', 'Focus on the stretch at the bottom'], primaryMuscle: 'pectorals', secondaryMuscles: ['front delts'], description: 'Isolation exercise for the chest.' },
    pl: { instructions: ['Połóż się na płaskiej ławce z hantlami nad klatką', 'Z lekkim ugięciem łokci, opuść hantle szerokim łukiem', 'Opuść aż poczujesz rozciągnięcie klatki', 'Podnieś hantle tym samym łukiem'], tips: ['Utrzymuj lekkie ugięcie łokci przez cały ruch', 'Skup się na rozciągnięciu na dole'], primaryMuscle: 'klatka piersiowa', secondaryMuscles: ['przednie naramienne'], description: 'Ćwiczenie izolowane na klatkę piersiową.' },
  },
  'cable crossover': {
    en: { instructions: ['Set cable pulleys to high position', 'Grab handles and step forward', 'With slight elbow bend, bring hands together in front of your chest', 'Squeeze chest at the bottom, then return with control'], tips: ['Vary pulley height to target different chest areas', 'Constant tension advantage over dumbbells'], primaryMuscle: 'pectorals', secondaryMuscles: ['front delts'], description: 'Cable chest isolation with constant tension.' },
    pl: { instructions: ['Ustaw wyciągi w wysokiej pozycji', 'Chwyć uchwyty i zrób krok do przodu', 'Z lekkim ugięciem łokci, ściągnij ręce przed klatkę', 'Ściśnij klatkę na dole, potem wróć z kontrolą'], tips: ['Zmień wysokość wyciągu, aby celować w różne części klatki', 'Stałe napięcie — przewaga nad hantlami'], primaryMuscle: 'klatka piersiowa', secondaryMuscles: ['przednie naramienne'], description: 'Izolacja klatki na wyciągu ze stałym napięciem.' },
  },
  'push-up': {
    en: { instructions: ['Start in a plank position, hands slightly wider than shoulders', 'Lower your body until chest nearly touches the floor', 'Push back up to the starting position', 'Keep core tight throughout'], tips: ['Hands at chest level, not above shoulders', 'Full range of motion is key'], primaryMuscle: 'pectorals', secondaryMuscles: ['front delts', 'triceps', 'core'], description: 'The most fundamental bodyweight pushing exercise.' },
    pl: { instructions: ['Zacznij w pozycji deski, dłonie nieco szerzej niż barki', 'Opuść ciało aż klatka prawie dotknie podłogi', 'Wypchnij się z powrotem do pozycji startowej', 'Utrzymuj napięty brzuch przez cały ruch'], tips: ['Dłonie na wysokości klatki, nie nad barkami', 'Pełny zakres ruchu jest kluczowy'], primaryMuscle: 'klatka piersiowa', secondaryMuscles: ['przednie naramienne', 'triceps', 'brzuch'], description: 'Najbardziej podstawowe ćwiczenie wypychające z masą ciała.' },
  },
  'close-grip bench press': {
    en: { instructions: ['Lie on flat bench, grip bar about shoulder width', 'Lower bar to lower chest, keeping elbows tucked', 'Press back up to lockout'], tips: ['Grip should be about shoulder width — not too narrow', 'Keep elbows close to your body'], primaryMuscle: 'triceps', secondaryMuscles: ['pectorals', 'front delts'], description: 'Narrow grip bench pressing for triceps and inner chest.' },
    pl: { instructions: ['Połóż się na ławce, chwyć sztangę na szerokość barków', 'Opuść sztangę do dolnej klatki, trzymając łokcie przy ciele', 'Wyciśnij do pełnego wyprostu'], tips: ['Chwyt powinien być na szerokość barków — nie za wąski', 'Trzymaj łokcie blisko ciała'], primaryMuscle: 'triceps', secondaryMuscles: ['klatka piersiowa', 'przednie naramienne'], description: 'Wyciskanie wąskim chwytem na triceps i wewnętrzną klatkę.' },
  },

  // ═══ BACK ═══
  'barbell row': {
    en: { instructions: ['Hinge forward at hips about 45 degrees', 'Grip bar slightly wider than shoulder width', 'Pull the bar to your lower chest/upper abs', 'Lower with control, fully extending arms'], tips: ['Keep your back flat, not rounded', 'Pull your elbows back, not just up'], primaryMuscle: 'lats', secondaryMuscles: ['rhomboids', 'rear delts', 'biceps'], description: 'Fundamental compound back exercise.' },
    pl: { instructions: ['Pochyl się w biodrach ok. 45 stopni', 'Chwyć sztangę nieco szerzej niż barki', 'Przyciągnij sztangę do dolnej klatki/górnego brzucha', 'Opuść z kontrolą, prostując ramiona'], tips: ['Utrzymuj plecy płasko, nie zaokrąglone', 'Ciągnij łokcie do tyłu, nie tylko do góry'], primaryMuscle: 'najszersze', secondaryMuscles: ['mięśnie równoległoboczne', 'tylne naramienne', 'biceps'], description: 'Podstawowe ćwiczenie wielostawowe na plecy.' },
  },
  'dumbbell row': {
    en: { instructions: ['Place one knee and hand on a bench', 'Hold a dumbbell in the other hand, arm extended', 'Pull the dumbbell to your hip', 'Lower with control'], tips: ['Think about pulling your elbow to the ceiling', 'Great for fixing side-to-side imbalances'], primaryMuscle: 'lats', secondaryMuscles: ['rhomboids', 'rear delts', 'biceps'], description: 'Unilateral back exercise, one arm at a time.' },
    pl: { instructions: ['Oprzyj jedno kolano i dłoń na ławce', 'Trzymaj hantel w drugiej ręce, ramię wyprostowane', 'Przyciągnij hantel do biodra', 'Opuść z kontrolą'], tips: ['Myśl o ciągnięciu łokcia do sufitu', 'Świetne do korekcji nierównomierności'], primaryMuscle: 'najszersze', secondaryMuscles: ['mięśnie równoległoboczne', 'tylne naramienne', 'biceps'], description: 'Jednostronne ćwiczenie na plecy, jedno ramię na raz.' },
  },
  'lat pulldown': {
    en: { instructions: ['Sit at the lat pulldown machine, thighs under the pads', 'Grip the bar wider than shoulder width', 'Pull the bar down to your upper chest', 'Control the weight back up, fully extending arms'], tips: ['Lean back slightly', 'Pull with your elbows, not your hands'], primaryMuscle: 'lats', secondaryMuscles: ['biceps', 'rear delts', 'rhomboids'], description: 'Cable exercise mimicking pull-ups for lat width.' },
    pl: { instructions: ['Usiądź przy maszynie, uda pod poduszkami', 'Chwyć drążek szerzej niż barki', 'Ściągnij drążek do górnej klatki', 'Kontroluj powrót, prostując ramiona'], tips: ['Lekko odchyl się do tyłu', 'Ciągnij łokciami, nie dłońmi'], primaryMuscle: 'najszersze', secondaryMuscles: ['biceps', 'tylne naramienne', 'mięśnie równoległoboczne'], description: 'Ćwiczenie na wyciągu naśladujące podciąganie, na szerokość pleców.' },
  },
  'pull-up': {
    en: { instructions: ['Hang from a bar with an overhand grip, slightly wider than shoulders', 'Pull yourself up until your chin is above the bar', 'Lower yourself with control to full extension', 'Avoid swinging or kipping'], tips: ['Start from a dead hang', 'Think about driving elbows down to your sides'], primaryMuscle: 'lats', secondaryMuscles: ['biceps', 'rear delts', 'core', 'forearms'], description: 'The gold standard of upper back exercises.' },
    pl: { instructions: ['Zwiś na drążku nachwytem, nieco szerzej niż barki', 'Podciągnij się aż broda będzie nad drążkiem', 'Opuść się z kontrolą do pełnego wyprostu', 'Unikaj kołysania'], tips: ['Zacznij z martwego zwisu', 'Myśl o ciągnięciu łokci w dół do boków'], primaryMuscle: 'najszersze', secondaryMuscles: ['biceps', 'tylne naramienne', 'brzuch', 'przedramiona'], description: 'Złoty standard ćwiczeń na górne plecy.' },
  },
  'cable row': {
    en: { instructions: ['Sit at a cable row machine with feet on the platform', 'Grab the handle with arms extended', 'Pull the handle to your abdomen', 'Squeeze shoulder blades together, then return with control'], tips: ['Keep your chest up and back straight', 'V-grip for lats, wide grip for upper back'], primaryMuscle: 'lats', secondaryMuscles: ['rhomboids', 'rear delts', 'biceps'], description: 'Seated cable rowing for mid-back.' },
    pl: { instructions: ['Usiądź przy wyciągu ze stopami na platformie', 'Chwyć uchwyt z wyprostowanymi ramionami', 'Przyciągnij uchwyt do brzucha', 'Ściśnij łopatki, potem wróć z kontrolą'], tips: ['Utrzymuj klatkę do góry i proste plecy', 'Wąski chwyt na najszersze, szeroki na górne plecy'], primaryMuscle: 'najszersze', secondaryMuscles: ['mięśnie równoległoboczne', 'tylne naramienne', 'biceps'], description: 'Wiosłowanie siedząc na wyciągu na środek pleców.' },
  },
  'face pull': {
    en: { instructions: ['Set a cable pulley at face height with a rope attachment', 'Pull the rope toward your face, separating the ends', 'Externally rotate your shoulders so hands end up beside your ears', 'Squeeze the rear delts, then return with control'], tips: ['Essential exercise for shoulder health', 'Light weight, high reps, perfect form'], primaryMuscle: 'rear delts', secondaryMuscles: ['rhomboids', 'rotator cuff', 'traps'], description: 'Essential cable exercise for rear delts and shoulder health.' },
    pl: { instructions: ['Ustaw wyciąg na wysokości twarzy z liną', 'Przyciągnij linę do twarzy, rozdzielając końce', 'Wykonaj rotację zewnętrzną barków — dłonie kończą obok uszu', 'Ściśnij tylne naramienne, potem wróć z kontrolą'], tips: ['Kluczowe ćwiczenie dla zdrowia barków', 'Lekki ciężar, dużo powtórzeń, perfekcyjna forma'], primaryMuscle: 'tylne naramienne', secondaryMuscles: ['mięśnie równoległoboczne', 'stożek rotatorów', 'trapezy'], description: 'Kluczowe ćwiczenie na wyciągu na tylne naramienne i zdrowie barków.' },
  },

  // ═══ SHOULDERS ═══
  'overhead press': {
    en: { instructions: ['Grip barbell at shoulder width in the front rack position', 'Press the bar directly overhead', 'Push your head through once the bar clears it', 'Lock out with the bar over mid-foot'], tips: ['Squeeze glutes and brace core for stability', 'Keep the bar close to your face on the way up'], primaryMuscle: 'front delts', secondaryMuscles: ['lateral delts', 'triceps', 'upper chest'], description: 'Primary barbell shoulder pressing movement.' },
    pl: { instructions: ['Chwyć sztangę na szerokość barków w pozycji front rack', 'Wyciśnij sztangę prosto nad głowę', 'Przepchnij głowę do przodu gdy sztanga ją minie', 'Zablokuj ze sztangą nad środkiem stopy'], tips: ['Ściśnij pośladki i napnij brzuch dla stabilności', 'Trzymaj sztangę blisko twarzy w drodze do góry'], primaryMuscle: 'przednie naramienne', secondaryMuscles: ['boczne naramienne', 'triceps', 'górna klatka'], description: 'Główne ćwiczenie na barki ze sztangą.' },
  },
  'dumbbell shoulder press': {
    en: { instructions: ['Sit or stand with dumbbells at shoulder height', 'Press both dumbbells overhead until arms are extended', 'Lower with control back to shoulder height'], tips: ['Seated version isolates shoulders more', 'Standing version engages more core'], primaryMuscle: 'front delts', secondaryMuscles: ['lateral delts', 'triceps'], description: 'Shoulder press with dumbbells.' },
    pl: { instructions: ['Usiądź lub stań z hantlami na wysokości barków', 'Wyciśnij oba hantle nad głowę aż ramiona będą wyprostowane', 'Opuść z kontrolą z powrotem na wysokość barków'], tips: ['Wersja siedząca bardziej izoluje barki', 'Wersja stojąca bardziej angażuje brzuch'], primaryMuscle: 'przednie naramienne', secondaryMuscles: ['boczne naramienne', 'triceps'], description: 'Wyciskanie hantli nad głowę.' },
  },
  'lateral raise': {
    en: { instructions: ['Stand with dumbbells at your sides', 'Raise the dumbbells out to the sides until arms are parallel to the floor', 'Lead with your elbows, slight bend', 'Lower with control'], tips: ['Slight forward lean targets lateral delts better', 'Lead with elbows, not hands', 'Light weight, high reps, perfect form'], primaryMuscle: 'lateral delts', secondaryMuscles: ['front delts', 'traps'], description: 'The go-to exercise for building wider shoulders.' },
    pl: { instructions: ['Stań z hantlami po bokach', 'Unieś hantle na boki aż ramiona będą równolegle do podłogi', 'Prowadź łokciami, lekkie ugięcie', 'Opuść z kontrolą'], tips: ['Lekki pochył do przodu lepiej celuje w boczne naramienne', 'Prowadź łokciami, nie dłońmi', 'Lekki ciężar, dużo powtórzeń, perfekcyjna forma'], primaryMuscle: 'boczne naramienne', secondaryMuscles: ['przednie naramienne', 'trapezy'], description: 'Główne ćwiczenie na szersze barki.' },
  },
  'arnold press': {
    en: { instructions: ['Start with dumbbells at chin height, palms facing you', 'Press up while rotating palms to face forward', 'Lockout overhead with palms forward', 'Reverse the rotation as you lower'], tips: ['Hits all three delt heads in one movement'], primaryMuscle: 'front delts', secondaryMuscles: ['lateral delts', 'rear delts', 'triceps'], description: 'Rotating dumbbell press hitting all delt heads.' },
    pl: { instructions: ['Zacznij z hantlami na wysokości brody, dłonie do siebie', 'Wyciśnij do góry obracając dłonie na zewnątrz', 'Zablokuj nad głową z dłońmi do przodu', 'Odwróć rotację opuszczając'], tips: ['Angażuje wszystkie trzy głowy naramiennych w jednym ruchu'], primaryMuscle: 'przednie naramienne', secondaryMuscles: ['boczne naramienne', 'tylne naramienne', 'triceps'], description: 'Wyciskanie z rotacją angażujące wszystkie głowy naramiennych.' },
  },

  // ═══ ARMS ═══
  'barbell curl': {
    en: { instructions: ['Stand with barbell at arm\'s length, underhand grip', 'Curl the bar up to shoulder height', 'Squeeze biceps at the top', 'Lower with control — no swinging'], tips: ['Keep elbows pinned to your sides', 'Focus on the squeeze at the top'], primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], description: 'Classic bicep exercise.' },
    pl: { instructions: ['Stań ze sztangą w wyprostowanych rękach, chwyt podchwytowy', 'Ugnij sztangę do wysokości barków', 'Ściśnij biceps na górze', 'Opuść z kontrolą — bez kołysania'], tips: ['Trzymaj łokcie przyciśnięte do boków', 'Skup się na ściśnięciu na górze'], primaryMuscle: 'biceps', secondaryMuscles: ['przedramiona'], description: 'Klasyczne ćwiczenie na biceps.' },
  },
  'hammer curl': {
    en: { instructions: ['Stand holding dumbbells at your sides, palms facing each other', 'Curl the dumbbells up while maintaining neutral grip', 'Squeeze at the top', 'Lower with control'], tips: ['Targets the brachialis — makes arms look wider'], primaryMuscle: 'brachialis', secondaryMuscles: ['biceps', 'brachioradialis'], description: 'Neutral grip curl for brachialis and forearms.' },
    pl: { instructions: ['Stań trzymając hantle po bokach, dłonie do siebie', 'Ugnij hantle utrzymując neutralny chwyt', 'Ściśnij na górze', 'Opuść z kontrolą'], tips: ['Celuje w mięsień ramienny — sprawia że ramiona wyglądają szerzej'], primaryMuscle: 'mięsień ramienny', secondaryMuscles: ['biceps', 'mięsień ramienno-promieniowy'], description: 'Uginanie neutralnym chwytem na mięsień ramienny i przedramiona.' },
  },
  'tricep pushdown': {
    en: { instructions: ['Stand facing a high cable with bar or rope attachment', 'Pin elbows to your sides', 'Push the handle down until arms are fully extended', 'Return with control, keeping elbows stationary'], tips: ['Rope attachment allows you to spread at the bottom for more contraction'], primaryMuscle: 'triceps', secondaryMuscles: [], description: 'Cable isolation for triceps.' },
    pl: { instructions: ['Stań przodem do wysokiego wyciągu z drążkiem lub liną', 'Przyciśnij łokcie do boków', 'Zepchnij uchwyt w dół aż ramiona będą w pełni wyprostowane', 'Wróć z kontrolą, utrzymując łokcie nieruchomo'], tips: ['Lina pozwala rozdzielić na dole dla lepszego napięcia'], primaryMuscle: 'triceps', secondaryMuscles: [], description: 'Izolacja tricepsa na wyciągu.' },
  },
  'skull crusher': {
    en: { instructions: ['Lie on a bench holding a barbell or EZ bar above your chest', 'Bend elbows to lower the bar toward your forehead', 'Extend arms back to the starting position', 'Keep upper arms stationary throughout'], tips: ['Lower the bar slightly behind your head for more stretch', 'EZ bar is easier on the wrists'], primaryMuscle: 'triceps', secondaryMuscles: [], description: 'Lying tricep extension.' },
    pl: { instructions: ['Połóż się na ławce trzymając sztangę lub gryf łamany nad klatką', 'Zginaj łokcie opuszczając gryf w kierunku czoła', 'Wyprostuj ramiona wracając do pozycji startowej', 'Utrzymuj ramiona nieruchomo przez cały ruch'], tips: ['Opuść gryf lekko za głowę dla lepszego rozciągnięcia', 'Gryf łamany jest łagodniejszy dla nadgarstków'], primaryMuscle: 'triceps', secondaryMuscles: [], description: 'Prostowanie ramion leżąc (French press).' },
  },
  'dumbbell curl': {
    en: { instructions: ['Stand or sit with dumbbells at your sides', 'Curl the dumbbells up, rotating from neutral to supinated', 'Squeeze at the top', 'Lower with control'], tips: ['Supinate (rotate) your wrist during the curl'], primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], description: 'Standard dumbbell curl for bicep development.' },
    pl: { instructions: ['Stań lub usiądź z hantlami po bokach', 'Ugnij hantle do góry, obracając z neutralnego do podchwytowego', 'Ściśnij na górze', 'Opuść z kontrolą'], tips: ['Supinuj (obracaj) nadgarstek podczas uginania'], primaryMuscle: 'biceps', secondaryMuscles: ['przedramiona'], description: 'Standardowe uginanie hantlami na rozwój bicepsa.' },
  },
  'overhead tricep extension': {
    en: { instructions: ['Hold a dumbbell with both hands overhead', 'Lower the dumbbell behind your head by bending elbows', 'Extend arms back overhead', 'Keep upper arms close to your head'], tips: ['Targets the long head of the triceps (biggest head)'], primaryMuscle: 'triceps (long head)', secondaryMuscles: [], description: 'Overhead tricep exercise for the long head.' },
    pl: { instructions: ['Trzymaj hantel obiema rękami nad głową', 'Opuść hantel za głowę zginając łokcie', 'Wyprostuj ramiona z powrotem nad głowę', 'Utrzymuj ramiona blisko głowy'], tips: ['Celuje w długą głowę tricepsa (największa głowa)'], primaryMuscle: 'triceps (głowa długa)', secondaryMuscles: [], description: 'Ćwiczenie nad głową na długą głowę tricepsa.' },
  },

  // ═══ CORE ═══
  'plank': {
    en: { instructions: ['Get into a forearm plank position', 'Keep body in a straight line from head to heels', 'Squeeze glutes and brace abs', 'Hold for prescribed time'], tips: ['Don\'t let hips sag or pike up', 'Breathe normally — don\'t hold breath'], primaryMuscle: 'rectus abdominis', secondaryMuscles: ['obliques', 'transverse abdominis', 'glutes'], description: 'Foundational isometric core exercise.' },
    pl: { instructions: ['Przyjmij pozycję deski na przedramionach', 'Utrzymuj ciało w prostej linii od głowy do pięt', 'Ściśnij pośladki i napnij brzuch', 'Utrzymuj przez wyznaczony czas'], tips: ['Nie pozwól biodom opadać ani unosić się', 'Oddychaj normalnie — nie wstrzymuj oddechu'], primaryMuscle: 'mięsień prosty brzucha', secondaryMuscles: ['skośne', 'mięsień poprzeczny brzucha', 'pośladki'], description: 'Podstawowe izometryczne ćwiczenie na brzuch.' },
  },
  'hanging leg raise': {
    en: { instructions: ['Hang from a pull-up bar with arms extended', 'Raise your legs up, keeping them straight', 'Lift until legs are parallel to the floor or higher', 'Lower with control — avoid swinging'], tips: ['Bend knees if straight legs are too difficult', 'Curl pelvis up at the top for more ab engagement'], primaryMuscle: 'rectus abdominis', secondaryMuscles: ['hip flexors', 'obliques'], description: 'Advanced core exercise for lower abs.' },
    pl: { instructions: ['Zwiś na drążku z wyprostowanymi ramionami', 'Unieś nogi do góry, trzymając je proste', 'Unieś aż nogi będą równolegle do podłogi lub wyżej', 'Opuść z kontrolą — unikaj kołysania'], tips: ['Zegnij kolana jeśli proste nogi są za trudne', 'Podwiń miednicę na górze dla lepszego napięcia brzucha'], primaryMuscle: 'mięsień prosty brzucha', secondaryMuscles: ['zginacze bioder', 'skośne'], description: 'Zaawansowane ćwiczenie na dolny brzuch.' },
  },
  'russian twist': {
    en: { instructions: ['Sit on the floor with knees bent, feet off the ground', 'Lean back slightly, maintaining a straight back', 'Rotate your torso side to side', 'Hold a weight for extra resistance'], tips: ['The rotation should come from the torso, not the arms'], primaryMuscle: 'obliques', secondaryMuscles: ['rectus abdominis'], description: 'Rotational core exercise targeting obliques.' },
    pl: { instructions: ['Usiądź na podłodze z ugiętymi kolanami, stopy uniesione', 'Odchyl się lekko do tyłu, utrzymując proste plecy', 'Obracaj tułów na boki', 'Trzymaj obciążenie dla większego oporu'], tips: ['Rotacja powinna pochodzić z tułowia, nie z ramion'], primaryMuscle: 'skośne', secondaryMuscles: ['mięsień prosty brzucha'], description: 'Ćwiczenie rotacyjne na skośne mięśnie brzucha.' },
  },
  'cable crunch': {
    en: { instructions: ['Kneel in front of a high cable with rope attachment', 'Hold the rope behind your head', 'Crunch down by flexing your spine', 'Return with control'], tips: ['Focus on spinal flexion, not hip flexion', 'Keep hips stationary'], primaryMuscle: 'rectus abdominis', secondaryMuscles: ['obliques'], description: 'Kneeling crunch with cable for progressive overload.' },
    pl: { instructions: ['Klęknij przed wysokim wyciągiem z liną', 'Trzymaj linę za głową', 'Zegnij tułów skurczem brzucha', 'Wróć z kontrolą'], tips: ['Skup się na zgięciu kręgosłupa, nie bioder', 'Utrzymuj biodra nieruchomo'], primaryMuscle: 'mięsień prosty brzucha', secondaryMuscles: ['skośne'], description: 'Spięcie klęcząc na wyciągu z progresywnym obciążeniem.' },
  },
};

// ── Polish name aliases → English key ──
const plAliases: Record<string, string> = {
  'przysiad ze sztangą': 'barbell back squat', 'przysiad frontowy': 'front squat', 'przysiad goblet': 'goblet squat',
  'przysiad bułgarski': 'bulgarian split squat', 'prasa do nóg': 'leg press', 'martwy ciąg rumuński': 'romanian deadlift',
  'martwy ciąg klasyczny': 'conventional deadlift', 'martwy ciąg sumo': 'sumo deadlift', 'hip thrust': 'hip thrust',
  'prostowanie nóg': 'leg extension', 'uginanie nóg': 'leg curl', 'wspięcia na palce': 'calf raise',
  'wykroki w marszu': 'walking lunges', 'wyciskanie sztangi leżąc': 'barbell bench press',
  'wyciskanie na ławce skośnej': 'incline bench press', 'wyciskanie hantli leżąc': 'dumbbell bench press',
  'wyciskanie hantli na skosie': 'incline dumbbell press', 'rozpiętki z hantlami': 'dumbbell fly',
  'krzyżowanie linek': 'cable crossover', 'pompki': 'push-up', 'wyciskanie wąskim chwytem': 'close-grip bench press',
  'wiosłowanie sztangą': 'barbell row', 'wiosłowanie hantlą': 'dumbbell row', 'ściąganie drążka': 'lat pulldown',
  'podciągnięcie na drążku': 'pull-up', 'podciągnięcie podchwytem': 'chin-up', 'wiosłowanie na wyciągu': 'cable row',
  'face pull': 'face pull', 'wyciskanie sztangi nad głowę': 'overhead press',
  'wyciskanie hantli nad głowę': 'dumbbell shoulder press', 'unoszenie hantli bokiem': 'lateral raise',
  'wyciskanie arnolda': 'arnold press', 'uginanie sztangi na biceps': 'barbell curl',
  'uginanie młotkowe': 'hammer curl', 'prostowanie ramion na wyciągu': 'tricep pushdown',
  'french press': 'skull crusher', 'uginanie hantli na biceps': 'dumbbell curl',
  'prostowanie ramion nad głową': 'overhead tricep extension', 'deska': 'plank',
  'unoszenie nóg w zwisie': 'hanging leg raise', 'rosyjski skręt': 'russian twist', 'spięcie na wyciągu': 'cable crunch',
  // Variant Polish names
  'wiosłowanie sztangą w opadzie tułowia': 'barbell row', 'wiosłowanie sztangą w opadzie': 'barbell row',
  'wyciskanie hantli na skosie dodatnim': 'incline dumbbell press', 'ściąganie drążka wyciągu nachwytem': 'lat pulldown',
  'ściąganie drążka nachwytem': 'lat pulldown', 'wznosy hantli bokiem': 'lateral raise', 'wznosy bokiem': 'lateral raise',
  'wyprosty ramion na wyciągu': 'tricep pushdown', 'wyprosty na wyciągu': 'tricep pushdown',
  'uginanie ramion hantlami': 'dumbbell curl', 'uginanie hantlami': 'dumbbell curl',
  'uginanie ramion sztangą': 'barbell curl', 'wyciskanie na ławce': 'barbell bench press',
  'wyciskanie leżąc': 'barbell bench press', 'wyciskanie na skosie': 'incline bench press',
  'wyciskanie nad głowę': 'overhead press', 'martwy ciąg': 'conventional deadlift', 'przysiad': 'barbell back squat',
  'podciąganie': 'pull-up', 'podciąganie nachwytem': 'pull-up', 'podciąganie podchwytem': 'chin-up',
  'bench press': 'barbell bench press', 'bench': 'barbell bench press', 'squat': 'barbell back squat',
  'deadlift': 'conventional deadlift', 'ohp': 'overhead press', 'rdl': 'romanian deadlift',
};

// ── Keyword-based fuzzy matching (fallback) ──
const keywordMap: [string[], string][] = [
  [['wyciskanie', 'sztang', 'leżąc'], 'barbell bench press'], [['wyciskanie', 'sztang', 'skoś'], 'incline bench press'],
  [['wyciskanie', 'hantl', 'leżąc'], 'dumbbell bench press'], [['wyciskanie', 'hantl', 'skoś'], 'incline dumbbell press'],
  [['wyciskanie', 'wąsk'], 'close-grip bench press'], [['wyciskanie', 'nad', 'głow'], 'overhead press'],
  [['wiosłowanie', 'sztang'], 'barbell row'], [['wiosłowanie', 'hantl'], 'dumbbell row'],
  [['wiosłowanie', 'wyciąg'], 'cable row'], [['ściągan', 'drąż'], 'lat pulldown'],
  [['podciąg', 'nachwyt'], 'pull-up'], [['podciąg', 'podchwyt'], 'chin-up'], [['podciąg'], 'pull-up'],
  [['przysiad', 'sztang'], 'barbell back squat'], [['przysiad', 'front'], 'front squat'],
  [['przysiad', 'goblet'], 'goblet squat'], [['przysiad', 'bułgar'], 'bulgarian split squat'],
  [['martwy', 'ciąg', 'rumuń'], 'romanian deadlift'], [['martwy', 'ciąg', 'sumo'], 'sumo deadlift'],
  [['martwy', 'ciąg'], 'conventional deadlift'], [['hip', 'thrust'], 'hip thrust'],
  [['prostowanie', 'nóg'], 'leg extension'], [['uginanie', 'nóg'], 'leg curl'],
  [['wspięci', 'palce'], 'calf raise'], [['wykro', 'marsz'], 'walking lunges'],
  [['wznosy', 'bok'], 'lateral raise'], [['unoszen', 'bok'], 'lateral raise'],
  [['wyprost', 'ramion', 'wyciąg'], 'tricep pushdown'], [['prostowanie', 'ramion', 'wyciąg'], 'tricep pushdown'],
  [['prostowanie', 'ramion', 'głow'], 'overhead tricep extension'],
  [['uginanie', 'ramion', 'hantl'], 'dumbbell curl'], [['uginanie', 'hantl'], 'dumbbell curl'],
  [['uginanie', 'sztang'], 'barbell curl'], [['uginanie', 'młotk'], 'hammer curl'],
  [['french', 'press'], 'skull crusher'], [['face', 'pull'], 'face pull'],
  [['rozpiętk'], 'dumbbell fly'], [['krzyżowan', 'link'], 'cable crossover'],
  [['pompk'], 'push-up'], [['plank'], 'plank'], [['desk'], 'plank'],
  [['burpee'], 'burpee'], [['kettlebell', 'swing'], 'kettlebell swing'],
];

// ── Build lookup maps ──
const exerciseInfoMapEn = new Map<string, ExerciseInfo>();
const exerciseInfoMapPl = new Map<string, ExerciseInfo>();

for (const [key, val] of Object.entries(raw)) {
  exerciseInfoMapEn.set(key, val.en);
  exerciseInfoMapPl.set(key, val.pl);
}
for (const [alias, enKey] of Object.entries(plAliases)) {
  const entry = raw[enKey];
  if (entry) {
    exerciseInfoMapEn.set(alias, entry.en);
    exerciseInfoMapPl.set(alias, entry.pl);
  }
}

/**
 * Look up exercise info by name (case-insensitive).
 * Supports English names, Polish names, common abbreviations,
 * and fuzzy keyword matching as fallback.
 * @param lang - 'en' or 'pl' to get localized content
 */
export function getExerciseInfo(name: string, lang: 'en' | 'pl' = 'en'): ExerciseInfo | null {
  const key = name.toLowerCase().trim();
  const map = lang === 'pl' ? exerciseInfoMapPl : exerciseInfoMapEn;

  // 1. Exact match
  const exact = map.get(key);
  if (exact) return exact;

  // 2. Fuzzy keyword match
  for (const [keywords, enKey] of keywordMap) {
    if (keywords.every(kw => key.includes(kw))) {
      const entry = raw[enKey];
      if (entry) return lang === 'pl' ? entry.pl : entry.en;
    }
  }

  return null;
}
