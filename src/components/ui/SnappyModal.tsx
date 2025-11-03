import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Box,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody, Modal
} from '@chakra-ui/react';

interface SnappyModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: T[];
  titleFn: (item: T) => React.ReactNode;
  bodyFn: (item: T) => React.ReactNode;
  selectedItem?: T;
}

const SnappyModal = <T,>({isOpen, onClose, data, titleFn, bodyFn, selectedItem}: SnappyModalProps<T>) => {
  const modalOuterRef = useRef<HTMLDivElement>(null);
  const [childRefs, setChildRefs] = useState<React.RefObject<HTMLDivElement>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  //updating children refs
  useEffect(() => {
    // Create a ref for each child, if it doesn't already exist
    setChildRefs((refs) =>
      data.map((_, i) => refs[i] || React.createRef())
    );
  }, [data]);

  const changeSelectedIndex = useCallback((index: number, delay: boolean) => {
    if(delay){
      setTimeout(() => childRefs[index]?.current?.scrollIntoView({ behavior: 'auto' }), 10);
    } else {
      childRefs[index]?.current?.scrollIntoView({ behavior: 'auto' })
    }
  },[childRefs]);

  const changeSelected = useCallback((item: T, delay: boolean) => {
    changeSelectedIndex(data.indexOf(item), delay);
  },[changeSelectedIndex, data]);

  useEffect(() => {
    if(isOpen && selectedItem){
      changeSelected(selectedItem, true);
    }
  }, [changeSelected, isOpen, selectedItem]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.stopPropagation(); // prevents event from reaching window/global listeners
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = currentIndex + direction;
      if(nextIndex >= 0 && nextIndex < data.length) {
        changeSelectedIndex(nextIndex, false);
      }
    }
  }, [changeSelectedIndex, currentIndex, data.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(index);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent onKeyDown={handleKeyDown}>
        <ModalHeader>
          {titleFn(data[currentIndex])}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflow="hidden" px={0}>
          <Box w="100%" h="100%" display="flex" overflowX="auto" overflowY="hidden" scrollSnapType="x mandatory" position="relative" sx={{'&::-webkit-scrollbar': {display: 'none'}}} onScroll={handleScroll} ref={modalOuterRef}>
            {data.map((item, index) => (
                <Box key={index} flex="0 0 100%" scrollSnapAlign="start" overflowX="hidden" overflowY="auto" maxH="60vh" ref={childRefs[index]}>
                  <Box px={4}>
                    {Math.abs(index - currentIndex) > 9 ? null : bodyFn(item)}
                  </Box>
                </Box>
              )
            )}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SnappyModal;
