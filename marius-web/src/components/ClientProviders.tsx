"use client";

import type { ReactNode } from "react";
import { HoverAudioProvider } from "@/components/HoverAudioProvider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <HoverAudioProvider>{children}</HoverAudioProvider>;
}
