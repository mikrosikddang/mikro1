"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@prisma/client";

export type ClientSession = {
  userId: string;
  role: UserRole;
} | null;

const SessionContext = createContext<ClientSession>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: ClientSession;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
