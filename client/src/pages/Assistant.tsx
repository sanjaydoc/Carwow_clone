import ChatWidget from '../components/ChatWidget';

/* Full-page view of the De Novo AI assistant — the same chat as the home hero,
   rendered inline and page-sized via ChatWidget's `fullPage` mode. */
export default function Assistant() {
  return (
    <div className="bg-cream-100">
      <div className="container-x py-6">
        <div className="mb-4">
          <span className="chip bg-clay-100 text-clay-700">De Novo AI</span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">AI Assistant</h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-ink-700/60 sm:block">
            Ask about therapies, recovery &amp; post-op care, or medications — or 📎 attach an ECG, scan,
            lab report, or 🧬 DNA-methylation file to run the simulator. Educational support, not a diagnosis.
          </p>
        </div>
        <ChatWidget fullPage />
      </div>
    </div>
  );
}
