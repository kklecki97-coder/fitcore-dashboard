import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, FileSpreadsheet, Check, AlertTriangle, Dumbbell, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import GlassCard from './GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import type { WorkoutProgram, WorkoutDay, Exercise } from '../types';

interface ProgramImporterProps {
  onImported: (program: WorkoutProgram) => void;
  onBack: () => void;
}

// Parse an Excel/CSV file into a WorkoutProgram
function parseWorkbook(wb: XLSX.WorkBook): WorkoutProgram {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const days: WorkoutDay[] = [];
  let currentDay: WorkoutDay | null = null;

  for (const row of rows) {
    const cells = row.map(c => String(c ?? '').trim());
    const joined = cells.join('').toLowerCase();

    // Skip empty rows
    if (!joined) continue;

    // Skip instruction/header rows
    if (joined.startsWith('instrukcja') || joined.startsWith('progresja') ||
        joined.includes('w każdej serii') || joined.includes('serie rozgrzewkowe') ||
        joined.includes('ćwiczenia powinny') || joined.includes('nie zmieniaj') ||
        joined.includes('serie każdego') || joined.includes('treningi wykonujesz') ||
        joined.includes('do każdego ćwiczenia') || joined.includes('1 sekunda') ||
        joined.includes('raz w tygodniu') || joined.includes('na razie będzie') ||
        joined.includes('z tygodnia na') || joined.includes('ilość powtórzeń') ||
        joined.includes('następnie dodajesz') || joined.includes('jeżeli dojdziesz') ||
        joined.includes('zwiększać od')) {
      continue;
    }

    // Detect day/training header: "Trening I", "Trening II", "Day 1", etc.
    // or lines like "Góra A", "Dół B", etc.
    const firstCell = cells[0];
    const isTrainingHeader = /^trening\s/i.test(firstCell) ||
      (/^(g[oó]ra|d[oó][lł]|upper|lower|push|pull|legs|full)/i.test(firstCell) && !cells[1]);

    if (isTrainingHeader) {
      // Start a new day
      const dayName = cells.filter(c => c).join(' ').replace(/\s+/g, ' ');
      currentDay = {
        id: crypto.randomUUID(),
        name: dayName,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    // Detect column header rows (Numer, Nazwa, etc.) — skip them
    if (/^numer/i.test(firstCell) || /^#/i.test(firstCell) ||
        /^nazwa/i.test(cells[1] || '')) {
      continue;
    }

    // Try to parse exercise row
    // Expected formats:
    // [number, name, sets, reps, rest, tempo, notes, link]
    // or [name, sets, reps, rest, tempo, notes]
    if (!currentDay) continue;

    let name = '';
    let sets = 3;
    let reps = '10';
    let restSeconds: number | null = null;
    let tempo = '';
    let notes = '';

    // Detect if first cell is a number (row index)
    const firstIsNum = /^\d+\.?$/.test(firstCell);
    const offset = firstIsNum ? 1 : 0;

    name = cells[offset] || '';
    if (!name) continue;

    // Parse sets
    const setsStr = cells[offset + 1] || '';
    const parsedSets = parseInt(setsStr);
    if (!isNaN(parsedSets) && parsedSets > 0 && parsedSets <= 20) {
      sets = parsedSets;
    }

    // Parse reps (could be "8-12", "6--8", "AMRAP", etc.)
    reps = (cells[offset + 2] || '10').replace(/--/g, '-');

    // Parse rest (could be "90s", "120s", "150", etc.)
    const restStr = cells[offset + 3] || '';
    const restMatch = restStr.match(/(\d+)/);
    if (restMatch) {
      restSeconds = parseInt(restMatch[1]);
    }

    // Parse tempo (e.g. "2/0/1/0", "3-1-2-0")
    tempo = cells[offset + 4] || '';

    // Parse notes
    notes = cells[offset + 5] || '';

    // Skip link column (offset + 6)

    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name,
      sets,
      reps,
      weight: '',
      rpe: null,
      tempo,
      restSeconds,
      notes,
    };
    currentDay.exercises.push(exercise);
  }

  // Generate program name from sheet name or first day
  const sheetName = wb.SheetNames[0];
  const programName = sheetName && sheetName.length > 3
    ? sheetName.replace(/[_-]/g, ' ')
    : days.length > 0
      ? 'Imported Program'
      : 'Empty Program';

  return {
    id: crypto.randomUUID(),
    name: programName,
    status: 'draft',
    durationWeeks: 4,
    clientIds: [],
    days,
    isTemplate: false,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
}

export default function ProgramImporter({ onImported, onBack }: ProgramImporterProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const tr = t.programImporter;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<WorkoutProgram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const program = parseWorkbook(wb);

      if (program.days.length === 0) {
        setError(tr.errorNoDays);
        return;
      }

      setPreview(program);
    } catch {
      setError(tr.errorParse);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const confirmImport = () => {
    if (preview) {
      onImported(preview);
    }
  };

  const totalExercises = preview?.days.reduce((s, d) => s + d.exercises.length, 0) ?? 0;

  return (
    <div style={{ ...s.page, padding: isMobile ? '16px' : '24px 32px' }}>
      <motion.button onClick={onBack} style={s.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
        <ArrowLeft size={16} /> {tr.back}
      </motion.button>

      <div style={s.header}>
        <h2 style={s.title}>{tr.title}</h2>
        <p style={s.subtitle}>{tr.subtitle}</p>
      </div>

      {!preview ? (
        <GlassCard delay={0.1}>
          <div
            style={s.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
            <div style={s.uploadIcon}>
              <Upload size={32} color="var(--accent-primary)" />
            </div>
            <p style={s.dropText}>
              {tr.dropText}
            </p>
            <p style={s.dropSubtext}>
              {tr.dropSubtext}
            </p>
            {fileName && !error && (
              <p style={{ ...s.dropSubtext, color: 'var(--accent-primary)' }}>
                <FileSpreadsheet size={14} style={{ verticalAlign: 'middle' }} /> {fileName}
              </p>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={s.errorBanner}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={s.tips}>
            <p style={s.tipTitle}>{tr.tipsTitle}</p>
            <ul style={s.tipList}>
              {tr.tips.map((tip: string) => <li key={tip}>{tip}</li>)}
            </ul>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Preview */}
          <GlassCard delay={0.1}>
            <div style={s.previewHeader}>
              <div>
                <h3 style={s.previewTitle}>
                  <FileSpreadsheet size={18} color="var(--accent-primary)" /> {preview.name}
                </h3>
                <p style={s.previewMeta}>
                  {t.programs.days(preview.days.length)} · {t.programs.exercises(totalExercises)} · {tr.from} {fileName}
                </p>
              </div>
              <button
                onClick={() => { setPreview(null); setFileName(''); }}
                style={s.resetBtn}
              >
                <X size={14} /> {tr.chooseDifferent}
              </button>
            </div>
          </GlassCard>

          {preview.days.map((day, di) => (
            <GlassCard key={day.id} delay={0.1 + di * 0.05}>
              <div style={s.dayHeader}>
                <Dumbbell size={16} color="var(--accent-primary)" />
                <h4 style={s.dayName}>{day.name}</h4>
                <span style={s.exCount}>{day.exercises.length}</span>
              </div>
              <div style={s.exList}>
                {day.exercises.map((ex, ei) => (
                  <div key={ex.id} style={s.exRow}>
                    <span style={s.exNum}>{ei + 1}</span>
                    <div style={s.exInfo}>
                      <span style={s.exName}>{ex.name}</span>
                      <div style={s.exChips}>
                        <span style={s.chip}>{ex.sets} × {ex.reps}</span>
                        {ex.restSeconds && <span style={s.chip}>Rest {ex.restSeconds}s</span>}
                        {ex.tempo && <span style={s.chip}>{ex.tempo}</span>}
                        {ex.notes && <span style={{ ...s.chip, fontStyle: 'italic' }}>{ex.notes}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}

          <GlassCard delay={0.2}>
            <div style={s.actions}>
              <p style={s.actionNote}>
                <Check size={14} style={{ verticalAlign: 'middle', color: 'var(--accent-primary)' }} />
                {' '}{tr.confirmNote}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setPreview(null); setFileName(''); }} style={s.cancelBtn}>
                  {tr.cancel}
                </button>
                <motion.button
                  onClick={confirmImport}
                  style={s.importBtn}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Check size={16} /> {tr.importBtn}
                </motion.button>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    height: 'calc(100vh - var(--header-height))',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '48px 24px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--glass-border)',
  },
  uploadIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    background: 'var(--accent-primary-dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dropSubtext: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    margin: '0 16px',
    borderRadius: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: '14px',
  },
  tips: {
    padding: '16px 20px',
  },
  tipTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  tipList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  // Preview
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  previewTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewMeta: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: '13px',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  dayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 20px 10px',
  },
  dayName: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  exCount: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-subtle-hover)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontFamily: 'var(--font-mono)',
  },
  exList: {
    padding: '0 20px 14px',
  },
  exRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid var(--glass-border)',
  },
  exNum: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    background: 'var(--bg-subtle-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    marginTop: '2px',
  },
  exInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  exName: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  exChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  chip: {
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  actionNote: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
  },
  importBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-primary)',
    border: 'none',
    color: 'var(--text-on-accent)',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    boxShadow: '0 0 12px var(--accent-primary-dim)',
  },
};
