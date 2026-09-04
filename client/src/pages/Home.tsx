import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarCard from '../components/CarCard';
import CarImage from '../components/CarImage';
import EstablishedArt, { type Motif } from '../components/EstablishedArt';
import AutoRail from '../components/AutoRail';
import CarTypeIcon from '../components/CarTypeIcon';
import BrandLogo from '../components/BrandLogo';
import Spinner from '../components/Spinner';
import ChatWidget from '../components/ChatWidget';
import HeroCell from '../components/HeroCell';
import { supabase } from '../api/supabase';
import Icon, { type IconName } from '../components/Icon';
import { gbp, statusLabel, isResearch } from '../utils/format';
import { useSaved } from '../context/SavedContext';
import { useAuth } from '../context/AuthContext';

const categories = [
  { label: 'MSC', icon: 'sparkle', carType: 'MSC', to: '/browse?body_type=MSC' },
  { label: 'iPSC', icon: 'sparkle', carType: 'iPSC', to: '/browse?body_type=iPSC' },
  { label: 'Exosome', icon: 'sparkle', carType: 'Exosome', to: '/browse?body_type=Exosome' },
  { label: 'Orthopedics', icon: 'bolt', to: '/browse?make=Orthopedics' },
  { label: 'Cardiology', icon: 'leaf', to: '/browse?make=Cardiology' },
  { label: 'Neurology', icon: 'sparkle', to: '/browse?make=Neurology' },
];

function ChipIcon({ name }: { name: string }) {
  const p = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };
  if (name === 'bolt') return <svg {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>;
  if (name === 'leaf')
    return (
      <svg {...p}>
        <path d="M4 20c0-8 6-14 16-14 0 10-6 14-14 14z" />
        <path d="M5 19c3-5 7-7 11-8" />
      </svg>
    );
  if (name === 'sparkle') return <svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>;
  return (
    <svg {...p}>
      <path d="M5 13l1.4-3.6A2 2 0 0 1 8.3 8h7.4a2 2 0 0 1 1.9 1.4L19 13" />
      <path d="M4 13h16v3H4z" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </svg>
  );
}

const budgets = [
  { label: 'Under £5k', to: '/browse?max_price=5000&sort=price_desc', accent: '#4285F4', make: 'Orthopedics', model: 'PRP Knee', year: 2024 },
  { label: 'Under £10k', to: '/browse?max_price=10000&sort=price_desc', accent: '#0ea5e9', make: 'Dental', model: 'Dental Pulp MSC', year: 2024 },
  { label: 'Under £20k', to: '/browse?max_price=20000&sort=price_desc', accent: '#0891b2', make: 'Cardiology', model: 'Cardiac MSC', year: 2024 },
  { label: 'Under £40k', to: '/browse?max_price=40000&sort=price_desc', accent: '#c0392b', make: 'Neurology', model: 'Intrathecal MSC', year: 2024 },
];

const carTypes = [
  { label: 'MSC', body: 'MSC', make: 'Orthopedics', model: 'Mesenchymal' },
  { label: 'HSC', body: 'HSC', make: 'Cardiology', model: 'Haematopoietic' },
  { label: 'iPSC', body: 'iPSC', make: 'Neurology', model: 'Induced pluripotent' },
  { label: 'Exosome', body: 'Exosome', make: 'Age Rejuvenation', model: 'Exosome' },
  { label: 'Immune cell', body: 'Immune cell', make: 'Pulmonology', model: 'Immune cell' },
  { label: 'PRP', body: 'PRP', make: 'Cosmetic', model: 'Platelet-rich plasma' },
];

const BRANDS = [
  'Age Rejuvenation', 'Diabetes', 'HIV', 'Autoimmune', 'Dental', 'Orthopedics',
  'Cardiology', 'Gastroenterology', 'Neurology', 'Pulmonology', 'Nephrology', 'Cosmetic',
];

const usedModels = [
  'Knee Osteoarthritis MSC', 'MS Stem-Cell Transplant', 'Facial Fat Grafting + SVF',
  "Crohn's Fistula MSC", 'Cardiac Ischaemia MSC', 'Spinal Cord Injury MSC',
  'Hair Restoration Exosome', 'Rotator Cuff PRP', 'Type 1 Diabetes Islet iPSC',
  'COPD Lung MSC', 'Autism Cord-Blood Infusion', 'Anti-Ageing NK Cell',
  'Hip Osteoarthritis MSC', 'Parkinson’s iPSC Dopamine', 'Dental Pulp Regeneration',
  'Liver Cirrhosis MSC', 'Stroke Recovery MSC', 'Skin Rejuvenation Exosome',
  'Leukaemia HSC Transplant', 'Tendon Repair PRP',
];

const news = [
  'I have arthritis — could stem-cell therapy help me?',
  'The best regenerative therapies for joint pain, explained',
  'Living with MS: one patient’s stem-cell treatment journey',
  'How to know if you’re a candidate for cell therapy',
];

