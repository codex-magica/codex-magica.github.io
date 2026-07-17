import React, { useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";
import { Reorder, useDragControls } from "framer-motion";

// Drag-to-reorder for the sheet's edit-mode lists (conditions, weapons, companions). Rows keep
// their own tap/click behavior: dragging starts ONLY from the grip handle this component passes
// into `row` (dragListener is off), so scrolling and row taps never fight the drag.
//
// The order is LOCAL while a drag is in flight and commits once on drag end. Committing every
// mid-drag swap into the app store re-derives the whole record and re-renders the list under the
// pointer, which desyncs framer's layout measurements — the next drag then "sticks" between rows.
export function ReorderList<T>({ items, keyOf, onReorder, row }: {
  items: T[];
  keyOf: (item: T) => string;
  onReorder: (items: T[]) => void;
  row: (item: T, grip: React.ReactNode) => React.ReactNode;
}) {
  const [local, setLocal] = useState(items);
  const localRef = useRef(local);
  localRef.current = local;
  const dragging = useRef(false);
  // Adopt outside changes (add / delete / the post-commit refresh) whenever no drag is active.
  useEffect(() => { if (!dragging.current) setLocal(items); }, [items]);

  const onDragStart = () => { dragging.current = true; };
  const onDragEnd = () => { dragging.current = false; onReorder(localRef.current); };

  return (
    <Reorder.Group as="div" axis="y" values={local} onReorder={setLocal} style={{ listStyle: "none" }}>
      {local.map((item) => (
        <Row key={keyOf(item)} item={item} row={row} onDragStart={onDragStart} onDragEnd={onDragEnd} />
      ))}
    </Reorder.Group>
  );
}

const GripIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.7" /><circle cx="15" cy="5" r="1.7" />
    <circle cx="9" cy="12" r="1.7" /><circle cx="15" cy="12" r="1.7" />
    <circle cx="9" cy="19" r="1.7" /><circle cx="15" cy="19" r="1.7" />
  </svg>
);

function Row<T>({ item, row, onDragStart, onDragEnd }: {
  item: T;
  row: (item: T, grip: React.ReactNode) => React.ReactNode;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const grip = (
    <Box
      as="span"
      role="button"
      aria-label="Sorrend módosítása"
      title="Húzd a sorrend módosításához"
      onPointerDown={(e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); controls.start(e); }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      w="20px"
      alignSelf="stretch"
      flexShrink={0}
      color="fgFaint"
      cursor="grab"
      sx={{ touchAction: "none" }}
      _hover={{ color: "muted" }}
    >
      {GripIcon}
    </Box>
  );
  return (
    // The 5px row gap lives INSIDE the item as padding (not margin): framer measures border boxes,
    // and margin gaps would be dead zones the pointer can hover without triggering a swap.
    // whileDrag lifts the row; opacity comes from the caller's row background (EditRow is opaque).
    // NOTE: no theme colors in whileDrag — framer can't animate the tokens' oklch() values.
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ position: "relative", borderRadius: 7, paddingBottom: 5 }}
      whileDrag={{ zIndex: 3, boxShadow: "0 6px 18px rgba(0,0,0,.25)" }}
    >
      {row(item, grip)}
    </Reorder.Item>
  );
}
