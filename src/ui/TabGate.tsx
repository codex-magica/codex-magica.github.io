import React, { useEffect, useSyncExternalStore } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { startActiveTab, subscribeTab, tabState, continueHere } from "../state/activeTab";
import { rosterStore } from "../state/rosterStore";

// Shows the app only in the tab that's in use (see activeTab.ts); other tabs get a short screen with a
// button to continue there.
export const TabGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const state = useSyncExternalStore(subscribeTab, tabState);
  useEffect(() => startActiveTab(), []);
  // taken over while edits exist only in memory (storage full): park them, so they're back if the player
  // continues here again (this tab reloads then)
  useEffect(() => {
    if (state === "elsewhere") rosterStore().parkUnsaved();
  }, [state]);
  if (state === "checking") return null;
  if (state === "active") return <>{children}</>;
  return (
    <Box minH="100%" display="flex" alignItems="center" justifyContent="center" p="24px" bg="page" fontFamily="system-ui">
      <Box maxW="420px" textAlign="center">
        <Heading as="h1" fontSize="22px" fontWeight={700} color="fg" mb="10px" fontFamily="'Crimson Pro', Georgia, serif">
          Az alkalmazás egy másik lapon van nyitva
        </Heading>
        <Text fontSize="14.5px" color="muted" lineHeight="1.55" mb="18px">
          Egyszerre csak egy lapon használhatod, hogy a karaktereid ne keveredjenek össze. Ha inkább itt folytatnád, kattints a
          gombra; a másik lapon ekkor szünetel.
        </Text>
        <Box as="button" type="button" onClick={continueHere} px="18px" py="10px" borderRadius="9px" fontWeight={700} fontSize="15px" border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx">
          Használat itt
        </Box>
      </Box>
    </Box>
  );
};