const videos = [
  'What are mesenchymal stem cells?',
  'Is stem-cell therapy right for arthritis?',
  'Understanding clinical-trial phases',
];

const evTools = [
  { label: 'Browse all regenerative therapies', to: '/browse' },
  { label: 'Explore active clinical trials', to: '/research' },
  { label: 'Compare therapies side by side', to: '/compare' },
  { label: 'How stem-cell treatment works', to: '/browse' },
];

const reviews = [
  { title: 'Back on my feet in weeks', body: 'After my knee MSC injection the pain eased and I could walk properly again. The team explained every step clearly.', author: 'C. T.', when: '38 minutes ago' },
  { title: 'Clear, honest guidance', body: 'They were upfront that my therapy was investigational and walked me through the evidence. No pressure at all.', author: 'Priya S.', when: '2 hours ago' },
  { title: 'Genuinely caring specialists', body: 'From consultation to follow-up everything was thorough. I finally felt listened to about my condition.', author: 'James W.', when: '5 hours ago' },
  { title: 'Would recommend to anyone', body: 'The consultation was free and I had a personalised protocol within days. The aftercare has been excellent.', author: 'Aisha R.', when: 'Yesterday' },
  { title: 'So easy to compare options', body: 'Lining up three therapies side by side made a daunting decision feel manageable. Brilliant service.', author: 'Mark D.', when: '2 days ago' },
];

const faqs = [
  { q: 'What is stem-cell therapy?', a: 'Stem-cell and regenerative therapies use living cells — such as mesenchymal stem cells, exosomes or platelet-rich plasma — to help repair or modulate damaged tissue.' },
  { q: 'Are these therapies approved or experimental?', a: 'Some are established and offered routinely; many remain investigational and are only available within clinical research. Anything under research is clearly labelled throughout the site.' },
  { q: 'How do I know if I’m a candidate?', a: 'Candidacy depends on your condition, health history and the specific protocol. Book a free, no-obligation consultation and a specialist team will assess your suitability.' },
  { q: 'What does treatment cost?', a: 'Costs vary by department, cell source and delivery route. Indicative prices and monthly financing are shown alongside each therapy, and confirmed by a specialist at consultation.' },
  { q: 'Is it safe?', a: 'Safety depends on the therapy, its evidence base and how it is delivered. Established treatments follow strict clinical governance; investigational ones carry additional uncertainty, which we discuss openly.' },
  { q: 'Can I join a clinical trial?', a: 'Yes — many investigational therapies recruit through our research programme. Visit the clinical-trials section to see what is currently open.' },
];

const steps: { title: string; body: string; icon: IconName }[] = [
  { title: 'Digital DNA', body: 'A DNA test sequences your complete genome and converts it into a secure digital DNA file.', icon: 'dna' },
  { title: 'Protocol Simulator', body: 'Your digital DNA is fed into our De novo LLM, which invents novel biomolecules to reverse cellular ageing and reawaken dormant, aged stem cells into younger ones.', icon: 'brain' },
  { title: 'In-vitro production', body: 'The novel biomolecules are cultured and multiplied in vitro in our laboratory.', icon: 'dish' },
  { title: 'Exosome IV therapy', body: 'Your personalised biomolecule exosomes are delivered by IV infusion — then you recover and are monitored for weeks to months during a restorative stay in Ooty.', icon: 'syringe' },
];

