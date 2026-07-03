
export interface ArmorInfo {
  name: string;
  cost?: string;
  weight: string;
  STP: number;
  MGT: number;
  SFÉ: number;
  description: string | string[];
}

export interface ShieldInfo {
  name: string;
  cost: string;
  weight: string;
  damage?: string;
  attackDuration?: string;
  MGT: number;
  KÉ: number;
  TÉ: number
  VÉ: number | string;
  description: string | string[];
}

export const ShieldValues: ShieldInfo[] = [
  {
    name: "Pajzs, kicsi",
    cost: "6e",
    weight: "1",
    attackDuration: "3",
    damage: "1k6",
    MGT: 0,
    KÉ: 5,
    TÉ: 0,
    VÉ: 20,
    description: "Kis pajzsnak nevezzük a hozzávetőleg fél ynevi láb átmérőjű, általában kerek pajzsokat."
  },
  {
    name: "Pajzs, közepes",
    cost: "1a 6e",
    weight: "3",
    attackDuration: "5",
    damage: "1k6",
    MGT: -1,
    KÉ: 0,
    TÉ: 0,
    VÉ: 35,
    description: "A közepes pajzsok hosszúkásak és a felsőtestet védik, azaz kb. egy ynevi láb méretűek."
  },
  {
    name: "Pajzs, nagy",
    cost: "6a",
    weight: "6",
    attackDuration: "10",
    damage: "1k6",
    MGT: -3,
    KÉ: 0,
    TÉ: 0,
    VÉ: 50,
    description: "A nagy pajzsok embermagasak és a nehézvértezetű lovagok felszereléséhez tartoznak. Gyakran használnak ilyet a számszeríjászok is fedezékként."
  },
  {
    name: "Pajzs, pavaze",
    cost: "5a",
    weight: "6",
    MGT: 0,
    KÉ: 0,
    TÉ: 0,
    VÉ: "30/40",
    description: "A pavaze pajzs a számszeríjászok kedvelt pajzsa. Eredetileg az edorli gyalogezredben használták, onnan terjedt el. A pavéze hozzávetőleg téglalap alakú, de a közepén széles, függőleges gerinc fut végig. Ez azt a célt szolgálja, hogy a pajzsot fel lehessen állítani. Ha a számszeríjász ledöf egy karót a földbe, a pajzsot pedig úgy állítja mellé, hogy a gerinc belső oldala mentén támaszkodjon a karónak, akkor az nem fog eldőlni. A számszeríjászok ezt a pajzsot egyébként fedezékként használják, míg újratöltik nyílpuskáikat. A pavéze magas, egy felnőtt embernek a mellkasáig ér. Nagy mérete és esetlen alakja miatt közelharcban nehezen mozgatható, Védő értéke így 30, fedezékként azonban annál hasznosabb, a Célzó dobással szembeállított Védő értéke ugyanis 40."
  },
  {
    name: "Alkarvédő",
    cost: "5e",
    weight: "1",
    MGT: 0,
    KÉ: 0,
    TÉ: 0,
    VÉ: 15,
    description: "A legkisebb, hárításra használt eszközök az alkarvédők, amelyek használata sokban emlékeztet a pajzsokéra. Ezek Védő értéke 15, de ez csak akkor érvényesül, ha a karakter sem fegyvert, sem pajzsot nem fog védekező kezébe. Azok a páncélok, amelyek eleve rendelkeznek alkarvérttel (fél- és teljes vértezet) biztosítják ezt a védelmet viselőjük számára."
  }
  ]

