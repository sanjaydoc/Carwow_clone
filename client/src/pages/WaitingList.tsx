import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, saveRow } from '../api/supabase';
import Icon from '../components/Icon';

// Disease/condition → matched therapy + department.
const CONDITIONS: { disease: string; department: string; therapy: string }[] = [
  { disease: 'Age-related decline / longevity', department: 'Age Rejuvenation', therapy: 'ER-100 OSK reprogramming (AAV + IV exosome)' },
  { disease: 'Osteoarthritis / joint damage', department: 'Orthopedics', therapy: 'MSC intra-articular therapy' },
  { disease: 'Spinal / disc degeneration', department: 'Orthopedics', therapy: 'MSC regenerative therapy' },
  { disease: 'Heart failure / post-heart-attack', department: 'Cardiology', therapy: 'Cardiac MSC regeneration' },
  { disease: 'Stroke recovery', department: 'Neurology', therapy: 'IV exosome neurorepair' },
  { disease: 'Parkinson’s / neurodegeneration', department: 'Neurology', therapy: 'Neural exosome therapy' },
  { disease: 'COPD / lung damage', department: 'Pulmonology', therapy: 'MSC pulmonary therapy' },
  { disease: 'Chronic kidney disease', department: 'Nephrology', therapy: 'MSC renal therapy' },
  { disease: 'Liver cirrhosis / fibrosis', department: 'Gastroenterology', therapy: 'MSC hepatic therapy' },
  { disease: 'Diabetes / metabolic', department: 'Endocrinology', therapy: 'MSC / exosome metabolic therapy' },
  { disease: 'Autoimmune (RA, lupus, etc.)', department: 'Immunology', therapy: 'MSC immunomodulation' },
  { disease: 'Muscular dystrophy', department: 'Neuromuscular', therapy: 'Micro-dystrophin gene therapy' },
  { disease: 'Skin / cosmetic ageing', department: 'Cosmetic & Aesthetic', therapy: 'Exosome skin rejuvenation' },
  { disease: 'Other / not sure yet', department: 'Assessment', therapy: 'Clinical assessment' },
];

export default function WaitingList() {
  const { user } = useAuth();
  const [disease, setDisease] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const match = useMemo(() => CONDITIONS.find((c) => c.disease === disease) || null, [disease]);
  const priority = !!file;

  // Not signed in → prompt to create an account.
  if (!user) {
    return (
      <div className="container-x flex min-h-[60vh] items-center justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="icon-tile mx-auto h-14 w-14"><Icon name="clipboard" className="h-7 w-7" /></div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">Join the waiting list</h1>
          <p className="mt-2 text-ink-700/70">
            Create a free patient account to reserve your place and choose the therapy matched to your condition.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/register" className="btn-primary py-3">Create an account</Link>
            <Link to="/login" className="btn-outline py-3">I already have an account</Link>
          </div>
          <p className="mt-5 text-xs text-ink-700/50">
            Tip: patients who’ve had a DNA-methylation test and upload it get <b>priority</b> access.
          </p>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) { setError('Please select your condition.'); return; }
    setError('');
    setBusy(true);

    let file_name: string | null = null;
    let file_path: string | null = null;
    if (file) {
      file_name = file.name;
      // Best-effort upload to Storage; the waitlist still records the file name
      // + priority even if the bucket isn't set up yet.
      try {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const up = await supabase?.storage.from('waitlist').upload(path, file, { upsert: false });
        if (up && !up.error) file_path = path;
      } catch { /* ignore — priority still recorded below */ }
    }

    const res = await saveRow('waitlist', {
      user_id: user.id,
      name: user.name,
      email: user.email,
      disease: match.disease,
      department: match.department,
      therapy: match.therapy,
      has_methylation: priority,
      priority,
      file_name,
      file_path,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError('Could not join the waiting list right now. Please try again.');
  };

  if (done) {
    return (
      <div className="container-x flex min-h-[60vh] items-center justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="icon-tile mx-auto h-14 w-14"><Icon name="heart" className="h-7 w-7" /></div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">You’re on the waiting list</h1>
          <p className="mt-2 text-ink-700/70">
            Thanks, {user.name}. We’ve reserved your place for <b>{match?.therapy}</b> ({match?.department}).
          </p>
          {priority && (
            <p className="mt-3 inline-block rounded-full bg-clay-100 px-4 py-1.5 text-sm font-semibold text-clay-700">
              ★ Priority access — methylation test received
            </p>
          )}
          <p className="mt-5 text-xs text-ink-700/50">
            Our team will contact you at {user.email} as places open. This is a demo project — not medical advice.
          </p>
          <Link to="/" className="btn-outline mt-6 inline-block px-6 py-3">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span className="chip bg-clay-100 text-clay-700"><Icon name="clipboard" className="h-3.5 w-3.5" /> Waiting list</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">Reserve your therapy</h1>
          <p className="mt-3 text-ink-700/70">
            Choose the condition you’re seeking treatment for — we’ll match it to a therapy and hold your place.
          </p>
        </div>

        <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input bg-cream-100" value={user.name} disabled />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input bg-cream-100" value={user.email} disabled />
            </div>
          </div>

          <div>
            <label className="label">Your condition</label>
            <select className="input" value={disease} onChange={(e) => setDisease(e.target.value)} required>
              <option value="">Select your disease / condition…</option>
              {CONDITIONS.map((c) => <option key={c.disease} value={c.disease}>{c.disease}</option>)}
            </select>
          </div>

          {match && (
            <div className="rounded-2xl border border-clay-200 bg-clay-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-clay-700">Matched therapy</p>
              <p className="mt-1 font-display text-lg font-bold text-ink-900">{match.therapy}</p>
              <p className="text-sm text-ink-700/70">{match.department} department</p>
            </div>
          )}

          <div>
            <label className="label">DNA-methylation test (optional — gets you priority)</label>
            <input
              type="file"
              accept=".csv,.cov,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-ink-700 file:mr-4 file:rounded-full file:border-0 file:bg-clay-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-clay-600"
            />
            <p className="mt-1.5 text-xs text-ink-700/50">
              Upload your methylation sequencing result (.csv or .cov). Patients with a test on file are moved to
              the front of the queue.
            </p>
            {priority && (
              <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                ★ Priority access unlocked
              </p>
            )}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you’d like our team to know…" />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 disabled:opacity-60">
            {busy ? 'Joining…' : 'Join the waiting list'}
          </button>
          <p className="text-center text-xs text-ink-700/50">
            StemCells Protocol is a demo project. Joining the waiting list is not a booking or medical advice.
          </p>
        </form>
      </div>
    </div>
  );
}
