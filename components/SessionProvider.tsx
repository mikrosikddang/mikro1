"use client";

import { createContext, useContext } from "react";

export type ClientSession = {
  userId: string;
  role: "CUSTOMER" | "SELLER";
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
