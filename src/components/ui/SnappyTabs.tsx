import React, {useEffect, useRef, useState} from 'react';
import {Box, HStack, Button} from '@chakra-ui/react';

interface SnappyTabsProps {
  tabs: string[];
  children: React.ReactNode[];
}

const SnappyTabs: React.FC<SnappyTabsProps> = ({tabs, children}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [childRefs, setChildRefs] = useState<React.RefObject<HTMLDivElement>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  //updating children refs
  useEffect(() => {
    // Create a ref for each child, if it doesn't already exist
    setChildRefs((refs) =>
      children.map((_, i) => refs[i] || React.createRef())
    );
  }, [children]);

  //updating currentIndex
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    let ticking = false;

    const updateIndex = () => {
      if (!el) return;
      const index = Math.round(el.scrollLeft / window.innerWidth);
      setCurrentIndex(index);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateIndex);
        ticking = true;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // handle arrow keys for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle left/right arrow keys
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();

        const direction = e.key === 'ArrowRight' ? 1 : -1;

        const tagetIndex = Math.max(Math.min(currentIndex + direction, childRefs.length), 0);
        const target = childRefs[tagetIndex]?.current;

        target?.scrollIntoView({behavior: "auto"});
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [childRefs, currentIndex]);

  // TODO: fixing safari scroll tail slowness
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
    childRefs[index]?.current?.scrollIntoView({ behavior: 'auto' });
  };

  return (
    <>
      <HStack position="fixed" top={5} width="100%" zIndex={1} justifyContent="center" bg="transparent">
        {tabs.map((tab, index) => (
          <Button key={index} onClick={() => handleTabClick(index)} colorScheme={index === currentIndex ? "red" : undefined}>{tab}</Button>
        ))}
      </HStack>
      <Box w="100%" h="100%" display="flex" overflowX="auto" overflowY="hidden" scrollSnapType="x mandatory" position="relative" sx={{'&::-webkit-scrollbar': {display: 'none'}}} ref={outerRef}>
        {React.Children.map(children, (child, i) => (
          <Box key={i} w="100vw" flex="0 0 100vw" h="100%" scrollSnapAlign="start" overflowX="hidden" overflowY="auto" sx={{'&::-webkit-scrollbar': {display: 'none'}}} ref={childRefs[i]}>
            <Box pt="60px" w="100%">{child}</Box>
          </Box>
          )
        )}
      </Box>
    </>
  );
};

export default SnappyTabs;
