import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Loader2, Send, Check, Dumbbell, User, ChevronRight,
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import type { Client, WorkoutProgram, WorkoutDay, Exercise } from '../types';

interface AIProgramCreatorProps {
  clients: Client[];
  onGenerated: (program: WorkoutProgram) => void;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SYSTEM_PROMPT = `You are FitCore AI - an expert personal trainer and program designer built into the FitCore coaching platform.

Your job: Have a short, focused conversation with the coach to build a workout program. You are practical and direct - like a senior coach talking to another coach.

RULES:
- Be SHORT. 1-2 sentences max per response. No filler.
- NEVER ask about injuries, equipment, session duration, or experience level unless the coach brings it up first. Assume they have a full gym and know what they're doing.
- Focus ONLY on what matters for the program: which days, what exercises, sets/reps/weight specifics.
- When the coach mentions exercises, IMMEDIATELY ask the details that matter: how many sets, rep range, barbell or dumbbell, what weight or % 1RM. This is what actually goes into the program.
- Don't ask generic questions. Every question should directly help you fill in the program.
- If the coach says something doesn't matter or is vague, just pick reasonable defaults and move on.
- Do NOT say you're ready to generate until you have completed ALL steps in the flow below. You MUST gather exercise details for every gym/strength day before moving on.
- For non-gym days (martial arts, boxing, BJJ, cardio, sports, etc.): do NOT invent exercises. Only include exercises the coach explicitly tells you. If the coach just says "Monday is boxing + BJJ", that day should have NO exercises in the program — it's just a label/placeholder. The coach handles those sessions themselves.
- ONLY generate exercises that the coach explicitly provides or confirms. Never make up exercises on your own.

FLOW (follow this order strictly — do not skip steps):
1. Ask what the training week looks like (days + activities)
2. Ask when the program starts and when it ends (or how many weeks). The coach may have phases (e.g. "3 days for the first month, then 4 days from May"). Capture this.
3. For EACH gym/strength day: ask which exercises the coach wants, then drill into sets/reps/weight details. Do not move to step 4 until you have exercise info for every gym day.
4. Ask what 3 key lifts/metrics to track on the client's progress dashboard (e.g. bench press, squat, deadlift - or overhead press, pull-ups, whatever matters for this client). Also ask their current numbers so we have a starting point.
5. Ask what the client's main goals are (e.g. "lose 5kg by summer", "hit 100kg bench", "improve cardio endurance"). Be specific - not generic stuff like "get fit". These go on their progress dashboard.
6. ONLY after you have: start/end dates + exercises for all gym days + tracked lifts + goals — tell the coach you're ready to generate and include the exact tag [READY] at the end of your message. Do NOT include [READY] until you truly have all the information.

Start with a brief greeting and ask about their client's training week.`;

const GENERATE_PROMPT = `Based on our conversation, generate the complete workout program now.

RESPOND WITH ONLY VALID JSON in this exact structure (no markdown, no code blocks, just raw JSON):
{
  "programName": "string - creative program name based on our discussion",
  "durationWeeks": number,
  "trackedLifts": [
    {
      "name": "string - e.g. 'Bench Press', 'Squat', 'Deadlift', 'Overhead Press'",
      "currentValue": number or null (in kg, the client's current number if discussed),
      "unit": "kg"
    }
  ],
  "clientGoals": ["string - specific goals like 'Lose 5kg by summer', 'Bench 100kg', 'Run 5k under 25 min'"],
  "days": [
    {
      "name": "string - e.g. 'Monday - BJJ + MMA' or 'Friday - Upper Body Hypertrophy'",
      "exercises": [
        {
          "name": "string - exercise name",
          "sets": number,
          "reps": "string - e.g. '8-12', '5', 'AMRAP', '30s'",
          "weight": "string - e.g. '70% 1RM', 'moderate', 'BW', '20kg'",
          "rpe": number or null (1-10 scale),
          "tempo": "string - e.g. '3-1-2-0' or empty string",
          "restSeconds": number or null (in seconds),
          "notes": "string - coaching cues, form tips"
        }
      ]
    }
  ]
}

trackedLifts: Include exactly 3 key lifts/metrics that the coach wants to track on the client's progress dashboard. Use the lifts discussed in conversation. If not discussed, default to Bench Press, Squat, Deadlift.
clientGoals: Include the specific goals discussed with the coach. Make them concrete and measurable when possible. These appear on the client's progress dashboard.

CRITICAL RULES for generation:
- For gym/strength days: include ONLY the exercises the coach explicitly mentioned. Do not add extra exercises. Use exact sets/reps/weight the coach provided.
- For non-gym days (martial arts, boxing, BJJ, sports, etc.): include the day with an empty exercises array []. Do NOT invent drills, sparring rounds, or any exercises the coach didn't specify. These are just labels.
- If the coach described phases (e.g. "3 days until April, then 4 days from May"), include ALL days but add phase info in the day name (e.g. "Sunday - Full Body (starts May 1st)").
- Use the start/end dates discussed to calculate durationWeeks accurately.
- Be specific with loads and coaching cues for the exercises the coach DID provide.`;

export default function AIProgramCreator({ clients, onGenerated, onBack }: AIProgramCreatorProps) {
  useIsMobile(); // hook must be called
  const { lang } = useLang();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [phase, setPhase] = useState<'pick-client' | 'chat'>('pick-client');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<WorkoutProgram | null>(null);
  const [aiReady, setAiReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const startChat = () => {
    setPhase('chat');
    const clientInfo = selectedClient
      ? `The coach is building a program for ${selectedClient.name} (${selectedClient.plan} plan, goals: ${selectedClient.goals.join(', ')})`
      : 'The coach is building a general program template';
    sendToAI([
      { role: 'system' as const, content: SYSTEM_PROMPT + `\n\nCLIENT CONTEXT: ${clientInfo}` },
      { role: 'user' as const, content: 'Hey, I need to create a workout program for my client.' },
    ]);
  };

  const getConversationMessages = () => {
    const clientInfo = selectedClient
      ? `The coach is building a program for ${selectedClient.name} (${selectedClient.plan} plan, goals: ${selectedClient.goals.join(', ')})`
      : 'The coach is building a general program template';
    const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + `\n\nCLIENT CONTEXT: ${clientInfo}` },
    ];
    for (const msg of messages) msgs.push({ role: msg.role, content: msg.text });
    return msgs;
  };

