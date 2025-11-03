import React from 'react';
import {Text, VStack} from "@chakra-ui/react";
import DetailsTable from "@/components/etc/DetailsTable";

interface DetailsProps {
  prefix?: string,
  color?: string,
  children: JSX.Element | string | string[],
}

const isString = (value: any) => {
  return typeof value === 'string';
}

const isTableString = (value: string) => {
  return value.startsWith('table:');
}

const isStringArray = (value: any) => {
  return Array.isArray(value) && value.every(isString);
}

export default ({prefix, color, children}: DetailsProps) => {

  const renderString = (text: string, applyPrefix = false) => {
    if(isTableString(text)) {
      return <DetailsTable tableString={text.replace("table:", "")} />;
    }

    const isSmall = text.startsWith('small:');

    const paragraphs= text.replace("small:", "").split('\n').filter((line) => line.length > 0);

    return (
        <VStack align='start' spacing={0} w="100%">
          {paragraphs.map((paragraph, index) => (
            <Text textAlign="justify" w="100%" key={index} fontSize={isSmall ? 'sm' : undefined} textIndent="20px" color={color}>
              {applyPrefix && index === 0 && prefix && <strong>{prefix + ' '}</strong>}
              {paragraph}
            </Text>
          ))}
        </VStack>
    );
  }

  if(isString(children)) {
    return renderString(children as string, true);
  }

  if(isStringArray(children)) {
    return (
      <>
        {(children as string[]).map((child, index) => (
          <React.Fragment key={index}>
            {renderString(child, index === 0)}
          </React.Fragment>
        ))}
      </>
    );
  }

  return (<>
    {prefix && <Text fontWeight="bold" color={color}>{prefix + ' '}</Text>}
    {children}
  </>);
};
