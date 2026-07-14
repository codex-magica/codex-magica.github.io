import React, { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { ZoneBar } from "./ZoneBar";
import { Compendium } from "./Compendium";
import { DetailModal, ModalState } from "./DetailModal";
import { ZoneSwitch } from "./controls";
import { useRulesPreference } from "../state/rulesPreference";

// Standalone compendium — reachable from the welcome screen without a character open. Same content as
// the in-character compendium zone, but the "Karakter" pill returns to the roster.
// Phones: the ZoneBar is hidden and its contents move into the compendium's single merged top bar.
// Shows the rules variant from the app-level preference (nav-footer switch); the same preference
// seeds the house-rules toggle of newly created characters.
export const CompendiumScreen: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [compTab, setCompTab] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [pref, setPref] = useRulesPreference();
  return (
    <Flex direction="column" h="100%" overflow="hidden" bg="page" color="fg" fontFamily="Warnock, serif">
      <Box display={{ base: "none", md: "block" }} flexShrink={0}>
        <ZoneBar active="kompendium" onKarakter={onExit} onKompendium={() => {}} />
      </Box>
      <Compendium
        compTab={compTab}
        onSelectTab={setCompTab}
        onOpenModal={setModal}
        mobileLeading={<ZoneSwitch active="kompendium" onKarakter={onExit} onKompendium={() => {}} />}
        homebrew={!!pref.skillRework}
        onSetHomebrew={(on) => setPref({ ...pref, skillRework: on || undefined })}
      />
      <DetailModal modal={modal} onClose={() => setModal(null)} />
    </Flex>
  );
};

export default CompendiumScreen;
