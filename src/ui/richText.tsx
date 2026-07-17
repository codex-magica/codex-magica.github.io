import React from "react";
import { Box, Text, TextProps } from "@chakra-ui/react";

// Minimal inline markup for book prose: **bold** and *italic* spans. Deliberately NOT applied where
// literal asterisks are meaningful — the footnote markers (*, **, ***…) in table cells and "small:"
// fine print stay as typed.
export const InlineMd: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((seg, i) =>
      seg.startsWith("**") && seg.endsWith("**") && seg.length > 4 ? (
        <Text as="span" key={i} fontWeight={700} color="accentTx">{seg.slice(2, -2)}</Text>
      ) : seg.startsWith("*") && seg.endsWith("*") && seg.length > 2 ? (
        <Text as="i" key={i}>{seg.slice(1, -1)}</Text>
      ) : (
        <React.Fragment key={i}>{seg}</React.Fragment>
      )
    )}
  </>
);

// Book prose paragraphs: blank lines split paragraphs, single newlines stay as line breaks, a
// "> " lead marks a quote block (indented italic, like the rulebook's asides), and InlineMd handles
// the bold/italic spans. `parProps` styles the paragraphs (size, line height, justification…).
export const Prose: React.FC<{ text: string; parMb?: TextProps["mb"]; parProps?: TextProps }> = ({ text, parMb = "13px", parProps }) => (
  <>
    {text.split(/\n{2,}/).map((p, i) =>
      /^\s*>/.test(p) ? (
        <Box key={i} mb={parMb} pl="12px" borderLeft="2px solid" borderColor="rule">
          <Text fontSize="13.5px" lineHeight="1.65" {...parProps} color="muted" fontStyle="italic" whiteSpace="pre-line">
            <InlineMd text={p.replace(/^\s*>\s?/gm, "")} />
          </Text>
        </Box>
      ) : (
        <Text key={i} mb={parMb} fontSize="13.5px" lineHeight="1.65" color="fg" whiteSpace="pre-line" {...parProps}>
          <InlineMd text={p} />
        </Text>
      )
    )}
  </>
);
