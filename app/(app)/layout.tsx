import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AccountProvider } from "@/components/providers/AccountProvider";
import { DateRangeProvider } from "@/components/providers/DateRangeProvider";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.accessToken) {
    redirect("/");
  }

  return (
    <AccountProvider>
      <DateRangeProvider>
        <AppShell>{children}</AppShell>
      </DateRangeProvider>
    </AccountProvider>
  );
}