// Real-world, regulator-approved cell, gene & regenerative therapies — shown as
// an "Established therapies" reference rail (educational; approvals as noted).
type EstablishedKind = 'Stem cell' | 'CAR-T' | 'Gene therapy' | 'Regenerative';
const established: {
  name: string;
  generic: string;
  kind: EstablishedKind;
  indication: string;
  approval: string;
  motif: Motif;
}[] = [
  { name: 'Bone-marrow / HSC transplant', generic: 'Haematopoietic stem cells', kind: 'Stem cell', indication: 'Leukaemia, lymphoma & marrow failure', approval: 'Standard of care', motif: 'stemcell' },
  { name: 'Casgevy', generic: 'Exagamglogene autotemcel (CRISPR)', kind: 'Gene therapy', indication: 'Sickle-cell disease & β-thalassaemia', approval: 'FDA · 2023', motif: 'rbc' },
  { name: 'Zolgensma', generic: 'Onasemnogene abeparvovec (AAV)', kind: 'Gene therapy', indication: 'Spinal muscular atrophy', approval: 'FDA · 2019', motif: 'neuron' },
  { name: 'Luxturna', generic: 'Voretigene neparvovec (AAV)', kind: 'Gene therapy', indication: 'Inherited retinal dystrophy (RPE65)', approval: 'FDA · 2017', motif: 'eye' },
  { name: 'Kymriah', generic: 'Tisagenlecleucel', kind: 'CAR-T', indication: 'B-cell ALL & large B-cell lymphoma', approval: 'FDA · 2017', motif: 'tcell' },
  { name: 'Yescarta', generic: 'Axicabtagene ciloleucel', kind: 'CAR-T', indication: 'Large B-cell lymphoma', approval: 'FDA · 2017', motif: 'tcell' },
  { name: 'Carvykti', generic: 'Ciltacabtagene autoleucel', kind: 'CAR-T', indication: 'Multiple myeloma', approval: 'FDA · 2022', motif: 'tcell' },
  { name: 'Abecma', generic: 'Idecabtagene vicleucel', kind: 'CAR-T', indication: 'Multiple myeloma', approval: 'FDA · 2021', motif: 'tcell' },
  { name: 'Ryoncil', generic: 'Remestemcel-L (MSC)', kind: 'Stem cell', indication: 'Steroid-refractory acute GvHD', approval: 'FDA · 2024', motif: 'shield' },
  { name: 'Alofisel', generic: 'Darvadstrocel (MSC)', kind: 'Stem cell', indication: 'Crohn’s perianal fistulas', approval: 'EMA · 2018', motif: 'intestine' },
  { name: 'Holoclar', generic: 'Ex-vivo limbal stem cells', kind: 'Stem cell', indication: 'Corneal (limbal) repair', approval: 'EMA · 2015', motif: 'eye' },
  { name: 'Stempeucel', generic: 'Allogeneic pooled MSC', kind: 'Stem cell', indication: 'Critical limb ischaemia (Buerger’s)', approval: 'CDSCO India', motif: 'vessel' },
  { name: 'Hemgenix', generic: 'Etranacogene dezaparvovec (AAV)', kind: 'Gene therapy', indication: 'Haemophilia B', approval: 'FDA · 2022', motif: 'drop' },
  { name: 'Elevidys', generic: 'Delandistrogene moxeparvovec (AAV)', kind: 'Gene therapy', indication: 'Duchenne muscular dystrophy', approval: 'FDA · 2023', motif: 'muscle' },
  { name: 'Zynteglo', generic: 'Betibeglogene autotemcel', kind: 'Gene therapy', indication: 'Transfusion-dependent β-thalassaemia', approval: 'FDA · 2022', motif: 'rbc' },
  { name: 'MACI', generic: 'Matrix-induced autologous chondrocytes', kind: 'Regenerative', indication: 'Knee cartilage defects', approval: 'FDA · 2016', motif: 'joint' },
  { name: 'Apligraf', generic: 'Bioengineered living skin', kind: 'Regenerative', indication: 'Diabetic & venous leg ulcers', approval: 'FDA-approved', motif: 'skin' },
];

const kindStyle: Record<EstablishedKind, string> = {
  'Stem cell': 'bg-clay-100 text-clay-700',
  'CAR-T': 'bg-violet-100 text-violet-700',
  'Gene therapy': 'bg-emerald-100 text-emerald-700',
  'Regenerative': 'bg-amber-100 text-amber-700',
};

const kindAccent: Record<EstablishedKind, string> = {
  'Stem cell': '#4285F4',
  'CAR-T': '#7c3aed',
  'Gene therapy': '#059669',
  'Regenerative': '#d97706',
};

type Tab = 'find' | 'sell' | 'reviews';

