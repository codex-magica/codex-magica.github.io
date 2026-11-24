import React, { useState } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { useRegisterSW } from "virtual:pwa-register/react";

const CHECK_EVERY_MS = 60 * 60 * 1000;

// A new version has been downloaded in the background by the service worker. The app never reloads
// on its own (a character half-built in the editor would be lost): the user picks the moment.
// Rendered inside #root like every other overlay, so the desktop UI scaling applies to it too.
// `paused`: held back while the creator is open (reloading would drop the half-built character), or while
// the Drive notice uses the same spot; it shows again afterwards. `beforeReload`: while saving to this
// device fails, the latest edits exist only in memory and are parked for the reload first; if that isn't
// possible, the update waits and says why. `required`: the Drive sync is waiting for this update (another
// device saved data only a newer version reads), so "Később" isn't offered and a dismissal doesn't hold.
export const UpdateBanner: React.FC<{ paused?: boolean; required?: boolean; beforeReload?: () => boolean }> = ({ paused = false, required = false, beforeReload }) => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // installed home-screen apps can stay open for days: look for a new version every hour
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_EVERY_MS);
    },
  });

  const [later, setLater] = useState(false);
  const [blocked, setBlocked] = useState(false);
  if (!needRefresh || paused || (later && !required)) return null;
  const text = blocked
    ? "Most nem frissíthetsz: nem sikerül menteni, és elvesznének a legutóbbi módosításaid. Exportáld a karaktereidet, törölj egy feleslegeset, aztán próbáld újra."
    : required
      ? "A szinkron folytatásához frissítsd az alkalmazást."
      : "Új verzió érhető el.";
  return (
    <Box position="fixed" left="50%" bottom="max(18px, calc(env(safe-area-inset-bottom) + 8px))" transform="translateX(-50%)" zIndex={60} w="max-content" maxW="calc(100% - 32px)">
      <HStack gap="12px" px="16px" py="11px" borderRadius="12px" bg="sheet" border="1px solid" borderColor="hair" boxShadow="0 10px 30px rgba(0,0,0,.18)" fontFamily="system-ui">
        <Text fontSize="13.5px" color="fg">{text}</Text>
        {!required && <Box as="button" type="button" onClick={() => setLater(true)} fontSize="13px" color="muted" px="6px">Később</Box>}
        <Box as="button" type="button" onClick={() => {
            if (beforeReload && !beforeReload()) return setBlocked(true);
            void updateServiceWorker(true);
          }} fontSize="13px" fontWeight={700} color="accentTx" bg="accentSoft" border="1px solid" borderColor="accentBd" borderRadius="8px" px="11px" py="5px">
          Frissítés
        </Box>
      </HStack>
    </Box>
  );
};
