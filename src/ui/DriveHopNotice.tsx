import React, { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { DriveHop } from "../state/useDriveSync";

// The small card that confirms the sync after coming back from Google's consent page (turning sync
// on, or reconnecting). role="status", not a dialog: it must not count as an open window.

const rise = keyframes`from { opacity: 0; transform: translate(-50%, 14px) scale(.97); } to { opacity: 1; transform: translate(-50%, 0) scale(1); }`;
const sink = keyframes`from { opacity: 1; transform: translate(-50%, 0) scale(1); } to { opacity: 0; transform: translate(-50%, 10px) scale(.98); }`;
const float = keyframes`0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); }`;
const spin = keyframes`to { transform: rotate(360deg); }`;
const pop = keyframes`0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); }`;

const CLOUD = "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z";
const Glyph: React.FC<{ phase: Exclude<DriveHop, null> }> = ({ phase }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={CLOUD} />
    {phase === "backDone" ? (
      <path d="m9.6 14.2 2 2 3.6-3.7" style={{ transformOrigin: "12px 14px", animation: `${pop} .45s ease-out both` }} />
    ) : (
      <path d="M12.4 16.6v-5.2m-2.3 2.2 2.3-2.3 2.3 2.3" />
    )}
  </svg>
);

const COPY: Record<Exclude<DriveHop, null>, { title: string; body: string }> = {
  backSyncing: { title: "Szinkronizálás…", body: "A karaktereid frissülnek a Google Drive-on." },
  backDone: { title: "Szinkronizálva", body: "A karaktereid a Google Drive-on is naprakészek." },
};

const EXIT_MS = 220;
const calm = { "@media (prefers-reduced-motion: reduce)": { animation: "none !important" } };

export const DriveHopNotice: React.FC<{ hop: DriveHop }> = ({ hop }) => {
  // keep the last phase on screen while the card slides away
  const [shown, setShown] = useState<Exclude<DriveHop, null> | null>(hop);
  if (hop && hop !== shown) setShown(hop);
  const leaving = !hop && shown !== null;
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setShown(null), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);
  if (!shown) return null;

  const { title, body } = COPY[shown];
  const busy = shown === "backSyncing";
  return (
    <Box role="status" aria-live="polite" position="fixed" left="50%" bottom="max(18px, calc(env(safe-area-inset-bottom) + 8px))" zIndex={61}
      transform="translateX(-50%)" w="min(380px, calc(100% - 32px))" fontFamily="system-ui"
      sx={{ animation: `${leaving ? sink : rise} ${leaving ? EXIT_MS : 320}ms cubic-bezier(.2,.8,.25,1) both`, ...calm }}>
      <Box position="relative" overflow="hidden" borderRadius="16px" bg="sheet" border="1px solid" borderColor="accentBd"
        boxShadow="0 18px 44px -12px rgba(20,30,50,.32), 0 2px 6px rgba(20,30,50,.08)">
        <Flex align="center" gap="14px" pl="14px" pr="12px" py="13px">
          {/* the cloud, in a soft disc with a spinning ring (syncing) or a check (done) */}
          <Box position="relative" flexShrink={0} w="42px" h="42px">
            {busy && (
              <Box position="absolute" inset="-3px" borderRadius="full" border="2px solid transparent" borderTopColor="accent" borderRightColor="accent"
                sx={{ animation: `${spin} .9s linear infinite`, ...calm }} />
            )}
            <Flex position="absolute" inset={0} borderRadius="full" bg="accentSoft" color="accentTx" align="center" justify="center">
              <Box display="flex" sx={{ animation: shown === "backDone" ? undefined : `${float} 2.4s ease-in-out infinite`, ...calm }}>
                <Glyph phase={shown} />
              </Box>
            </Flex>
          </Box>
          <Box flex="1 1 auto" minW={0}>
            <Text fontSize="14px" fontWeight={700} color="fg" lineHeight="1.3">{title}</Text>
            <Text fontSize="12.5px" color="muted" lineHeight="1.4" mt="2px">{body}</Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default DriveHopNotice;
