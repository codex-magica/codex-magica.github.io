import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {ChakraProvider} from "@chakra-ui/react";
import theme from "@/theme";
import {RootApp} from "@/ui/RootApp";

// Dev-only referential check over the rules data (typo'd skill/background/tag names surface in the
// console instead of as silent ghost rows). Dynamic import keeps it out of the production bundle.
if (process.env.NODE_ENV === "development") {
  Promise.all([import("@/model/validateRules"), import("@/model/rulesDb")]).then(([{ validateRules }, { RULES }]) => {
    const problems = validateRules(RULES);
    if (problems.length) console.warn(`validateRules: ${problems.length} hiba\n` + problems.join("\n"));
  });
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
