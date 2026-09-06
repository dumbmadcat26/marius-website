"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { unlockAudioPlayback } from "@/lib/audioUnlock";
import {
  hasEnteredStartup,
  markStartupEntered,
  revealEnteredDocument,
} from "@/lib/startup";
import styles from "./StartupScreen.module.css";

const INTRO_SRC = "/marius-intro.jpg";
const LEAVE_MS = 700;

type Phase = "blocking" | "intro" | "leaving" | "done";

type Props = {
  children: ReactNode;
};

export function StartupScreen({ children }: Props) {
  const [phase, setPhase] = useState<Phase>("blocking");
  const [assetsReady, setAssetsReady] = useState(false);
  const characterRef = useRef<HTMLImageElement>(null);
  const pendingRef = useRef(false);
  const leavingRef = useRef(false);
  const introShakeRef = useRef(false);

  const playShake = useCallback(() => {
    const el = characterRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.remove(styles.shaking);
    void el.offsetWidth;
    el.classList.add(styles.shaking);
  }, []);

  const playIntroShake = useCallback(() => {
    if (introShakeRef.current) return;
    introShakeRef.current = true;
    playShake();
  }, [playShake]);

  useEffect(() => {
    if (hasEnteredStartup()) {
      revealEnteredDocument();
      setPhase("done");
      return;
    }
    setPhase("intro");
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;
    if (characterRef.current?.complete) playIntroShake();
  }, [phase, playIntroShake]);

  useEffect(() => {
    let cancelled = false;
    const images = Array.from(document.querySelectorAll("img"));
    for (const image of images) {
      image.loading = "eager";
    }

    const imageReady = Promise.all(
      images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );

    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    void Promise.all([imageReady, fontsReady]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const beginLeave = useCallback(() => {
    if (leavingRef.current || phase === "done") return;
    leavingRef.current = true;
    markStartupEntered();
    setPhase("leaving");
  }, [phase]);

  const requestContinue = useCallback(() => {
    if (phase !== "intro" && phase !== "blocking") return;
    unlockAudioPlayback();
    if (assetsReady) {
      beginLeave();
      return;
    }
    pendingRef.current = true;
  }, [assetsReady, beginLeave, phase]);

  useEffect(() => {
    if (assetsReady && pendingRef.current) beginLeave();
  }, [assetsReady, beginLeave]);

  useEffect(() => {
    if (phase !== "leaving") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      revealEnteredDocument();
      setPhase("done");
    };

    if (reduced) {
      finish();
      return;
    }

    const timer = window.setTimeout(finish, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "intro" && phase !== "blocking") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
        return;
      }
      requestContinue();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, requestContinue]);

  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  const visible = phase !== "done";

  return (
    <>
      <div inert={visible ? true : undefined}>{children}</div>
      {visible ? (
        <div
          className={`${styles.overlay} ${phase === "leaving" ? styles.overlayLeaving : ""}`}
          data-startup
          role="dialog"
          aria-modal="true"
          aria-labelledby="startup-prompt"
          aria-busy={!assetsReady}
          onClick={requestContinue}
        >
          <div className={styles.stage}>
            <div className={styles.figure}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={characterRef}
                className={styles.character}
                src={INTRO_SRC}
                alt="Marius"
                width={956}
                height={1024}
                draggable={false}
                onLoad={playIntroShake}
                onPointerEnter={playShake}
              />
            </div>
            <p id="startup-prompt" className={styles.prompt}>
              Click or press any key to continue
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
