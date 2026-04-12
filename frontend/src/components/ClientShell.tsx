"use client";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

/**
 * ClientShell isolates all client-only layout components (Header, Sidebar)
 * into a single "use client" boundary so the root layout can remain a
 * Server Component and avoid hydration mismatches on hard reload.
 */
export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Sidebar />
      <main className="lg:ml-64 pt-16 min-h-screen">
        {children}
      </main>
    </>
  );
}
