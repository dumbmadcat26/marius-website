"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioStatus } from "@/components/ProjectGridCard";

export function useHoverAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const canHoverRef = useRef(true);

  useEffect(() => {
    canHoverRef.current = window.matchMedia("(hover: hover)").matches;
    audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.preload = "none";
    audio.volume = 0.85;

    const onWaiting = () => {
      if (activeIdRef.current) setStatus("loading");
    };
    const onPlaying = () => {
      if (activeIdRef.current) setStatus("playing");
    };
    const onPause = () => {
      if (!activeIdRef.current) setStatus("idle");
    };

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    activeIdRef.current = null;
    setActiveId(null);
    setStatus("idle");
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      currentUrlRef.current = null;
    }
  }, []);

  const play = useCallback((projectId: string, audioUrl: string) => {
    if (!canHoverRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    activeIdRef.current = projectId;
    setActiveId(projectId);
    setStatus("loading");

    const startPlayback = () => {
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
      audio.addEventListener("canplay", startPlayback, { once: true });
    }
  }, [stop]);

  const getCardStatus = useCallback(
    (projectId: string): AudioStatus => {
      if (activeId !== projectId) return "idle";
      return status;
    },
    [activeId, status],
  );

  return { play, stop, getCardStatus };
}
