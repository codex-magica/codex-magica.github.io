// Harci helyzetek — a Harcrendszer fejezet (17-harcrendszer.md) "Harci helyzetek" szakasza.
// Cell values follow the book's summary table; descriptions are the book's prose (OCR-corrected).
// "—" = nincs módosító, "nincs" = az érték elvész / nem alkalmazható.

export interface CombatSituation {
  name: string;
  ke: string;
  te: string;
  ve: string;
  ce: string;
  // when set, the situation has no simple numeric modifiers — the table row shows this note instead
  note?: string;
  description: string[];
}

export const combatSituationsIntro =
  "A Kezdeményező, Támadó és Célzó dobás eredményességét nagyban befolyásolhatja a harci helyzet. Ez magában foglalja a küzdő felek egymáshoz viszonyított helyzetéből, illetve a környezetükből származó előnyöket és hátrányokat. A következőkben másféltucatnyi különböző harci helyzetet említünk és kommentálunk.";

export const CombatSituations: CombatSituation[] = [
  {
    name: "Meglepetésszerű támadás",
    ke: "a támadó", te: "+30", ve: "—", ce: "—",
    description: [
      "Akkor beszélhetünk meglepetésszerű támadásról, ha a célpontot teljesen váratlanul éri a támadás, nincs felkészülve a hárításra vagy kitérésre. Így — értelemszerűen — a támadóé a kezdeményezés joga, és az adott körben, a küzdelemben is fölénybe kerül. Az ebből származó előnyök a következő harci körben odalesznek a meglepetéssel együtt.",
    ],
  },
  {
    name: "Harc magasabbról",
    ke: "—", te: "+5", ve: "+5", ce: "—",
    description: [
      "Ha az ellenfelek a küzdelem során szintkülönbségbe kerülnek egymáshoz képest (egyikük két fokkal lejjebb áll a lépcsőn, netán egy asztal tetejéről tornyosul a másik fölé), akkor a feljebb tartózkodó előnyt élvez, hiszen csapásaiba nagyobb erőt képes belevinni, míg védekezésnél kisebb és könnyebben védhető felületet nyújt ellenfelének.",
    ],
  },
  {
    name: "Harc helyhez kötve",
    ke: "-10", te: "—", ve: "-10", ce: "—",
    description: [
      "A Harc helyhez kötve annyit tesz, hogy az egyik harcoló fél képtelen a helyváltoztatásra. Vagy mert a küzdelem során a falhoz szorult, vagy mert derékig a sárba süppedt stb. Ebből természetesen jelentős hátránya származik.",
    ],
  },
  {
    name: "Harc fekve",
    ke: "nincs", te: "-20", ve: "-10", ce: "nincs",
    description: [
      "Harc közben gyakran előfordul, hogy valaki felbukik, hanyatt zuhan. Az illető ilyenkor súlyos hátránnyal képes csak folytatni a küzdelmet. A kezdeményezést automatikusan elveszíti.",
      "Az érintett felállni csak akkor képes, ha sikeres mozgásértékű cselekedetet hajt végre anélkül, hogy közben bárki sikeres Támadó dobást hajtana végre ellene. Ha mindezen feltételek teljesülnek, a kör végére újból talpra állhat.",
      "small:Közelharc közben fekve lehetetlen célzófegyvert használni. Egyébként — harcon kívül — kizárólag nyílpuskával és fúvócsővel lehet eredményesen célozni fekve.",
    ],
  },
  {
    name: "Harc mozgó lóról",
    ke: "—", te: "+20", ve: "+10", ce: "—",
    description: [
      "A küzdő felek egyike — és csak egyike! — lovon ülve harcol, ebből (ha rendelkezik az adott képzettséggel) jelentős előnyt kovácsolhat. Ehhez egyrészt 3. fokú Lovaglás képzettséggel kell rendelkeznie, másrészt az általa megült hátasnak szünet nélkül mozognia, rúgkapálnia kell. Ha ezen feltételek valamelyike nem teljesül, a lovas csak a Harc magasabbról előnyeit élvezi.",
    ],
  },
  {
    name: "Harc vakon vagy vaksötétben",
    ke: "nincs", te: "-60", ve: "-60", ce: "-150",
    description: [
      "Mindazok, akik — vagy, mert vakok, vagy bármely más okból — nem látják ellenfelüket, valamint nem érzékelik pontosan a környezetüket, jelentős hátránnyal képesek csak harcolni, a kezdeményezést is automatikusan elveszítik.",
    ],
  },
  {
    name: "Harc láthatatlan ellenféllel",
    ke: "nincs", te: "-40", ve: "-40", ce: "-75",
    description: [
      "Különbséget kell tennünk azonban két eset között: amikor teljesen vakon küzd valaki, illetve amikor a környezetével tökéletesen tisztában van, csupán ellenfelét nem látja. Ha nem is olyan szigorúak, mint a vakharc esetében, de ilyenkor is komoly levonások sújtják a hátrányba került felet, a kezdeményezést is automatikusan elveszíti.",
    ],
  },
  {
    name: "Harc félelem hatása alatt",
    ke: "a támadó", te: "-20", ve: "+10", ce: "—",
    description: [
      "Mindazok, akik rettegnek ellenfelüktől, hogy életüket megóvják, tudat alatt is a védekezésre összpontosítanak a támadás hátrányára.",
    ],
  },
  {
    name: "Harc gyűlölettel eltelve",
    ke: "+5", te: "+5", ve: "-10", ce: "—",
    description: [
      "Mindazok, akik parttalanul gyűlölik ellenfelüket — vagy rettegnek tőle, de sarokba szorulnak, és szembefordulni kényszerülnek vele — gyakorta merítenek erőt ebből az érzésből. Nem törődnek a rájuk hulló csapásokkal, vakon törnek előre, csak hogy minél hamarabb elpusztítsák ellenfelüket.",
    ],
  },
  {
    name: "Roham",
    ke: "—", te: "+20", ve: "-20", ce: "-20",
    description: [
      "Küzdelem során — leginkább egy harc kezdetekor — gyakran előfordul, hogy az egyik fél lerohanja a másikat, lendületét fordítva a maga hasznára. A támadás ennek következtében átütő erejű lesz, míg a védekezés háttérbe szorul. Roham során megkísérelt célzáson futás közben vagy vágtató hátasról leadott lövést értünk.",
      "Roham esetén gyakran egy kör alatt eldől a küzdelem sorsa. Az eredmény legtöbbször attól függ, hogy a rohamozó, vagy a nyugton várakozó ellenfél ragadja-e magához a kezdeményezést. Sikeres roham, illetve a rohamozó ellen végrehajtott sikeres feltartó támadás esetén az okozott sebzés mindig kétszerese a közönségesnek (lásd még Egészkörös cselekedetek!)",
      "A sebzés kétszereződése nem vonatkozik sem a hajítófegyverekre, sem a célzófegyverek lövedékei által okozott veszteségekre.",
      "Ha mindkét fél rohamra lendül, az összecsapáskor mindketten élvezik és elszenvedik jelen szabály előnyeit és hátrányait, azonban a sebzés nem négyszereződik.",
      "Rohammal csak akkor lehet több támadást is leadni, ha a rohamozót semmi sem kényszeríti lendülete megtörésére, lelassulásra, tehát senki nem dob ellene sikeres Támadó dobást, és nem kerül akadály az útjába. Ellenkező esetben a roham megtörik.",
    ],
  },
  {
    name: "Harc az ellenfél elfogásáért",
    ke: "—", te: "-10", ve: "—", ce: "nincs",
    description: [
      "Erről a harci helyzetről akkor beszélhetünk, ha a küzdők egyike ellenfele foglyul ejtésére vagy ártalmatlanná tételére törekszik. Nem az a célja, hogy súlyos sebet ejtsen ellenfelén, pusztán az, hogy jobb belátásra bírja vagy elkábítsa. A túlütés ilyen feltételek mellett nem jelent Ép sebzést, ellenben kétszeres Fp sebet okoz. Az utolsó támadásnál, az áldozat Fp-inek elfogytával a sebzés nem csúszik át Ép-re, hanem az áldozat egyszerűen elájul.",
      "Foglyul ejtés csak Közelharcban alkalmazható. Hajítófegyvert dobni, távolsági fegyverrel lőni ilyen szándékkal nem lehet.",
    ],
  },
  {
    name: "Harc kábultan",
    ke: "-10", te: "-20", ve: "-10", ce: "-30",
    description: [
      "Mindazok, akik valamilyen okból nincsenek teljesen tudatában cselekedeteiknek (akár alkohol, akár különböző mákonyok hatása miatt), a fenti hátrányokkal harcolnak.",
    ],
  },
  {
    name: "Harc bénultan",
    ke: "", te: "", ve: "", ce: "",
    note: "Lásd a leírást!",
    description: [
      "A karakter lebénult végtagját nem használhatja harc közben, így elveszíti például a pajzs, alkarvédő vagy a fegyver nyújtotta módosítókat. Amennyiben képtelen a helyváltoztatásra, úgy a Harc fekve vagy a Harc helyhez kötve módosítói érvényesek rá.",
      "Amennyiben teljesen lebénul, úgy magatehetetlen célpontnak tekintendő, VÉ értéke 0-ra csökken.",
    ],
  },
  {
    name: "Támadás hátulról",
    ke: "", te: "", ve: "", ce: "",
    note: "Lásd a leírást!",
    description: [
      "A támadó hátulról ront ellenfelére, aki így kevésbé képes védekezni ellene. Akit a támadás ért, elveszíti a fegyvere és a pajzsa nyújtotta VÉ módosítókat. A hátrányt azonban szigorúan csak addig szenvedi el, ameddig a másik mögötte tud maradni.",
    ],
  },
  {
    name: "Támadás oldalról/félhátulról",
    ke: "", te: "", ve: "", ce: "",
    note: "Lásd a leírást!",
    description: [
      "A támadó úgy harcol ellenfelével, hogy annak félig-meddig — de semmiképpen sem teljesen — a háta mögött marad, vagy pedig oldalról ront rá. Akit a támadás ért, elveszíti a fegyvere vagy a pajzsa nyújtotta VÉ módosítókat (attól függően, melyik oldalról éri a támadás), egészen addig, míg ellenfelével szembe nem fordul.",
    ],
  },
  {
    name: "Védekező harc",
    ke: "a támadó", te: "nincs", ve: "+40/+25/+10", ce: "nincs",
    description: [
      "Az érintett fél egyetlen célja, hogy megóvja magát a támadásoktól. Kizárólag a védekezésre összpontosít, ami (míg a körülmények engedik), folyamatos hátrálást jelenthet, ehhez pedig jelentős helyre van szükség (lásd még Egészkörös cselekedetek!).",
      "Ha kizárólag a védekezésre összpontosít a célpont és van helye is a hátrálásra, akkor a VÉ-je 40-nel nő, míg a Kezdeményezés az ellenfélé lesz. A védekező harcban visszatámadásra nincs mód.",
      "Ez esetben azonban más cselekvést nem tud végrehajtani. A védekezéssel egyidejűleg nem használhat pszit, mágiát, nem vehet elő addig elrakott fegyvereket, felszerelési tárgyakat, nem tud előre menni, egy helyben maradni, hanem folyamatosan hátrál és hárít.",
      "small:Ha falhoz szorítják, vagy szorosan körbeveszik — „Harc helyhez kötve” — hiába változatlan az erőfeszítése, a védekezés kevésbé lesz hatékony, a Védő Érték mindössze +25-tel nő.",
      "small:Ha kénytelen megosztani a figyelmét, mert a védekezés közben pszit, mágiát stb. kíván használni, a védekezés korántsem olyan hatékony, mint teljes összpontosítás esetén. Ekkor a Védő Érték csupán +10-zel nő.",
    ],
  },
];
