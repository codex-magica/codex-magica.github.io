import React, { useState } from "react";
import { Box, Heading, HStack, IconButton, Text, Textarea } from "@chakra-ui/react";
import { EditIcon, CheckIcon } from "@chakra-ui/icons";
import { ModalShell, ModalHeader } from "../Modal";
import { NumPad } from "../NumPad";
import { Card, FS, FS_SEC } from "./primitives";

// Quantity calculator for a numbered equipment line — mirrors the resource-pool pad.
const InventoryQtyModal: React.FC<{ name: string; qty: number; onApply: (n: number) => void; onClose: () => void }> = ({ name, qty, onApply, onClose }) => {
  const [amount, setAmount] = useState("");
  const amt = parseInt(amount, 10) || 0;
  const apply = (n: number) => onApply(Math.max(0, n));
  return (
    <ModalShell onClose={onClose} width="min(340px, 100%)">
      <ModalHeader onClose={onClose}>
        <Heading as="h3" fontSize="18px" fontWeight={700} color="fg" noOfLines={1} px="28px">{name || "Mennyiség"}</Heading>
        <Text mt="2px" fontSize="22px" fontWeight={700} color="accentTx" sx={{ fontVariantNumeric: "tabular-nums" }}>{qty} db</Text>
      </ModalHeader>
      <Box flex="1 1 auto" overflowY="auto" px="20px" pt="14px" pb="20px">
        <NumPad value={amount} onChange={setAmount} />
        <HStack gap="9px" mt="12px">
          <Box as="button" type="button" onClick={() => apply(qty + amt)} flex="1" py="11px" borderRadius="9px" border="1px solid" borderColor="good" bg="transparent" color="good" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45}>+ Hozzáad</Box>
          <Box as="button" type="button" onClick={() => apply(qty - amt)} flex="1" py="11px" borderRadius="9px" border="1px solid" borderColor="bad" bg="transparent" color="bad" fontWeight={700} fontSize="15px" opacity={amt > 0 ? 1 : 0.45}>− Elvesz</Box>
        </HStack>
        <Box as="button" type="button" onClick={() => apply(amt)} w="100%" mt="10px" py="9px" borderRadius="9px" border="1px solid" borderColor="fieldBd" bg="fieldBg" color="accentTx" fontWeight={600} fontSize="14px" opacity={amount ? 1 : 0.45}>Beállít: {amount || "0"} db</Box>
      </Box>
    </ModalShell>
  );
};

// Free-text equipment list. View mode renders each line; a line starting with a number turns that
// number into a button that opens the quantity calculator. The edit button (top-left) swaps in a textarea.
export const EquipmentCard: React.FC<{ text: string; onSet: (t: string) => void }> = ({ text, onSet }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [qtyEdit, setQtyEdit] = useState<{ idx: number; name: string; qty: number } | null>(null);
  const editing = draft !== null;
  const lines = text.split("\n");
  const empty = lines.every((l) => !l.trim());
  const MIN_LINES = 8; // keep a notebook-page height even when near-empty

  const setLineQty = (idx: number, n: number) => {
    const ls = text.split("\n");
    ls[idx] = ls[idx].replace(/^(\s*)\d+/, `$1${Math.max(0, n)}`);
    onSet(ls.join("\n"));
  };

  return (
    <>
      <Card>
        <HStack spacing="9px" pb="6px" mb="6px" borderBottom="1px solid" borderColor="rule" align="center" justify="space-between">
          <Heading as="h2" fontSize={FS_SEC} fontWeight={700} color="fg">Felszerelés</Heading>
          <IconButton aria-label={editing ? "Mentés" : "Felszerelés szerkesztése"} title={editing ? "Kész" : "Szerkesztés"} size="xs" variant="outline"
            borderColor={editing ? "accent" : "hair"} bg={editing ? "accentSoft" : "fieldBg"} color={editing ? "accentTx" : "muted"}
            icon={editing ? <CheckIcon boxSize="12px" /> : <EditIcon boxSize="13px" />}
            onClick={() => { if (editing) { onSet(draft!); setDraft(null); } else setDraft(text); }} />
        </HStack>
        {editing ? (
          <Textarea value={draft ?? ""} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft != null && onSet(draft)} autoFocus rows={Math.max(MIN_LINES, lines.length + 1)}
            placeholder={"Egy tárgy soronként.\nSzám az elején = mennyiség, pl. „5 fáklya”."}
            bg="fieldBg" borderColor="fieldBd" color="fg" fontSize={FS} lineHeight="1.55" focusBorderColor="accent" resize="vertical" />
        ) : (
          // pad to at least MIN_LINES so the panel keeps a notebook-page height even when near-empty
          Array.from({ length: Math.max(MIN_LINES, lines.length) }).map((_, i) => {
            const line = lines[i] ?? "";
            const m = line.match(/^(\s*)(\d+)(.*)$/);
            return (
              <Box key={i} py="3px" color="fg" fontSize={FS} lineHeight="1.4" minH="1.45em" borderBottom="1px solid" borderColor="hairSoft">
                {m ? (
                  <>
                    {/* the quantity reads like accentuated handwriting, but stays clickable */}
                    <Box as="button" type="button" title="Mennyiség módosítása" onClick={() => setQtyEdit({ idx: i, name: m[3].trim(), qty: parseInt(m[2], 10) })}
                      display="inline" color="accentTx" fontWeight={700} mr="8px" sx={{ fontVariantNumeric: "tabular-nums" }} _hover={{ textDecoration: "underline" }}>
                      {m[2]}
                    </Box>
                    {m[3].trim()}
                  </>
                ) : (
                  line ? line : i === 0 && empty ? <Text as="span" color="fgFaint" fontStyle="italic">Üres — szerkeszd a ceruzával.</Text> : " "
                )}
              </Box>
            );
          })
        )}
      </Card>
      {qtyEdit && (
        <InventoryQtyModal name={qtyEdit.name} qty={qtyEdit.qty} onApply={(n) => { setLineQty(qtyEdit.idx, n); setQtyEdit(null); }} onClose={() => setQtyEdit(null)} />
      )}
    </>
  );
};
