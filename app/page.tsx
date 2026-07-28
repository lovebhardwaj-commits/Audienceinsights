import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/layout/Logo";

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
    <div className="flex flex-1 items-center justify-center bg-surface-app">
      <div className="mx-4 w-full max-w-md">
        <div className="animate-fade-in rounded-2xl p-10"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="flex items-center justify-center">
            <Logo className="h-9 w-auto text-ink" />
          </div>

          <p className="mt-4 text-center text-sm leading-relaxed text-ink-secondary">
            Reach intelligence for Meta Ads — understand who you&apos;re reaching, how efficiently, and where to optimise.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.06)" }}
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(175, 70, 253, 0.12)", color: "#AF46FD" }}
              >1</div>
              <div className="text-sm text-ink-secondary">Connect your Meta ad account securely via Facebook login</div>
            </div>
            <div className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.06)" }}
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(175, 70, 253, 0.12)", color: "#AF46FD" }}
              >2</div>
              <div className="text-sm text-ink-secondary">Get 7 reach and audience intelligence reports instantly</div>
            </div>
            <div className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.06)" }}
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(175, 70, 253, 0.12)", color: "#AF46FD" }}
              >3</div>
              <div className="text-sm text-ink-secondary">Spot overlap, creative fatigue, and wasted spend before they hurt</div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)", color: "#ff7070" }}
            >
              {decodeURIComponent(error)}
            </div>
          )}

          <a
            href="/api/auth/login"
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-[#1567d3] hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Continue with Facebook
          </a>

          <p className="mt-4 text-center text-[11px] text-ink-tertiary">
            We only request read-only access to your ad data. Nothing is stored permanently.
          </p>
        </div>
      </div>
    </div>
  );
}
