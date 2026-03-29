import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Radio, Send, Loader2, Play, ChevronRight, Terminal } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────
type Phase = 'join' | 'waiting' | 'briefing' | 'simulation' | 'submitted';

interface ClassInfo {
  id: string;
  name: string;
  section_code: string;
}

interface SimulationInfo {
  id: string;
  class_id: string;
  status: string;
}

interface Decisions {
  tiktok_spend: number;
  instagram_spend: number;
  facebook_spend: number;
  newspaper_spend: number;
  strategy_notes: string;
}

const TOTAL_BUDGET = 20000;

const MISSION_LOG_LINES = [
  { time: 0, text: '> SYSTEM BOOT: Initializing simulation environment...' },
  { time: 2, text: '> INTEL LOADED: Market data for Q4 campaign received.' },
  { time: 5, text: '> BRIEFING: You have been assigned a $20,000 marketing budget.' },
  { time: 8, text: '> OBJECTIVE: Maximize revenue across 3 product tiers.' },
  { time: 12, text: '> CHANNELS: TikTok • Instagram • Facebook • Newspaper' },
  { time: 15, text: '> PRODUCTS: Bottle ($10) • Cushion ($50) • Chair ($500)' },
  { time: 18, text: '> WARNING: Each channel has different conversion dynamics.' },
  { time: 22, text: '> ADVISORY: Analyze cost-per-click and conversion rates carefully.' },
  { time: 25, text: '> STATUS: Briefing complete. Awaiting your decisions, Operator.' },
];

// ─── HUD Decorative Components ──────────────────────────────────
const HudCorner = ({ position }: { position: string }) => (
  <div className={`absolute w-4 h-4 ${position}`}>
    <div className="absolute inset-0 border-l-2 border-t-2 border-emerald-500/40" />
  </div>
);

