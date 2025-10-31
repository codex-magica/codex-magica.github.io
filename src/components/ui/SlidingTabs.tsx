import React, { useState } from 'react';
import {Box, HStack, Button, useBoolean} from '@chakra-ui/react';
import { motion } from 'framer-motion';

interface SlidingTabsProps {
  tabs: string[];
  children: React.ReactNode[];
}

const SlidingTabs: React.FC<SlidingTabsProps> = ({ tabs, children }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useBoolean();

  return (
    <>
      <Box position="fixed" top={5} width="100%" zIndex={1} display="flex" justifyContent="center" bg="transparent">
        <HStack>
            {tabs.map((tab, index) => (
              <Button key={index} onClick={() => setTabIndex(index)}>{tab}</Button>
            ))}
        </HStack>
      </Box>
      <Box w="100%" display="flex" flexDir="column" overflow="hidden">
        <motion.div style={{
          flexDirection: "row",
          direction: "ltr",
          willChange: "transform",
          minHeight: 0,
          flex: 1,
          display: "flex" }}
          transition={{
            tension: 190,
            friction: 70,
            mass: 0.4
          }}
          initial={false}
          animate={{ x: tabIndex * -100 + "%" }}
          onAnimationStart={setIsAnimating.on}
          onAnimationComplete={setIsAnimating.off}
        >
          {React.Children.map(children, (child, i) => (
            <Box
              key={i}
              aria-hidden={tabIndex !== i}
              tabIndex={tabIndex === i ? 0 : -1}
              // visibility={tabIndex === i ? 'visible' : 'hidden'}
              display="flex"
              flexDir="column"
              w="100%"
              alignSelf="stretch"
              justifyContent="flex-start"
              flexShrink={0}
              height="100vh"
              overflowX="hidden"
              overflowY={isAnimating ? "hidden" : "auto"}
              outline="none"
              sx={{touchAction: 'pan-y'}}
            >
              {child}
            </Box>
          ))}
        </motion.div>
      </Box>
    </>
  );
};

export default SlidingTabs;
