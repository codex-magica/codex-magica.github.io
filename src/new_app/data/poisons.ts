// Mérgek és mérgezés — a 20-mergek-es-mergezes.md fejezet referencia-adatai: példamérgek,
// a mérgezés kis szabálytáblázatai, valamint a fejezet szabályprózája (a Szabályok modalhoz).

export interface Poison {
  name: string;
  level: number;
  kind: string; // alkalmazás szerint (fegyverméreg, kontaktméreg, …)
  system?: string; // melyik rendszerre hat (idegrendszer, izomrendszer, …)
  effect: string; // "enyhébb / súlyosabb" (sikeres / sikertelen Egészségpróba)
  onset: string; // hatóidő-kategória
  duration: string; // időtartam-kategória
  price: string;
  description: string[];
}

export const poisonsIntro =
  "Ynev mérgei növényi vagy állati eredetű, esetleg különleges ásványokból készített keverékek, porok, párlatok — okozhatnak kisebb gyomorégést éppúgy, mint azonnali halált. Minden méreg ellen Egészségpróbát kell dobni, a méreg szintjével csökkentett Egészségre: siker esetén az enyhébb, kudarc esetén a súlyosabb hatás érvényesül.";

// hatóidő- és időtartam-kategóriák → játéktechnikai idő (a modal statokban jelenik meg)
export const ONSET_TIMES: Record<string, string> = {
  "azonnali": "1k10 szegmens",
  "gyors": "1k6 kör",
  "lassú": "2k6 óra",
  "nagyon lassú": "1k6 nap",
  "lappangó": "feltételhez kötött",
};
export const DURATION_TIMES: Record<string, string> = {
  "egyszeri": "1 kör",
  "rövid": "1k6×10 perc",
  "közepes": "1k6 óra",
  "hosszú": "1k6 nap",
  "maradandó": "maradandó károsodás",
};

