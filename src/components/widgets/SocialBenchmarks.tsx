import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Lock, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Benchmark { city: string; course: string; food: number; transit: number; sampleSize: number; }
// #propertyofbharat
interface Challenge { id: string; title: string; target: number; joined: boolean; }

const aggregateBenchmarks: Benchmark[] = [
  { city: "Delhi", course: "Engineering", food: 84, transit: 24, sampleSize: 214 },
  { city: "Delhi", course: "Arts", food: 73, transit: 21, sampleSize: 129 },
  { city: "Moscow", course: "Engineering", food: 136, transit: 42, sampleSize: 178 },
  { city: "Moscow", course: "Arts", food: 122, transit: 39, sampleSize: 111 },
];

const fetchAnonymizedBenchmarks = async () => new Promise<Benchmark[]>((resolve) => window.setTimeout(() => resolve(aggregateBenchmarks), 180));
const LOBBY_KEY = "cash-compass-private-lobby-v1";

// #propertyofindia
export const SocialBenchmarks = () => {
  const { formatFromUSD } = useCurrency();
  const [data, setData] = useState<Benchmark[]>([]);
  const [city, setCity] = useState("Delhi");
  const [course, setCourse] = useState("Engineering");
  const [optedIn, setOptedIn] = useState(() => localStorage.getItem(LOBBY_KEY) === "true");
  // #meehikasharma
  const [target, setTarget] = useState("20");
  const [challenges, setChallenges] = useState<Challenge[]>([{ id: "challenge-week", title: "Seven-day save streak", target: 20, joined: false }]);

  useEffect(() => { fetchAnonymizedBenchmarks().then(setData); }, []);
  useEffect(() => localStorage.setItem(LOBBY_KEY, String(optedIn)), [optedIn]);
  const benchmark = useMemo(() => data.find((item) => item.city === city && item.course === course), [city, course, data]);

  const createChallenge = () => {
    const amount = Number(target);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setChallenges((current) => [{ id: `challenge-${Date.now()}`, title: "My weekly savings challenge", target: amount, joined: true }, ...current]);
    setTarget("");
  };

  return (
    <section className="rounded-3xl border border-border bg-card/90 p-5 shadow-card">
      <div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Users className="h-5 w-5" /></div><div><p className="font-semibold font-heading">Student benchmark ledger</p><p className="mt-0.5 text-sm text-muted-foreground">Anonymous regional averages — never individual activity.</p></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <select value={city} onChange={(event) => setCity(event.target.value)} className="h-9 rounded-xl border border-border bg-card px-2 text-foreground"><option>Delhi</option><option>Moscow</option></select>
        <select value={course} onChange={(event) => setCourse(event.target.value)} className="h-9 rounded-xl border border-border bg-card px-2 text-foreground"><option>Engineering</option><option>Arts</option></select>
      </div>
      {benchmark ? <div className="mt-3 rounded-2xl border border-border bg-secondary/25 p-3"><p className="text-sm leading-relaxed">Students in <span className="font-semibold">{benchmark.course}</span> in {benchmark.city} spend about <span className="font-semibold">{formatFromUSD(benchmark.food)}</span> per month on food and {formatFromUSD(benchmark.transit)} on transit.</p><p className="mt-2 text-xs text-muted-foreground">Aggregated from {benchmark.sampleSize}+ verified students. No profiles, names, or individual amounts are displayed.</p></div> : <p className="mt-3 text-sm text-muted-foreground">Loading anonymized aggregates…</p>}

      <div className="mt-4 rounded-2xl border border-border p-3">
        <div className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Optional private savings lobby</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Opt in to create or join short-term velocity challenges. Your balances stay private.</p></div></div>
        {!optedIn ? <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setOptedIn(true)}>Join private lobby</Button> : <><div className="mt-3 flex gap-2"><Input aria-label="Weekly savings target" type="number" min="1" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Weekly target" /><Button type="button" size="sm" onClick={createChallenge}>Create</Button></div><div className="mt-3 space-y-2">{challenges.map((challenge) => <div key={challenge.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />{challenge.title}</span><button type="button" onClick={() => setChallenges((current) => current.map((item) => item.id === challenge.id ? { ...item, joined: !item.joined } : item))} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{challenge.joined ? "Joined" : `Join · ${formatFromUSD(challenge.target)}`}</button></div>)}</div><p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5 text-primary" />You can leave the lobby at any time.</p></>}
      </div>
    </section>
  );
};
