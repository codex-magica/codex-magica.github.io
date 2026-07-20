import React, { useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";

// The four szakrális spheres, in canonical (book) order.
const SPHERES = ["Élet", "Halál", "Lélek", "Természet"];
const inOrder = (set: string[]): string[] => SPHERES.filter((s) => set.includes(s));

// Szakrális szféra editor — lives in the character builder (not the play sheet). A Kegyelt +
// Vallásismeret 3 character may cast prayers without a priesthood, so the player picks which spheres
// they command. The deity/rend grants are the defaults; toggling writes an explicit override, and
// "Visszaállítás" clears it back to those defaults. The caller gates visibility on the Kegyelt háttér.
export const SphereEditor: React.FC<{
  effective: string[]; // current spheres (override if set, else the deity/rend defaults)
  defaults: string[]; // the deity/rend-granted spheres (for the reset hint)
  overridden: boolean; // the player has set an explicit list (record.sacredSpheres != null)
  granted: boolean; // the Kegyelt háttér comes from the class — start read-only, a pencil unlocks it
  onSet: (spheres: string[] | undefined) => void; // undefined ⇒ reset to defaults
}> = ({ effective, defaults, overridden, granted, onSet }) => {
  // A class-granted Kegyelt shows the deity's spheres dimmed (they're the rend's defaults, not a
  // player pick) — the pencil unlocks the chips for an override. An existing override stays unlocked.
  const [unlocked, setUnlocked] = useState(false);
  const locked = granted && !overridden && !unlocked;
  const has = (s: string) => effective.includes(s);
  const toggle = (s: string) =>
    onSet(inOrder(has(s) ? effective.filter((x) => x !== s) : [...effective, s]));

  return (
    <Box mt="8px">
      <Flex align="center" gap="7px" mb="5px">
        <Text fontFamily="system-ui" fontSize="10px" fontWeight={700} letterSpacing=".09em" textTransform="uppercase" color="fgFaint">
          Szakrális szférák
        </Text>
        {locked && (
          <Box as="button" type="button" onClick={() => setUnlocked(true)}
            title="Szférák felülbírálása" aria-label="Szférák felülbírálása"
            w="20px" h="20px" borderRadius="6px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="muted"
            display="inline-flex" alignItems="center" justifyContent="center"
            _hover={{ borderColor: "accent", color: "accentTx" }}>
            <EditIcon boxSize="9px" />
          </Box>
        )}
      </Flex>
      <Flex wrap="wrap" gap="6px" align="center" opacity={locked ? 0.62 : 1}>
        {SPHERES.map((s) => {
          const on = has(s);
          return (
            <Box as="button" type="button" key={s} onClick={() => toggle(s)} disabled={locked}
              px="11px" py="5px" borderRadius="8px" border="1px solid"
              borderColor={on ? "accent" : "fieldBd"} bg={on ? "accentSoft" : "fieldBg"}
              color={on ? "accentTx" : "muted"} fontFamily="system-ui" fontSize="12.5px" fontWeight={on ? 700 : 500}
              cursor={locked ? "default" : "pointer"} _hover={locked ? undefined : { borderColor: "accent" }}>
              {s}
            </Box>
          );
        })}
        {overridden && (
          <Box as="button" type="button" onClick={() => onSet(undefined)}
            ml="2px" fontFamily="system-ui" fontSize="11.5px" color="accentTx" _hover={{ textDecoration: "underline" }}
            title={defaults.length ? `Alapértelmezett: ${inOrder(defaults).join(" · ")}` : "Nincs alapértelmezett szféra"}>
            Visszaállítás
          </Box>
        )}
      </Flex>
      <Text fontFamily="system-ui" fontSize="11px" color="fgFaint" lineHeight="1.4" mt="4px">
        {locked
          ? "A rend szférái — a ceruzával felülbírálhatók."
          : "Mely szférák Kis/Nagy Arkánum fohászait használhatja. Az istenség/rend adja az alapértelmezést."}
      </Text>
    </Box>
  );
};