  const sendToAI = async (apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) => {
    setLoading(true);
    try {
      // Separate system message from conversation messages for Claude API
      const systemMsg = apiMessages.find(m => m.role === 'system')?.content || '';
      const conversationMsgs = apiMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: { system: systemMsg, messages: conversationMsgs, temperature: 0.7, max_tokens: 1000 },
      });
      if (fnError) throw new Error(fnError.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);
      let text = (data?.content?.[0]?.text || '').trim();
      if (text.includes('[READY]')) {
        setAiReady(true);
        text = text.replace(/\s*\[READY\]\s*/g, '').trim();
      }
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}` }]);
    } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const apiMessages = getConversationMessages();
    apiMessages.push({ role: 'user', content: text });
    await sendToAI(apiMessages);
  };

  const generateProgram = async () => {
    setGenerating(true); setLoading(true);
    const apiMessages = getConversationMessages();
    apiMessages.push({ role: 'user', content: GENERATE_PROMPT });
    try {
      const systemMsg = apiMessages.find(m => m.role === 'system')?.content || '';
      const conversationMsgs = apiMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
      const { data, error: fnError } = await supabase.functions.invoke('anthropic-proxy', {
        body: { system: systemMsg, messages: conversationMsgs, temperature: 0.7, max_tokens: 4000 },
      });
      if (fnError) throw new Error(fnError.message || 'Edge function error');
      if (data?.error) throw new Error(data.error);
      const content = (data.content?.[0]?.text || '').trim();
      const jsonStr = content.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      const generated = JSON.parse(jsonStr);
      const program: WorkoutProgram = {
        id: crypto.randomUUID(), name: generated.programName || 'AI Generated Program', status: 'draft',
        durationWeeks: generated.durationWeeks || 8, clientIds: selectedClientId ? [selectedClientId] : [],
        days: generated.days.map((day: { name: string; exercises: Array<{ name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; restSeconds: number | null; notes: string; }> }) => ({
          id: crypto.randomUUID(), name: day.name,
          exercises: day.exercises.map((ex: { name: string; sets: number; reps: string; weight: string; rpe: number | null; tempo: string; restSeconds: number | null; notes: string; }): Exercise => ({
            id: crypto.randomUUID(), name: ex.name, sets: ex.sets || 3, reps: String(ex.reps || '10'),
            weight: ex.weight || '', rpe: ex.rpe ?? null, tempo: ex.tempo || '', restSeconds: ex.restSeconds ?? null, notes: ex.notes || '',
          })),
        } as WorkoutDay)),
        isTemplate: false, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0],
      };
      // Save tracked lifts to client_metrics if client selected
      if (selectedClientId && generated.trackedLifts) {
        const liftData: Record<string, number | null> = {};
        for (const lift of generated.trackedLifts) {
          const key = lift.name.toLowerCase().replace(/\s+/g, '_');
          if (key.includes('bench')) liftData.bench_press = lift.currentValue ?? null;
          else if (key.includes('squat')) liftData.squat = lift.currentValue ?? null;
          else if (key.includes('deadlift') || key.includes('dead_lift')) liftData.deadlift = lift.currentValue ?? null;
        }
        if (Object.values(liftData).some(v => v !== null)) {
          await supabase.from('client_metrics').insert({
            client_id: selectedClientId,
            recorded_at: new Date().toISOString().split('T')[0],
            ...liftData,
          });
        }
      }

      // Save client goals if provided
      if (selectedClientId && generated.clientGoals?.length) {
        await supabase.from('clients').update({
          goals: generated.clientGoals,
        }).eq('id', selectedClientId);
      }

      setGeneratedProgram(program);
      setGenerating(false);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: `Program "${program.name}" is ready! Review it on the left and hit Save when you're happy.` }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: `Failed to generate: ${err instanceof Error ? err.message : 'Unknown error'}. Try again.` }]);
      setGenerating(false);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isMobile = useIsMobile();

  // ═══════════════════════════════════════
  // CLIENT PICKER - Full screen first step
  // ═══════════════════════════════════════
  if (phase === 'pick-client') {
    return (
      <div style={{ ...s.outerPage, padding: isMobile ? '14px 16px' : '24px' }}>
        <div style={{ ...s.pickerCentered, padding: isMobile ? '12px 0' : '24px 20px' }}>
          <motion.button onClick={onBack} style={{ ...s.backBtn, ...(isMobile ? { fontSize: '13px', padding: '6px 10px' } : {}) }} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
            <ArrowLeft size={isMobile ? 13 : 15} /> {lang === 'pl' ? 'Powrót' : 'Back'}
          </motion.button>
          <motion.div
            style={s.pickerCard}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div style={s.pickerGlow} />
            <div style={s.pickerIconWrap}>
              <div style={{ ...s.pickerIcon, ...(isMobile ? { width: '44px', height: '44px', borderRadius: '12px' } : {}) }}><Sparkles size={isMobile ? 18 : 22} /></div>
            </div>
            <h2 style={{ ...s.pickerTitle, ...(isMobile ? { fontSize: '18px' } : {}) }}>{lang === 'pl' ? 'Kreator AI' : 'AI Program Builder'}</h2>
            <p style={{ ...s.pickerDesc, ...(isMobile ? { fontSize: '12px' } : {}) }}>{lang === 'pl' ? 'Wybierz klienta' : 'Select a client to get started'}</p>
            <div style={s.clientList}>
              {clients.filter(c => c.status === 'active').map(client => (
                <motion.button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  style={{
                    ...s.clientCard,
                    ...(isMobile ? { padding: '10px 12px', gap: '10px' } : {}),
                    borderColor: selectedClientId === client.id ? 'var(--accent-primary)' : 'var(--glass-border)',
                    background: selectedClientId === client.id ? 'rgba(0,229,200,0.08)' : 'transparent',
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div style={{ ...s.clientAvatar, ...(isMobile ? { width: '28px', height: '28px', borderRadius: '7px', fontSize: '11px' } : {}), background: selectedClientId === client.id ? 'var(--accent-primary)' : 'var(--bg-subtle-hover)' }}>
                    {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={s.clientInfo}>
                    <span style={{ ...s.clientName, ...(isMobile ? { fontSize: '14px' } : {}) }}>{client.name}</span>
                    <span style={{ ...s.clientMeta, ...(isMobile ? { fontSize: '11px' } : {}) }}>{client.plan}</span>
                  </div>
                  {selectedClientId === client.id ? (
                    <div style={s.checkMark}><Check size={13} /></div>
                  ) : (
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  )}
                </motion.button>
              ))}
            </div>
            <motion.button
              onClick={startChat}
              style={{ ...s.pickerStartBtn, ...(isMobile ? { fontSize: '13px' } : {}), opacity: selectedClientId ? 1 : 0.35, pointerEvents: selectedClientId ? 'auto' : 'none' }}
              whileHover={selectedClientId ? { scale: 1.01 } : {}}
              whileTap={selectedClientId ? { scale: 0.99 } : {}}
            >
              <Sparkles size={15} /> {lang === 'pl' ? 'Rozpocznij' : 'Start Building'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // WORKSPACE - Left cards + Right chatbot
  // ═══════════════════════════════════════
  return (
    <div style={{ ...s.outerPage, padding: isMobile ? '14px 16px' : '24px' }}>
      <div style={{ ...s.layoutGrid, gridTemplateColumns: isMobile ? '1fr' : '320px 1fr' }}>
        {/* ── LEFT COLUMN (hidden on mobile) ── */}
        {!isMobile && <div style={s.leftCol}>
          {/* Back */}
          <motion.button onClick={onBack} style={s.backBtn} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
            <ArrowLeft size={15} /> {lang === 'pl' ? 'Powrót' : 'Back'}
          </motion.button>

          {/* Card 1: Selected Client */}
          <motion.div
            style={s.leftCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <div style={s.leftCardHeader}>
              <User size={14} color="var(--accent-primary)" />
              <span style={s.leftCardTitle}>{lang === 'pl' ? 'Klient' : 'Client'}</span>
            </div>
            {selectedClient && (
              <div style={{ ...s.clientCard, borderColor: 'var(--accent-primary)', background: 'rgba(0,229,200,0.08)', cursor: 'default' }}>
                <div style={{ ...s.clientAvatar, background: 'var(--accent-primary)' }}>
                  {selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={s.clientInfo}>
                  <span style={s.clientName}>{selectedClient.name}</span>
                  <span style={s.clientMeta}>{selectedClient.plan}</span>
                </div>
                <div style={s.checkMark}><Check size={13} /></div>
              </div>
            )}
          </motion.div>

          {/* Card 2: AI Info / Status */}
          <motion.div
            style={s.leftCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <div style={s.leftCardHeader}>
              <Sparkles size={14} color="var(--accent-primary)" />
              <span style={s.leftCardTitle}>{lang === 'pl' ? 'Kreator AI' : 'AI Program Builder'}</span>
            </div>
            <div style={s.infoContent}>
              <p style={s.infoText}>
                {lang === 'pl' ? 'Opisz plan treningowy w czacie, a FitCore AI wygeneruje kompletny program.' : 'Describe the training plan in the chat and FitCore AI will generate a complete periodized program.'}
              </p>
              <div style={s.infoSteps}>
                <div style={{ ...s.infoStep, opacity: phase === 'chat' ? 1 : 0.4 }}>
                  <div style={{ ...s.stepDot, background: messages.length > 0 ? 'var(--accent-primary)' : 'var(--glass-border)' }} />
                  <span>{lang === 'pl' ? 'Omów program' : 'Discuss the program'}</span>
                </div>
                <div style={{ ...s.infoStep, opacity: aiReady ? 1 : 0.4 }}>
                  <div style={{ ...s.stepDot, background: aiReady ? 'var(--accent-primary)' : 'var(--glass-border)' }} />
                  <span>{lang === 'pl' ? 'Generuj program' : 'Generate program'}</span>
                </div>
                <div style={{ ...s.infoStep, opacity: generatedProgram ? 1 : generating ? 0.7 : 0.4 }}>
                  <div style={{ ...s.stepDot, background: generatedProgram ? 'var(--accent-primary)' : 'var(--glass-border)' }} />
                  <span>{lang === 'pl' ? 'Sprawdź i zapisz' : 'Review & save'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Program Preview */}
          <motion.div
            style={{ ...s.leftCard, flex: 1, overflow: 'auto' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
          >
            <div style={s.leftCardHeader}>
              <Dumbbell size={14} color="var(--accent-primary)" />
              <span style={s.leftCardTitle}>{lang === 'pl' ? 'Program' : 'Program'}</span>
            </div>
            {generatedProgram ? (
              <div style={s.programPreview}>
                <div style={s.programName}>{generatedProgram.name}</div>
                <div style={s.programMeta}>{generatedProgram.durationWeeks} {lang === 'pl' ? 'tyg.' : 'weeks'} · {generatedProgram.days.length} {lang === 'pl' ? 'dni treningowych' : 'training days'}</div>
                <div style={s.programDays}>
                  {generatedProgram.days.map((day, i) => (
                    <div key={day.id} style={s.programDay}>
                      <div style={s.programDayHeader}>
                        <div style={{ ...s.programDayDot, background: i % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)' }} />
                        <span style={s.programDayName}>{day.name}</span>
                        <span style={s.programDayCount}>{day.exercises.length} {lang === 'pl' ? 'ćwiczeń' : 'exercises'}</span>
                      </div>
                      <div style={s.programExercises}>
                        {day.exercises.map((ex) => (
                          <div key={ex.id} style={s.programExercise}>
                            <span style={s.exName}>{ex.name}</span>
                            <span style={s.exDetail}>{ex.sets}×{ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={() => onGenerated(generatedProgram)}
                  style={s.saveBtn}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Check size={14} /> {lang === 'pl' ? 'Zapisz Program' : 'Save Program'}
                </motion.button>
              </div>
            ) : (
              <div style={s.programEmpty}>
                <Dumbbell size={20} color="var(--text-tertiary)" style={{ opacity: 0.3 }} />
                <span style={s.programEmptyText}>
                  {generating ? (lang === 'pl' ? 'Generowanie...' : 'Generating...') : (lang === 'pl' ? 'Program pojawi się tutaj po wygenerowaniu' : 'Program will appear here after generation')}
                </span>
              </div>
            )}
          </motion.div>
        </div>}

        {/* ── Mobile: back button + save button above chat ── */}
        {isMobile && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <motion.button onClick={onBack} style={{ ...s.backBtn, fontSize: '13px', padding: '6px 10px' }} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}>
              <ArrowLeft size={13} /> {lang === 'pl' ? 'Powrót' : 'Back'}
            </motion.button>
            {generatedProgram && (
              <motion.button
                onClick={() => onGenerated(generatedProgram)}
                style={{ ...s.saveBtn, padding: '8px 16px', fontSize: '13px' }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Check size={14} /> {lang === 'pl' ? 'Zapisz Program' : 'Save Program'}
              </motion.button>
            )}
          </div>
        )}

        {/* ── RIGHT COLUMN - Chatbot card ── */}
        <motion.div
          style={s.chatCard}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div style={s.cardGlow} />

          {/* Card header */}
          <div style={{ ...s.cardHeader, ...(isMobile ? { padding: '12px 16px' } : {}) }}>
            <div style={s.cardHeaderLeft}>
              <div style={s.cardHeaderIcon}><Sparkles size={14} /></div>
              <span style={s.cardTitle}>FitCore AI</span>
            </div>
            <div style={s.cardOnline}>
              <div style={s.onlineDot} />
              <span>{lang === 'pl' ? 'Online' : 'Online'}</span>
            </div>
          </div>

          {/* Messages area */}
          <div style={s.cardMessages}>
            <div style={{ ...s.cardMessagesInner, ...(isMobile ? { padding: '16px 14px', gap: '14px' } : {}) }}>
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {msg.role === 'assistant' ? (
                          <div style={s.aiMsg}>
                            <div style={s.aiAvatar}><Sparkles size={11} /></div>
                            <div style={{ ...s.aiBubble, ...(isMobile ? { padding: '8px 12px' } : {}) }}>
                              <div style={{ ...s.aiText, ...(isMobile ? { fontSize: '13px' } : {}) }}>{msg.text}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={s.userMsg}>
                            <div style={{ ...s.userBubble, ...(isMobile ? { padding: '8px 12px' } : {}) }}>
                              <div style={{ ...s.userText, ...(isMobile ? { fontSize: '13px' } : {}) }}>{msg.text}</div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {loading && !generating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div style={s.aiMsg}>
                        <div style={s.aiAvatar}><Sparkles size={11} /></div>
                        <div style={s.aiBubble}>
                          <div style={s.dots}>
                            <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} style={s.dot} />
                            <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.15 }} style={s.dot} />
                            <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} style={s.dot} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {generating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.genRow}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'flex' }}>
                        <Loader2 size={15} color="var(--accent-primary)" />
                      </motion.div>
                      <span style={s.genText}>{lang === 'pl' ? 'Tworzenie programu...' : 'Building your program...'}</span>
                    </motion.div>
                  )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Card footer */}
          <div style={{ ...s.cardFooter, ...(isMobile ? { padding: '10px 14px 14px' } : {}) }}>
            {aiReady && !generating && !generatedProgram && (
              <motion.button
                onClick={generateProgram}
                style={{ ...s.genBtn, ...(isMobile ? { fontSize: '13px', padding: '9px 0' } : {}) }}
                disabled={loading}
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Dumbbell size={14} /> {lang === 'pl' ? 'Generuj Program' : 'Generate Program'}
              </motion.button>
            )}
            <div style={s.inputRow}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={lang === 'pl' ? 'Opisz program, którego potrzebujesz...' : 'Describe the program you need...'}
                style={{ ...s.textInput, ...(isMobile ? { fontSize: '13px', padding: '9px 12px' } : {}) }}
                rows={1}
                disabled={loading}
              />
              <motion.button
                onClick={sendMessage}
                style={{ ...s.sendBtn, ...(isMobile ? { width: '32px', height: '32px', borderRadius: '8px' } : {}), opacity: input.trim() && !loading ? 1 : 0.25 }}
                disabled={!input.trim() || loading}
                whileHover={input.trim() && !loading ? { scale: 1.06 } : {}}
                whileTap={input.trim() && !loading ? { scale: 0.94 } : {}}
              >
                <Send size={isMobile ? 12 : 14} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
const s: Record<string, React.CSSProperties> = {
  outerPage: {
    height: 'calc(100vh - var(--header-height))',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
  },

  // ── Layout grid: left cards + right chatbot ──
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '20px',
    width: '100%',
    maxWidth: '1100px',
    height: '100%',
  },

  // ── Picker screen ──
  pickerCentered: {
    width: '100%', maxWidth: '480px', padding: '24px 20px',
    display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto',
    margin: '0 auto',
  },
  pickerCard: {
    position: 'relative',
    borderRadius: '16px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)', padding: '36px 28px 28px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 30px rgba(0,0,0,0.15), 0 0 40px rgba(0,229,200,0.04)',
  },
  pickerGlow: {
    position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
    width: '200px', height: '100px', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(0,229,200,0.12), transparent 70%)',
    pointerEvents: 'none',
  },
  pickerIconWrap: { position: 'relative' },
  pickerIcon: {
    width: '52px', height: '52px', borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-on-accent)', boxShadow: '0 0 24px rgba(0,229,200,0.2)',
  },
  pickerTitle: { fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  pickerDesc: { fontSize: '15px', color: 'var(--text-tertiary)', margin: '0 0 4px' },
  pickerStartBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px 0', width: '100%', borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    border: 'none', color: 'var(--text-on-accent)', fontSize: '15px', fontWeight: 700,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    boxShadow: '0 0 20px rgba(0,229,200,0.15)', marginTop: '6px',
  },

  // ── Left column ──
  leftCol: {
    display: 'flex', flexDirection: 'column', gap: '16px',
    overflow: 'auto',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
    borderRadius: '8px', border: '1px solid var(--glass-border)',
    background: 'transparent', color: 'var(--text-tertiary)',
    fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-display)', cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  leftCard: {
    borderRadius: '14px', border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '14px',
  },
  leftCardHeader: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  leftCardTitle: {
    fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)',
  },

  // Client list
  clientList: { display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' },
  clientCard: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
    borderRadius: '10px', border: '1px solid var(--glass-border)',
    cursor: 'pointer', textAlign: 'left', width: '100%',
    fontFamily: 'var(--font-display)', transition: 'all 0.12s',
  },
  clientAvatar: {
    width: '36px', height: '36px', borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-on-accent)', flexShrink: 0,
  },
  clientInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  clientName: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' },
  clientMeta: { fontSize: '13px', color: 'var(--text-tertiary)' },
  checkMark: {
    width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-accent)', flexShrink: 0,
  },

  // Info card
  infoContent: { display: 'flex', flexDirection: 'column', gap: '14px' },
  infoText: { fontSize: '14px', lineHeight: 1.6, color: 'var(--text-tertiary)', margin: 0 },
  infoSteps: { display: 'flex', flexDirection: 'column', gap: '12px' },
  infoStep: {
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500,
    transition: 'opacity 0.3s',
  },
  stepDot: {
    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
    transition: 'background 0.3s',
  },

  // ── Program preview card ──
  programPreview: {
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  programName: {
    fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  programMeta: {
    fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
    fontWeight: 500,
  },
  programDays: {
    display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px',
  },
  programDay: {
    display: 'flex', flexDirection: 'column', gap: '6px',
  },
  programDayHeader: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  programDayDot: {
    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
  },
  programDayName: {
    fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', flex: 1,
  },
  programDayCount: {
    fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
  },
  programExercises: {
    display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px',
  },
  programExercise: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
  },
  exName: {
    fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 400,
  },
  exDetail: {
    fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
    fontWeight: 600, flexShrink: 0,
  },
  exMore: {
    fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 500, paddingTop: '2px',
  },
  saveBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    padding: '10px 0', width: '100%', borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    border: 'none', color: 'var(--text-on-accent)', fontSize: '14px', fontWeight: 700,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    boxShadow: '0 0 14px rgba(0,229,200,0.12)', marginTop: '8px',
  },
  programEmpty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '24px 0', flex: 1,
  },
  programEmptyText: {
    fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center',
  },

  // ── Right column - Chat card ──
  chatCard: {
    position: 'relative',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    background: 'var(--bg-card)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 4px 30px rgba(0,0,0,0.15), 0 0 40px rgba(0,229,200,0.04)',
  },
  cardGlow: {
    position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
    width: '300px', height: '120px', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(0,229,200,0.08), transparent 70%)',
    pointerEvents: 'none',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
    flexShrink: 0, position: 'relative', zIndex: 1,
  },
  cardHeaderLeft: {
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  cardHeaderIcon: {
    width: '28px', height: '28px', borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-on-accent)', boxShadow: '0 0 16px rgba(0,229,200,0.15)',
  },
  cardTitle: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' },
  cardOnline: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500,
  },
  onlineDot: {
    width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e',
    boxShadow: '0 0 6px rgba(34,197,94,0.4)',
  },
  wsClientBadge: {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '4px 10px 4px 8px', borderRadius: '8px',
    background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
    fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0,
  },

  // Messages area
  cardMessages: { flex: 1, overflowY: 'auto', overflowX: 'hidden' },
  cardMessagesInner: {
    padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px',
    minHeight: '100%',
  },

  // Waiting state
  chatWaiting: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '12px',
    minHeight: '300px', opacity: 0.5,
  },
  chatWaitingIcon: {
    width: '48px', height: '48px', borderRadius: '14px',
    background: 'var(--accent-primary-dim)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--accent-primary)',
  },
  chatWaitingText: {
    fontSize: '14px', color: 'var(--text-tertiary)', margin: 0,
  },

  // AI message
  aiMsg: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
  },
  aiAvatar: {
    width: '24px', height: '24px', borderRadius: '7px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-on-accent)', flexShrink: 0, marginTop: '2px',
  },
  aiBubble: {
    padding: '10px 14px', borderRadius: '12px 12px 12px 4px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
    maxWidth: '85%',
  },
  aiText: {
    fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)', whiteSpace: 'pre-wrap',
  },

  // User message
  userMsg: {
    display: 'flex', justifyContent: 'flex-end',
  },
  userBubble: {
    padding: '10px 14px', borderRadius: '12px 12px 4px 12px',
    background: 'rgba(0,229,200,0.1)', border: '1px solid rgba(0,229,200,0.2)',
    maxWidth: '85%',
  },
  userText: {
    fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)', whiteSpace: 'pre-wrap',
  },

  // Dots
  dots: { display: 'flex', gap: '3px', alignItems: 'center', padding: '4px 0' },
  dot: { width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-tertiary)', display: 'inline-block' },

  // Generating
  genRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', marginLeft: '34px' },
  genText: { fontSize: '13px', color: 'var(--text-tertiary)' },

  // Footer
  cardFooter: {
    padding: '12px 20px 16px', borderTop: '1px solid var(--glass-border)',
    flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px',
    position: 'relative', zIndex: 1,
  },
  genBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    padding: '10px 0', width: '100%', borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    border: 'none', color: 'var(--text-on-accent)', fontSize: '14px', fontWeight: 700,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    boxShadow: '0 0 14px rgba(0,229,200,0.12)',
  },
  inputRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  textInput: {
    flex: 1, padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--glass-border)', background: 'var(--bg-elevated)',
    color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-display)',
    outline: 'none', resize: 'none', lineHeight: 1.4, maxHeight: '120px', boxSizing: 'border-box',
  },
  sendBtn: {
    width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-primary)',
    border: 'none', color: 'var(--text-on-accent)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
};
