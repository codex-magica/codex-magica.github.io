import {Race} from "@/magus/character";


export interface ClassInfo {
  allowedRaces: Race[],
  kapCost: number,
  subclasses?: any
}

export interface SubclassInfo {
}
export const ClassValues = {
  Harcos: {
    allowedRaces: ["Ember", "Elf", "FélElf", "UdvariOrk", "Törpe", "KyrSzármazék"],
    kapCost: 5,
    subclasses: {
      "Amazon": {} as SubclassInfo,
      "Barbár": {} as SubclassInfo,
      "Erigowi számszeríjász": {} as SubclassInfo,
      "Gorviki siedon": {} as SubclassInfo,
      "Predoci vértes": {} as SubclassInfo,
    }
  } as ClassInfo,
  Lovag: {
    allowedRaces: ["Ember", "FélElf", "KyrSzármazék"],
    kapCost: 6,
    subclasses: {
      "Feketerendek": {} as SubclassInfo,
      "Marico con Rabora": {} as SubclassInfo,
      "Isten Kardja lovagrend": {} as SubclassInfo,
      "Erigowi Krad lovagrend": {} as SubclassInfo,
    }
  } as ClassInfo,
  Fejvadász: {
    allowedRaces: ["Ember", "FélElf", "KyrSzármazék"],
    kapCost: 7,
    subclasses: {
      "Gorviki Vértestvériség": {} as SubclassInfo,
      "Anat-Akhan": {} as SubclassInfo,
      "Toroni Ikrek": {} as SubclassInfo,
      "Embervadászok": {} as SubclassInfo,
    }
  } as ClassInfo,
  Tolvaj: {
    allowedRaces: ["Ember", "FélElf", "UdvariOrk", "Törpe", "KyrSzármazék"],
    kapCost: 6,
    subclasses: {
      "Kobrák": {},
      "Talavrai Csodaművesek": {} as SubclassInfo,
      "Szürkecsuklyások": {} as SubclassInfo,
    }
  } as ClassInfo,
  Bárd: {
    allowedRaces: ["Ember", "Elf", "FélElf", "KyrSzármazék"],
    kapCost: 6,
    subclasses: {
      "Aszisz Énekmondó": {} as SubclassInfo,
      "Lombhullás Árvái": {} as SubclassInfo,
      "Vándorló dalnok": {} as SubclassInfo,
      "Sötét bárd": {} as SubclassInfo,
    }
  } as ClassInfo,
  Pap: {
    allowedRaces: ["Ember", "Elf", "FélElf", "Törpe", "KyrSzármazék"],
    kapCost: 7,
    subclasses: {
      "Domvik-pap": {} as SubclassInfo,
      "Ranagol-pap": {} as SubclassInfo,
      "Arel-pap": {} as SubclassInfo,
      "Kyel-pap": {} as SubclassInfo,
      "Sogron-pap": {} as SubclassInfo,
      "Tharr-pap": {} as SubclassInfo,
    }
  } as ClassInfo,
  Paplovag: {
    allowedRaces: ["Ember", "FélElf", "KyrSzármazék"],
    kapCost: 6,
    subclasses: {
      "Darton-paplovag (Maremita)": {} as SubclassInfo,
      "Domvik-paplovag (Isten Kardja)": {} as SubclassInfo,
      "Dreina-paplovag (Oroszlánszív)": {} as SubclassInfo,
      "Krad-paplovag (Aranykör lovag)": {} as SubclassInfo,
      "Ranagol-paplovag": {} as SubclassInfo,
      "Sogron-paplovag": {} as SubclassInfo,
      "Uwel-paplovag": {} as SubclassInfo,
    }
  } as ClassInfo,
  Harcművész: {
    allowedRaces: ["Ember", "FélElf", "KyrSzármazék"],
    kapCost: 10,
    subclasses: {
      "Shien-ka-to (Tűz)": {} as SubclassInfo,
      "Dart-nid-kinito (Víz)": {} as SubclassInfo,
      "Avad-ka-kinito (Föld)": {} as SubclassInfo,
      "Nisen-nid-to (Levegő)": {} as SubclassInfo,
      "Udvari kardművész": {} as SubclassInfo,
      "A harc útja": {} as SubclassInfo,
    }
  } as ClassInfo,
  Boszorkány: {
    allowedRaces: ["Ember", "FélElf", "KyrSzármazék"],
    kapCost: 5,
    subclasses: {
      "Liviniai Gyülekezet": {} as SubclassInfo,
      "Maida Saluquas": {} as SubclassInfo,
      "Stella Prosylens": {} as SubclassInfo,
      "Alidaxi Boszorkányrend": {} as SubclassInfo,
      "Ezer Fátyol Nővérei": {} as SubclassInfo,
    }
  } as ClassInfo,
  Boszorkánymester: {
    allowedRaces: ["Ember", "UdvariOrk", "KyrSzármazék"],
    kapCost: 6,
    subclasses: {
      "Aszisz Vérkelyhesek": {} as SubclassInfo,
      "Ascens Morga": {} as SubclassInfo,
      "Hergoli Villámmesterek": {} as SubclassInfo,
    }
  } as ClassInfo,
  Tűzvarázsló: {
    allowedRaces: ["Ember", "KyrSzármazék"],
    kapCost: 6,
    subclasses: {
      "Tűz Táplálói": {} as SubclassInfo,
      "Tűz Hordozói": {} as SubclassInfo,
      "Tűz Harcosai": {} as SubclassInfo,
      "Aschaon Tűzmesterei": {} as SubclassInfo,
    }
  } as ClassInfo,
  Varázsló: {
    allowedRaces: ["Ember", "Elf", "FélElf", "Törpe", "KyrSzármazék"],
    kapCost: 10,
subclasses: {
      "Lar-Dor": {} as SubclassInfo,
      "Pyarroni Varázslórend": {} as SubclassInfo,
      "Doran": {} as SubclassInfo,
    }
  } as ClassInfo
}

export type Class = keyof typeof ClassValues