const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
    animate={{ top: ['0%', '100%'] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
  />
);

// ─── Main Component ─────────────────────────────────────────────
export default function StudentSimulation() {
  const [phase, setPhase] = useState<Phase>('join');
  const [accessCode, setAccessCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [simulation, setSimulation] = useState<SimulationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [missionLogIndex, setMissionLogIndex] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [decisions, setDecisions] = useState<Decisions>({
    tiktok_spend: 5000,
    instagram_spend: 5000,
    facebook_spend: 5000,
    newspaper_spend: 5000,
    strategy_notes: '',
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const missionLogRef = useRef<HTMLDivElement>(null);

  const remainingBudget = TOTAL_BUDGET - (
    decisions.tiktok_spend + decisions.instagram_spend +
    decisions.facebook_spend + decisions.newspaper_spend
  );

  // ─── Join Flow ──────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    if (!accessCode.trim() || !studentName.trim()) {
      toast.error('Please enter both access code and your name.');
      return;
    }
    setLoading(true);
    try {
      // Look up class by section code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name, section_code')
        .eq('section_code', accessCode.trim().toUpperCase())
        .maybeSingle();

      if (classError || !classData) {
        toast.error('Invalid access code. Please check and try again.');
        setLoading(false);
        return;
      }
      setClassInfo(classData);

      // Check for active simulation
      const { data: simData } = await supabase
        .from('simulations')
        .select('id, class_id, status')
        .eq('class_id', classData.id)
        .eq('status', 'active')
        .maybeSingle();

      if (simData) {
        setSimulation(simData);
        setPhase('briefing');
      } else {
        setPhase('waiting');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    }
    setLoading(false);
  }, [accessCode, studentName]);

  // ─── Polling for active simulation (waiting phase) ────────
  useEffect(() => {
    if (phase !== 'waiting' || !classInfo) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('simulations')
        .select('id, class_id, status')
        .eq('class_id', classInfo.id)
        .eq('status', 'active')
        .maybeSingle();
      if (data) {
        setSimulation(data);
        setPhase('briefing');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [phase, classInfo]);

  // ─── Mission log auto-scroll ──────────────────────────────
  useEffect(() => {
    if (phase !== 'briefing') return;
    const timer = setInterval(() => {
      setMissionLogIndex(prev => {
        if (prev >= MISSION_LOG_LINES.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    missionLogRef.current?.scrollTo({ top: missionLogRef.current.scrollHeight, behavior: 'smooth' });
  }, [missionLogIndex]);

  // ─── Submit Decision ──────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (remainingBudget !== 0) {
      toast.error(`Budget must be exactly $${TOTAL_BUDGET.toLocaleString()}. You have $${Math.abs(remainingBudget).toLocaleString()} ${remainingBudget > 0 ? 'remaining' : 'over'}.`);
      return;
    }
    if (!simulation || !classInfo) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_responses')
        .insert({
          simulation_id: simulation.id,
          class_id: classInfo.id,
          student_name: studentName.trim(),
          student_identifier: studentId.trim() || studentName.trim(),
          decisions: decisions as unknown as Record<string, unknown>,
        });

      if (error) {
        toast.error('Failed to submit. Please try again.');
        console.error(error);
      } else {
        setPhase('submitted');
        toast.success('Decision submitted successfully!');
      }
    } catch {
      toast.error('Connection error.');
    }
    setLoading(false);
  }, [decisions, simulation, classInfo, studentName, studentId, remainingBudget]);

  const updateSpend = (channel: keyof Omit<Decisions, 'strategy_notes'>, value: number) => {
    setDecisions(prev => ({ ...prev, [channel]: value }));
  };

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-emerald-100 font-mono relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <ScanLine />

      <AnimatePresence mode="wait">
        {/* ─── JOIN PHASE ──────────────────────────────────── */}
        {phase === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex items-center justify-center min-h-screen p-4"
          >
            <div className="w-full max-w-md space-y-8">
              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10"
                >
                  <Shield className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <h1 className="text-2xl font-bold tracking-wider text-emerald-300 uppercase">
                  Join Simulation
                </h1>
                <p className="text-sm text-emerald-500/70 tracking-wide">
                  Enter your class access code to begin
                </p>
              </div>

              <div className="relative border border-emerald-500/20 bg-gray-900/80 rounded-lg p-6 space-y-5">
                <HudCorner position="top-0 left-0" />
                <HudCorner position="top-0 right-0 rotate-90" />
                <HudCorner position="bottom-0 left-0 -rotate-90" />
                <HudCorner position="bottom-0 right-0 rotate-180" />

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-emerald-500/60">Access Code</label>
                  <Input
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MKTG-101-FALL"
                    className="bg-gray-800/50 border-emerald-500/20 text-emerald-100 placeholder:text-emerald-500/30 font-mono tracking-wider focus:border-emerald-400 focus:ring-emerald-400/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-emerald-500/60">Your Name</label>
                  <Input
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="Full name"
                    className="bg-gray-800/50 border-emerald-500/20 text-emerald-100 placeholder:text-emerald-500/30 font-mono focus:border-emerald-400 focus:ring-emerald-400/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-emerald-500/60">Student ID <span className="text-emerald-500/40">(optional)</span></label>
                  <Input
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. STU-12345"
                    className="bg-gray-800/50 border-emerald-500/20 text-emerald-100 placeholder:text-emerald-500/30 font-mono tracking-wider focus:border-emerald-400 focus:ring-emerald-400/30"
                  />
                </div>

                <Button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-gray-950 font-bold tracking-wider uppercase border border-emerald-400/30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                  Enter Simulation
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── WAITING PHASE ───────────────────────────────── */}
        {phase === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex items-center justify-center min-h-screen p-4"
          >
            <div className="text-center space-y-6 max-w-md">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-cyan-500/30 bg-cyan-500/5"
              >
                <Radio className="w-10 h-10 text-cyan-400" />
              </motion.div>
              <h2 className="text-xl font-bold tracking-wider text-cyan-300 uppercase">
                Standby Mode
              </h2>
              <p className="text-sm text-cyan-500/60 tracking-wide">
                Connected to <span className="text-cyan-300">{classInfo?.name}</span>
              </p>
              <p className="text-xs text-cyan-500/40">
                Waiting for your professor to activate the simulation...
              </p>
              <div className="flex items-center justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── BRIEFING PHASE ──────────────────────────────── */}
        {phase === 'briefing' && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col min-h-screen"
          >
            {/* Video area — top 70% */}
            <div className="flex-[7] relative bg-black flex items-center justify-center border-b border-emerald-500/20">
              <div className="text-center space-y-4 p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/5">
                  <Play className="w-10 h-10 text-emerald-400 ml-1" />
                </div>
                <p className="text-sm text-emerald-500/50 tracking-wider uppercase">
                  Mission Briefing Video
                </p>
                <p className="text-xs text-emerald-500/30">
                  Video player placeholder — connect your briefing video URL here
                </p>
              </div>
              {/* Uncomment and set src to use a real video:
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                onEnded={() => setVideoEnded(true)}
                controls
              >
                <source src="/briefing-video.mp4" type="video/mp4" />
              </video>
              */}
            </div>

            {/* Mission Log — bottom 30% */}
            <div className="flex-[3] bg-gray-900/95 border-t border-emerald-500/20 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-emerald-500/10">
                <Terminal className="w-4 h-4 text-emerald-500/60" />
                <span className="text-xs uppercase tracking-widest text-emerald-500/60">Mission Log</span>
              </div>
              <div ref={missionLogRef} className="flex-1 overflow-y-auto p-4 space-y-1 text-sm">
                {MISSION_LOG_LINES.slice(0, missionLogIndex + 1).map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-emerald-400/80 leading-relaxed"
                  >
                    {line.text}
                  </motion.div>
                ))}
                {missionLogIndex >= MISSION_LOG_LINES.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="pt-4"
                  >
                    <Button
                      onClick={() => setPhase('simulation')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-gray-950 font-bold tracking-wider uppercase"
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Begin Simulation
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── SIMULATION PHASE ────────────────────────────── */}
        {phase === 'simulation' && (
          <motion.div
            key="simulation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen p-4 md:p-8"
          >
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-wider text-emerald-300 uppercase">
                    Active Simulation
                  </h1>
                  <p className="text-xs text-emerald-500/50 tracking-wide mt-1">
                    {classInfo?.name} • Operator: {studentName}
                  </p>
                </div>
                <div className={`text-sm font-bold tracking-wider px-3 py-1 rounded border ${
                  remainingBudget === 0
                    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    : remainingBudget < 0
                    ? 'text-red-300 border-red-500/30 bg-red-500/10'
                    : 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                }`}>
                  {remainingBudget === 0 ? '✓ BUDGET BALANCED' : `$${Math.abs(remainingBudget).toLocaleString()} ${remainingBudget > 0 ? 'REMAINING' : 'OVER'}`}
                </div>
              </div>

              {/* Channel Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { key: 'tiktok_spend', label: 'TikTok', color: 'text-pink-400' },
                  { key: 'instagram_spend', label: 'Instagram', color: 'text-purple-400' },
                  { key: 'facebook_spend', label: 'Facebook', color: 'text-blue-400' },
                  { key: 'newspaper_spend', label: 'Newspaper', color: 'text-amber-400' },
                ] as const).map(({ key, label, color }) => (
                  <Card key={key} className="bg-gray-900/80 border-emerald-500/15">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold uppercase tracking-wider ${color}`}>{label}</span>
                        <span className="text-lg font-bold text-emerald-200 font-mono">
                          ${decisions[key].toLocaleString()}
                        </span>
                      </div>
                      <Slider
                        value={[decisions[key]]}
                        onValueChange={([v]) => updateSpend(key, v)}
                        min={0}
                        max={TOTAL_BUDGET}
                        step={500}
                        className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-500 [&_.bg-primary]:bg-emerald-500/50"
                      />
                      <div className="flex justify-between text-[10px] text-emerald-500/40 uppercase tracking-wider">
                        <span>$0</span>
                        <span>${TOTAL_BUDGET.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Strategy Notes */}
              <Card className="bg-gray-900/80 border-emerald-500/15">
                <CardContent className="p-4 space-y-2">
                  <label className="text-xs uppercase tracking-widest text-emerald-500/60">
                    Strategy Notes <span className="text-emerald-500/30">(optional)</span>
                  </label>
                  <Textarea
                    value={decisions.strategy_notes}
                    onChange={e => setDecisions(prev => ({ ...prev, strategy_notes: e.target.value }))}
                    placeholder="Explain your reasoning..."
                    className="bg-gray-800/50 border-emerald-500/20 text-emerald-100 placeholder:text-emerald-500/30 font-mono min-h-[80px] focus:border-emerald-400 focus:ring-emerald-400/30"
                  />
                </CardContent>
              </Card>

              {/* Submit Button with pulse */}
              <motion.div
                animate={remainingBudget === 0 ? { scale: [1, 1.02, 1] } : {}}
                transition={remainingBudget === 0 ? { duration: 1.5, repeat: Infinity } : {}}
              >
                <Button
                  onClick={handleSubmit}
                  disabled={loading || remainingBudget !== 0}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-gray-950 font-bold text-lg tracking-wider uppercase border border-emerald-400/30 disabled:opacity-30 disabled:bg-gray-700"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  Submit Decision
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ─── SUBMITTED PHASE ─────────────────────────────── */}
        {phase === 'submitted' && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex items-center justify-center min-h-screen p-4"
          >
            <div className="text-center space-y-6 max-w-md">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-emerald-400/40 bg-emerald-500/10"
              >
                <Shield className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-wider text-emerald-300 uppercase">
                Decision Submitted
              </h2>
              <p className="text-sm text-emerald-500/60 tracking-wide">
                Your allocation has been recorded. Stand by for results from your professor.
              </p>
              <div className="border border-emerald-500/20 bg-gray-900/60 rounded-lg p-4 text-left space-y-1 text-sm font-mono">
                <div className="text-emerald-500/50">TikTok: <span className="text-emerald-300">${decisions.tiktok_spend.toLocaleString()}</span></div>
                <div className="text-emerald-500/50">Instagram: <span className="text-emerald-300">${decisions.instagram_spend.toLocaleString()}</span></div>
                <div className="text-emerald-500/50">Facebook: <span className="text-emerald-300">${decisions.facebook_spend.toLocaleString()}</span></div>
                <div className="text-emerald-500/50">Newspaper: <span className="text-emerald-300">${decisions.newspaper_spend.toLocaleString()}</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
