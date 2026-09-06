export const STARTUP_SESSION_KEY = "marius.startupEntered";

export const STARTUP_SESSION_SCRIPT = `try{if(sessionStorage.getItem("${STARTUP_SESSION_KEY}")==="1")document.documentElement.dataset.entered="1"}catch(e){}`;

export function hasEnteredStartup(): boolean {
  try {
    return sessionStorage.getItem(STARTUP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markStartupEntered(): void {
  try {
    sessionStorage.setItem(STARTUP_SESSION_KEY, "1");
  } catch {
    // Private mode or blocked storage should still allow this visit.
  }
}

export function revealEnteredDocument(): void {
  document.documentElement.dataset.entered = "1";
}
