import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

const FOUNDER = {
  name: 'Dr. Sanjay Anbu',
  role: 'Founder',
  // Fill these two in to finalise the profile:
  credential: 'MBBS · Regenerative Medicine & AI',   // shown under the name
  photo: '',               // e.g. '/founder.jpg' — drop a headshot in client/public/
  email: 'dr.sanjay@stemcellsprotocol.com',
  personalEmail: 'dr.sanjayanbu@gmail.com',
  github: 'https://github.com/sanjaydoc',
  githubDisplay: 'github.com/sanjaydoc',
  linkedin: 'https://www.linkedin.com/in/sanjay-anbu-56a076252',
  linkedinDisplay: 'linkedin.com/in/sanjay-anbu',
  // Both numbers are India (+91) and both have WhatsApp.
  phones: [
    { raw: '6385371758', display: '+91 63853 71758' },
    { raw: '6385181758', display: '+91 63851 81758' },
  ],
};

// Bio is grounded in the verifiable, open-source portfolio linked below.
const FOUNDER_BIO =
  'Sanjay Anbu is the founder of StemCells Protocol, working at the intersection of ' +
  'regenerative medicine, de novo molecular design and neurotechnology. He is the creator of ' +
  'De-Novo-LLM (generative design of novel biomolecules), a multi-generation Brain–Computer ' +
  'Interface platform, and the StemCells Protocol AI care assistant — building the tools to make ' +
  'age-reversal therapy personal to each patient’s own genome.';

const FOUNDER_FOCUS = [
  'Regenerative medicine',
  'Epigenetic reprogramming',
  'De novo molecular design',
  'Neurotechnology',
  'AI platforms',
];

// Founder's wider research & engineering portfolio.
interface Project {
  name: string;
  blurb: string;
  live?: string;
  repo?: string;
}

const PROJECTS: Project[] = [
  {
    name: 'Brain–Computer Interface v3',
    blurb:
      'A configurable, scalable platform that designs the molecules, drives an ultrasound read/write scanner, holds a living digital-twin of a brain, and runs it in a virtual environment with live 3D visualization.',
    live: 'https://sanjaydoc.github.io/Brain-Computer-Interface-v3/',
    repo: 'https://github.com/sanjaydoc/Brain-Computer-Interface-v3',
  },
  {
    name: 'Brain–Computer Interface v1',
    blurb:
      'A scalable connectome simulation and live-visualization platform, built to climb from a 302-neuron worm to the human brain (~86B neurons, ~10¹⁴ synapses) without a rewrite.',
    live: 'https://sanjaydoc.github.io/Brain-Computer-Interface-v1/app/',
    repo: 'https://github.com/sanjaydoc/Brain-Computer-Interface-v1',
  },
  {
    name: 'De-Novo-LLM',
    blurb:
      'Fine-tune language models to generate de novo biomolecules — small molecules (SMILES/SELFIES), proteins/peptides, and nucleic acids (DNA/RNA) — from one modular, config-driven pipeline.',
    live: 'https://sanjaydoc.github.io/De-Novo-LLM/',
    repo: 'https://github.com/sanjaydoc/De-Novo-LLM',
  },
  {
    name: 'LabSuite',
    blurb:
      'A from-scratch IAM control plane: onboard/offboard and enforce access across Okta → Active Directory → TrueNAS + Proxmox — SCIM sync, nested-group resolution, audited allow/deny, and access reviews. Pure-Python core, swappable adapters, CLI + HTTP API + web GUI.',
    live: 'https://sanjaydoc.github.io/LabSuite/',
    repo: 'https://github.com/sanjaydoc/LabSuite',
  },
  {
    name: 'SonoForge',
    blurb:
      'An open, closed-loop DBTL platform for de novo design of biomolecules that let neurons talk to ultrasound — the basis of non-invasive molecular brain–computer interfaces. Designs gas-vesicle acoustic reporter genes via SE(3) flow-matching, molecular dynamics, and constrained Bayesian optimization, RL, and preference learning.',
    repo: 'https://github.com/sanjaydoc/sonoforge',
  },
  {
    name: 'pdz-denovo',
    blurb:
      'Closed-loop de novo design of PSD-95 PDZ-domain binders via SE(3) flow matching + multi-objective optimization.',
    repo: 'https://github.com/sanjaydoc/pdz-denovo',
  },
  {
    name: 'NeuroMamba',
    blurb:
      'From-scratch selective state-space (Mamba/S6) protein language model that autoregressively generates novel PDZ-domain sequences for neuro-relevant de novo design. Trains on a laptop in resumable batches; ships proxy scorers + novelty metrics.',
    repo: 'https://github.com/sanjaydoc/NeuroMamba',
  },
  {
    name: 'Artificial Brain v3',
    blurb:
      'A brain-inspired full-stack AI platform: Node.js/Express backend with modular brain-region services, a multi-tier LLM router, Neo4j memory, and React apps for agents & invention.',
    repo: 'https://github.com/sanjaydoc/artificial-brain-v3',
  },
];

