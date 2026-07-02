import React, { useState } from "react";
import { Flex } from "@chakra-ui/react";
import { ZoneBar } from "./ZoneBar";
import { Compendium } from "./Compendium";
import { DetailModal, ModalState } from "./DetailModal";

// Standalone compendium — reachable from the welcome screen without a character open. Same content as
// the in-character compendium zone, but the "Karakter" pill returns to the roster.
export const CompendiumScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [compTab, setCompTab] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  return (
    <Flex direction="column" h="100vh" sx={{ "@supports (height: 100dvh)": { height: "100dvh" } }} overflow="hidden" bg="page" color="fg" fontFamily="Warnock, serif">
      <ZoneBar active="kompendium" onKarakter={onExit} onKompendium={() => {}} />
      <Compendium compTab={compTab} onSelectTab={setCompTab} onOpenModal={setModal} />
      <DetailModal modal={modal} onClose={() => setModal(null)} />
    </Flex>
  );
};

export default CompendiumScreen;
