import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import { ModalShell } from "./Modal";

const REPO_URL = "https://github.com/marcigo36/codex-magica";

// "About & credits": an unofficial-fan-project notice and the rulebook's credits, for people who use
// the app without ever reading the repository. Same wording as NOTICE.md (no claim of permission).
export const CreditsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalShell onClose={onClose} width="min(500px, 100%)" maxH="88vh">
    <Box p="22px 22px 8px" overflowY="auto">
      <Text fontFamily="system-ui" fontSize="11px" fontWeight={700} letterSpacing=".2em" textTransform="uppercase" color="accentTx" mb="6px">
        Névjegy
      </Text>
      <Heading fontSize="22px" fontWeight={700} color="fg" mb="12px">A Codex Magicáról</Heading>

      <Text fontSize="15px" color="fg" lineHeight="1.6" mb="12px">
        A Codex Magica <b>független, nem kereskedelmi célú rajongói projekt</b>: játékosok készítették
        játékosoknak. Nem hivatalos M.A.G.U.S.-kiadvány: nem a védjegyek tulajdonosai, illetve a könyvek szerzői
        vagy kiadói adták ki, és a tartalmáért nem ők felelnek.
      </Text>
      <Text fontSize="15px" color="fg" lineHeight="1.6" mb="14px">
        A szabályok, képzettségek, varázslatok és a többi játékadat a <i>M.A.G.U.S. Új Törvénykönyv</i> (Tuan
        Kiadó, 2007) alapján készült; ezek a jogosultak szellemi tulajdonát képezik.
      </Text>

      <Box borderTop="1px solid" borderBottom="1px solid" borderColor="rule" py="10px" mb="14px">
        <Text fontFamily="system-ui" fontSize="11.5px" fontWeight={700} letterSpacing=".08em" textTransform="uppercase" color="fgFaint" mb="6px">
          A könyv közreműködői, ahogy a kötetben szerepelnek
        </Text>
        <Box as="ul" listStyleType="none" m={0} p={0} fontSize="14px" color="muted" lineHeight="1.65">
          <li>A M.A.G.U.S. világa: Gáspár András és Novák Csanád</li>
          <li>Az eredeti játékrendszer: Novák Csanád és Nyulászi Zsolt</li>
          <li><i>Új Törvénykönyv</i>: Bayer Tibor és Kriston Dávid; szerkesztette Mórocz Tibor</li>
        </Box>
      </Box>

      <Text fontSize="14px" color="muted" lineHeight="1.6" mb="6px">
        Az alkalmazás forráskódja nyílt (MIT licenc); a részletek és a teljes közreműködői lista a{" "}
        <Box as="a" href={REPO_URL} target="_blank" rel="noopener noreferrer" color="accentTx" textDecoration="underline" textUnderlineOffset="3px">
          projekt oldalán
        </Box>{" "}
        olvashatók. Ha jogosultként bármit módosíttatnál vagy eltávolíttatnál, nyiss ott egy issue-t, és hamar
        intézzük.
      </Text>
    </Box>

    <Box display="flex" alignItems="center" justifyContent="space-between" gap="12px" p="12px 22px 18px" borderTop="1px solid" borderColor="rule">
      <Text fontFamily="system-ui" fontSize="12px" color="fgFaint" lineHeight="1.4">
        Később a karakterlista alján, a „Névjegy” linkkel nyitható meg újra.
      </Text>
      <Box as="button" type="button" onClick={onClose} flexShrink={0} px="20px" py="9px" borderRadius="9px" border="1px solid" borderColor="accent" bg="accentSoft" color="accentTx" fontWeight={700} fontSize="15px">
        Értem
      </Box>
    </Box>
  </ModalShell>
);
