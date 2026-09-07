"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { AudioStatus } from "@/components/ProjectGridCard";
import { isAudioUnlocked, unlockAudioPlayback } from "@/lib/audioUnlock";

type HoverAudioContextValue = {
  play: (projectId: string, audioUrl: string) => void;
  stop: () => void;
  getCardStatus: (projectId: string) => AudioStatus;
};

const HoverAudioContext = createContext<HoverAudioContextValue | null>(null);

const TARGET_VOLUME = 0.85;
const FADE_OUT_MS = 380;

function createAudioElement(): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = "none";
  audio.volume = TARGET_VOLUME;
  return audio;
}

export function HoverAudioProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const pendingPlayRef = useRef<(() => void) | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const canHoverRef = useRef(true);
  const pathnameRef = useRef(pathname);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");

  const getAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = createAudioElement();
    }
    return audioRef.current;
  }, []);

  const cancelFade = useCallback(() => {
    if (fadeRafRef.current != null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }, []);

  const clearPendingPlay = useCallback(() => {
    const audio = getAudio();
    if (pendingPlayRef.current && audio) {
      audio.removeEventListener("canplay", pendingPlayRef.current);
      pendingPlayRef.current = null;
    }
  }, [getAudio]);

  const hardStop = useCallback(() => {
    cancelFade();
    clearPendingPlay();
    const audio = getAudio();
    activeIdRef.current = null;
    setActiveId(null);
    setStatus("idle");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = TARGET_VOLUME;
      currentUrlRef.current = null;
    }
  }, [cancelFade, clearPendingPlay, getAudio]);

  const stop = useCallback(() => {
    clearPendingPlay();
    const audio = getAudio();
    activeIdRef.current = null;
    setActiveId(null);
    setStatus("idle");

    if (!audio || audio.paused) {
      cancelFade();
      currentUrlRef.current = null;
      if (audio) audio.volume = TARGET_VOLUME;
      return;
    }

    cancelFade();
    const startVol = audio.volume;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_OUT_MS);
      audio.volume = startVol * (1 - t);
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
        return;
      }
      fadeRafRef.current = null;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = TARGET_VOLUME;
      currentUrlRef.current = null;
    };

    fadeRafRef.current = requestAnimationFrame(step);
  }, [cancelFade, clearPendingPlay, getAudio]);

  const unlockAudio = useCallback(() => {
    if (isAudioUnlocked()) return;
    unlockAudioPlayback();
  }, []);

  useLayoutEffect(() => {
    canHoverRef.current = window.matchMedia("(hover: hover)").matches;
    getAudio();

    const onWaiting = () => {
      if (activeIdRef.current) setStatus("loading");
    };
    const onPlaying = () => {
      if (activeIdRef.current) setStatus("playing");
    };
    const onPause = () => {
      if (!activeIdRef.current) setStatus("idle");
    };

    const audio = getAudio();
    if (!audio) return;

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);

    const unlockOnGesture = () => unlockAudio();
    document.addEventListener("pointerdown", unlockOnGesture, { passive: true });
    document.addEventListener("keydown", unlockOnGesture);

    return () => {
      hardStop();
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      document.removeEventListener("pointerdown", unlockOnGesture);
      document.removeEventListener("keydown", unlockOnGesture);
      audio.src = "";
      audioRef.current = null;
    };
  }, [getAudio, hardStop, unlockAudio]);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    stop();
  }, [pathname, stop]);

  const play = useCallback(
    (projectId: string, audioUrl: string) => {
      if (!canHoverRef.current) return;

      const audio = getAudio();
      if (!audio) return;

      if (!isAudioUnlocked()) {
        unlockAudio();
      }

      cancelFade();
      clearPendingPlay();
      audio.volume = TARGET_VOLUME;
      activeIdRef.current = projectId;
      setActiveId(projectId);
      setStatus("loading");

      const startPlayback = () => {
        pendingPlayRef.current = null;
        if (activeIdRef.current !== projectId) return;
        audio.play().catch(() => {
          if (activeIdRef.current === projectId) hardStop();
        });
      };

      if (currentUrlRef.current !== audioUrl) {
        audio.src = audioUrl;
        currentUrlRef.current = audioUrl;
        audio.load();
      }

      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        startPlayback();
      } else {
        pendingPlayRef.current = startPlayback;
        audio.addEventListener("canplay", startPlayback, { once: true });
      }
    },
    [cancelFade, clearPendingPlay, getAudio, hardStop, unlockAudio],
  );

  const getCardStatus = useCallback(
    (projectId: string): AudioStatus => {
      if (activeId !== projectId) return "idle";
      return status;
    },
    [activeId, status],
  );

  return (
    <HoverAudioContext.Provider value={{ play, stop, getCardStatus }}>
      {children}
    </HoverAudioContext.Provider>
  );
}

export function useHoverAudio() {
  const context = useContext(HoverAudioContext);
  if (!context) {
    throw new Error("useHoverAudio must be used within HoverAudioProvider");
  }
  return context;
}
