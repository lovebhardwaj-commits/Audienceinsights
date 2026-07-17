import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session.accessToken || session.demo) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <div className="mx-4 w-full max-w-md">
        <div className="animate-fade-in rounded-2xl border border-slate-200/60 bg-white p-10 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-lg font-bold text-white shadow-md shadow-brand-500/25">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ads Reach</h1>
          </div>

          <p className="mt-4 text-center text-sm leading-relaxed text-slate-500">
            Reach intelligence for Meta Ads — understand who you're reaching, how efficiently, and where to optimise.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">1</div>
              <div className="text-sm text-slate-600">Connect your Meta ad account securely via Facebook login</div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">2</div>
              <div className="text-sm text-slate-600">Get 7 reach and audience intelligence reports instantly</div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">3</div>
              <div className="text-sm text-slate-600">Spot overlap, creative fatigue, and wasted spend before they hurt</div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{decodeURIComponent(error)}</div>
          )}

          <a
            href="/api/auth/login"
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1567d3] hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Continue with Facebook
          </a>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            We only request read-only access to your ad data. Nothing is stored permanently.
          </p>
        </div>
      </div>
    </div>
  );
}