export const PoisonValues: Poison[] = [
  {
    name: "Álomkenőcs",
    level: 2, kind: "kontaktméreg", system: "idegrendszer",
    effect: "rosszullét / bódulat", onset: "gyors", duration: "rövid", price: "1a 8e",
    description: [
      "2. szintű, rosszullétet vagy bódulatot okozó szer. A legcélszerűbb idegméregnek neveznünk. Egyes vidékeken — így főleg Abasziszban — boszorkányok állítják elő maszlagból. Hatása gyors és rövid ideig tart. Kontaktméreg, azaz elég bőrfelületre juttatni, de ételbe, italba nem keverhető. Valószerű álmokat és látomásokat okoz, ezért boszorkányok gyakran használják jósálmokhoz. Túl gyakori használata kábítószer-függőséget okozhat.",
    ],
  },
  {
    name: "A Császár Bosszúja",
    level: 3, kind: "többkomponensű ételméreg", system: "emésztőrendszer",
    effect: "ájulás / halál", onset: "lappangó", duration: "maradandó", price: "~100a",
    description: [
      "3. szintű, több komponensű méreg. A toroni császári udvar méregkeverői készítik és készítésének titkát féltve őrzik. Csak ételbe keverhető. Kereskedelemben nem beszerezhető, de előállítási költsége is hozzávetőleg 100 arany, mivel különleges összetevők szükségesek hozzá.",
      "A császár minden kétes hűségű bizalmi emberének ételébe belecsempésztet egy keveset. Hatását tekintve a méreg az emésztőrendszerre hat, lappangó, és ájulást vagy halált okoz, amennyiben nem kap meg egy bizonyos ellenszert az áldozat. Ha az illető áruló lesz, a császár futni hagyja — hiszen az ellenszerhez nem juthat hozzá.",
    ],
  },
  {
    name: "Feketevér",
    level: 2, kind: "étel- és italméreg", system: "idegrendszer",
    effect: "bódulat / halál", onset: "gyors", duration: "rövid", price: "20a",
    description: [
      "2. szintű, gorviki eredetű idegméreg. Sűrű, fekete, keserű folyadék, legtöbbször ételbe keverve adják be. Az idegrendszerre hat, bódulatot, súlyosabb esetben halált okoz. Gyors hatású és rövid ideig hat — ha túlélik.",
    ],
  },
  {
    name: "Kobramarás",
    level: 2, kind: "összetett fegyverméreg", system: "izomrendszer",
    effect: "görcs / halál", onset: "azonnali", duration: "hosszú", price: "22a",
    description: [
      "2. szintű összetett fegyverméreg, melynek fő komponense a kígyó mérge. Az izomrendszerre hat. Görcsöt vagy halált okoz, hatása azonnali és görcs esetén hosszú ideig tart. Főleg délen készítik, északon nehezen beszerezhető és rendkívül drága.",
    ],
  },
  {
    name: "Altató",
    level: 0, kind: "fegyverméreg", system: "idegrendszer",
    effect: "semmi / alvás", onset: "gyors", duration: "rövid", price: "11e",
    description: [
      "0. szintű, idegrendszerre ható méreg, mely vagy hatástalan vagy alvást okoz. Gyorsan hat, de csak rövid ideig. Fegyverre kenhető, enyhén zöldes színű gél, készítése a legtöbb vajákos előtt ismert.",
    ],
  },
  {
    name: "Toroni Pokol",
    level: 3, kind: "fegyverre kenhető kínméreg",
    effect: "rosszullét / fájdalom (5k6 Fp)", onset: "azonnali", duration: "hosszú", price: "21a",
    description: [
      "3. szintű fegyverre kenhető kínméreg. A véráramba jutva fejti ki azonnali hatását, ami hosszú ideig tart. Az áldozat rosszul lesz vagy égető kínt él át, amitől elveszít 5k6 Fp-t. Ezt a fajta mérget az Ikrek szektájának méregkeverői készítik, orgyilkosai előszeretettel használják. Ritkán bár, de adnak el belőle.",
    ],
  },
  {
    name: "Szikrafű",
    level: 0, kind: "légméreg", system: "idegrendszer",
    effect: "bódulat / alvás", onset: "gyors", duration: "közepes", price: "1a",
    description: [
      "0. szintű légméreg, ami egy főleg szikrafűből és édesdohányból álló keverék elégetésével állítható elő. Az idegrendszerre hat, hatása gyors és közepes ideig tart. Bódulatot vagy alvást okoz. Ynev egyes területein pipából, kábítószerként is szívják. Túl gyakori élvezete függőséget vált ki. A bódult áldozat számára megszűnik a külvilág, csak a saját lebegésszerű álomvilága marad.",
    ],
  },
  {
    name: "Nyelvoldó",
    level: 0, kind: "fegyverméreg", system: "idegrendszer",
    effect: "rosszullét / bódulat", onset: "gyors", duration: "közepes", price: "1e",
    description: [
      "0. szintű fegyverméreg, azaz a véráramba jutva fejti ki hatását, de az idegrendszerre hat. Rosszullétet vagy különös bódulatot okoz. Hatása gyors és közepes ideig tart. Az ilyen méreg áldozata nem bódul el teljesen, azaz tudatában van a külvilágnak, harcértékei csak a kábultságnál leírt értékekkel csökkennek, azonban szinte teljesen elveszíti akaraterejét (-10). Ilyen körülmények között szinte bármit elmond, amire csak vallatói kíváncsiak.",
      "Eredetileg kráni ügynökök alkalmazták szerte Yneven — egyik legrettegettebb eszközük volt. Az évek során a recept titka kiszivárgott, s ma már minden valamirevaló méregkeverő ismeri.",
    ],
  },
  {
    name: "Vérizzító",
    level: 1, kind: "fegyverméreg",
    effect: "fájdalom (5k6 Fp)", onset: "azonnali", duration: "egyszeri", price: "1a 2e",
    description: [
      "1. szintű gorviki fegyverméreg. A véráramba jutva fejti ki azonnali, egyszeri hatását. Áldozata perzselő kínt érez egész testében, ami 5k6 Fp veszteséget okoz.",
    ],
  },
];

