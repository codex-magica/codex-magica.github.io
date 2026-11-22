import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {ChakraProvider} from "@chakra-ui/react";
import theme from "@/theme";
import {RootApp} from "@/ui/RootApp";

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

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <RootApp />
    </ChakraProvider>
  </React.StrictMode>
);