// Név MGT SFÉ Súly Ár STP
// fegyverkabát 0 1 5 1e 20
// bőrpáncél 0 1 8 3e 20
// keményített bőrvértezet -2 4 7 10a 80
// gyűrűs vértezet -1 1 12 2a 20
// brigandin -2 3 15 4a 60
// láncing -1 2 20 10a 40
// sodronying -1 3 20 12a 60
// pikkelyvért -2 3 16 20a 60
// lemezvértezet -2 2 18 40a 40
// rákozott páncél -2 4 25 100a 80
// mellvért -3 4 20 80a 80
// félvértezet -4 5 30 120a 100
// teljes vértezet -5 6 35 200a 120
// gladiátorvért -2 4 15 - 80
// kráni vért -2 4 15 - 80
// kardművész vért -1 4 15 - 80
export const ArmorValues: ArmorInfo[] = [
  {
    name: "fegyverkabát",
    cost: "1e",
    weight: "5",
    STP: 20,
    MGT: 0,
    SFÉ: 1,
    description: "A legegyszerűbb páncélfajta a fegyverkabát. Az alapgondolata az, hogy a vastagon hordott ruha valamelyest felfogja, tompítja az ütéseket, vágásokat. A fegyverkabát — bár neve erre engedne következtetni — nem mindig ruhaposztóból készül. Bármilyen vastag anyag megteszi. Sokszor puha bőrből készült zekét, kabátot bélelnek ki úgy, hogy védjen a támadások ellen, illetve a sérülékenyebb helyeken, pl. hónaljban még léncszövet rátéttel is erősíthetik. A fegyverkabát alapvetően 2 felsőtestet védi. Elöl és hátul egyaránt védettséget nyújt. A kezet és a lábat a különböző darabok különbözőképpen védik. Ezen vért általában hosszú ujjú, így a karokat egészen csuklóig beborítja, de a combokra csak kis mértékben lóg rá. A. nehezebb vértezetek alapjául szolgál a legtöbb esetben, így, ha említésre kerül az adott páncél leírásánál, hogy efféle alap szükségeltetik viseléséhez, akkor a vértezet változatlan MGT mellett a táblázatban feltüntetett SFÉ-nél egy ponttal kevesebb védelmet nyújt, ha hiányzik a fegyverkabát."
  },
  {
    name: "bőrpáncél",
    cost: "3e",
    weight: "8",
    STP: 20,
    MGT: 0,
    SFÉ: 1,
    description: "A bőrpáncél, amit gyakran szegecsekkel vernek ki, puha, de vastag bőrből készül. Minthogy hajlékony, szabad mozgást tesz lehetővé, vastagsága viszont tompítja az ütések erejét, és átvágni sem könnyű. Nagy előnye a fegyverkabátal szemben, hogy vékonyabb, hiszen a bőr erősebb, szívósabb anyag. A ráerősített szegecsek díszítő szerepe csak másodrendű. Elsősorban a vért keménységét, ellenállását fokozzák. Ezért van, hogy a bőrpáncélokon nem egyforma sűrűséggel helyezkednek el minden testtájon. Egyes vidékeken a harcosok alkarjukon olyan sűrűn szegecseltetik bőrvértjeiket, hogy az alkalmas legyen fegyverek hárítására, védekezésre is. Játékszabály szempontjából ez 2 ezüsttel megdrágítja a bőrvértet, de amikor a harcos viseli, úgy védekezhet, mintha alkarvédő lenne rajta. A bőrvért beborítja a teljes felsőtestet, elöl és hátul egyaránt. A karokat általában könyékig fedi, de készülnek hosszú ujjú és mellényszerű bőrpáncélok is."
  },
  {
    name: "keményített bőrvértezet",
    cost: "10a",
    weight: "7",
    STP: 80,
    MGT: -2,
    SFÉ: 4,
    description: "A bőrvértezet vastag bőrből készül, amit forró olajban kifőzve alakítanak a kívánt formára. Az olajfürdőtől a bőr kemény és merev lesz, ezért jobban ellenáll a támadásoknak. Sajnos a merevséggel az is együtt jár, hogy jobban akadályozza a mozgást. Leginkább mellvértet csinálnak kikeményített bőrből, de néha hátvértet, vállvértet is. Azonban leggyakoribb formája a nomád népeknél kifejlődött teljes testet takaró páncélzat, melyhez sisak is készül. Ez a páncél több rétegben tartalmazza a fent említett kifőzött, összeenyvezett bőrlapokat, emiatt igen vastag és ütésálló felületet alkot, melyet átvágni, vagy átdöfni is igen nehéz."
  },
  {
    name: "gyűrűs vértezet",
    cost: "2a",
    weight: "12",
    STP: 20,
    MGT: -1,
    SFÉ: 1,
    description: "A gyűrűs vért a fegyverkabát illetve a bőrpáncél továbbfejlesztett, megerősített változata. Itt a vastag és viszonylag puha anyagra acélgyűrűket varrnak. Ezek a gyűrűk elegendőek ahhoz, hogy a vágásokat és szúrásokat megakasszák, az ütések erejét pedig a posztó- vagy bőralap fogja meg. Mivel a gyűrűk nem fedik egymást, a pontosabb szúrások ellen nem véd olyan jól. Elkészítése viszonylag olcsó és egyszerű."
  },
  {
    name: "brigandin",
    cost: "4a",
    weight: "15",
    STP: 60,
    MGT: -2,
    SFÉ: 3,
    description: [
      "Az előkelő urak nem találták megfelelőnek a gyűrűsvértet — számukra készült a brigandin, Itt nem kívülről kerülnek a ruhára a fém részek, hanem két réteg szövet közé rögzítik azokat.",
    "Messziről a brigandin közönséges ruhának is vélhető, bár közelről látszanak a lemezek rögzítésére szolgáló, szabályosan elhelyezkedő varrások vagy szegecsek.  A brigandin ezenfelül hathatósabb védelmet nyújt a gyűrűsvértnél, mert itt a lapok átfedéssel kerülnek a két réteg szövet  közé, nem hagyva rést maguk között. A nagyobb biztonság ára  a nagyobb súly és a nehezebb mozgás. A gyűrűsvért, valamint  a brigandin elöl-hátul védi a felsőtestet és általában a felkarokat, éppúgy, mint a fegyverkabát ami ezek alapjául szolgál."
    ]
  },
  {
    name: "láncing",
    cost: "10a",
    weight: "20",
    STP: 40,
    MGT: -1,
    SFÉ: 2,
    description: "A sodronying és a láncing kisebb-nagyobb fémgyűrűkből áll, melyeket egymásba fűztek, és utána kovácsoltak vagy forrasztottak egybe. A szemek kapcsolódhatnak egyszeresen vagy többszörösen. Láncingek esetében az előbbi, míg sodronyingeknél az utóbbi szokásos. Sodronyingeknél többletvédelmet jelent az is, hogy a láncsorokat megcsavarják, így vastagabbá, ellenállóbbá téve azokat. Ezeket a vérteket sem tanácsos magukban hordani, mert nem tompítják eléggé az erős ütéseket — SFÉ-jük így 1 illetve 2 —; célszerű fegyverkabátot ölteni alájuk, így sokkal jobban védenek — így nyújtják a táblázatban feltüntetet teljes SFÉ-jüket.\nA láncés sodronyingek a teljes felsőtestet borítják, de gyakran a felkart és a combokat is befedik. Láncszövetből egyébként más ruhadarabokat utánzó vérteket is készítenek, például nadrágot, kesztyűt vagy csuklyát. Ezeket gyakran nem magukban, hanem a nehezebb vértek kiegészítéseként hordják."
  },
  {
    name: "sodronying",
    cost: "12a",
    weight: "20",
    STP: 60,
    MGT: -1,
    SFÉ: 3,
    description: "A sodronying és a láncing kisebb-nagyobb fémgyűrűkből áll, melyeket egymásba fűztek, és utána kovácsoltak vagy forrasztottak egybe. A szemek kapcsolódhatnak egyszeresen vagy többszörösen. Láncingek esetében az előbbi, míg sodronyingeknél az utóbbi szokásos. Sodronyingeknél többletvédelmet jelent az is, hogy a láncsorokat megcsavarják, így vastagabbá, ellenállóbbá téve azokat. Ezeket a vérteket sem tanácsos magukban hordani, mert nem tompítják eléggé az erős ütéseket — SFÉ-jük így 1 illetve 2 —; célszerű fegyverkabátot ölteni alájuk, így sokkal jobban védenek — így nyújtják a táblázatban feltüntetet teljes SFÉ-jüket.\nA láncés sodronyingek a teljes felsőtestet borítják, de gyakran a felkart és a combokat is befedik. Láncszövetből egyébként más ruhadarabokat utánzó vérteket is készítenek, például nadrágot, kesztyűt vagy csuklyát. Ezeket gyakran nem magukban, hanem a nehezebb vértek kiegészítéseként hordják."
  },
  {
    name: "pikkelyvért",
    cost: "20a",
    weight: "16",
    STP: 60,
    MGT: -2,
    SFÉ: 3,
    description: "A pikkelyvért is a brigandin elvén készül, ítt viszont ismét kívülre kerülnek a fémlapocskák. Ezek általában kör-, cserép- vagy téglalap alakúak, és jelentős átfedésekkel borítják a testet. Egyes vidékeken ezt is fegyverkabátra vagy bőrvért alapra varrják fel, de léteznek olyan megoldások is, ahol a lemezeket csak önmagukban fűzik össze. Ilyen esetekben mindig úgy vezetik az összekötő szíjat vagy zsinórt, hogy a pikkelylemezek egyben azt is takarják.\nA posztóalap nélküli pikkelyvért magában is viselhető, a vágásokat így is felfogja, de az ütések erejét alig tompítja, ezért így csak 2 az SFÉ-je — változatlan MGT mellett. Ahhoz, hogy teljes értékű védelmet nyújtson, megfelelő ruházatot kell alávenni, ami általában megfelel a fegyverkabát kategóriájának.\nA pikkelyvért a mellkast és a hasat védi, gyakran kiegészül a hátat borító résszel is. A karokat legfeljebb könyökig fedik, de sokszor leérnek egészen viselőjük térdéig. Ez esetben középen hasítékkal készülnek, a mozgás megkönnyítése érdekében."
  },
  {
    name: "lemezvértezet",
    cost: "40a",
    weight: "18",
    STP: 40,
    MGT: -2,
    SFÉ: 2,
    description: "A lemezvértezet elvben a pikkelyvérthez hasonló, hiszen ez is egymáshoz erősített fémlapokból áll, kinézete azonban teljesen más. A lemezvértezetet alkotó fémlapok általában hosszú, széles csíkok, amelyeket belső oldalukon szíjakkal fűznek össze. Ezek a szíjak biztosítják, hogy a lemezek elmozdulhassanak egymáshoz képest. A nagyobb lemezek miatt kevésbé hajlékony, mint a pikkelyvért, jobban akadályozza a mozgást. A lemezeket alapvetően kétféleképpen szokták elhelyezni: vagy függőlegesen vagy vízszintesen. Hátránya, hogy a lemezek alakja egyszerű, nem követi a test vonalát. Az általánosan elterjedt lemezvértezetek a felsőtestet teljes egészében védik, legtöbb fajtájuk a vállat is. Csak kevés készül a combokra nyúló csataköpennyel, a karokat, lábakat pedig egyáltalán nem védik.\nSzintén ajánlott alatta fegyverkabátot hordani."
  },
  {
    name: "rákozott páncél",
    cost: "100a",
    weight: "25",
    STP: 80,
    MGT: -2,
    SFÉ: 4,
    description: "A lemezvértezet és a mellvért, illetve a félvértezet közti átmenetet a rákozott páncél képviseli. Ez is egymásra rétegelt lemezekből áll, de ezek a lemezek már úgy vannak kialakítva, hogy jobban viselőjük testéhez simuljanak. Ezáltal növelték védelmének hatásosságát, míg nem akadályozza jobban a mozgást, mint egy lemezvértezet. A rákozott páncél a teljes felsőtestet védi elöl-hátul, és minden esetben rálóg a combokra és a felkarra is."
  },
  {
    name: "mellvért",
    cost: "80a",
    weight: "20",
    STP: 80,
    MGT: -3,
    SFÉ: 4,
    description: "Az igazi nehézvértek a mellyvért, a félvértezet és a teljes vértezet nem sokban különböznek egymástól. Alapvető elemeik ugyanazok, csak az különbözteti meg őket, hogy mely részeket használják fel, illetve hagyják el éppen.  A mellvértet mindig domborúra készítik, általában gömbölyűre vagy gerinccel osztottra. A gyomorszáj tájékán gyakran csúcsba futó lemezzel erősítik meg, ami néha a szegycsontig is felér. Ez a rátét néhány páncél esetében külön mozgatható, így kevésbé akadályozza a páncél viselőjét."
  },
  {
    name: "félvértezet",
    cost: "120a",
    weight: "30",
    STP: 100,
    MGT: -4,
    SFÉ: 5,
    description: "A félvért jóval egyszerűbb, itt a lábat védő páncéldarabok részben vagy teljes egészében elmaradnak. A csataszoknyát a megfelelő védelem miatt láncnadrággal egészítik ki. Gyakran a térdvértet külön is felveszik, mivel a térd különösen sérülékeny. A mellvért hagyományos értelemben csak a mellvasat tartalmazza, bár általában a hátvassal együtt veszik fel. Alkalmanként váll-, könyök- és térdvas egészíti ki, olykor a csataszoknyát is felcsatolják hozzá. Szintén láncinget vagy sodronyinget hordanak alatta, ami a lábakat és a karokat védi."
  },
  {
    name: "teljes vértezet",
    cost: "200a",
    weight: "35",
    STP: 120,
    MGT: -5,
    SFÉ: 6,
    description: "A lovagi fél- és teljesvértek mellvasának jobb oldalán kap helyet az úgynevezett ord, ami a nehézkopja megtámasztására szolgál. Ebbe a csuklós kampóba akasztja bele a lovas a kopja végét, amit így könnyebb tartani, azaz pontosabb lesz vele a döfés. Néhány vérten a hátlemezen is található ilyen ord, ez a kopja végének megtámasztását szolgálja. A mellvashoz kapcsolódik a vállvért, amelyen sokszor magas gallér fut végig. Ez néhány esetben csak a bal oldalon található meg. Feladata a nyak védelme; általában rákozott megoldással készül. Fontos problémája a páncélkovácsoknak a vállvas és a mellvért találkozása. Itt ugyanis a váll széles mozgásigénye miatt a hónalj részben fedetlen marad, Ezt a vállakra szíjazott korongokkal, tárcsákkal igyekeznek áthidalni, de ez a megoldás sem kielégítő. Ezért van, hogy a páncélos lovag ellen - akár kopjával, akár karddal — az egyik leghatékonyabb szúrás a hónaljdöfés.\nLehetséges megoldást kínál a felemás páncél, aminek a jobb vállvasa kicsi, de a bal hosszan benyúlik a mellvas elé, mivel a balban csak a pajzsot kell tartani. A felső és alsó karvasakat a könyökvért köti össze, amelyen oldalt pillangószerű kiszélesedés védi a hajlatot. A hátvasak tagoltak, alakjuk jól követi az emberi testet. A nagyobb merevség érdekében gyakran bordázottak. A mell- és hátvasakhoz szíjakkal csatlakozik a csatakötény, ami rendszerint rákozott, akárcsak a rákozott vért. Feladata a combok védelme. A mozgást és a lovaglást megkönnyítendő, ágyéknál általában helyet hagynak — ezt a részt a teljes vért alá vett fegyverkabáton sodrony rátéttel védik. A lábvértek csőszerű vasak, melyeket a mellvért alatt viselt övhöz szíjaznak, egymáshoz pedig vaskapoccsal vagy szíjakkal csatlakoztatnak. A comb- és lábszárvértet a térdvas kapcsolja össze, ami a könyökvashoz hasonlóan pillangószerű kiszélesedéssel védi a hajlatot. A mellvérthez felül vagy az állvért kapcsolódik, amihez azután a harangsisakot rögzítik, vagy az összetettebb zárt sisak. A sisak és a mellvért találkozása a vállvérthez hasonlóan nem teljesen megoldott, ezért az ellenfél álla is elsődleges célpont a lovagok számára. Az alkarvérthez vaskesztyű csatlakozik. Egyes vidékeken ez csak egy fémlemezekkel megerősített bőrkesztyű, de a nevesebb fegyverkovácsok olyan kesztyűket is készítenek, amelyek mindenütt acél alkatrészekből állnak, és pontosan követik a kéz mozdulatait. A legtöbb páncélkesztyű csak a kézhát felőli oldalon véd, a lovag tenyere szabadon marad, így képes megfogni fegyvereit. A lábszárvérthez vassaru csatlakozik. Ennek orrészére gyakran hosszú, hegyes toldalékot illesztenek, ez azonban csak a lovasságra jellemző — a gyalogság vassarui elöl mind lekerekítettek.\nA nehézvért alá, a hézagok elfedésére sodrony- vagy láncrátétet hordanak, amit a bőr- vagy posztóruházaton viselnek. A díszes, rangot jelző köpönyegek a vértezeteken kívülre kerülnek. A súly csökkentése végett a nehézvért alá vett kiegészítőket gyakran ötvözik. A bőr- vagy posztó fegyverkabátra csak ott erősítenek láncszövet darabokat, ahol annak védenie kell."
  },
  {
    name: "gladiátorvért",
    weight: "15",
    STP: 80,
    MGT: -2,
    SFÉ: 4,
    description: "A szaknyelv gladiátorvértezetnek nevezi a következő öszszeállítást: alkar-, felkar- és lábszárvédők, övszerűen derékra csatolható hasvért, csak gyomorszájig leérő mellpáncél.\nA gladiátorokéhoz hasonló, de erősebb és vállvasakkal is ellátott kráni vértet viselnek Krán fejvadászai."
  },
  {
    name: "kráni vért",
    weight: "15",
    STP: 80,
    MGT: -2,
    SFÉ: 4,
    description: "A szaknyelv gladiátorvértezetnek nevezi a következő öszszeállítást: alkar-, felkar- és lábszárvédők, övszerűen derékra csatolható hasvért, csak gyomorszájig leérő mellpáncél.\nA gladiátorokéhoz hasonló, de erősebb és vállvasakkal is ellátott kráni vértet viselnek Krán fejvadászai."
  },
  {
    name: "kardművész vért",
    weight: "15",
    STP: 80,
    MGT: -1,
    SFÉ: 4,
    description: "A kardművészvért egymásra erősített fémlemezkékből, pikkelyekből áll; mindig hajlékony, nem akadályozza a szabad mozgást."
  }

]
