import type { Metadata } from 'next';

import { LiveVerifyDemo } from './_components/live-verify-demo';

export const metadata: Metadata = {
  title: 'Live Verification Demo — Vex',
  description:
    'See Vex catch and correct AI hallucinations in real-time. Live API demo with a customer support agent.',
};

export default function LiveDemoPage() {
  return (
    <div className="container py-24">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 text-[13px] font-medium tracking-widest uppercase text-emerald-500">
          Live Demo
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
          See Vex in Action
        </h1>

        <p className="text-lg text-[#a2a2a2]">
          Watch a customer support agent hallucinate — and Vex catch and correct
          it in real-time. Every verification below is a live API call.
        </p>
      </div>

      {/* Demo */}
      <div className="mt-16">
        <LiveVerifyDemo />
      </div>

      {/* CTA */}
      <div className="mt-20 text-center">
        <a
          href="https://app.tryvex.dev"
          className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          Start Protecting Your Agents
        </a>

        <p className="mt-3 text-sm text-[#666]">
          Free tier available · No credit card required
        </p>
      </div>
    </div>
  );
}
