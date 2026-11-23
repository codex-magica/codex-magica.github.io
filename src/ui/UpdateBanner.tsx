import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { useRegisterSW } from "virtual:pwa-register/react";

const CHECK_EVERY_MS = 60 * 60 * 1000;

// A new version has been downloaded in the background by the service worker. The app never reloads
// on its own (a character half-built in the editor would be lost): the user picks the moment.
// Rendered inside #root like every other overlay, so the desktop UI scaling applies to it too.
// `paused`: held back while the creator is open (reloading would drop the half-built character), while
// saving to this device fails (the latest edits exist only in memory), or while the Drive notice uses the
// same spot; it shows again afterwards.
export const UpdateBanner: React.FC<{ paused?: boolean }> = ({ paused = false }) => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // installed home-screen apps can stay open for days: look for a new version every hour
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_EVERY_MS);
    },
  });

  if (!needRefresh || paused) return null;
  return (
    <Box position="fixed" left="50%" bottom="max(18px, calc(env(safe-area-inset-bottom) + 8px))" transform="translateX(-50%)" zIndex={60} w="max-content" maxW="calc(100% - 32px)">
      <HStack gap="12px" px="16px" py="11px" borderRadius="12px" bg="sheet" border="1px solid" borderColor="hair" boxShadow="0 10px 30px rgba(0,0,0,.18)" fontFamily="system-ui">
        <Text fontSize="13.5px" color="fg">Új verzió érhető el.</Text>
        <Box as="button" type="button" onClick={() => setNeedRefresh(false)} fontSize="13px" color="muted" px="6px">Később</Box>
        <Box as="button" type="button" onClick={() => void updateServiceWorker(true)} fontSize="13px" fontWeight={700} color="accentTx" bg="accentSoft" border="1px solid" borderColor="accentBd" borderRadius="8px" px="11px" py="5px">
          Frissítés
        </Box>
      </HStack>
    </Box>
  );
};