const SHOWCASES = [
  { name: 'Brain uploading system — end to end', url: 'https://inventorstudio.xyz/showcase/6a4453a6346e644999a26685' },
  { name: 'A new type of self-supervised LLM', url: 'https://inventorstudio.xyz/showcase/69fa16bd2aff950307c4fdb6' },
  { name: 'Brain–machine interface', url: 'https://inventorstudio.xyz/showcase/6a441aea67c81f425f6f5c73' },
];

const VISION =
  'We built StemCells Protocol to make age-reversal therapy truly personal. A patient uploads a digital version of their DNA into our AI care assistant, which orchestrates our De-Novo-LLM to generate novel age-reversal biomolecules for epigenetic reprogramming — our Persona Reversal programme. Instead of one-size-fits-all treatment, every person receives a therapy engineered specifically for their own genome.';

const highlights: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'dna',
    title: 'Age-reversal — flagship programme',
    body: 'Partial epigenetic reprogramming (OSK) to reset biological age — delivered via IV exosomes. This is our Persona Reversal programme.',
  },
  {
    icon: 'hospital',
    title: 'MSC & IV-exosome therapies',
    body: 'A broad regenerative-medicine platform — MSC and IV-exosome treatments today, spanning Age Rejuvenation, Cardiology, Neurology, Orthopedics and more.',
  },
  {
    icon: 'ai',
    title: 'AI-first patient experience',
    body: 'A multilingual AI care assistant that reads ECGs, scans and lab reports — lowering the cost of patient triage.',
  },
];

