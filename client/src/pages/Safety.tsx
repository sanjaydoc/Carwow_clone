import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

const principles: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'clock',
    title: 'Temporal control',
    body: 'Reprogramming is transient and inducible — rejuvenate, then stop before cell identity is lost. Duration is set deliberately, not left running.',
  },
  {
    icon: 'dna',
    title: 'DNA untouched',
    body: 'Only epigenetic settings are nudged; the underlying genome sequence is not edited. We reset the software, not the hardware.',
  },
  {
    icon: 'scale',
    title: 'OSK, not OSKM',
    body: 'Our age-reversal programme omits the c-MYC oncogene, materially improving the safety profile for rejuvenation.',
  },
  {
    icon: 'syringe',
    title: 'Contained delivery',
    body: 'Programmes begin in contained, measurable settings with objective read-outs, limiting systemic exposure.',
  },
];

export default function Safety() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="scale" className="h-3.5 w-3.5" /> Safety &amp; accreditation</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Safety is the design, not an afterthought
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          Regenerative and reprogramming therapies are powerful — which is exactly why they must be controlled.
          These are the principles that guide how we think about safety, and how we label what is established
          versus investigational.
        </p>
      </div>

      {/* Principles */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
        {principles.map((p) => (
          <div key={p.title} className="card p-6">
            <div className="icon-tile h-14 w-14"><Icon name={p.icon} className="h-7 w-7" /></div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-700/70">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Established vs investigational */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="chip bg-clay-500 text-white">Clear labelling</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Established vs investigational</h2>
            <p className="mt-2 max-w-2xl text-white/70">
              Every therapy on this site is labelled by status so it is never mistaken for something it is not.
            </p>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700">Established</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Therapies with an accepted clinical basis, offered under the relevant protocols and regulations.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700">Investigational / research</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Approaches under active research or clinical trials. Efficacy and long-term safety are not
                established, and these are not offered as proven treatments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data & compliance */}
      <div className="mx-auto mt-14 max-w-4xl grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <div className="icon-tile h-12 w-12"><Icon name="clipboard" className="h-6 w-6" /></div>
          <h3 className="mt-4 font-display text-base font-bold text-ink-900">Data &amp; privacy</h3>
          <p className="mt-2 text-sm text-ink-700/70">
            Genomic and health data are sensitive. Any real patient data is handled with consent, security and
            purpose-limitation as first principles.
          </p>
        </div>
        <div className="card p-6">
          <div className="icon-tile h-12 w-12"><Icon name="hospital" className="h-6 w-6" /></div>
          <h3 className="mt-4 font-display text-base font-bold text-ink-900">Regulatory intent</h3>
          <p className="mt-2 text-sm text-ink-700/70">
            Clinical services are intended to operate under applicable national regulations and accreditation.
            Investigational therapies are pursued through proper trial and approval pathways.
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-clay-200 bg-clay-50 p-6 text-center">
        <p className="text-sm font-semibold text-ink-900">Important</p>
        <p className="mt-2 text-sm text-ink-700/75">
          StemCells Protocol is a demonstration project. Therapies, costs, success rates and outcomes shown
          across this site are illustrative sample data — <b>not medical advice</b>, not a diagnosis, and not an
          offer of treatment. Nothing here should be used to make a medical decision. Always consult a qualified
          clinician.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link to="/consultation" className="btn-primary px-6 py-3">Book a consultation</Link>
          <Link to="/about" className="btn-outline px-6 py-3">About us</Link>
        </div>
      </div>
    </div>
  );
}
