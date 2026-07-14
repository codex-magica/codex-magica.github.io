import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {ChakraProvider} from "@chakra-ui/react";
import theme from "@/theme";
import {RootApp} from "@/ui/RootApp";
// import {registerServiceWorker} from "@/registerServiceWorker";

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

// registerServiceWorker();