// Méregkeverés (képzettség): egyedi méreg összeállítása — a négy képesség Ip költsége soronként.
// A 0. szintű méreg Ip költsége a négy választott képesség Ip értékének összege; minden szint +3 Ip.
export const PoisonCraftCosts = [
  { ip: "1 Ip", type: "Étel- és italméreg", effect: "Gyengeség, Rosszullét", duration: "Egyszeri hatású (1 kör)", onset: "Nagyon lassú (1k6 nap)" },
  { ip: "2 Ip", type: "Fegyverméreg", effect: "Kábulat, Bódulat, Fájdalom", duration: "Rövid (1k6×10 perc)", onset: "Lassú (2k6 óra)" },
  { ip: "3 Ip", type: "Légméreg", effect: "Görcs, Bénultság", duration: "Közepes (1k6 óra)", onset: "Gyors (1k6 kör)" },
  { ip: "4 Ip", type: "Több komponensű", effect: "Alvás, Ájulás", duration: "Hosszú (1k6 nap)", onset: "Azonnali (1k10 szegmens)" },
  { ip: "5 Ip", type: "Kontaktméreg", effect: "Halál", duration: "Maradandó", onset: "Lappangó (feltételhez kötött)" },
];

// Méregkeverés (képzettség): a kikevert méreg ára a teljes Ip költség alapján
export const PoisonCraftPrices = [
  { ip: "1-10 Ip", price: "10 réz / Ip" },
  { ip: "11-20 Ip", price: "1 ezüst / Ip" },
  { ip: "21+ Ip", price: "1 arany / Ip" },
];

// A mérgek hatásai — jelentés + tulajdonságmódosítók (—: nincs módosító, a hatás máshogy érvényesül)
export interface PoisonEffect {
  name: string;
  meaning: string;
  mods?: { ero: string; gy: string; ugy: string; aks: string; akr: string; erz: string };
}

export const PoisonEffects: PoisonEffect[] = [
  { name: "Semmi", meaning: "A méreg valamilyen oknál fogva nem hat." },
  { name: "Rosszullét", meaning: "Az áldozat komoly hányingerrel, fejfájással stb. küszködik.", mods: { ero: "-1", gy: "-1", ugy: "-1", aks: "-1", akr: "-1", erz: "-1" } },
  { name: "Gyengeség", meaning: "Az áldozat legyengül, képtelen bármiféle megerőltető tettre.", mods: { ero: "-2", gy: "-2", ugy: "-2", aks: "-1", akr: "—", erz: "—" } },
  { name: "Fájdalom", meaning: "A kínmérgek sajátja, hogy áldozatuknak szörnyű fájdalmat okoznak. Fp-vesztés esetén az áldozat a méreg hatásának teljes időtartama alatt veszti el a feltüntetett mennyiségű Fp-t, nem minden egyes kör során." },
  { name: "Kábulat, Bódulat", meaning: "Az áldozat tudata eltompul, akarata gyengül, esetleg látomások gyötrik. A bódult áldozatot különböző látomások gyötörhetik: lehet, hogy rettegni kezd egy csak általa látható ellenféltől, az is elképzelhető, hogy dühödten nekiront a szörnynek, ami kizárólag az ő elméjében létezik, vagy akár csak áll és élvezi a bódult lebegést.", mods: { ero: "-1", gy: "-1", ugy: "-1", aks: "—", akr: "-3", erz: "-3" } },
  { name: "Görcs", meaning: "Az áldozat részlegesen lebénul, csak nehézkesen és lassan képes mozogni.", mods: { ero: "-4", gy: "-4", ugy: "-4", aks: "—", akr: "—", erz: "-1" } },
  { name: "Bénultság", meaning: "Az áldozat akaratlagos mozgásra képtelen." },
  { name: "Alvás, Ájulás", meaning: "Az áldozat bizonyos időre eszméletét veszti, nem tud a külvilágról." },
  { name: "Halál", meaning: "Az áldozat meghal, egyszerű gyógyítás hasznavehetetlen." },
];

