// The one-time "about & credits" notice: shown on first launch, then only on request (the roster's
// "Névjegy" link). A private window or blocked storage just shows it again next time, which is fine.

const KEY = "magus.creditsSeen.v1";

export const creditsSeen = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const markCreditsSeen = (): void => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable: the notice will simply show again */
  }
};
