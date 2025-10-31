import React from 'react';
import './App.css';
import MainContainer from "./MainContainer";
import {CharacterProvider} from "./CharacterContext";

function App() {
  return (
    <CharacterProvider>
      <MainContainer />
    </CharacterProvider>
  );
}

export default App;
