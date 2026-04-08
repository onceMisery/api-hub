"use client";

import { motion } from "framer-motion";
import { PanelCard, SectionHeader } from "@api-hub/ui";

import { LoginForm } from "../../features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center p-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[2rem] border border-white/50 bg-white/50 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">ApiHub Console</p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950">
              Shape, review, and publish your API workspace from a single console.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600">
              Raycast-inspired cards, grouped navigation, and a focused editing surface for your evolving API catalogue.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <div className="text-2xl font-semibold text-slate-950">01</div>
              <p className="mt-2">Credential-based entry</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <div className="text-2xl font-semibold text-slate-950">02</div>
              <p className="mt-2">Project dashboard</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <div className="text-2xl font-semibold text-slate-950">03</div>
              <p className="mt-2">Endpoint workbench</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <PanelCard>
              <div className="w-full min-w-[min(26rem,calc(100vw-4rem))] max-w-md space-y-6">
                <SectionHeader title="Sign in to ApiHub" description="Use the local account provisioned by the backend seed data." />
                <LoginForm />
                <p className="text-sm text-slate-500">After login you will be redirected to `/console/projects`.</p>
              </div>
            </PanelCard>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
