import React, {createContext, ReactNode, useContext, useReducer} from 'react';
import {Character} from "@/data/character";
import {defaultCharacter} from "@/data/defaultCharacter";

// Define the type for the context value
interface CharacterContextValue {
  character: Character;
  setCharacter: React.Dispatch<Partial<Character>>;
}

// Create the context with a default value
const CharacterContext = createContext<CharacterContextValue | undefined>(undefined);

interface CharacterProviderProps {
  children: ReactNode; // or ReactNode[] if you expect multiple children
}

// Create a provider component
export const CharacterProvider: React.FC<CharacterProviderProps> = ({ children }) => {
  const [character, setCharacter] = useReducer(
    (state: Character, newState: Partial<Character>) => ({ ...state, ...newState }),
    defaultCharacter
  );

  return (
    <CharacterContext.Provider value={{ character, setCharacter }}>
      {children}
    </CharacterContext.Provider>
  );
};

// Hook to use the character context
export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
};
