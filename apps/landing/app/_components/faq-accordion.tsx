const faqs = [
  {
    q: 'What is Vex?',
    a: "Vex is an open-source runtime reliability layer for AI agents. It detects when your agent's behavior silently changes in production — hallucinations, drift, schema violations — and auto-corrects before your users notice.",
  },
  {
    q: 'How is Vex different from evals or tracing?',
    a: "Evals test your agent before deployment. Tracing shows you what happened after something breaks. Vex runs continuously in production, catching behavioral drift in real-time and auto-correcting on the fly. They're complementary — Vex fills the gap between pre-deploy testing and post-mortem analysis.",
  },
  {
    q: 'How long does it take to set up?',
    a: 'About 5 minutes. Install the SDK (pip install vex-sdk or npm install @vex_dev/sdk), add 3 lines of code to wrap your agent function, and deploy. Vex starts learning from the first request.',
  },
  {
    q: 'What frameworks does Vex support?',
    a: 'Vex works with LangChain, CrewAI, OpenAI Assistants, and any custom Python or TypeScript agent. If your code calls an LLM, Vex can watch it.',
  },
  {
    q: 'Is Vex open source?',
    a: 'Yes. Vex is fully open source. The SDKs (Python, TypeScript) are Apache 2.0. The core engine and dashboard are AGPLv3. Everything is on GitHub.',
  },
  {
    q: 'Does Vex add latency?',
    a: 'In async mode (default), Vex adds zero latency — verification happens in the background. In sync mode, Vex adds a verification step before returning the output, which typically takes 200-500ms depending on the checks enabled.',
  },
];

export function FaqAccordion() {
  return (
    <section id="faq" className="border-t border-[#252525] py-20">
      <div className="container">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          FAQ
        </div>
        <h2 className="mb-12 max-w-[600px] text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mx-auto max-w-[800px]">
          {faqs.map((faq, i) => (
            <details key={i} className="group border-b border-[#252525]">
              <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="pr-4 text-[15px] font-medium text-white">
                  {faq.q}
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="shrink-0 text-[#585858] transition-transform duration-200 group-open:rotate-45"
                >
                  <line x1="10" y1="4" x2="10" y2="16" />
                  <line x1="4" y1="10" x2="16" y2="10" />
                </svg>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-[#a2a2a2]">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
