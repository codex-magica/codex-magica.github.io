import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {ChakraProvider} from "@chakra-ui/react";
import theme from "@/theme";
import {RootApp} from "@/ui/RootApp";
import {TabGate} from "@/ui/TabGate";
import {ErrorBoundary} from "@/ui/ErrorBoundary";

// Dev-only referential check over the rules data (typo'd skill/background/tag names surface in the
// console instead of as silent ghost rows). Dynamic import keeps it out of the production bundle.
if (import.meta.env.DEV) {
  Promise.all([import("@/model/validateRules"), import("@/model/rulesDb"), import("@/model/rulesVariants")]).then(
    ([{ validateRules }, { RULES }, { rulesHomebrew, homebrewProse }]) => {
      const problems = validateRules(RULES);
      if (problems.length) console.warn(`validateRules: ${problems.length} hiba\n` + problems.join("\n"));
      const hb = validateRules(rulesHomebrew(), homebrewProse());
      if (hb.length) console.warn(`validateRules (homebrew): ${hb.length} hiba\n` + hb.join("\n"));
    }
  );
}

// Desktop UI scale (see index.css): 1.1 from 1680px, 1.2 from 2200px. Set from here, not with CSS
// media queries, because the build rewrites those into range syntax older Safari can't read.
const zoomSteps: [MediaQueryList, string][] = [
  [window.matchMedia("(min-width: 2200px)"), "1.2"],
  [window.matchMedia("(min-width: 1680px)"), "1.1"],
];
const applyZoom = () => document.documentElement.style.setProperty("--app-zoom", zoomSteps.find(([q]) => q.matches)?.[1] ?? "1");
applyZoom();
for (const [q] of zoomSteps) {
  if (typeof q.addEventListener === "function") q.addEventListener("change", applyZoom);
  else q.addListener(applyZoom); // Safari before 14
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ErrorBoundary>
        <TabGate>
          <RootApp />
        </TabGate>
      </ErrorBoundary>
    </ChakraProvider>
  </React.StrictMode>
);