export default function Investors() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="trending" className="h-3.5 w-3.5" /> For investors</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Invest in the future of regenerative medicine
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          StemCells Protocol is building a regenerative-medicine hospital and platform around
          partial epigenetic reprogramming and stem-cell therapies. We welcome conversations with
          strategic and financial investors.
        </p>
      </div>

      {/* Highlights */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
        {highlights.map((h) => (
          <div key={h.title} className="card p-6">
            <div className="icon-tile h-14 w-14"><Icon name={h.icon} className="h-7 w-7" /></div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{h.title}</h3>
            <p className="mt-2 text-sm text-ink-700/70">{h.body}</p>
          </div>
        ))}
      </div>

      {/* Founder profile */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="text-center">
          <span className="chip bg-clay-100 text-clay-700"><Icon name="clinician" className="h-3.5 w-3.5" /> Founder</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">About the founder</h2>
        </div>

        <div className="card mt-8 flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
          {FOUNDER.photo ? (
            <img
              src={FOUNDER.photo}
              alt={FOUNDER.name}
              className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-1 ring-ink-900/10 sm:h-36 sm:w-36"
            />
          ) : (
            <span className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-clay-500 to-clay-700 font-display text-4xl font-bold text-white sm:h-36 sm:w-36 sm:text-5xl">
              {FOUNDER.name.replace(/^Dr\.\s*/, '').split(' ').map((w) => w.charAt(0)).slice(0, 2).join('')}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl font-extrabold text-ink-900">{FOUNDER.name}</h3>
            <p className="mt-0.5 text-sm font-semibold text-clay-600">
              {FOUNDER.role}, StemCells Protocol{FOUNDER.credential ? ` · ${FOUNDER.credential}` : ''}
            </p>

            <p className="mt-4 leading-relaxed text-ink-700/80">{FOUNDER_BIO}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {FOUNDER_FOCUS.map((f) => (
                <span key={f} className="chip bg-cream-200 text-ink-700">{f}</span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href={FOUNDER.github} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-clay-300 hover:bg-clay-50">
                <GitHubIcon /> GitHub
              </a>
              <a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-[#0a66c2]/40 hover:bg-[#0a66c2]/5">
                <LinkedInIcon /> LinkedIn
              </a>
              <a href={`mailto:${FOUNDER.email}`}
                 className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-clay-300 hover:bg-clay-50">
                <MailIcon /> Email
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Founder contact */}
      <div className="mx-auto mt-14 max-w-2xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="chip bg-clay-500 text-white">Founder</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Let's talk</h2>
            <p className="mt-2 text-white/70">
              For investment enquiries and partnership opportunities, reach the founder directly.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay-100 font-display text-2xl font-bold text-clay-700">
                {FOUNDER.name.charAt(0)}
              </span>
              <div>
                <p className="font-display text-xl font-bold text-ink-900">{FOUNDER.name}</p>
                <p className="text-sm text-ink-700/60">{FOUNDER.role}, StemCells Protocol</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <a
                href={`mailto:${FOUNDER.email}`}
                className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-clay-100 text-clay-600">
                  <MailIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Email</span>
                  <span className="block truncate font-semibold text-ink-900">{FOUNDER.email}</span>
                </span>
              </a>

              <a
                href={`mailto:${FOUNDER.personalEmail}`}
                className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-clay-100 text-clay-600">
                  <MailIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Personal email</span>
                  <span className="block truncate font-semibold text-ink-900">{FOUNDER.personalEmail}</span>
                </span>
              </a>

              {FOUNDER.phones.map((p) => (
                <a
                  key={`tel-${p.raw}`}
                  href={`tel:+91${p.raw}`}
                  className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-clay-100 text-clay-600">
                    <PhoneIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Phone</span>
                    <span className="block font-semibold text-ink-900">{p.display}</span>
                  </span>
                </a>
              ))}

              {FOUNDER.phones.map((p) => (
                <a
                  key={`wa-${p.raw}`}
                  href={`https://wa.me/91${p.raw}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-green-300 hover:bg-green-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-600">
                    <WhatsAppIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">WhatsApp</span>
                    <span className="block font-semibold text-ink-900">{p.display}</span>
                  </span>
                </a>
              ))}

              <a
                href={FOUNDER.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-900 text-white">
                  <GitHubIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">GitHub</span>
                  <span className="block truncate font-semibold text-ink-900">{FOUNDER.githubDisplay}</span>
                </span>
              </a>

              <a
                href={FOUNDER.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-[#0a66c2]/40 hover:bg-[#0a66c2]/5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0a66c2] text-white">
                  <LinkedInIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">LinkedIn</span>
                  <span className="block truncate font-semibold text-ink-900">{FOUNDER.linkedinDisplay}</span>
                </span>
              </a>
            </div>

            <p className="mt-6 text-center text-xs text-ink-700/50">
              StemCells Protocol is a demo project. Figures and therapies shown across the site are
              illustrative and not medical advice.
            </p>
          </div>
        </div>
      </div>

      {/* Founder portfolio */}
      <div className="mx-auto mt-16 max-w-5xl">
        <div className="text-center">
          <span className="chip bg-clay-100 text-clay-700"><Icon name="microscope" className="h-3.5 w-3.5" /> Founder portfolio</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Research &amp; engineering track record
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-700/70">
            A selection of the founder's open work across regenerative medicine, neurotechnology,
            de novo molecular design and full-stack platforms.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {PROJECTS.map((p) => (
            <div key={p.name} className="card flex flex-col p-6">
              <h3 className="font-display text-lg font-bold text-ink-900">{p.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700/75">{p.blurb}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.live && (
                  <a
                    href={p.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-clay-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                  >
                    <ExternalIcon /> Live demo
                  </a>
                )}
                {p.repo && (
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-800 transition hover:border-ink-900 hover:bg-cream-100"
                  >
                    <GitHubIcon /> Code
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured concepts / showcases */}
      <div className="mx-auto mt-14 max-w-5xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Featured concepts
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SHOWCASES.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center justify-between gap-3 p-5 transition hover:shadow-lg"
            >
              <span className="font-semibold text-ink-900">{s.name}</span>
              <span className="shrink-0 text-clay-600">
                <ExternalIcon />
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Research vision */}
      <div className="mx-auto mt-14 max-w-3xl">
        <div className="rounded-3xl bg-ink-900 p-8 text-white sm:p-10">
          <span className="chip bg-clay-500 text-white">Our vision</span>
          <p className="mt-4 font-display text-xl font-semibold leading-relaxed text-white/90 sm:text-2xl">
            “{VISION}”
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link to="/" className="btn-outline px-6 py-3">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.4 8.65 22 10.6 22 14.1V21h-4v-6.1c0-1.45-.03-3.32-2.02-3.32-2.02 0-2.33 1.58-2.33 3.21V21H9z" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7M21 3l-9 9M5 5h5M5 5v14h14v-5" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.02c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}
