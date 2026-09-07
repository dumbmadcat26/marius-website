"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AudioStatus } from "@/components/ProjectGridCard";
import { isAudioUnlocked, unlockAudioPlayback } from "@/lib/audioUnlock";

type HoverAudioContextValue = {
  play: (projectId: string, audioUrl: string) => void;
  stop: () => void;
  getCardStatus: (projectId: string) => AudioStatus;
};

const HoverAudioContext = createContext<HoverAudioContextValue | null>(null);

function createAudioElement(): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = "none";
  audio.volume = 0.85;
  return audio;
}

export function HoverAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const pendingPlayRef = useRef<(() => void) | null>(null);
  const canHoverRef = useRef(true);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");

  const getAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== "undefined") {
      audioRef.current = createAudioElement();
    }
    return audioRef.current;
  }, []);

  const clearPendingPlay = useCallback(() => {
    const audio = getAudio();
    if (pendingPlayRef.current && audio) {
      audio.removeEventListener("canplay", pendingPlayRef.current);
      pendingPlayRef.current = null;
    }
  }, [getAudio]);

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
      clearPendingPlay();
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      document.removeEventListener("pointerdown", unlockOnGesture);
      document.removeEventListener("keydown", unlockOnGesture);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [clearPendingPlay, getAudio, unlockAudio]);

  const stop = useCallback(() => {
    clearPendingPlay();
    const audio = getAudio();
    activeIdRef.current = null;
    setActiveId(null);
    setStatus("idle");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      currentUrlRef.current = null;
    }
  }, [clearPendingPlay, getAudio]);

  const play = useCallback(
    (projectId: string, audioUrl: string) => {
      if (!canHoverRef.current) return;

      const audio = getAudio();
      if (!audio) return;

      if (!isAudioUnlocked()) {
        unlockAudio();
      }

      clearPendingPlay();
      activeIdRef.current = projectId;
      setActiveId(projectId);
      setStatus("loading");

      const startPlayback = () => {
        pendingPlayRef.current = null;
        if (activeIdRef.current !== projectId) return;
        audio.play().catch(() => {
          if (activeIdRef.current === projectId) stop();
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
    [clearPendingPlay, getAudio, stop, unlockAudio],
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
