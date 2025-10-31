import React, {cloneElement, ReactElement} from 'react';
import {useDisclosure} from '@chakra-ui/react';

interface Triggerable {
  trigger: ReactElement,
  children: JSX.Element,
}

export default ({trigger, children,}: Triggerable) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const transformedTrigger = cloneElement(trigger, { onClick: onOpen });
  const triggerable = cloneElement(children, { isOpen, onClose });

  return (
    <>
      {transformedTrigger}
      {isOpen && triggerable}
    </>
  );
};
