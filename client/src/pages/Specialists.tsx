import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

const departments: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: 'Age Rejuvenation' },
  { icon: 'heart', label: 'Cardiology' },
  { icon: 'brain', label: 'Neurology' },
  { icon: 'dish', label: 'Orthopedics' },
  { icon: 'stethoscope', label: 'Pulmonology' },
  { icon: 'flask', label: 'Gastroenterology' },
  { icon: 'syringe', label: 'Dental' },
  { icon: 'star', label: 'Cosmetic & Aesthetic' },
];

export default function Specialists() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="clinician" className="h-3.5 w-3.5" /> Our specialists</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          The people behind your protocol
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          StemCells Protocol is led by a clinician-founder and supported by a growing network of specialists
          and scientific advisors across regenerative medicine.
        </p>
      </div>

      {/* Founder / lead */}
      <div className="mx-auto mt-12 max-w-4xl">
        <div className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <span className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-clay-500 to-clay-700 font-display text-4xl font-bold text-white sm:h-32 sm:w-32">
            SA
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold text-ink-900">Dr. Sanjay Anbu</h2>
            <p className="mt-0.5 text-sm font-semibold text-clay-600">Founder &amp; Lead · MBBS · Regenerative Medicine &amp; AI</p>
            <p className="mt-3 text-ink-700/80">
              A clinician working at the intersection of regenerative medicine, de novo molecular design and
              neurotechnology — building the tools to make age-reversal therapy personal to each patient's genome.
            </p>
            <div className="mt-4">
              <Link to="/investors" className="btn-outline px-5 py-2.5 text-sm">Full profile</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Departments */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Departments we cover</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink-700/70">
          Specialists are onboarded per department as we scale. Each therapy is delivered under the relevant
          clinical protocol and applicable regulations.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {departments.map((d) => (
            <div key={d.label} className="card flex flex-col items-center gap-3 p-5 text-center">
              <div className="icon-tile h-12 w-12"><Icon name={d.icon} className="h-6 w-6" /></div>
              <span className="text-sm font-semibold text-ink-900">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory note */}
      <div className="mx-auto mt-14 max-w-3xl">
        <div className="card p-6 sm:p-8">
          <span className="chip bg-clay-100 text-clay-700"><Icon name="users" className="h-3.5 w-3.5" /> Clinical &amp; scientific advisory</span>
          <h3 className="mt-3 font-display text-lg font-bold text-ink-900">Our team is growing</h3>
          <p className="mt-2 text-sm text-ink-700/75">
            We are actively building our advisory board across epigenetics, gene therapy, cell manufacturing and
            clinical operations. Specialists and researchers interested in partnering are welcome to reach out.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/investors" className="btn-primary px-5 py-2.5 text-sm">Get in touch</Link>
            <Link to="/consultation" className="btn-outline px-5 py-2.5 text-sm">Book a consultation</Link>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-ink-700/50">
        StemCells Protocol is a demo project. Team, therapies and figures shown are illustrative — not medical advice.
      </p>
    </div>
  );
}