export default function Home() {
  const [featured, setFeatured] = useState<Car[]>([]);
  const [trending, setTrending] = useState<Car[]>([]);
  const [posters, setPosters] = useState<Car[]>([]);
  const [available, setAvailable] = useState<Car[]>([]);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('find');
  const [search, setSearch] = useState('');
  const [waitCount, setWaitCount] = useState<number | null>(null);

  // Live waiting-list count for social proof (reads a count-only RPC so no
  // patient data is exposed; silently hidden until the RPC exists).
  useEffect(() => {
    if (!supabase) return;
    supabase.rpc('waitlist_count').then(({ data, error }) => {
      if (!error && typeof data === 'number') setWaitCount(data);
    });
  }, []);
  const [reg, setReg] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSaved, toggle } = useSaved();

  // Save/unsave a therapy from a card without following its link.
  const onSaveTherapy = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: `/therapies/${id}` } });
      return;
    }
    try {
      await toggle(id);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    // Top-rated therapies, with both Diabetes therapies (Type 1 then Type 2)
    // pinned to the front.
    Promise.all([
      api.getCars({ sort: 'rating_desc', limit: 8 }),
      api.getCars({ make: 'Diabetes', sort: 'rating_desc', limit: 2 }),
    ])
      .then(([top, dia]) => {
        const leadIds = new Set(dia.cars.map((c) => c.id));
        const list = [...dia.cars, ...top.cars.filter((c) => !leadIds.has(c.id))];
        setFeatured(list.slice(0, 8));
      })
      .finally(() => setLoading(false));
    api.getCars({ sort: 'rating_desc', limit: 6 }).then(({ cars }) => setTrending(cars));
    // Featured-therapies slider: ER-100, Exosome IV Longevity, Type 1 Diabetes, HIV cure.
    Promise.all([
      api.getCars({ search: 'ER-100', limit: 1 }),
      api.getCars({ search: 'Exosome IV Longevity', limit: 1 }),
      api.getCars({ search: 'Type 1 Diabetes', limit: 1 }),
      api.getCars({ make: 'HIV', sort: 'rating_desc', limit: 1 }),
    ]).then((res) => setPosters(res.map((r) => r.cars[0]).filter(Boolean) as Car[]));
    // Our own available (established) therapies for the Established rail.
    api.getCars({ limit: 200 }).then(({ cars }) =>
      setAvailable(cars.filter((c) => !isResearch(c.condition))),
    );
  }, []);

  // Auto-advance the featured slider (paused on hover).
  useEffect(() => {
    if (posters.length < 2 || paused) return;
    const t = window.setInterval(() => setSlide((s) => (s + 1) % posters.length), 4500);
    return () => clearInterval(t);
  }, [posters.length, paused]);

  const goSlide = (dir: number) =>
    setSlide((s) => (s + dir + posters.length) % posters.length);

  // Patient-friendly titles for the featured slider (full names live on the detail page).
  const posterTitle = (p: Car) =>
    p.make === 'HIV' ? 'HIV Cure' : /ER-100/i.test(p.model) ? 'ER-100 Age Reversal' : p.model;

  const onFind = (e: FormEvent) => {
    e.preventDefault();
    const q = encodeURIComponent(search.trim());
    // The "Read outcomes" tab surfaces our top-rated therapies.
    navigate(tab === 'reviews' ? `/browse?search=${q}&sort=rating_desc` : `/browse?search=${q}`);
  };
  const onSell = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/browse?search=${encodeURIComponent(reg.trim())}`);
  };


  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-clay-500/20 blur-3xl" />
        <HeroCell />
        <div className="container-x relative py-10 sm:py-14">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
            Regenerate. Restore.
            <br />
            <span className="text-clay-500">Renew.</span>
          </h1>
          <div className="mt-5 flex flex-col items-start gap-1 sm:gap-1.5">
            {([
              { icon: 'dna', label: 'Upload Digital DNA' },
              { icon: 'brain', label: 'De Novo LLM (chat)' },
              { icon: 'clinician', label: 'Personalised Healthcare' },
            ] as { icon: IconName; label: string }[]).map((s, i) => (
              <div key={s.label} className="flex flex-col items-start gap-1 sm:gap-1.5">
                {i > 0 && (
                  <svg viewBox="0 0 24 24" className="ml-3 h-3 w-3 shrink-0 text-clay-500 sm:ml-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 sm:gap-2 sm:px-4 sm:py-2 sm:text-base">
                  <Icon name={s.icon} className="h-3 w-3 text-clay-400 sm:h-5 sm:w-5" />
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            Because the future is personalised healthcare — tailored to each individual's own DNA.
          </p>

          {/* Waiting-list CTA + live social-proof counter */}
          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              to="/waiting-list"
              className="inline-flex items-center gap-2 rounded-full bg-clay-500 px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-clay-600"
            >
              <Icon name="clipboard" className="h-5 w-5" />
              Join the waiting list
            </Link>
            {waitCount !== null && waitCount > 0 && (
              <span className="text-sm font-medium text-white/70">
                <span className="font-bold text-white">{waitCount.toLocaleString()}</span> patient{waitCount === 1 ? '' : 's'} already on the waiting list
              </span>
            )}
          </div>

          {/* AI chat assistant — launcher sits just above the search widget */}
          <div className="mt-7">
            <ChatWidget />
          </div>

          {/* Tabbed search card */}
          <div className="max-w-2xl overflow-hidden rounded-3xl bg-white/5 p-5 shadow-card ring-1 ring-white/10 backdrop-blur sm:p-7">
            <div className="flex gap-5 border-b border-white/10 sm:gap-8">
              {[
                { id: 'find' as Tab, label: 'Find a therapy' },
                { id: 'sell' as Tab, label: 'Book a consultation' },
                { id: 'reviews' as Tab, label: 'Read outcomes' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative pb-3 text-base font-bold transition sm:text-lg ${
                    tab === t.id ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-clay-500" />
                  )}
                </button>
              ))}
            </div>

            {tab !== 'sell' ? (
              <>
                <form onSubmit={onFind} className="mt-5 flex items-center gap-2 rounded-full bg-white p-1.5">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === 'reviews' ? 'Search outcomes by therapy' : 'Search by condition or therapy'}
                    className="w-full bg-transparent px-4 py-3 text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-clay-500 text-white transition hover:bg-clay-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4-4" strokeLinecap="round" />
                    </svg>
                  </button>
                </form>
                <p className="mt-3 text-sm text-white/60">
                  or let us help you{' '}
                  <Link to="/browse" className="font-bold text-white underline underline-offset-4">
                    Find a therapy
                  </Link>
                </p>
              </>
            ) : (
              <form onSubmit={onSell} className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-white/70">
                  Your condition or symptoms
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={reg}
                    onChange={(e) => setReg(e.target.value)}
                    placeholder="Enter Condition"
                    className="w-full rounded-full bg-white px-6 py-3.5 text-center text-lg font-bold tracking-wide text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
                  />
                  <button type="submit" className="btn-primary shrink-0 rounded-full px-8 py-3.5">
                    Find therapies
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Category chips (horizontal scroll on mobile) */}
          <div className="-mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                {c.carType ? (
                  <CarTypeIcon type={c.carType} className="h-5 w-5 text-white" />
                ) : (
                  <ChipIcon name={c.icon} />
                )}
                {c.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/70">
            <span className="flex items-center gap-1.5"><Check /> Rated 4.6/5 by 4,800+ patients</span>
            <span className="flex items-center gap-1.5"><Check /> Free &amp; no-obligation consultation</span>
          </div>
        </div>
      </section>

      {/* ---------- FEATURED THERAPIES SLIDER ---------- */}
      {posters.length > 0 && (
        <section className="container-x pt-10">
          <div
            className="relative overflow-hidden rounded-3xl bg-ink-900"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {posters.map((p) => (
                <Link
                  key={p.id}
                  to={`/therapies/${p.id}`}
                  className="group relative w-full shrink-0 text-white"
                >
                  <div className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-clay-500/25 blur-3xl" />
                  <div className="relative grid items-center gap-4 p-6 pb-12 sm:p-10 sm:pb-14 md:grid-cols-2">
                    <div>
                      <span className="chip bg-white/10 text-white/80">Featured therapy</span>
                      <h2 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none sm:text-5xl">
                        {posterTitle(p)}
                      </h2>
                      <p className="mt-3 line-clamp-3 max-w-sm text-white/70">{p.description}</p>
                      <div className="mt-5 flex flex-wrap items-center gap-4">
                        <span className="rounded-full bg-white px-6 py-3 font-display font-bold text-ink-900 transition group-hover:bg-clay-500 group-hover:text-white">
                          Learn more
                        </span>
                        <span className="text-sm text-white/70">
                          From <b className="text-white">{gbp(p.price)}</b> · from{' '}
                          <b className="text-clay-300">{gbp(p.monthly_price)}/mo</b>
                        </span>
                      </div>
                    </div>
                    <CarImage
                      accent={p.accent}
                      bodyType={p.body_type}
                      make={p.make}
                      model={p.model}
                      year={p.year}
                      angle={21}
                      className="h-56 w-full rounded-2xl bg-transparent sm:h-72"
                    />
                  </div>
                </Link>
              ))}
            </div>

            {/* arrows */}
            {posters.length > 1 && (
              <>
                <button
                  onClick={() => goSlide(-1)}
                  aria-label="Previous featured therapy"
                  className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 sm:left-4"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => goSlide(1)}
                  aria-label="Next featured therapy"
                  className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 sm:right-4"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}

            {/* dots */}
            {posters.length > 1 && (
              <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {posters.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Show featured therapy ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === slide ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------- ESTABLISHED THERAPIES (slider) ---------- */}
      <section className="container-x pt-14 pb-2">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-11 w-11"><Icon name="dish" className="h-6 w-6" /></span>
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              Established therapies
            </h2>
            <p className="text-ink-700/70">Regulator-approved cell, gene &amp; regenerative medicines in clinical use worldwide.</p>
          </div>
        </div>

        {/* Our own available therapies (auto-scrolling) */}
        {available.length > 0 && (
          <>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-clay-600">Available at StemCells Protocol</p>
            <AutoRail speed={0.5} className="-mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...available, ...available].map((c, i) => (
                <Link
                  key={`${c.id}-${i}`}
                  to={`/therapies/${c.id}`}
                  className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-3xl border border-cream-300 bg-white transition hover:shadow-card-hover"
                >
                  <div className="relative h-32 w-full">
                    <CarImage accent={c.accent} bodyType={c.body_type} make={c.make} model={c.model} year={c.year} className="h-full w-full" />
                    <span className="absolute left-3 top-3 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">Available</span>
                    <button
                      onClick={(e) => onSaveTherapy(e, c.id)}
                      aria-label={isSaved(c.id) ? 'Remove from saved' : 'Save therapy'}
                      className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 ${
                        isSaved(c.id) ? 'text-clay-600' : 'text-ink-700 hover:text-clay-600'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isSaved(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-bold uppercase tracking-wide text-clay-600">{c.make}</span>
                    <h3 className="mt-1 font-display text-lg font-bold leading-tight text-ink-900">{c.model}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-ink-700/60">{c.trim}</p>
                    <span className="mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold text-clay-600 transition-all group-hover:gap-2">View therapy →</span>
                  </div>
                </Link>
              ))}
            </AutoRail>
          </>
        )}

        {/* Regulator-approved worldwide (auto-scrolling) */}
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-700/50">Approved worldwide</p>
        <AutoRail speed={0.4} className="-mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...established, ...established].map((t, i) => (
            <div
              key={`${t.name}-${i}`}
              className="flex w-[260px] shrink-0 flex-col overflow-hidden rounded-3xl border border-cream-300 bg-white transition hover:shadow-card-hover"
            >
              <div className="relative h-32 w-full">
                <EstablishedArt motif={t.motif} accent={kindAccent[t.kind]} className="h-full w-full" />
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${kindStyle[t.kind]}`}>{t.kind}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="inline-flex items-center gap-1 self-start text-xs font-semibold text-emerald-700">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  {t.approval}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{t.name}</h3>
                <p className="text-sm text-ink-700/60">{t.generic}</p>
                <p className="mt-3 text-sm text-ink-700/80">{t.indication}</p>
              </div>
            </div>
          ))}
        </AutoRail>
        <p className="mt-1 text-xs text-ink-700/50">
          “Approved worldwide” is a reference list for education — not all are offered here. Demo project, not medical advice.
        </p>
      </section>

      {/* ---------- FEATURED ---------- */}
      <section className="container-x py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              Top-rated therapies
            </h2>
            <p className="mt-1 text-ink-700/70">Hand-picked from our specialist teams.</p>
          </div>
          <Link to="/browse" className="btn-outline hidden px-5 py-2.5 text-sm sm:inline-flex">
            View all
          </Link>
        </div>
        {loading ? (
          <Spinner label="Loading therapies…" />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- BROWSE BY BUDGET ---------- */}
      <section className="container-x pb-6">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Browse by budget
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {budgets.map((b) => (
            <Link
              key={b.label}
              to={b.to}
              className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <CarImage
                accent={b.accent}
                make={b.make}
                model={b.model}
                year={b.year}
                className="h-28 w-full sm:h-32"
              />
              <p className="p-4 font-display text-lg font-bold text-ink-900">{b.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- REGENERATIVE THERAPIES TRENDING (slider) ---------- */}
      {trending.length > 0 && (
        <section className="container-x py-8">
          <div className="flex items-center gap-3">
            <span className="icon-tile h-11 w-11"><Icon name="dna" className="h-6 w-6" /></span>
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
                Regenerative therapies trending
              </h2>
              <p className="text-ink-700/70">The most highly-rated protocols right now.</p>
            </div>
          </div>

          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((car) => (
              <Link
                key={car.id}
                to={`/therapies/${car.id}`}
                className="group w-[300px] shrink-0 snap-start rounded-3xl bg-cream-200 p-5 transition hover:shadow-card-hover"
              >
                <h3 className="font-display text-xl font-bold text-ink-900">
                  {car.model}
                </h3>
                <p className="text-sm text-ink-700/70">{car.trim}</p>
                <span
                  className={`mt-3 inline-block rounded-lg px-3 py-1 text-sm font-bold ${
                    isResearch(car.condition) ? 'bg-clay-100 text-clay-700' : 'bg-ink-900 text-clay-300'
                  }`}
                >
                  {statusLabel(car.condition)}
                </span>
                <CarImage
                  accent={car.accent}
                  bodyType={car.body_type}
                  make={car.make}
                  model={car.model}
                  year={car.year}
                  className="my-4 h-36 w-full bg-transparent"
                />
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      From <b>{gbp(car.price)}</b>
                    </p>
                    <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      Finance from <b>{gbp(car.monthly_price)}</b>/mo
                    </p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-ink-900 text-white transition group-hover:bg-clay-500">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- CONSULTATION CTA ---------- */}
      <section className="container-x py-10">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-10">
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-clay-500/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">
                Not sure which therapy is right?
              </h2>
              <p className="mt-3 max-w-md text-white/70">
                Book a free, no-obligation consultation and our specialist team will assess your
                condition and match you to suitable regenerative therapies.
              </p>
              <Link to="/consultation" className="btn-primary mt-6 px-6 py-3">
                Book a consultation
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { k: '8', v: 'Specialties' },
                { k: '40+', v: 'Therapies' },
                { k: '5 mins', v: 'To book a consultation' },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                  <p className="font-display text-2xl font-extrabold text-clay-300">{s.k}</p>
                  <p className="mt-1 text-sm text-white/70">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- EXPLORE THERAPIES ---------- */}
      <section className="container-x py-10">
        <h2 className="font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Explore therapies
        </h2>

        <h3 className="mt-8 font-display text-xl font-bold text-ink-900 sm:text-2xl">
          Browse by category
        </h3>
        <div className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {carTypes.map((t) => (
            <Link
              key={t.label}
              to={t.body ? `/browse?body_type=${encodeURIComponent(t.body)}` : '/browse'}
              className="group flex w-[180px] shrink-0 snap-start flex-col items-center overflow-hidden rounded-2xl border border-cream-300 bg-white p-3 transition hover:border-clay-400 hover:shadow-card"
            >
              <CarImage
                accent="#334155"
                bodyType={t.body || 'MSC'}
                make={t.make}
                model={t.model}
                year={2024}
                className="h-24 w-full"
              />
              <p className="mt-2 font-semibold text-ink-900">{t.label}</p>
            </Link>
          ))}
        </div>

        <h3 className="mt-12 font-display text-xl font-bold text-ink-900 sm:text-2xl">
          Browse by department
        </h3>
        <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {BRANDS.map((m) => (
            <Link
              key={m}
              to={`/browse?make=${encodeURIComponent(m)}`}
              className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-cream-200"
            >
              <BrandLogo make={m} />
              <span className="min-w-0 break-words font-bold text-ink-900">{m}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- POPULAR THERAPIES ---------- */}
      <section className="container-x py-8">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Popular therapies
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {usedModels.map((m) => (
            <Link
              key={m}
              to={`/browse?search=${encodeURIComponent(m)}`}
              className="break-words font-semibold text-ink-800 underline-offset-4 transition hover:text-clay-600 hover:underline"
            >
              {m}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="container-x py-14">
        <div className="text-center">
          <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
            How StemCells Protocol works
          </h2>
          <p className="mt-2 text-ink-700/70">From your DNA to a personalised regenerative therapy, in four steps.</p>
          <Link to="/simulator" className="btn-primary mt-5 inline-flex px-6 py-3">
            <Icon name="brain" className="h-5 w-5" /> Try the Protocol Simulator
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="card p-7">
              <div className="flex items-center gap-3">
                <span className="icon-tile h-12 w-12">
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <span className="font-display text-4xl font-extrabold text-cream-300">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-ink-700/70">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Sample & sequencing — what "digital DNA" actually is */}
        <div className="mt-8 rounded-3xl bg-cream-200 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="lg:w-1/2">
              <h3 className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl">
                What is your “digital DNA”?
              </h3>
              <p className="mt-2 text-ink-700/75">
                To engineer a therapy for your body, we read two data layers from a simple sample —
                and they are not the same test.
              </p>
              <Link to="/simulator" className="mt-4 inline-flex items-center gap-1.5 font-semibold text-clay-600 hover:underline">
                See sample &amp; sequencing details
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-1/2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="icon-tile h-9 w-9"><Icon name="dish" className="h-5 w-5" /></span>
                  <span className="text-xs font-bold uppercase tracking-wide text-clay-600">Essential</span>
                </div>
                <h4 className="mt-3 font-display font-bold text-ink-900">Methylation sequencing</h4>
                <p className="mt-1 text-sm text-ink-700/70">Reads your epigenome — what defines biological age and every reversal target.</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="icon-tile h-9 w-9"><Icon name="dna" className="h-5 w-5" /></span>
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-700/50">Recommended</span>
                </div>
                <h4 className="mt-3 font-display font-bold text-ink-900">Whole genome sequencing</h4>
                <p className="mt-1 text-sm text-ink-700/70">Reads your genome — for safety screening and deeper per-DNA personalisation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PATIENT REVIEWS (slider) ---------- */}
      <section className="container-x pb-8">
        <div className="flex items-center gap-3">
          <span className="icon-tile h-11 w-11"><Icon name="star" className="h-6 w-6" /></span>
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              This is how care should feel
            </h2>
            <p className="text-ink-700/70">
              Our patients rate us as <b>‘Excellent’</b> on Trustpilot.
            </p>
          </div>
        </div>

        <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reviews.map((r) => (
            <div
              key={r.title}
              className="w-[300px] shrink-0 snap-start rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"
            >
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((n) => (
                  <span key={n} className="grid h-6 w-6 place-items-center rounded bg-green-500 text-white">
                    <Icon name="star" className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
              <h3 className="mt-3 font-display font-bold text-ink-900">{r.title}</h3>
              <p className="mt-1 text-sm text-ink-700/70">{r.body}</p>
              <p className="mt-4 text-sm font-semibold text-ink-800">
                {r.author} <span className="font-normal text-ink-700/50">· {r.when}</span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center text-sm text-ink-700/70">
          Rated <b>4.6/5</b> based on <b>4,800+</b> reviews on{' '}
          <span className="inline-flex items-center gap-1 font-semibold text-green-600"><Icon name="star" className="h-4 w-4" /> Trustpilot</span>
        </p>
      </section>

      {/* ---------- ACCREDITED & RESEARCH-LED ---------- */}
      <section className="container-x py-10">
        <div className="flex items-start gap-4">
          <Icon name="heart" className="h-9 w-9 shrink-0 text-clay-500" />
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Accredited &amp; research-led
            </h2>
            <p className="mt-1 max-w-xl text-ink-700/70">
              We work with accredited specialist clinics and research-led cell-therapy laboratories
              across every department.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- WE MAKE REGENERATIVE CARE CLEAR ---------- */}
      <section className="container-x pb-10">
        <div className="rounded-3xl bg-ink-900 p-8 text-white sm:p-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-clay-500 text-white">
              <Icon name="clinician" className="h-8 w-8" />
            </span>
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
                We make regenerative care clear
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/70">
                Our clinical team is here to make regenerative medicine easy to understand. Our
                detailed therapy overviews and plain-English patient guides have got you covered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MOST-VIEWED THERAPIES ---------- */}
      {featured.length > 0 && (
        <section className="container-x pb-14">
          <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
            Most-viewed therapies
          </h2>
          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.slice(0, 6).map((car) => (
              <Link
                key={car.id}
                to={`/therapies/${car.id}`}
                className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-card transition hover:shadow-card-hover"
              >
                <CarImage
                  accent={car.accent}
                  bodyType={car.body_type}
                  make={car.make}
                  model={car.model}
                  year={car.year}
                  className="h-40 w-full"
                />
                <div className="p-4">
                  <h3 className="font-display text-lg font-bold text-ink-900 underline-offset-4 group-hover:underline">
                    {car.model}
                  </h3>
                  <span className="mt-2 inline-block rounded-lg bg-clay-100 px-2.5 py-1 text-sm font-extrabold text-clay-700">
                    {Math.round(car.rating * 2)}/10
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- PATIENT GUIDES + VIDEOS (dark) ---------- */}
      {featured.length > 0 && (
        <section className="bg-ink-900 py-14 text-white">
          <div className="container-x">
            <h2 className="font-display text-2xl font-extrabold uppercase sm:text-3xl">
              Patient guides and latest research
            </h2>
            <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {news.map((title, i) => {
                const car = featured[i % featured.length];
                return (
                  <Link
                    key={title}
                    to="/browse"
                    className="group w-[300px] shrink-0 snap-start"
                  >
                    <CarImage
                      accent={car.accent}
                      bodyType={car.body_type}
                      make={car.make}
                      model={car.model}
                      year={car.year}
                      className="h-44 w-full rounded-2xl"
                    />
                    <h3 className="mt-3 font-display text-lg font-bold underline-offset-4 group-hover:underline">
                      {title}
                    </h3>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Link to="/browse" className="btn bg-white px-6 py-3 text-ink-900 hover:bg-clay-500 hover:text-white">
                View more patient guides
              </Link>
            </div>

            <h2 className="mt-12 font-display text-2xl font-extrabold uppercase sm:text-3xl">
              Explainer videos
            </h2>
            <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {videos.map((title, i) => {
                const car = featured[(i + 2) % featured.length];
                return (
                  <Link key={title} to="/browse" className="group w-[320px] shrink-0 snap-start">
                    <div className="relative overflow-hidden rounded-2xl">
                      <CarImage
                        accent={car.accent}
                        bodyType={car.body_type}
                        make={car.make}
                        model={car.model}
                        year={car.year}
                        className="h-44 w-full"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/20">
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-ink-900 transition group-hover:scale-110">
                          <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold underline-offset-4 group-hover:underline">
                      {title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------- EXPLORE REGENERATIVE MEDICINE ---------- */}
      {trending.length > 0 && (
        <section className="container-x py-14">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay-500 text-white">
              <Icon name="dna" className="h-7 w-7" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                Explore regenerative medicine
              </h2>
              <p className="mt-1 text-ink-700/70">
                Check out our regenerative-medicine tools and patient guides.
              </p>
            </div>
          </div>

          <div className="mt-6 flex snap-x snap-mandatory scroll-smooth gap-5 overflow-x-auto pb-4 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {evTools.map((t, i) => {
              const car = trending[i % trending.length];
              return (
                <Link
                  key={t.label}
                  to={t.to}
                  className="group w-[82%] shrink-0 snap-center sm:w-auto sm:shrink"
                >
                  <CarImage
                    accent={car.accent}
                    bodyType={car.body_type}
                    make={car.make}
                    model={car.model}
                    year={car.year}
                    className="aspect-[4/3] w-full rounded-2xl"
                  />
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug text-ink-900 underline-offset-4 group-hover:underline">
                    {t.label}
                  </h3>
                </Link>
              );
            })}
          </div>

          <div className="mt-6">
            <Link to="/compare" className="btn-outline w-full justify-center py-3.5 sm:w-auto sm:px-8">
              Compare regenerative therapies
            </Link>
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <section className="container-x py-14">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Frequently asked questions
        </h2>
        <div className="mt-6 divide-y divide-cream-300 overflow-hidden rounded-2xl border border-cream-300 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-display font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cream-200 text-clay-600 transition group-open:rotate-45">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="px-5 pb-5 text-ink-700/80">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-clay-500" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