// A fejezet szabályprózája a Szabályok modalhoz — a lapon táblázatként megjelenő adatok nélkül.
export const poisonRules = `A hozzáértők a mérgeket különböző módokon csoportosítják: leggyakrabban hatásuk vagy alkalmazásuk szerint, néha összetevőik eredete, mennyisége, netán ára alapján.

## Alkalmazás szerinti csoportok

**Étel- és italmérgek:** az emésztőrendszerbe kerülve fejtik ki hatásukat. Hatóidejük a néhány perctől a néhány napig terjed. A hatás általában rosszullét, gyengeség vagy halál. Legtöbbször növényi vagy ásványi mérgek, por vagy folyadék formában. Előnyük a biztos hatás, hátrányuk, hogy bizonyos előkészületeket igényelnek.

**Fegyvermérgek:** a fegyver éléről vagy hegyéről a véráramba kerülő mérgek. Hatásuk többnyire gyors, hiszen nyílt harcban az ellenféllel minél előbb végezni kell. Legtöbbször állati eredetű mérgek.

**Gáz- vagy légmérgek:** gázok, a végletekig finommá őrölt porok vagy porlasztott folyadékok, amelyek belégzéssel kerülnek az áldozat szervezetébe. Nehezen kezelhetőek és nem irányíthatók. Általában nem gáz halmazállapotban tárolják őket, hanem folyadékként vagy szilárd anyagként, amit elpárologtatva vagy elégetve nyerik a gázt.

**Kontaktmérgek:** a csupasz bőrön, de még a vékonyabb ruhán keresztül is felszívódnak és igen gyorsan hatnak. Előállításuk igen bonyolult és költséges, csak igen képzett méregkeverő képes rá, és egy alkimista segítségét is igénybe kell vennie (vagy rendelkeznie kell az Alkímia képzettséggel). Kivételes tulajdonságuk, hogy fegyverre is kenhetők és ételbe, italba is keverhetők.

**Többkomponensű mérgek:** a mérgezés magasiskolája — több lépcsőben jutnak az áldozat szervezetébe és ott elegyedve fejtik ki hatásukat. Például egy estélyen lehet méreg az ételben és az italban, de csak az esik áldozatul, akibe mindkét fajta méreg bejut. Másik szokásos használatuk a lassan ölő méreg, ami csak akkor hat, ha az áldozat nem kapja meg rendszeresen az ellenszert.

## Méregellenállás

Minden méreg ellen Egészségpróbát kell dobni, az áldozat Egészségéből levonva a méreg szintjének megfelelő módosítót (0–5). Ha a próba sikeres, a karakter ellenállt a mérgezésnek, és csak az enyhébb hatás érvényesül rá; ha sikertelen, a méreg teljes hatóerővel hat.

Ha az áldozat csak a méreg eltávolításával törődik — pl. kiszívja a sebből — jelentősen javulnak esélyei (+2). Erre csak a méreg hatásának kezdete előtt van lehetősége, és abban a körben mást nem cselekedhet.

Aki teheti, ellenméreggel védekezik (+5). Ezeket a méregkeverők és nagyritkán a herbalisták képesek előállítani; legtöbbjük akkor hatásos, ha még a mérgezés előtt beveszi őket az áldozat.

A hozzászoktatás során a karakter először kis, később egyre nagyobb adagokat kap az adott méregből, míg szervezete fokozatosan ellenállást fejleszt ki (+1-5). Ezt kizárólag 4. fokú méregkeverő segítségével tanácsos végezni — a hatás még így is bizonytalan, könnyen lehet, hogy a karakter belehal.

A mérgeket erősíteni is lehet: egy adott erősségű méregből minél többet kap valaki, annál biztosabb a hatás (minden további adag -1 az Egészségpróbára). Persze nem minden méregfajtából lehet egyszerre több adagot bejuttatni.

A fegyverekre kenhető adagnak legfeljebb a kétszeresét lehet felvinni; a szükségesnél kevesebbet használva a méreg hatása egy osztályt esik minden hiányzó adag után.

## A mérgek típusai (hatás szerint)

**I. Emésztőrendszerre ható mérgek:** az áldozat emésztésében okoznak zavart, ami különösen táplálkozás után jelentkezik. Legtöbbször kínzó fájdalommal, gyomorrontással járnak, de súlyosabb esetekben akár halálosak is lehetnek.

**II. Idegrendszerre ható mérgek:** legtöbbször bénulást vagy érzetkiesést okoznak. Ez lehet egészen enyhe, ami csak gyengeségben, a végtagok reszketésében nyilvánul meg, de lehet akár olyan erős is, ami azonnali halált vált ki.

**III. Izomrendszerre ható mérgek:** az egyik leggyakoribb típus. Okozhat enyhe gyengeséget éppúgy, mint görcsöket vagy bénultságot, legrosszabb esetben szívgörcsöt és halált.

**IV. Keringési rendszerre ható mérgek:** hatásukra a szervezet teljesítőképessége csökken: az áldozat fáradékonyabbá, gyengébbé válik. A legvégső állapot akár a halál is lehet, amit ilyen esetben mindig kóma előz meg.

## A hatás lefolyása

A méreg hatásának múlásával az áldozat a méreg típusához tartozó összes enyhébb hatáson keresztülmegy, a következő sorrend szerint (a súlyosabbtól az enyhébb felé):

1. Halál
2. Alvás, Ájulás
3. Görcs, Bénultság
4. Kábulat, Bódulat, Fájdalom
5. Gyengeség, Rosszullét

A tulajdonságcsökkenésekkel párhuzamosan a karakter időlegesen elveszíti a képzettségei nyújtotta bónuszokat, illetve akár még mágikus képességeit is.

## A mérgek árai

Minden méreg 1 adagja általánosságban annyi pénzbe kerül, amennyi a Méregkeverés képzettségnél feltüntetett táblázatban szerepel (az Ismeret pontok a méreg bonyolultságának felelnek meg). Ha a méregkeverő a Herbalizmus, illetve az Alkímia képzettséggel, saját laboratóriumában állítja elő a mérget, az összeg a korábbi ár töredéke, mindössze harmada.

## Ajzószerek

A méregkeverésben járatos karakter ajzószereket is előállíthat: ezek a mérgekkel hasonló mértékű, de ellenkező előjelű hatást gyakorolnak alkalmazójukra — a testi adottságok vagy a szellemi koncentrálóképesség javulhat időszakosan. Az ajzószer Ip költsége minden esetben kétszerese a hasonló mértékű, de ellentétes hatású méregnek, ára a teljes (duplázott) Ip költség szerint számolandó.

Az ajzószer erősítése pozitív módosítóként érvényesül a karakter Egészségpróbáján az alkalmazáskor. Ha azonban a karakter elvéti a próbát, szervezete nem bírja a megterhelést: az eredetileg kívánt hatásnál egy szinttel súlyosabb és egy időtartam-kategóriával hosszabb hatás teljesedik ki, ezúttal a normál mérgezésnek megfelelő hatással.

## Függőség

Függőség akkor alakulhat ki, ha a karaktert valamely méreghez vagy ajzószerhez hozzászoktatják, vagy ha ezen anyagok bármelyikével huzamosabban él. A hozzászoktatás által szerzett minden plusz egy Egészségmódosító -1 módosítót jelent a karakter minden Akaraterő-dobására az anyaggal kapcsolatban; hasonlóképpen negatív módosítót jelent minden 3 holdhónap, amely alatt a karakter rendszeresen — legalább heti 1 alkalommal — használja a szert.

Ha a karakter nem jut hozzá az anyaghoz, Akaraterőpróbát köteles tenni a megfelelő módosítókkal. Ha ez sikertelen, minden Tulajdonsága annyival csökken, amennyi a negatív módosító volt, és érvénybe lépnek a Rosszullét hatásai is. Ha a karakter Egészsége vagy Állóképessége 0-ra csökken, belehal az elvonási tünetekbe.

A leszokás annyi hétig tart, amennyi negatív módosító a karaktert sújtja. Minden héten Egészségpróbát kell dobnia; ha a próba sikertelen, azon a héten megtorpan a javulás. Az elvonási tünetek minden sikeres Egészségpróba után egy ponttal csökkennek. Méregkeverésben járatos személy segíthet: ha képzettségpróbáját a karaktert sújtó negatív módosítóval sikerrel végzi el, a siker mértékével megegyező pozitív módosítóval próbálkozhat a leszokó. A 20 Ip feletti anyagokról leszokni általában szinte képtelenség.`;
