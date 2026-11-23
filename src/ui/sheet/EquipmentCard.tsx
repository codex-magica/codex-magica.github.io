import React, { useState } from "react";
import { useDraftWhile } from "./draftContext";
import { Box, Heading, HStack, Text, Textarea } from "@chakra-ui/react";
import { NumPadDialog } from "./NumPadDialog";
import { Card, FS, FS_SEC, PanelEditButton } from "./primitives";

// Quantity calculator for a numbered equipment line — mirrors the resource-pool pad.
const InventoryQtyModal: React.FC<{ name: string; qty: number; onApply: (n: number) => void; onClose: () => void }> = ({ name, qty, onApply, onClose }) => {
  const apply = (n: number) => onApply(Math.max(0, n));
  return (
    <NumPadDialog
      title={name || "Mennyiség"}
      readout={<Text as="span" color="accentTx">{qty} db</Text>}
      width="min(340px, 100%)"
      upLabel="+ Hozzáadás"
      downLabel="− Elvétel"
      onUp={(amt) => apply(qty + amt)}
      onDown={(amt) => apply(qty - amt)}
      tertiaryLabel={(amount) => `Beállítás: ${amount || "0"} db`}
      tertiaryEnabled={(amount) => !!amount}
      onTertiary={(amt) => apply(amt)}
      onClose={onClose}
    />
  );
};

// Free-text equipment list. View mode renders each line; a line starting with a number turns that
// number into a button that opens the quantity calculator. The edit button (top-left) swaps in a textarea,
// which saves as you type (like the companion and condition windows): leaving the sheet without closing
// the editor loses nothing.
export const EquipmentCard: React.FC<{ text: string; onSet: (t: string) => void }> = ({ text, onSet }) => {
  const [draft, setDraft] = useState<string | null>(null);
  useDraftWhile(draft !== null);
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
          <PanelEditButton editing={editing} label="Felszerelés szerkesztése"
            onToggle={() => setDraft(editing ? null : text)} />
        </HStack>
        {editing ? (
          <Textarea value={draft ?? ""} onChange={(e) => { setDraft(e.target.value); onSet(e.target.value); }} autoFocus rows={Math.max(MIN_LINES, lines.length + 1)}
            placeholder={"Soronként egy tárgy.\nSzám az elején = mennyiség, pl. „5 fáklya”."}
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
