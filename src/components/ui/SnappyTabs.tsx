import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {Box, HStack, Button, useBoolean, Text} from '@chakra-ui/react';
import {loremIpsum} from "@/components/etc/utils";

interface SnappyTabsProps {
  tabs: string[];
  children: React.ReactNode[];
}

const SnappyTabs: React.FC<SnappyTabsProps> = ({tabs, children}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [childRefs, setChildRefs] = useState<React.RefObject<HTMLDivElement>[]>([]);

  useEffect(() => {
    // Create a ref for each child, if it doesn't already exist
    setChildRefs((refs) =>
      children.map((_, i) => refs[i] || React.createRef())
    );
  }, [children]); // Depend on children

  useEffect(() => { //cutting the end of safari scroll snap animation
    const el = outerRef.current;
    if (!el) return;

    let t: any = null;
    let lastX = el.scrollLeft;

    const handler = () => {
      clearTimeout(t);
      const nowX = el.scrollLeft;
      const dx = Math.abs(nowX - lastX);
      lastX = nowX;

      if (dx < 2) {
        const pageWidth = window.innerWidth;
        const index = Math.round(el.scrollLeft / pageWidth);
        const target = childRefs[index]?.current;

        //alert("Snapping to tab " + index + target?.getBoundingClientRect().left);
        // use scrollIntoView instead of scrollTo
        //target?.scrollIntoView({behavior: "auto"});
        //el.scrollTo({left: target?.getBoundingClientRect().left, behavior: "auto"});
      }
    };

    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const handleTabClick = (index: number) => {
    childRefs[index]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <HStack position="fixed" top={5} width="100%" zIndex={1} justifyContent="center" bg="transparent">
        {tabs.map((tab, index) => (
          <Button key={index} onClick={() => handleTabClick(index)}>{tab}</Button>
        ))}
      </HStack>
      <Box w="100%" h="100%" display="flex" overflowX="auto" overflowY="hidden" scrollSnapType="x mandatory" position="relative" ref={outerRef}>
        {React.Children.map(children, (child, i) => (
          <Box key={i} w="100vw" flex="0 0 100vw" h="100%" scrollSnapAlign="start" overflowX="hidden" overflowY="auto" ref={childRefs[i]}>
            <Box pt="60px" w="100%">{child}</Box>
          </Box>
          )
        )}
      </Box>
    </>
  );
};

export default SnappyTabs;
