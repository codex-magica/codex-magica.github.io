type Stat = string;

export type SkillDifficulty = "I" | "II" | "III" | "IV";
export type SkillType = "Harci" | "Alvilági" | "Világi" | "Tudományos" | "Szociális" | "Misztikus";

export interface SkillInfo {
  name: string; // keys must match the new model's skill names (model/skills.ts) for the modal lookup
  skillType: SkillType;
  skillDifficulty: SkillDifficulty;
  softReq: Skill[];
  hardReq: Skill[];
  stats: Stat[];
  description: string | string[];
  lvl_1?: string;
  lvl_2?: string;
  lvl_3?: string;
  lvl_4?: string;
  lvl_5?: string;
  special?: string;
}
export const SkillValues : SkillInfo[] = [
    {
      name: "Fájdalomtűrés",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Állóképesség", "Akaraterő"],
      description: "A képzettség birtokosa sokat megélt szívós ember. Képes a teste figyelmeztetéseként jelentkező fájdalmat rövid, vagy hosszú távon lebírni, hogy elméjét tisztán, testét pedig mozgásban tarthassa minél tovább.\n\nAz efféle tapasztalatokkal rendelkező karakter hosszútávfutó, harcos, esetleg sokat megélt szerencsevadász, vándor, aki nem riad vissza a hétköznapok jelentette fájdalmaktól, esetleg olyan személy, aki magasabb szinteken némi gyakorlással már szinte teljesen képes elszakadni testétől, addig sanyargatva, kihasználva annak tartalékait, míg az egyáltalán lehetséges.",
      lvl_1: "A karakter durva közegben nőtt fel, esetleg rendszeresen kénytelen testi épségét kockára tenni, netalántán gyakran kénytelen fizikumát a végleteken túlhajszolva újra és újra felülmúlni önnön teljesítőképessége határait.\n\nA karakter bármely esetben, mely tőle Állóképesség vagy Akaraterő próbát követelne meg - kizárólag fizikai kimerültség, ájulás, egyéb fájdalmak elviselése, kínzás stb., de semmiféleképpen mágikus procedúrák, vagy más szellemi beavatkozások ellensúlyozására tett kísérlet esetén - az adott helyzetnél ismertetett módosítók mellett még egyszer -1 módosítóval megismételheti próbáját, az eredeti próba kudarca esetén.",
      lvl_2: "A karakter már igen széleskörű tapasztalatokkal bír bizonyos sérülések fájdalmának leküzdésében. A karakter egy sikeres Akaraterő, vagy Állóképesség próba után figyelmen kívül hagyhatja az Fp sérülések okozta negatív módosítókat. Természetesen újabb sérülések esetén a karakter újabb próbát köteles dobni.\n\nAz 1. fokán ismertetett „újradobást” a karakter már csupán az adott szituációban leírt módosítókkal hajtja végre.",
      lvl_3: "A képzettség e fokának birtokosa már igazi túlélő. A különböző fájdalmak leküzdésére szolgáló próbáját, illetve a fent ismertetett „újradobást” (az adott szituáció módosítói mellett) immáron +1 módosítóval végezheti el.\n\nA karakter egy +1 módosítóval végrehajtott sikeres próba esetén akkor is képes talpon maradni, ha Fp-i nullára csökkennének. Ebben az esetben azonban minden körben köteles elvégezni a próbadobást. Sikertelenség esetén azonnal elájul. Természetesen Ép-i elfogytával a karakter azonnal elájul és meghal a dobás sikerétől függetlenül.\n\nAz ilyen szívós személy már könnyedén gyűri le a fájdalmat, Fp-ihez szintenként +1 járul.",
      lvl_4: "A képzettség ilyen szintű birtokosa a vonatkozó Tulajdonságpróbáját immáron +2 módosítóval teheti, illetve a korábbiakhoz képest szintenként nem +1, hanem +2 Fp-t kap.",
      lvl_5: "A karakter szinte teljesen érzéketlen a fájdalomra, vonatkozó Tulajdonságpróbáját már +3 módosítóval dobhatja. Szintenként +3 Fp-t kap."

    }, {
      name: "Fegyverhasználat",
      skillType: "Harci",
      skillDifficulty: "III",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Gyorsaság" ,"Ügyesség", "Érzékelés"], //TODO: clarify/branch
      description: [
        "Fegyvereket az óidők hajnalától Ynev minden értelmes faja forgat. Az első eszköz is, mely kóborló őseink kezébe akadt nem szerszám, hanem egy fegyver, kődarab vagy husáng volt. Az alábbiakban annyiféle képzettséget foglaltunk össze, ahány fegyvert a Hetedkor alkonyáig a kontinens földjén halandó kezébe akadhatott. Minden fegyvercsaládhoz, illetve fegyvertípushoz tartozik egy képzettség, mely a forgatásában való jártasság fokmérője. Amikor a játékos eldönti, hogy mely csoportba, illetve mely típusba tartozó fegyverrel kíván bánni, karaktere a Fegyverek táblázatban feltüntetettek közül válogathat. A képzettség alacsonyabb szintjein (1. és 2. fokon) a karakter még csak egy fegyvercsalád forgatásának alapvető technikáit sajátítja el, (a szúrás, vágás vagy zúzás a hasonló felépítésű fegyverek esetén hasonló alapokon nyugszik) azaz képessé válik a csatabárdok, a buzogányok vagy a tőrök stb. forgatására. Magasabb szinteken, a 3. foktól kezdődően pedig a képzettség egy adott harci eszköz használatának titkaiba, trükkjeibe avatja be birtokosát, aki az innen számított bónuszokat már csak a kiválasztott fegyverre kapja meg.\n\nA karakterlapon a képzettségek felsorolásakor a Fegyverhasználat képzettség mellet a forgatott fegyvercsaládot is fel kell tüntetni 1. és a 2. fokú alkalmazó esetén, 3. foktól pedig a választott fegyvert, melynek mesterévé kíván válni a játékos karaktere. Például: Fegyverhasználat 2. fok (buzogányok) majd Fegyverhasználat 3. fok (Shadleki buzogány)",
        "Ha a karakter nem bír a képzettséggel, akkor azon összecsapásokban, ahol fegyverrel vesz részt a harcban, sújtják a Képzetlen fegyverforgatásból eredő módosítók. (Lásd a Harcrendszer c. fejezetben a 167. oldalt).",
        "table:Név\tMéret\tFegyverek\n\nPuszta kéz\t1\tököl, vasököl *\n\nTőr jellegű\t2\tkés, tőr, dzsambia, sqeuor, stb ***\n\nEgykezes fegyverek\t3\tBotok (rövid bot, furkós bot)*\n Buzogányok (tollas buzogány, harci kalapács, csatacsillag)**\n Egykezes kardok (hosszúkard, rövidkard, stb) *\n\nNehéz fegyverek\t4\tkétkezes csatabárd, csatacsákány, másfélkezes kard, mara-sequor, lovagkard, kétkezes kard, stb **\n\nNyeles fegyverek\t5\talabárd, lándzsa, hosszúbot, stb **\n\nEgyebek\t\tHajitótör, -bárd, -csilag, Íjak, nyílpuskák ****\n Parittya, Bola, Háló",
        "small:A garott használata speciálisan nem fegyverhasználat, használata csakis az Orvtámadás képzettség alkalmazásakor lehetséges, és minden esetben a fegyvernélküli harcértékkel történik.",
        "small:*Tulajdonságkövetelmény: Erő, Gyorsaság, Ügyesség\n\n** Tulajdonságkövetelmény: Erő, Ügyesség\n\n*** Tulajdonságkövetelmény: Gyorsaság, Ügyesség\n\n**** Tulajdonságkövetelmény: Ügyesség, Érzékelés",
        "Minden más fegyver, ami nem sorolható egyértelműen a fentebbi kategóriákba, az egyebek kategóriába sorolandó külön kategóriát képez, melynek méret alapján történő besorolása a KM feladata.",
      ],
      lvl_1: "A karakter már gyakorlott forgatója az adott készségnek, nem sújtják a képzetlenségből eredő negatív módosítók, de nem kapja meg a fegyver harcértékeit, még a saját kategóriájába eső fegyverekkel szemben sem.",
      lvl_2: "A karakter megtanult bánni az adott fegyverrel, már megkapja annak harcértékeit a saját kategóriájába tartozó, illetve a kisebb fegyverekkel szemben; (a nagyobb kategóriába tartozó fegyverek ellen még nem) innentől kezdve a fegyver harcértékeinek hozzáadásával vesz részt az összecsapásokban.",
      lvl_3: "A hivatásos fegyverforgató az adott harceszköz forgatásának avatott ismerője. Az adott fegyverrel végrehajtott manővereinek harcértékeihez KÉ: +2, TÉ: +5, VÉ: +5, CÉ: +5 módosító járul.\n\nA karakter már az eggyel magasabb méretkategóriába eső fegyverekkel szemben is a fegyvere adta, illetve a képzettség nyújtotta plusz pontokkal megnövelt harcértékkel számolhat.\n\nAz ilyetén szinten képzett fegyverforgató már képes -50 módosítóval, sikeres találat esetén lefegyverezni ellenfelét, vagy ha a fegyvere képes rá, eltörni annak harci eszközét (akár pajzsot is), ha a fegyver eltéréséhez elég STP-t sebez rajta (nem szükséges egyetlen támadásból). Illetve a karakter képes kihasználni a fegyver átütő, páncélromboló képességét, ha a fegyvere rendelkezik efféle képességgel. Csapásainak így ezen a szinten 1 ponttal csökkentett SFÉ-vel állnak ellen a páncélok. (Lásd a fegyverek speciális tulajdonságait a Fegyverek című táblázatban a 197. oldalon).",
      lvl_4: "A karakter már mestere az adott fegyver forgatásának, a fegyveres harcértékeihez KÉ: +5, TÉ: +10, VÉ: +10, CÉ: +10 (A bónuszok nem adódnak össze a 3. foknál szereplőkkel).\n\nA karakter a lefegyverző, illetve fegyvertörő támadásait immáron csak -30 TÉ módosítóval hajtja végre, csapásainak, ha a fegyvere bír ilyen képességgel a páncélok -2 SFÉ- vel állnak ellen.\n\nA karakter már a kettővel magasabb méretkategóriába eső fegyverekkel szemben is a fegyvere adta, illetve a képzettség nyújtotta plusz pontokkal megnövelt harcértékkel számolhat.",
      lvl_5: "A karakter legendás mestere választott fegyvere forgatásának, sebzéseihez +1 Sp kap és a Túlütés küszöbe 10 ponttal csökken.\n\nA karakter a lefegyverző, illetve fegyvertörő támadásait immáron csak -10 TÉ módosítóval hajtja végre, csapásainak, ha a fegyvere bír ilyen képességgel a páncélok -3 SFÉ- vel állnak ellen.\n\nHa a karakter célzófegyvert használ, akkor képes felkészülni a lövésre. Minden egyes felkészüléssel töltött kör +10 CÉ-t jelent a képzettség birtokosa számára. Hagyományos íjjal lövő lövész 1 körnél, számszeríjat alkalmazó lövész 3 körnél többet nem tölthet felkészüléssel.\n\nA karakter már a hárommal magasabb méretkategóriába eső fegyverekkel szemben is a fegyvere adta, illetve a képzettség nyújtotta plusz pontokkal megnövelt harcértékkel számolhat.",

    },
    {
      name: "Fegyverismeret",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Intelligencia", "Érzékelés"],
      description: "Minden valamire való kardforgató, nemesember, bérverekedő, zsoldos vagy fejvadász, esetleg tolvaj vagy orgazda sajátja ez a képzettség, bár magasabb szintű alkalmazói között ősi ereklyéket kutató mágusok és történettudorok is akadnak.\n\nEnnek a tudománynak a segítségével a karakter képet alkothat egy fegyver minőségéről, anyagáról, és forgatásának módozatáról. Ez utóbbi információ persze csak szigorúan elméleti jellegű.\n\nA gyakorlatias mindennapokban a fegyverek beszerzésekor fontos e képzettség, nehogy gyatra, silány arzenállal induljanak útra a csapat tagjai. Ezen képzettség híján a KM nyugodtan keserítheti a kalandozók életét folyamatosan eltörő pengékkel, repedt, de szépen festett pajzsokkal, melyek a legrosszabbkor adják meg magukat az enyészetnek vagy önveszélyes íjakkal, illetve nyílpuskákkal. Magasabb fokú ismeret esetén pedig, valamely mágikus hagyomány beavatottjaként, vagy Történelem, esetleg Legendaismeret birtokában már varázsfegyvereket is felismerhet a karakter, esetleg ismerheti különleges képességeik titkait.",
      lvl_1: "A képzettség e szintjének birtokában a karakter ismeri saját kultúrkörének legelterjedtebb fegyvertípusait és a készítésükhöz használt leggyakoribb anyagokat. Egy-két perces vizsgálódással képes helytálló véleményt formálni a kezébe akadt készségek minőségéről. Az ismeretlen kultúrák alkotta gyilokszerszámok esetén még helyes forgatásuk módját is csak találgatja.",
      lvl_2: "A karakter jól ismeri saját kultúrköre minden, más humán kultúrák elterjedtebb fegyvereit. Pillátok alatt megmondja, ha egy pengét csak némi súrolással és csiszolással tettek csillogóvá, de mondjuk egy mara-sequorban továbbra is csak ívelt másfél kezes kardhoz hasonló fegyvert lát.",
      lvl_3: "A képzettség e fokú birtokosa igazi fegyverszak' értő. Magabiztosan ítél minden kultúrája alkotta fegyverről, a jelesebb mesterek műveit könnyedén azonosítja, esetleg készítésük és gazdáik történetéről is tud pár adatot. Az abbitből, lunírból, mithrillből kovácsolt pengéket és fegyvereket is csak ezen a szinten azonosíthatja a karakter, mert az alacsonyabb fokú alkalmazó csak olajban edzett, vagy ezüsttel futtatott darabokat vél felfedezni.\n\nAhhoz, hogy fegyverzete alapján valaki származását beazonosítsa a karakternek szintén e fok ismerete szükséges.",
      lvl_4: "A karakter már a mágiával átitatott pengéket is nagy valószínűséggel azonosítja kiegyensúlyozásuk, megjelenésük alapján. Az összes kortárs ynevi faj fegyvereiről a 3. foknál leírtak szerint képes nyilatkozni. Az ősfajok - aquirok, amundok, óelfek, stb. - fegyverei viszont még mindig zavarba hozzák.",
      lvl_5: "Ynev legjelesebb szakértői bírnak e tudomány ilyetén fokú ismeretével. A karakter már az ősfajok fegyvereiről is a 3. foknál leírtak szerint nyilatkozik, ismeri a hozzájuk fűződő legendákat, illetve ismerheti különleges képességeik titkait is, bár ennek eldöntése a KM joga."

    },
    {
      name: "Hadvezetés",
      skillType: "Harci",
      skillDifficulty: "III",
      softReq: ["Lélektan", "Térképészet"],
      hardReq: [],
      stats: ["Intelligencia", "Karizma"],
      description: "A Hadvezetés nem a párviadalszerű összecsapások, hanem a csatamezők és háborúk nélkülözhetetlen képzettsége, a tisztek, lovagok és rendszeresen háborúskodó nemesek sajátja. Segítségével csapatokat vezethet, ütközeteket vívhat meg birtokosa, magasabb fokú ismerete esetén pedig (Lélektannal, Térképészettel, Történelemmel, Alakzatharccal) alkalmazásával már háborúk levezénylésébe, megtervezésébe is belefoghat. Ez esetben a vezénylendő sereg méretétől és a hadjárat hosszától függően a KM feladata a szükséges képzettségek megállapítása.\n\nMindenesetre leszögezendő, a jó hadvezér nem biztos, hogy jó harcos. Ynev történelme számtalan rokkant vagy beteg hősről, legendás alakról bír feljegyzésekkel, kik testi fogyatékosságuk ellenére szárnyaló szellemükkel háborúkat, csatákat nyertek meg.\n\nKét hadvezér szembekerülésekor a köztük lévő képzettségi fokonként 3 ponttal emelkedik a képzettebb vezető alárendeltjeinek Bátorsága.",
      lvl_1: "A bölcs ember ezen a szinten még csak ismerkedik a tudomány alapjaival, mások munkásságát tanulmányozza. A kialakuló forgatagban, ha lehetősége van rá, beazonosíthatja az ellenfél főbb erőit, azok elhelyezkedését. Maximálisan 10 ember vezetésére képes.",
      lvl_2: "A karakter hivatásos kardforgató, lovag, egyszóval parancsnok. Képes értelmezni felettese utasításait és végrehajtani azok parancsait csapatával. Az alakulat pusztulásával járó parancsok kiadásakor köteles karizma próbát tenni. Ha ez sikertelen, altkor emberei megtagadják az engedelmességet. Maximálisan 100 ember vezetésére képes.",
      lvl_3: "Az ilyen szinten képzett parancsnok már igazi veterán, sok csatát látott. Alárendeltjeinek, ha követik parancsait az éppen végrehajtott hadmozdulattól függően +5 TÉ-t vagy VÉ-t biztosít.\n\nA fent leírt karizma próbát +1 módosítóval dobhatja. Maximálisan 1000 ember vezetésére képes.\n\nEzen a szinten már képes - ha bír a KM által meghatározott fokon a fönt felsorolt képzettségekkel, vagy vannak tanácsadói - kisebb hadjáratok levezetésére a sereg széthullása, utánpótlási problémák nélkül.\n\nHa bír a képzettség leírásánál felsorolt képzettségek 5. fokával, vagy tanácsadói bírnak a követelményekkel, akkor együttműködésük esetén egy +1 módosítóval dobott sikeres Intelligencia próbával egy megtervezett hadjárat sikeréről képes előre nyilatkozni, az összegyűjtött információk fényében.",
      lvl_4: "Az ennyire képzett vezér már ritkaság, országonként egy-kettő, ha akad. Előre kidolgozott haditervei +10 TÉ vagy VÉ módosítót juttatnak csapatainak, ha képes őket kivitelezni. A sereg ellátását bármely területen képes megszervezni, kivitelezni, ha az fizikailag lehetséges - e döntés a KM jogköre.\n\nA fent leírt karizma próbát +2 módosítóval dobhatja. Maximálisan 10.000 ember vezetésére képes.\n\nHa bír a képzettség leírásánál felsorolt képzettségek 5. fokával, vagy tanácsadói bírnak a követelményekkel, akkor együttműködésük esetén egy +2 módosítóval dobott sikeres Intelligencia próbával egy megtervezett hadjárat sikeréről képes előre nyilatkozni, az összegyűjtött információk tükrében.",
      lvl_5: "A karakter stratégiai, taktikai zseni, puszta jelenléte hírneve miatt +5 Bátorság bonuszt ad alárendeltjeinek.\n\nA fent leírt karizma próbát +3 módosítóval dobhatja. Az általa vezetett csapatoknak nincs létszám korlátja.\n\nHa bír a képzettség leírásánál felsorolt képzettségek 5. fokával, vagy tanácsadói bírnak a követelményekkel, akkor együttműködésük esetén egy +3 módosítóval dobott sikeres Intelligencia próbával egy megtervezett hadjárat sikeréről képes előre nyilatkozni, az összeszedett információk fényében."

    },
    {
      name: "Harci láz",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Állóképesség", "Egészség"],
      description: "Igen riasztó vagy magasztos külsőségek között jelentkező harci képzettség, amelyet a történelem folyamán majd minden civilizáció és kultúra felfedezett magának. A módszer lényege, hogy a kellőképp feltüzelt harcos nagyobb lelkesedéssel és lendülettel veti magát a csata forgatagába; vadul lobogó, vagy épp fehéren izzó, csendes gyűlöletét koncentrálva fordítja ellenfelei ellen.\n\nA képzettség alkalmazása során a karakter valamely monoton ingerre összpontosítva lovalja magát eksztázisba. Ez lehet dobszó, zene vagy akár egy litánia is, amire a karakter kondicionálja magát, majd dühe erejét felhasználva, azzal kitöltve tudatát tör előre, nem foglalkozva saját teste, életösztöne jelzéseivel, csakis az ellenfél elpusztítására koncentrálva. Igaz, teljesen más oldalról és megközelítés alapján, de a képzettség valaha volt leggyakorlottabb alkalmazói közt leginkább az északi barbárok szent tombolóit, illetve Kyria pusztítóit találjuk. Ez utóbbiak és módszerük már-már megközelíti a slanek által létrehozott Sárkány-harcot; csak egyetlen vékony, de áthághatatlan határvonal, a szellemi béke hiánya választja el őket tőle.\n\nA Harci lázba lovalt karakter felismeri ugyan társait, de csak +2 módosítóval dobott Asztrál próba esetén kíméli őket. A próbát körönként újradobhatja. A csata végeztével sikeres Asztrálpróba dobás szükségeltetik a révület megszüntetéséhez az alkalmazó részéről szintén +2 módosítóval.\n\nA féktelen tombolás közepette az alkalmazó nem gondol saját testi épségére, így pajzsát - ha visel is ilyet - nem használja.",
      lvl_1: "A karakter mesterségesen előidézheti a Harc gyűlölettel (KÉ: +5, TÉ: +5, VÉ: -10) helyzetet, megkapva annak módosítóit.",
      lvl_2: "A gyakorlott alkalmazó az őrjöngés ideje alatt nem esik össze, ha esetleg Fp-i nullára csökkennének, csak Ép-i elfogytával veszíti el az eszméletét.",
      lvl_3: "A képzettség ezen fokán a birtokosa tudatát annyira betölti a cél, az ellenfelek legyőzésének vágya, hogy saját testét sem kímélő hevület feszíti izmait, minden közelharci fegyvere sebzésére kockánként +1 pontot kap.",
      lvl_4: "Az efféle harci tomboló a Harc gyűlölettel módosítókat duplán kapja meg, illetve szenvedi el.",
      lvl_5: "A karakter harci megszállottságában szélvészként kaszabol és öl, közelharci fegyverei a támadások idejét illetőleg eggyel gyorsabb kategóriába esnek, azaz például egy kétkezes csatabárddal kétszer, egy hosszúkarddal háromszor támad egy teljes támadással töltött harci kör alatt."

    },
    {
      name: "Harcművészet",
      skillType: "Harci",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Gyorsaság", "Ügyesség", "Akaraterő"],
      description: "A képzettség nem csak egy harcmodor, de a test-test elleni küzdelem és a harcművész fegyverek használatának tudománya, a lélek összpontosító képességének kifejlesztése. Ezen képzettség segítségével képes a karakter testét és harcművész fegyvereit a Sárkány-harc megkövetelte rendben és harmóniában alkalmazni. Nem slan felhasználók esetén ez a képzettség teszi igazán veszedelmessé ökölcsapásaikat és rúgásaikat.\n\nA képzettséget stílusonként kell felvenni pl.: Harcművészet (Avad-ka-kinito) 2. fok. Ekkor a karakter az adott szinten képes a stílusirányzat tartalmazta összes fegyver, illetve pusztakezes technika alkalmazására. Azonban 3. foktól a Fegyverhasználat képzettséghez hasonlóan itt is el kell dönteni, hogy a stíluson belül oktatott fegyverek közül, melyiket, esetleg a fegyvertelen harcművészetet kívánja-e tanulni a karakter. Természetesen a képzettség nyújtotta bónuszok is csak ezen fegyverre, vagy a fegyvertelen technikára vonatkoznak, pl. Harcművészet 4. fok (tonfa).\n\nA kardművész karakter fegyvereit (Slan kard és Slan tőr) szintén ezen képzettség segítségével képes a Sárkány-harcban alkalmazni - ezért forgatásukhoz fegyverhasználat képzettség nem szükséges.\n\nA karakter az összecsapásokban a Fegyverhasználatnál ismertetett módon, a képzettség szintjétől függően, a harcművészetben alkalmazott fegyver méretkategóriája szerint vesz részt. Azonban e fegyverek a Harcművészet képzettség alkalmazása miatt eggyel magasabb méretkategóriájúnak számítanak, mint ami fel van tüntetve az adott harckészségnél a Fegyverek c. táblázatban.\n\nTehát, ha egy lándzsát fegyverhasználat képzettséggel forgat egy városi őr, akkor ő egy 5. méretkategóriájú fegyverrel harcol. Míg ugyanez a lándzsa egy erre specializálódott harcművész kezében már 6. méretkategóriájúnak számít.\n\nEmellett abban az esetben, ha fegyvert nem alkalmaz a képzettség birtokosa, puszta teste már akkor is 2. méretkategóriába számít, s a 3. foktól kezdve a Fegyverhasználatnál leírtak szerint kapja a bónuszokat.",
      lvl_1: "A tanuló még csak a formagyakorlatok és iskolánként eltérő szellemiség alapjaival ismerkedik, nem sújtják már a képzetlenségből eredő negatív módosítók",
      lvl_2: "A karakter megtanult harcolni az adott stílusban, már megkapja a fegyver vagy a stílus harcértékeit, innentől kezdve az így megnövelt harcértékeivel vesz részt az összecsapásokban. (A pusztakezes harc sebzésére vonatkozó stílusok sebzéseit lásd az iskolák leírásánál a 77. oldalon).",
      lvl_3: "A képzettség birtokosa már veszedelmes harcművész, a fegyveres vagy pusztakezes harcértékeihez KÉ: +2, TÉ: +5, VÉ:+5 módosító járul.\n\nAz ilyen szinten képzett harcművész már képes -50 TÉ- vel végrehajtott sikeres találat esetén lefegyverezni ellenfelét, vagy éppenséggel eltörni annak harci eszközét (akár pajzsot is), ha a fegyver eltöréséhez elegendő STP-t sebez rajta (nem szükséges egyetlen támadásból). Illetve a karakter képes kihasználni a fegyvere, ökle, esetleg rúgásai átütő, páncélromboló képességét, akkor csapásainak ezen a szinten 1 ponttal csökkentett SFÉ-vel állnak ellen a páncélok. Természetesen puszta kézzel, illetve abban az esetben, ha a fegyver képes a fenti manőverek végrehajtására. (Lásd a fegyverek speciális tulajdonságait a Fegyverek című táblázatban a 197. oldalon).",
      lvl_4: "A karakter már mestere az adott fegyver forgatásának vagy a pusztakezes harcművészetnek, harcértékeihez KE: +5, TÉ: +10, VÉ: +10 (a bónuszok nem adódnak össze a fokon szereplőkkel.)\n\nAz ilyetén szinten képzett harcművész már képes -30 TÉ- vel végrehajtott sikeres találat esetén lefegyverezni ellenfelét, vagy épp eltörni annak harci eszközét (akár pajzsot is), ha a fegyver eltöréséhez elég STP-t sebez rajta (nem szükséges egyetlen támadásból). Emellett a karakter képes kihasználni teste és a fegyver átütő, páncélromboló képességét; csapásainak ezen a szinten 2 ponttal csökkentett SFÉ-vel állnak ellen a páncélok. Természetesen puszta kézzel, illetve abban az esetben, ha a fegyver képes a fenti manőverek végrehajtására. (Lásd a fegyverek speciális tulajdonságait a Fegyverek című táblázatban a 197. oldalon).",
      lvl_5: "A karakter legendás mestere választott fegyvere forgatásának, illetve a pusztakezes harcművészetnek, túlütés küszöbe 10 ponttal csökken, sebzése +1 ponttal nő.\n\nAz ilyetén szinten képzett harcművész már képes -10 módosítóval végrehajtott sikeres találat esetén lefegyverezni ellenfelét vagy épp eltörni annak harci eszközét (akár pajzsot is), ha a fegyver eltöréséhez elég STP-t sebez rajta (nem szükséges egyetlen támadásból). Emellett a karakter képes kihasználni teste, illetve a fegyver átütő, páncélromboló képességét; csapásainak ezen a szinten 3 ponttal csökkentett SFÉ-vel állnak ellen a páncélok. Természetesen puszta kézzel, illetve abban az esetben, ha a fegyver képes a fenti manőverek végrehajtására. (Lásd a fegyverek speciális tulajdonságait a Fegyverek című táblázatban a 197. oldalon)."

    },
    {
      name: "Harctéri gyakorlat",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Gyorsaság", "Ügyesség", "Érzékelés"],
      description: "A képzettség birtokosa nem csak vívótermekben, illetve párbajokban fejlesztette harci tudását, hanem valódi csatamezők öldöklő forgatagában is tapasztalatokat szerzett. Nem jön zavarba, ha többen törnek ellene, illetve tudja, miként kezelje a derékig érő víz, a csúszós pallók, a magasabbról hadakozó ellenfél vagy bármely más harci helyzet miatt kialakult kellemetlen helyzeteket. A képzettség nem alkalmazható a sötétség, köd, nagy zaj vagy bármely, az érzékszerveket tompító negatív módosító leküzdésére, ellenben semlegesíthetőek vele a karakter ellen alkalmazott alakzatokból eredő negatív módosítók.\n\nEmellett az ilyen tapasztalatokra szert tett harcos már képes önállóan, a csetepaték forgatagában szerzett gyakorlatát hasznosítani és tovább fejleszteni, emiatt magasabb szinteken plusz HM-ekkel növelni harci képességeit.",
      lvl_1: "A karakter már gyakorlott az igazi, éles összecsapásokban. Minden negatív Harcérték módosító, mely valamely számára hátrányos helyzetből eredően sújtaná, érvényét veszti egyetlen körre, ha a karakter sikeres Tulajdonságpróbát tesz. Próbát körönként lehet tenni.",
      lvl_2: "A gyakorlott alkalmazó még jobban képes elkerülni a számára hátrányos helyzeteket, illetve csökkenteni annak hatásait. A képzettség e fokán az alkalmazót sújtó módosítók figyelmen kívül hagyhatóak egy sikeres Tulajdonságpróbát követően, egészen addig, míg a karakter nem óhajt haladni a „csatamezőn”.",
      lvl_3: "A képzettség e fokának birtokosa már igazi veterán, az őt sújtó módosítók már akkor is figyelmen kívül hagyhatóak, ha a karakter mozog, illetve immáron próbáját is +1 módosítóval dobhatja.\n\nA képzettség birtokosa képes több ellenfél ellen felvenni a harcot, mint arra fegyverzete, és harcmodora képessé tenné. Tehát eggyel több ellenféllel szemben is képes levonások nélkül harcolni, mint ahányat a Túlerő szabálynál a Harcrendszer c. fejezet 174. oldalán feltüntettünk.\n\nA karakter harci gyakorlata és tapasztalatai miatt már képes rendszerezni ellenfeleiről, saját harcmodoráról szerzett tudásanyagát, így minden szintlépéskor +1 HM-et kap.",
      lvl_4: "Az ezen a szinten képzett harcos a vonatkozó Tulajdonságpróbáját immáron +2 módosítóval teheti, illetve a korábbiakhoz képest már nem egy, hanem plusz két fővel is képes levonások nélkül felvenni a harcot.\n\nA karakter a képzettség ezen szintjén már +2 HM-et kap.",
      lvl_5: "A karakter a csatamezők réme. Képtelenség megszorítani, hiába is tör ellene akár egy kisebb tömeg. Mozdulatai kiszámítottak, nincs olyan hadrend, mely legyűrné.\n\nA karakter ezen a fokon próbáját már +3 módosítóval dobhatja, illetve a feltüntetettekhez képest plusz három fővel veheti fel a harcot levonások nélkül.\n\nA karakter a képzettség ezen szintjén már +3 HM-et kap."

    },
    {
      name: "Kétkezesharc",
      skillType: "Harci",
      skillDifficulty: "III",
      softReq: [],
      hardReq: ["Fegyverhasználat"],
      stats: ["Gyorsaság", "Ügyesség"],
      description: "Követelmény: Fegyverhasználat ismerete (csak egyszer kell felvenni). Különböző fegyverek esetén az alacsonyabbik alkalmazási fok számít. A Harcművészet és a Pusztakezes harc már önmagában kétkezes technikára épít, így Kétkezes harccal nem párosítható.\n\nA képzettség a páros fegyverhasználat képességével ruházza fel birtokosait. Alacsonyabb fokú tanulmányok esetén még csak sajátos, egyedi harci stílust mondhatnak magukénak az elsajátítói, de hosszabb tanulás után már halálos kombinációk egész tárházát képesek felvonultatni.\n\nA fegyverek, illetve pengék puszta méretei miatt 4. és 5. Méretkategóriájú két fegyverrel egyszerre nem lehet Kétkezes harcot alkalmazni.",
      lvl_1: "A karakter Harcértékei az alább módosítókat szenvedik el: KÉ: -5, TÉ: -10, VÉ: -10. A karakter Védő értékét az általa választott keze adja, valamint fegyverei eggyel lassabb kategóriába esnek (például a Tőr jellegű fegyverek annyiszor támadnak, mint az egykezes kardok).",
      lvl_2: "A karakter már összehangoltabban dolgozik mindkét kezével. A karakter Védő értékét az általa választott keze adja, azonban mindkét kezével továbbra is a lassabb kategória szerint támadhat",
      lvl_3: "A karakter már biztosan harcol két fegyverrel is, nincsenek levonásai, VÉ-jét választott keze adja, azonban rosszabbik kezével még mindig csak egy kategóriával lassabban támadhat. Fegyverei immár nem csak kiegészítik, segítik egymást, képes az Ismétlő csel illetve a Kettős védelem használatára. A manővereket a kör elején kell bejelenteni. Rosszabbik kezével még mindig lassabban támad.\n\nIsmétlő csel esetén a kiválasztott kézzel egy támadást hajt végre a karakter, melynek sikere esetén nem megsebzi a célpontot, hanem a támadás sebzését (túlütés esetén duplázódik) hozzáadhatja bonusz Támadó értékként következő támadásához.\n\nKettős védelem esetén a rosszabbik kéz fegyverének támadásait feladva a karakter mindkét fegyvere VÉ-jére támaszkodva (ha rendelkezik vele, akkor természetesen a 3. vagy a 4. fokú Fegyverhasználat nyújtotta bónuszokkal együtt) számíthatja ki az adott körre a Védő értékét.",
      lvl_4: "A kétkezes harc mesterének figyelmét már nem kell megosztania fegyverei között, ezért mindkét kezével a fegyver kategóriájának megfelelően támadhat.",
      lvl_5: "A képzettség nagymesterei minden esetben mindkét fegyverük Védő értékének alkalmazásával számíthatják ki teljes VÉ-jüket, akkor is, ha támadnak mindkét fegyverükkel."

    },
    {
      name: "Pajzshasználat",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Ügyesség"],
      description: "Mind a síkokon vitézkedő seregek, mind a páros összecsapások színterén alapvető harcmodornak számít a pajzs használata, amikor a harcos egyik kezében fegyverrel, a másikban pajzzsal verekszik. A pajzs speciális harceszköz, funkcióját tekintve félúton áll a fegyver és a vértezet között. A vértezethez hasonlóan óvja viselőjét, mégis nem a már sikeres támadások okozta veszteséget mérsékli, inkább elhárítani igyekszik a találatot, akár egy fegyver.\n\nAlakjukat és méretüket tekintve a pajzsok rendkívül sokfélék lehetnek, mi azonban az egyszerűség kedvéért három játéktechnikai csoportba soroljuk őket: kis pajzsok, melyek VÉ-je 20, közepes pajzsok, melyek VÉ-je 35 és nagy pajzsok, melyeké 50.\n\nAhhoz persze, hogy ezeket a módosítókat élvezhesse is a karakter, nem elegendő magára aggatni, de használni is tudni kell a készséget. A pajzs használatát a fegyverforgatáshoz hasonló módon tanulni kell, hogy ne csak a pajzsok súlya adta MGT-t, hanem VÉ-jüket is birtokolja gazdájuk.\n\nKét pajzsot forgatni nem kivitelezhetetlen vállalkozás, de maximálisan két kis pajzzsal lehetséges.\n\nYnev majd minden harcosa ért valamilyen szinten e tudományhoz, mégis vitathatatlan bajnokai a lovagrendek soraiból kerülnek ki.",
      lvl_1: "A karakter képes a három pajzstípusból egyet használni (kicsi, közepes vagy nagy), de ekkor a pajzs csak szemből, illetve a pajzsos oldaláról védi hordozóját. A pajzsot viselő karaktert még sújtja a pajzs MGT-je, értéke levonódik a Tulajdonságokból.",
      lvl_2: "A karakter ezen a szinten, már minden pajzstípust használ, viszont, még mindig csak a szemből és a pajzsos oldalról jövő támadások ellen véd.",
      lvl_3: "A pajzs ezen a szinten már a fegyverforgató oldaláról is védelmezi viselőjét, illetve a fegyvernélküli harcértékeivel támadhat is vele, bár ekkor elveszíti a pajzs adta VÉ-t a teljes körre. A manővert a kör elején kell bejelenteni és a karakter bármelyik harci cselekedetének ideje alatt bonusz támadásként végrehajthatja a fegyvertelen Támadó értékével. Ha karakter nem rendelkezik másik fegyverrel, vagy csak pajzzsal kíván támadni, úgy a közelharc egykezes fegyverrel időbeli megszorításai vonatkoznak rá. A pajzs sebzése 1k6+Erőbónusz. A pajzs MGT-je 1 ponttal csökken.",
      lvl_4: "Ezen a szinten pajzs MGT-je 2 ponttal csökken. Ha a pajzzsal sikeres támadás hajt végre, megpróbálhatja fellökni ellenfelét. Ilyenkor mind ő, mind ellenfele Erőpróbát dob, s ha a karakter nagyobb sikert ér el, mint ellenfele, a földre döntés sikeres. Amennyiben rendje okítat különleges támadásokat, azok is ezen a szinten válnak számára elérhetővé.",
      lvl_5: "A pajzs MGT-je immár 3 ponttal csökken, valamint ha támadni kíván a pajzzsal, nem veszíti el annak Védő értéket."

    },
    {
      name: "Pusztakezes harc",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Ügyesség", "Állóképesség"],
      description: "A képzettség magában foglalja a puszta kézzel folytatott harc minden fogását. Alacsonyabb szinten egyaránt tartalmazza a birkózók leszorító, végtagnyomorító fogásait éppúgy, mint az öklözés és a rúgások alapvető elemeit. Azonban a képzettség hivatásos szintjétől, 3. foktól a karakternek választania kell, hogy a birkózás, vagy az ökölharc (amely magába foglalhat rúgásokat is, ha karakter mesterei ilyen jellegű harci technikákat tanítanak) képességét fejleszti e tovább. Ezt fel kell tüntetnie karakterlapján is, mondjuk pl.: Ökölharc 3. fok. Természetesen arra is van lehetőség, hogy az adott személy mindkét stílusban jártasságot szerezzen; ekkor az adott képzettségszint eléréséhez szükséges Kp mennyiség kétszeresét kell kifizetnie. (Tehát a 3. fokot már kétszer kell felvenni, ha mindkét stílusban járatos akar lenni!)\n\nItt jegyzendő meg, hogy a birkózó karakter minden, nem a birkózás célpontjául kiválasztott ellenfelével szemben a Harc helyhez kötve módosítókat szenvedi el. Természetesen birkózó ellenfelével szemben e hátrány nem sújtja.\n\nHa a karakter nem bír a képzettséggel, akkor azon összecsapásokban, ahol fegyvertelenül vesz részt, sújtják a Képzetlen fegyverforgatásból eredő módosítók. (Lásd a Harcrendszer c. fejezetben a 174. oldalt).",
      lvl_1: "A karakter képes egy gyors gánccsal, dobással földre vinni ellenfelét egy sikeres fegyver nélküli támadódobással, melyet a Pusztakezes harc szabályai szerint kell kiviteleznie.\n\nA karakter képes ökölcsapásaival 1k3 Sp sebet okozni ellenfelének.",
      lvl_2: "A képzettség e szintjén a birkózó, öklöző már képes komoly sérüléseket okozni ellenfelének, fogásainak, ízület romboló csavarásainak, csapásainak sebzése 1k6 Sp.",
      lvl_3: "A karakter hivatásos birkózó, megkapja a hivatásos fegyverforgatásból jelentkező KÉ: +2, TÉ: +5, VÉ: +5 módosítót. A birkózás alkalmazásával pedig képes egy lefegyverző támadás végrehajtására egy sikeres -50 TÉ-vel végrehajtott támadás esetén.\n\nSikeres támadás, illetve sikeres Erő tulajdonság ellenpróba esetén képes részlegesen lebénítani az ellenfélét. A sikeres találatkor a kidobott sebzésnek megfelelő értékkel (túlütés esetén duplázódik) csökken az ellenfél VÉ-je a következő birkózófogással szemben, ekkor viszont nem sérül a célpont. Ezen támadásait a kör elején be kell jelentenie.\n\nA karakter hivatásos öklöző, megkapja a hivatásos fegyverforgatásból jelentkező KÉ: +2, TÉ: +5, VÉ: +5 módosítót.\n\nA karakter ezen a szinten már az eggyel magasabb méretkategóriába tartozó fegyverekkel szemben is alkalmazhatja a képzettség nyújtotta bonuszait, immáron nem csak fegyvernélküli harcértékével vesz részt a küzdelemben.",
      lvl_4: "A karakter mesteri birkózó vagy ökölharcos, megkapja a mester fokú fegyverhasználat bonuszait KÉ: +5, TÉ: +10, VÉ: +10. (A bónuszok nem adódnak össze a 3. foknál szereplőkkel).\n\nBirkózóként sikeres támadás, illetve sikeres Erő tulajdonság ellenpróba esetén képes részlegesen lebénítani az ellenfelét. A sikeres találatkor a kidobott sebzés (túlütés esetén duplázódik) kétszeresének megfelelő értékkel csökken az ellenfél VÉ-je a következő birkózófogással szemben, ekkor viszont nem sérül a célpont. Emellett képes egy lefegyverző támadás végrehajtására -30 TÉ-vel. Ezen támadásait a kör elején be kell jelentenie.\n\nÖklözőként könnyedén képes kiütni ellenfeleit, minden fejre mért célzott támadása esetén az okozott sebzés a leütésre nézve kétszeresének számít. (A célpont csak az eredeti sebzést szenvedi el.) Ezt a támadását a kör elején be kell jelentenie.\n\nA karakter ezen a szinten már a kettővel magasabb méretkategóriába tartozó fegyverekkel szemben is alkalmazhatja a képzettség nyújtotta bónuszait.",
      lvl_5: "A karakter immáron hihetetlen képességekkel megáldott birkózó, sikeres találat esetén képes bénító fogásba vinni ellenfelét. Találatkor, sikeres Erő ellenpróba esetén a kidobott sebzés (túlütés esetén duplázódik) háromszorosának megfelelő értékkel csökken az ellenfél VÉ-je a következő birkózófogással szemben, ekkor viszont nem sérül a célpont. A lefegyverző támadást ekkor már csak -10 TÉ levonással hajtja végre. Ezen támadásait a kör elején be kell jelentenie.\n\nÖklözőként könnyedén képes kiütni ellenfeleit, minden fejre mért célzott támadása esetén az okozott sebzés a leütésre nézve háromszorosának számít. (A célpont csak az eredeti sebzést szenvedi el.) Ezt a támadását a kör elején be kell jelentenie.\n\nA karakterek ökle vagy fogásai ezen a szinten már egyaránt 1k10 Sp-t sebeznek.\n\nA karakter ezen a szinten már a hárommal magasabb méretkategóriába tartozó fegyverekkel szemben is alkalmazhatja a képzettség nyújtotta bonuszait."

    },
    {
      name: "Pusztítás",
      skillType: "Harci",
      skillDifficulty: "III",
      softReq: ["Élettan"],
      hardReq: ["Fegyverhasználat"],
      stats: ["Erő"],
      description: "A harctéri hatékonyság, a halálosabbnál halálosabb sebek osztásának tudománya. Csak humanoidok ellen (vagy a megfelelő fajra felvett Élettan képzettség ismerete esetén más fajokra is) alkalmazható. Csakis 3-as, vagy nagyobb méretkategóriájú fegyverekre vehető fel. Az egyéb kategória tagjaival, illetve hajító és célzó fegyverekre nem alkalmazható, fegyvercsaládonként kell felvenni.\n\nA képzettség egyedi, a szokványostól eltérő harcmodort követel meg alkalmazójától, így nem használható egyszerre az Orvtámadás képzettséggel.",
      lvl_1: "A karakter még csak sejti a képzettségben rejlő lehetőségeket, sebzéséhez túlütés esetén +1 Ép járul",
      lvl_2: "A gyakorlott pusztító hatékonysága nő, a túlütés küszöbe 10-zel csökken, csapásai egyre halálosabbá válnak. (Ez a módosító összeadódik a Fegyverhasználat képzettség 5. fokának túlütés küszöböt csökkentő képességével, ha a karakter az utóbbival is bír).",
      lvl_3: "A hivatásos pusztító a korábbi előnyök mellett, ha túlütést ér el, már komolyabb, 1k3 Ép módosítót adhat a sebzéséhez.",
      lvl_4: "A karakter a csatamezők réme, ellenfelei rettegik a nevét, túlütés küszöbe újabb 10 ponttal 30-ra változik, ez összeadódik esetleges más bónuszokkal.",
      lvl_5: "A legendás hírű pusztító megjelenése is félelemmel tölti el ellenfeleit, hírhedt csapásainak szinte mindegyike öl, a korábbi előnyök mellett túlütés esetén újabb +1k6 Ép extra sebzést is okoz. (Azaz a 2. fokon kapott Sebzés bonuszon felül még + 1k6)."

    },
    {
      name: "Taktika",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A harcmezők vagy bármiféle összecsapás túlélésének záloga, ha társaiddal együtt, egymást segítve harcoltok. Ez a felismerés késztette Ynev fegyverforgatóit, hogy alakzatok formálásával nemesítsék az egyéni párviadalok zűrzavarából nagyobb egységek összecsapásává a többszereplős kézitusákat.\n\nAki járatos ebben a képzettségben beavatottságától függően ismeri Ynev majd minden harci alakzatát, egy-két pillanat alatt képes alkalmazkodni és részt venni az egység harcában. Az ebben járatlan karakterek nem képesek egységként hadakozni, az összecsapásokat csakis egyéni párviadalok soraként képzelik el, s legtöbbször alulmaradnak az alakzatba tömörült harcosokkal szemben.\n\nAbban az esetben, ha a harcos ismeri az ellene alkalmazott harci taktikát, akkor a taktika nyújtotta módosítóknak csak a fele érvényesül ellene.\n\nYnev harci formációi tájanként változnak, de több közös vonásuk akad.\n\n1.\tAz alakzat csak Taktikában megfelelően képzett fegyveresekből állhat, különben a képzetlen személyek megzavarják, és lehetetlenné teszik az alakzat működését. Az alakzatot zavaró idegenek jelenlétének és akadályozó tevékenységük meglétének megítélése a KM jogköre.\n\n2.\tAz alakzatban való harc bizonyos helyzeti előnyökkel, illetve KÉ, TÉ, VÉ módosítókkal járhat, ezeket lásd az alakzatok egyéni leírásánál.\n\n3.\tAz alakzatoknak van egy minimális, és legtöbbször egy maximális létszáma, mely alatt, illetve felett a formáció képtelen ellátni feladatát, és minden általa adott módosító, bonusz elvész.\n\nA képzetlen karakter ugyan utánozhatja alakzatba formálódott társait, de a képzettség adta semmilyen előnyt nem élvez.",
      lvl_1: "A képzettség 1. fokú ismerete összesen egy harci alakzat ismeretét biztosítja a karakternek a legegyszerűbbek és a legalapvetőbbek közül.",
      lvl_2: "Ezen a fokon a karakterek már két elterjedtebb harci alakzatot ismernek; általában ez egy nagyobb és egy, két, vagy három ember alkotta kisegységes alakzatot jelent.",
      lvl_3: "A képzettség 3. foka minőségi változást hoz: a karakter immáron öt harci alakzatot ismer. Ezekből általában továbbra is csak maximum egy vagy kettő kisegységes alakzat.\n\nA reguláris hadseregek elitcsapatai általában 3. fokon képzett harcosokból állnak; a fejlett hadszervezetükről híres országokban, például Abasziszban - minden katona ilyen szintű kiképzésben részesül.",
      lvl_4: "A képzettség e fokán a karakter már képes viszonylag gyorsan alkalmazkodni - sikeres Érzékeléspróba esetén - bármely harci alakzathoz, s részt venni azok működésében anélkül, hogy akadályozná annak működését. Igaz, ekkor sem kapja meg az alakzatok nyújtotta előnyöket.",
      lvl_5: "A karakter már egy-két kör alatt képes alkalmazkodni Ynev bármely harci alakzatához - sikeres Érzékeléspróba esetén. Ekkor nem csak, hogy nem akadályozza az alakzat működését, de hatásos részvételével részesül a taktika nyújtotta előnyökből.",
      special: "Shadoni páros\n\nKözelharcban a szembenálló csapatok teljes elkeveredése után használják. A két harcos egymásnak veti hátát, így védve társát a hátulról jövő támadásoktól. Az ilyen formációban küzdőket nem lehet hátulról (és fél hátulról) támadni, VÉ-jük pedig - az állandó mozgástól és forgástól - 5-tel nő. Shadonban a katonák és zsoldosok alapvető kiképzéséhez tartozik, de Ynev több táján is ismerik és használják.\n\nAbasziszi hármas\n\nHasonló a shadoni páros küzdőmódszerhez, célja a többiek védelme. Ennek végrehajtásához - értelemszerűen - három harcos szükségeltetik, akik egymásnak háttal állva szűk kört alkotnak. Fő előnye ugyanaz, mint a shadoni párosnak, azaz, hogy az így harcolókat nem lehet hátulról vagy fél hátulról támadni. Hátránya, hogy több embert igényel, előnye viszont, hogy a harcosok jobban odafigyelhetnek egymásra, hiszen így csak a teljes kör egyharmadát kell védeniük, nem pedig a felét. Ennek köszönhető a magasabb VÉ módosító: +10.\n\nKráni pusztító ék\n\nKívülállók számára ritkán elsajátítható technika, a kráni Pusztító alakulatok alkalmazzák. A módszer a hagyományos, hadászati jellegű alakzatok közül talán a leghatásosabb, legkeményebb. A küzdők ék alakban támadnak, folyamatosan törnek előre. Az ék csúcsán a legkeményebb támadó harcos áll, a két oldalon a védők. A támadónak szinte felesleges ügyelnie a védelmére, a két szárnyon állók felelősek ezért. A két védő is támadhat, de Támadó értékük alacsonyabb, a fokozott védelemre való összpontosítás miatt. Az alakzatot áttörni meglehetősen nehéz; lassan, módszeresen haladva minden útjába kerülőt elpusztít, minden ellenállást felmorzsol. Gyakran indítják meg őket az ellenséges fővezér irányába. Ha a csúcson álló netán fárad, vagy mégis komolyabb sebet kapna, az egyik védő állhat támadó pozícióba, átvéve az élharcos szerepét.\n\nAz alakzat módosítói: hátulról és fél hátulról nem intézhető támadás az ékben állók közül az ék csúcsán állóra. A támadó pozícióban álló TÉ-je 25-tel nő, a védőké fejenként 15-tel csökken. A csúcson álló VÉ-je a saját VÉ-jének fele plusz a két védő összes VÉ-jének harmada; a szárnyakon állóké nem változik. Leginkább három emberrel alkalmazzák, de lehet öt-, sőt hét fős éket is alkotni. Ekkor is csak az elöl haladó három harcos harcértékei változnak, viszont a többi is harcol, és utánpótlásként bármikor beállhatnak. Kránon kívül kevés helyen oktatják - kizárólag csakis nagyobb birodalmak (Shadon, Gorvik, Pyarron, Toron és Abaszisz) hadseregeiben.\n\nSün\n\nHasonló, mint a pajzsfal, de nem támadásra, hanem védekezésre használatos. Ennek alkalmazásához kevesebb katona is elég, de minimum 5 szükséges. A technika lényegében megegyezik a pajzsfallal, ám jelen esetben az alakzat minden oldalán felépül a pajzsok alkotta védmű. Legelterjedtebb formái a háromszög, négyszög és kör. A középen állók, akiknek társuk elestéig nincs feladatuk, pajzsaikat fejük fölé emelik, ezzel is megnehezítve az ellenfél íjászainak, parittyásainak dolgát. Az ilyen alakzat nehezen mozog, hiszen tagjai különböző irányokba néznek, haladniuk azonban egy irányba, egyszerre kellene. Védekezéshez viszont ideális: a szálfegyverek nyelének földbetámasztásával a lovasrohamot is képes megtörni, a gyalogos ellenfelek támadását pedig még inkább megnehezíti. A formációban állók VÉ-je 20-szal nő, célzott fegyverek ellen +50-nel. Ha netán haladni akarnának, úgy csak a pajzsfalból származó előnyöket kapják meg.\n\nTiadlani kettős\n\nA Tiadlani kettős nem annyira katonai formáció, mint inkább kalandozók kedvelt harcmodora. Mint neve is mutatja, két harcos kell hozzá. Alapvetően a túlerőre épít. Ha a két harcos nálánál erősebb ellenféllel kerül szembe, egymást támogatva és védve harcolhatnak a közös ellenfél ellen. Az alakzatban a résztvevők megosztják egymás közt, hogy ki támad, és ki védekezik. Ezt alaposan begyakorolják, hiszen a kettős előnye a pontosság és az összehangoltság - nem meglepő tehát, hogy a taktika származási helyét a tiadlani kolostorok erődfalai között sejtik Ynev tudós fői. Általában egyikük rátámad az ellenfélre, de szándékosan elrontja. Az felbuzdulva sikerén visszatámad. Ez a kritikus pillanat, ugyanis ezt a viszonttámadást már váró harcos felkészülten hárít, míg a másik ezzel egy időben lecsap. Ha jól időzítettek, az ellenfél nem képes védekezni, hiszen támad. A hárító harcos védekező harcot folytat annak minden előnyével és hátrányával, a Támadó pedig a Támadás Fél hátulról harci helyzet módosítóit kapja meg. A sikernek feltétele a pontos időzítés, amihez az kell, hogy a kettős támadó tagjának Kezdeményezése felülmúlja az áldozatét. Ha ez nem így történik és elkésik a támadással, akkor mindketten elveszítik pozitív módosítóikat.\n\nA Falkataktika a Tiadlani kettős többszemélyes változata. Humanoid, ember méretű ellenfél ellenében maximálisan hatan képesek egyszerre fellépni. A létszámfölény miatt nem csak egy, de két személy is Támadóként vehet részt a formációban a fenti módosítók, illetve megkötések mellett; természetesen a túlerőből adódó módosítók is sújtják az áldozatot.\n\nTerkinior-féle lándzsahasználat\n\nTerkinior hercegkapitány Abhamaik Otlokir uralkodása idején élt, a hadsereg-reformer nagykirály jobbkeze volt. Az ő nevéhez fűződik ez a módszer. Lényege egy szűk terület tartása pajzs és lándzsa segítségével. Annyi falanx-harcos szükséges hozzá, amennyi az adott terület, átjáró teljes elállásához szükséges. Ilyenkor a harcos lándzsájával, pajzsa védelmét kihasználva, feltartja ellenfeleit. Amennyiben ő kezdeményez, és ameddig ellenfelét eltalálja - ha nem üti át a páncélt az SFÉ miatt, akkor is -, annak nincs joga a visszatámadáshoz, kivéve, ha fegyvere legalább azonos méretkategóriájú, mint a falanx lándzsája. Ha a feltartó harcos elhibázza támadását, természetesen minden előnyét elveszíti."

    },
    {
      name: "Vakharc",
      skillType: "Harci",
      skillDifficulty: "III",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A képzettség a vak harcosok, illetve leginkább felkészültebb fejvadászok, tárnaharcosok sajátja. A képzettség segítsége nélkül a megvakult, vagy vaksötétbe került karakter a Harc vakon (KÉ: nincs, TÉ: -60, VÉ: -60 CÉ; -150) módosítóit, a láthatatlan ellenféllel küzdők, pedig a Harc láthatatlan ellenféllel (KÉ: nincs, TÉ: -30, VÉ: -30 CÉ: -75) módosítókat szenvedik el.\n\nA Vakharcnak csak akkor veszi hasznát a karakter, ha képes a hangok, zajok, neszek alapján hozzávetőlegesen betájolni ellenfele helyzetét, a lesújtó penge suhogásából megsejteni a támadás irányát, a csikorduló fém hangjából megállapítani, hogy ellenfele visel-e vértet vagy pajzsot stb. Hangzavarban, csatatéren vagy bármely más zajos helyen a képzettséget csak egy fokkal alacsonyabban alkalmazhatja emiatt.",
      lvl_1: "A karakter harcolni ezen a szinten még nem tud, képessége botlás, nagyobb tárgyakkal történő ütközés nélküli haladásra jogosítja fel.",
      lvl_2: "A képzettség alkalmazója már éles helyzetben is hasznát veszi a képzettségének. A Harc vakon módosítók helyett már csak egy Harc láthatatlan ellenféllel módosítót kap, hiszen képes látása híján hallására (az ellenfele ütötte apró zajokra, neszekre), és megérzéseire támaszkodni. Ám láthatatlan ellenféllel szemben továbbra is elszenvedi a negatív módosítókat. Bármely más látást rontó helyzetben, mely nem teljes vakságot okoz, csak KM által meghatározott módosítók felét szenvedi el.",
      lvl_3: "Az alkalmazó látást rontó, de vakságot nem okozó helyzetben már levonások nélkül harcol. Teljesen vakon vagy láthatatlan ellenféllel szemben pedig egy csökkentett KÉ: -10, TÉ: -20, VÉ: -20, CÉ: -50 módosítóval kell számolni.",
      lvl_4: "A vakharcos innentől kezdve hagyatkozik leginkább az ösztöneire, megérzéseire. Negatív módosítók immáron nem sújtják.",
      lvl_5: "A Játékos karakter ezen a szinten nem tanulhatja a képzettséget, csak ha vaknak született, vagy ha legalább már öt éve világtalan. Ezen a szinten, ha a harcoló feleknek sötétben kell hadakoznia, akkor a vakharcos már egy bonusz KÉ: +5, TÉ: +10, VÉ: +10 módosítóval is számolhat.\n\n"

    },
    {
      name: "Vértviselet",
      skillType: "Harci",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Erő"],
      description: "Harcászati értelemben Ynev a hidegfegyverek virágkorában él. Az átlagos harcos kardban, tőrben, buzogányban gondolkodik, s ezek ellen a legjobb védelem, ha az ember annyi keményre edzett fémet halmoz magára, amennyit csak elbír. Ezt a gyakorlatot a kontinens népei már korok óta gyakorolják, annak ellenére, hogy a rengeteg fém viselése lelassítja, akadályozza viselőjét; ezt nevezzük Mozgásgátló tényezőnek (MGT).\n\nEzen akadályozó erő hatására fejlődött ki az évezredek során az a sajátos képzettség, amely megedzi és képessé teszi birtokosa testét az irgalmatlan súlyú vértek viselésére is.\n\nA vértezeteket anyaguk és típusaik szerint három csoportba soroljuk, az egyikbe a Könnyűvértezetek, azaz a nem fém vértezetek (posztóvért, bőrpáncél), a másodikba a Rugalmas Nehézvértek (gyűrűs vért, sodronying, brigandin, láncing, pikkelyvért), míg a harmadik csoportba a Merev Nehézvértek tartoznak (lemezvért, mellvért, fél- vértezet, teljes vért). A különböző klánok, rendek, iskolák speciális vértezeteit lásd az adott klán, rend, iskola vagy a fegyverek leírásánál.\n\nKépzetlenség esetén a karakter, ha könnyűvértet ölt magára képes viselni azt, de az MGT egésze érvényesül. Ha nehézvérttel próbálkozik, akkor az MGT érvényesül, illetve az irdatlan tömeg alatt tántorogva a karaktert a képzetlen fegyverforgatásból adódó negatív módosítók sújtják. A nehézvértet képzetlen személy maximálisan az Állóképességének megfelelő körig képes viselni, majd kimerültén, és továbbiakban a Harc kábultan módosítóit is elszenvedni (KÉ: -10 TÉ: -20 VÉ: -10, CÉ: -30)",
      lvl_1: "A karakter izomszakasztó, több heti verejtékes gyakorlás után nemcsak Könnyűvértezeteket, hanem Rugalmas Nehézvértezeteket is képes viselni.",
      lvl_2: "A képzettség birtokosának teste lassan átformálódik azzá a masszív felépítésű, nehézcsontozatú alakká, aki tapasztalataival és rengeteg munkával már kihasználja a páncél felépítése adta lehetőségeket és segítségükkel huzamosabb ideig képes hordozni a terhet. A Könnyűvértezetek MGT-je 1-gyel csökken. A karakter már bármiféle Nehézvértezetet viselhet.",
      lvl_3: "Az ilyen fokon képzett karakter már igazi páncélos vitéz, még kevésbé zavarják a nehezebb vértezetek. A Nehézvértek MGT-je 1-gyel csökken, a Könnyűvértezeteké\n\n2-\tvel csökken. A karakter képességei miatt már ösztönösen alkalmazza a páncélzata nyújtotta lehetőségeket a csapások hárítására, mérséklésére, az általa viselt vértezetek SFÉ-je 1 ponttal magasabbnak számít.",
      lvl_4: "A képzettség e fokának birtokosa már igen nagy gyakorlattal bír a vértviselésben, a Nehézvértezetek MGT-je 2-vel csökken, az általa viselt páncélok SFÉ-je 2 ponttal magasabbnak számít.",
      lvl_5: "„Páncélban született” tartják az efféléről a bölcsek és a köznép egyaránt, már szinte észrevétlen hordozza az irdatlan vasakkal felszerelt teljes vértezeteket is, a Nehézvértezetek MGT-je 3-mal csökken, az általa viselt vértek SFÉ-je 3 ponttal magasabbnak számít."

    },

    {
      name: "Álcázás/álruha",
      skillType: "Alvilági",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Kultúra"],
      stats: ["Ügyesség", "Érzékelés"],
      description: "A karakter ezen képzettséggel álruhák felöltésére, készítésére, önmaga vagy mások elmaszkírozására, illetve tárgyak elrejtésére képes. A kutató szemek és kezek ellen próba dobandó a kutakodó személy Érzékeléspróbája, esetleg bármely a KM által kiválasztott képzettsége ellenében.\n\nAz álcázás elkészülési idejének megállapítása a KM jogköre, ám egyetlen álruha sem nagyon készül 23 óránál tovább, akad viszont egyetlen perc alatt kivitelezhető is. Másrészről egyetlen nagyobb még elrejthető tárgyat sem nagyon kell néhány óránál tovább álcázni.\n\nMegjegyzendő még, hogy a képzettségből megszerzett fokonként -10% módosító járul a karakter által állított csapdák elleni Csapdakeresés próbákhoz, amely összeadódik a Csapdaállításnál szereplő módosítókkal.",
      lvl_1: "A karakter egyelőre még csak elvegyülni képes az általa ismert kultúrkör tagjai alkotta tömegben, ha akadnak megfelelő ruhák, akár percek alatt is képes egy semmitmondó öltözék összeállítására. Kisebb tárgyakat rejthet, takarhat el, vagy álcázhat valamely más tárgy felhasználásával egykét perc alatt.\n\nA karakter próbájához -1 módosító járul.",
      lvl_2: "A gyakorlott álcázó, már képes nagyobb, majd félembernyi tárgyakat is elrejteni, vagy álcázhat más tárgyakká, akár percek alatt is, ha ez fizikailag lehetséges, a KM belátása szerint. Emellett már képes egyszerűbb anyagokból álöltözetek elkészítésére is.\n\nA karakter próbáját módosító nélkül dobja.",
      lvl_3: "Az ilyen szinten beavatott álca és álruhakészítő már igen gyakorlott. Akár embernyi tárgyakat is sikeresen elrejthet, a KM belátása szerinti idő alatt. Percek alatt képes akár nemesi vagy valamely szervezet beavatottjának öltözékét mímelni, ha a megfelelő eszközök a rendelkezésére állnak. Képes akár már élethű maszkokat is készíteni, melyek három óránál nem tartanak tovább, s az időtartam lejárta után lassan széthullanak, illetve képes a sajátjától 20%kal jobban el nem térő testalkat utánzására cseles eszközeivel.\n\nA karakter próbájához +1 módosító járul. ",
      lvl_4: "A mesteri művelője e „szakmának” már bármilyen körbe bejuthat öltözékei segítségével, ha bír a KM által meghatározott Udvari etikett vagy Kultúra képzettség szükséges fokával. Maszkjai akár hatnyolc órán át használhatóak maradnak. A sajátjától maximálisan 30%kal eltérő testméretek utánzására képes.\n\nMár igen nagy, akár kisebb kunyhónyi tárgyakat is elrejthet a KM belátása szerinti idő alatt, ha ez az adott helyzetben lehetséges.\n\nA karakter próbájához +2 módosító járul.",
      lvl_5: "Legendás hírű álcázó mester, kinek híre munkásságának és álöltözeteinek hála csak igen szűk körben terjed. Ha ideje engedi, szinte bármekkora, emberi méretű test viselhető álcáját elkészíti, maszkjai akár napokig is kitarthatnak.\n\nKépességei birtokában nagyobb háznyi tárgyakat is megpróbálhat elrejteni a KM beleegyezésével, a megfelelő idő birtokában.\n\nA karakter próbájához +3 módosító járul."

    },
    {
      name: "Hamisítás",
      skillType: "Alvilági",
      skillDifficulty: "III",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség", "Intelligencia"],
      description: "A képzettség különböző iratok, értékek hamisítására, az eredetihez megszólalásig hasonló másolatának elkészítésére szolgál.\n\nA képzettség követelménye lehet a hamisítandó érték elkészítéséhez tartozó Szakma ismerete, illetve okirat hamisításnál írás/olvasás, Heraldika megfelelő kultúrkörének ismerete.\n\nA csalást felfedni kívánók ellen próba dobandó a kutakodó személy Érzékeléspróbája, esetleg Értékbecslés vagy bármely a KM által kiválasztott képzettsége ellenében.",
      lvl_1: "A karakter még csak figyelgeti a mesterség alapjait, jobban teszi, ha nem próbálkozik, ha nem akar kötelet a nyaka köré.\n\nA karakter próbájához -1 módosító járul.",
      lvl_2: "Kontár, még csak tanulja a szakma alapjait. Komolyabb munkáknál nincs sok esélye sikerre.\n\nA karakter próbáját módosító nélkül végezheti el.",
      lvl_3: "Tehetős iparos, komolyabb munkákat még csak nagy kockázattal vállalhat, de már tisztességes úti okmányok egyszerűbb passzusok kerülnek ki a keze alól, becsületes pénzhamisító.\n\nA karakter próbájához +1 módosító járul.",
      lvl_4: "Ezen a szinten a karakter már komolyabb ékszereket vagy iratokat hamisít, csak igazi, szakavatott mesterek kezdenek el gyanakodni munkája láttán.\n\nA karakter próbájához +2 módosító járul.",
      lvl_5: "A hamisítás nagymestere, igen tehetős, pártfogókkal bíró művész. Munkája, akár még egy bankház titoknokát is megtévesztheti, igen nagybecsű és értékes ékszerekről készíthet másolatot a lelepleződés csekély esélyével. Ha bírja a vonatkozó mágikus hagyományt, akár varázstárgyakat is hamisíthat, melyek hatásukban nem, de kinézetükben és egészen használatukig képességeikben is teljesen azonosak az eredetivel.\n\nA karakter próbájához +3 módosító járul."

    },
    {
      name: "Jelbeszéd",
      skillType: "Alvilági",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés", "Intelligencia"],
      description: "A jelekkel folytatott kommunikáció tudománya, a fejvadászrendek és tolvaj klánok sajátos belső nyelve, de kalandozóknak is jól jöhet.",
      lvl_1: "Az ilyen szinten képzett személy még csak egykét jelet ismer, melyek igen egyszerűek, például: „Menj innen!” vagy „Le a fegyvert!”",
      lvl_2: "A karakter már nagyon egyszerű, köznapi szavakkal megértetheti magát, például: „Menj fel a padlásra!” vagy „Nincs itt senki, elmentek.” A tolvajcéhek képzettebb embereinek szintje.",
      lvl_3: "A képzett személy szókincse már jelentős és nagy gyakorlata van a csendes beszéd használatában is. Egyfajta konyhanyelvet már igen gyorsan és szinte hibátlanul alkalmaz. A képzettség ezen szintje, afféle fejvadász harci nyelv a csendesebb bevetésekre.\n\nA süketnéma karakterek kötelező tudásszintje. Induláskor anyanyelvűk helyett ezen képzettség 3. fokát birtokolják.",
      lvl_4: "A karakter képes magát az élőszónál valamivel lassabban, de teljes nyelvi repertoárját felölelő módon kifejezni.",
      lvl_5: "Akár irodalmi értekezést is lefolytathat a karakter a jelbeszéd segítségével, már ha van, aki megértse. Kommunikációja sebessége már azonos az élőszóéval. A karakter akár már számára idegen jelrendszereket is megért sikeres Intelligencia próbával."

    },
    {
      name: "Kocsmai verekedés",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Gyorsaság", "Ügyesség"],
      description: "Ezen képzettséggel felvértezve bármilyen rögtönzött fegyverrel képes a karakter helytállni, amit egy ivó vagy egy fogadó söntése nyújthat, például szék, asztal, söröskupa, kancsó, esetleg étekfogóvilla. A magasabb szintjein már igen komoly harci tapasztalatot birtokol a karakter.\n\nA kocsmai fegyverek értékeinek meghatározása a KM tisztje, bár azt megjegyeznénk, hogy ritkán akad olyan kocsmai berendezési tárgy vagy kellék, amely akár harcértékeiben, akár sebzésében elérné egy valódi fegyver képességeit.",
      lvl_1: "A kezdő bunyóst nem sújtják már a képzetlenségből eredő negatív módosítók",
      lvl_2: "A gyakorlott kocsmavitéz megtanult bánni az adott fegyverekkel, már megkapja a fegyver harcértékeit, innentől kezdve a fegyver KM által meghatározott értékeivel megnövelt harcértékekkel vesz részt az összecsapásokban.",
      lvl_3: "A hivatásos ivóbajnok már képzett fegyverforgató, sebzéseihez +1 Sp járul.",
      lvl_4: "Az ilyen megátalkodott kocsmatöltelék már mestere a kocsmai fegyverek forgatásának, a fegyveres harcértékeihez KÉ: +2, TÉ: +5, VÉ: +5, CÉ: +5 járul.",
      lvl_5: "A karakter legendás bajnoka Ynev ivóinak, sebzéséhez +2 Sp adódik."

    },
    {
      name: "Méregkeverés/semlegesítés",
      skillType: "Alvilági",
      skillDifficulty: "II",
      softReq: ["Alkímia"],
      hardReq: ["Herbalizmus"],
      stats: ["Intelligencia"],
      description: [
        "A képzettség birtokosa képes mérgek, áfiumok és ajzószerek keverésére. Ha úgy hozza a szükség, a méreg típusának és jellemzőinek meghatározása után képes ellenszert készíteni, ha az adott képességekkel bíró mérget maga is ki tudná keverni. Azonban a méreg képességeinek kiderítéséhez vagy mágiát kell használnia a karakternek, vagy sikeres Intelligenciapróbát kell dobnia a leírásban szereplő módosítókkal.\n\nA méregkeverő által elkészíthető mérgek képességeit a képzettség függvényében a következő módon állíthatja össze a játékos a KMmel egyeztetve.",
        "table:Ip\tMéregtípus\tHatás\tHatás időtartama\tHatóidő\n\n1\tÉtel és italméreg\tGyengeség, Rosszullét\tEgyszeri hatású\tNagyon lassú\n\n2\tFegyverméreg\tKábulat, Bódulat, Fájdalom\tRövid ideig ható\tLassú\n\n3\tLégméreg\tGörcs, Bénultság\tKözepes ideig ható\tGyors\n\n4\tTöbb komponensű\tAlvás, ájulás\tHosszú ideig ható\tAzonnali\n\n5\tKontaktméreg\tHalál\tMaradandó\tLappangó",
        "A mérgek négy fontos képességét sorolja fel az alábbi táblázat, feltüntetve a tulajdonság pontértékét. Mikor egy méreg kikeverésére kerül a sor a karakter a képzettség nyújtotta Ismeret pontokból vásárolhatja meg az adott méreg képességeit. A tulajdonságok Ismeret pont Azonban a KM belátása szerint igen különleges esetekben, ritka, nagyon nehezen beszerezhető, vagy igen borsos árú alapanyagok felhasználásával a méreg szintje maximum hárommal növelhető, az Ip költség növekedése nélkül.\n\nA mérgek szintjének növekedésével párhuzamosan az adott méreg hatása ellen dobandó Egészségpróbát a méreg szintjének megfelelő negatív módosító sújtja.\n\nItt jegyzendő meg, hogy a komolyabb, súlyosabb hatású mérgek elkészítéséhez már laboratórium vagy drága felszerelés szükséges, a KM döntése szerint.\n\nA Fájdalom hatással bíró mérgek sebzése minden egyes a karakter által birtokolt képzettségi fok után 1k6 Sp, ami a hatás kialakulásakor azonnal fellép, és a teljes hatóidő alatt érvényesül. Amíg a méreg hat csakis pszionikával, vagy mágiával (a méreg semlegesítése vagy a karakter eltompítása ál?\n\ntál) mérsékelhető a fájdalom. Azaz 1. fokú képzettséggel 1k6 Sp, 3. fokú képzettséggel 3k6 Sp. Ez a sebzés alapvetően Fp, azonban a kötelező Ép vesztés miatt könnyedén komolyabb Ép sérüléssé változhat.\n\nAz adott méreg keveréséhez szükséges Ipk száma.",
        "table:Ip-k száma\tA méreg ára(1 adag)\n\n1-10\t10 réz/IP\n\n11-20\t1 ezüst/IP\n\n21+ 1\tarany/IP",
        "small: Például: Arash, a boszorkánymester, aki 3. fokon jártas a méregkeverésben, és ezért 15 Ipvel bír, egy italmérget akar készíteni (1 pont), ami kábulatot okoz (2 pont), ami közepes ideig hat (3 pont) és aminek gyors a hatása (3 pont) - őszszesen tehát 9 pont. A mérget nem szánja túl erősre, hiszen egy nyeszlett uzsorás életének megkeserítésére készül, azaz 2.szintű elegendő lesz. Tehát a végső Ip költség 9+6=15 pont. Ezek szerint pont a 3. szintű méregkeverés szükséges az előállításához, tehát Arash szépen munkához láthat.\n\nMásik alkalommal Arash egy egész ivó vendégeire akarja rászabadítani a halált, mert vérig sértették. Egy légmérget szeretne (3 pont), ami halált okoz (5 pont), aminek hatása természetesen maradandó (5 pont) és ami lassú hatású (2 pont) - összesen tehát 15 pont. Mivel az ivó vendégei jórészt harcosok, ezért magasabb szintű mérget, mondjuk 1. szintűt szeretne a biztos hatás elérése érdekében, így a végső Ip költség 15+3=18 Ip lenne. A fogadó vendégei e szerint megmenekülnének, mivel Arash ezt a mérget képtelen előállítani. De jaj nekik, mert a boszorkánymester belátó és inkább csak 0. szintű mérget készít, aminek Ip költsége 15, és a többit a tőrére bízza.\n\nAzonban abban az esetben, ha Arash birtokol néhány szemet az Elátkozott Vidék legendás görcsfáinak magvaiból, akkor ezekkel képes megerősíteni egy szinttel áfiuma gyilkos hatását, és csak a legkitartóbban az életbe kapaszkodó vendégeket kell megismertetnie tőre vasával.\n\nA mérgek mindig kétféle hatással bírnak, az egyik az Ip pontokból kigazdálkodott mérgek Hatása, ez mindig az erősebb hatás, a másik a méregkeverő által választható, egy, vagy több kategóriával gyengébb hatás. Ez abban az esetben lép színre, ha a célpont sikeres Egészségpróbát dobna. Ennek a másodlagos hatásnak az időtartama is egy kategóriával kisebb az elsődleges hatásénál.\n\nA mérgek hatóidejének letelte után a célpont még 1k6 percig a KM által meghatározott utóhatásoktól szenved (általában gyengeség).\n\nA mérgek tulajdonságait és az alkalmazásukról szóló egyéb információkat lásd a 186. oldalon a Mérgek c. fejezetnél."
      ],
      lvl_1: "A kezdő áfiumkeverő még csak tanulgatja e sötét tudomány alapjait: 5 Ipből gazdálkodhat.\n\nEzen a beavatottsági fokozaton még csak nagyon egyszerű mérgezések orvoslására képes, Intelligenciapróbáját -1 módosítóval dobja.",
      lvl_2: "A gyakorlott méregkeverő munkássága már valamivel több az egyszerű receptek szolgai végrehajtásánál, immáron 10 Ipvel bír.\n\nMár komolyabb mérgezéseket is kezelhet, Intelligenciapróbáját módosító nélkül dobja.",
      lvl_3: "A szakavatott méregkeverő, már igazi mesterember. Ezen a szinten már 15 Ipt birtokol.\n\n \n\nA karakter, ha gyógyításra adja a fejét, akkor Intelligenciapróbáját már +1 módosítóval dobja.",
      lvl_4: "A karakter igazi méregmester, a képzettség ezen fokán 20 Ipt birtokol.\n\nA mérgek ellenszereit is gyakorlott könnyedséggel keveri ki és állapítja meg a szükséges gyógymódot, Intelligenciapróbáját +2 módosítóval dobja.",
      lvl_5: "A karakter ezen a szinten már szinte bármilyen mérget előállíthat, ami megalkotható a rendelkezésre álló 25 Ipjéből.\n\nEzen a fokozaton már bármilyen mérgezést orvosolhat, ha van rá ideje, a megfelelő gyógymód felismeréséhez szükséges Intelligenciapróbát +3mal dobja.",

    },
    {
      name: "Orvtámadás",
      skillType: "Alvilági",
      skillDifficulty: "II",
      softReq: ["Élettan"],
      hardReq: ["Fegyverhasználat", "Pusztakezes harc"], // TODO: OR
      stats: ["Ügyesség"],
      description: "A karakter képes meglepetésből gyilkos döféseket, pusztító vágásokat vagy halálos lövéseket végrehajtani.\n\nA képzettség nem alkalmazható együtt a Pusztítás képzettséggel.",
      lvl_1: "A kezdő orvtámadó meglepetésszerű támadás esetén + 1 Sp sebzést adhat a sebzéséhez.",
      lvl_2: "A gyakorlott orvgyilkos meglepetésszerű támadás esetén +1k3 Sp sebzést adhat a sebzéséhez.",
      lvl_3: "A karakter hivatásos gyilkos, meglepetésszerű támadás esetén +1k6 Spt adhat a sebzéséhez.",
      lvl_4: "A karakter mestere a meglepetésszerű támadásokból bevitt iszonytató sebek okozásának, sikeres támadás esetén +2k6 Spt adhat a sebzéséhez.",
      lvl_5: "A legendás orvgyilkos, már fogalom a szakmában, meglepetésszerű támadás esetén +3k6 Spt adhat a sebzéséhez."

    },
    {
      name: "Kínzás",
      skillType: "Alvilági",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség", "Intelligencia"],
      description: "A kínzás és vallatás művészete, a minél fájdalmasabb sebek okozásának és a lelki gyötrelmek keltésének tudománya, melyet leginkább a sötét birodalmak hóhérai, vallatói, fejvadászai, valamint boszorkány és boszorkánymesteri rendek képviselői tanulmányoznak.",
      lvl_1: "Vallatás esetén az áldozat óránként köteles Akaraterő próbát tenni a vallató Tulajdonságpróbája ellenében, hogy megtörike a vallatás kínjai közepette. A vallató próbáját -1 módosítóval teszi.",
      lvl_2: "Vallatás esetén az áldozat félóránként köteles Akaraterő próbát tenni a vallató Tulajdonságpróbája ellenében, hogy megtörike a vallatás kínjai közepette. A kínokozó próbáját módosítók nélkül dobja.",
      lvl_3: "Vallatás esetén az áldozat negyedóránként köteles Akaraterő próbát tenni a vallató Tulajdonságpróbája ellenében, hogy megtörike. A vallató próbáját +1 módosítóval teszi.",
      lvl_4: "A már szinte művészetként hivatását gyakorló kínzómester áldozata 10 percenként köteles dobni, a vallató karakter +2 módosítóval dobhatja próbáját.",
      lvl_5: "A legendás hírű mester áldozatának öt percenként kell Akaraterő próbát dobnia, amely ellenében a vallató +3 módosítóval végezheti el dobását. A képzettség ilyen szintű alkalmazója már inkább a lelki kínzásban, áldozata személyiségének és akaraterejének teljes megtörésében látja a megszerezni kívánt információhoz vezető utat, semmint a fizikai test fájdalmas szétrombolásában."

    },
    {
      name: "Szabadulóművészet",
      skillType: "Alvilági",
      skillDifficulty: "III",
      softReq: ["Zárnyitás"],
      hardReq: ["Csomózás"],
      stats: ["Ügyesség"],
      description: "A karakter szorongatott helyzetéből, csapdákból, kötelékekből, leláncolt, vagy lelakatolt szerkezetekből juthat ki ily módon. A szabaduláshoz sikeres próbát kell dobnia a leírásban szereplő módosítókkal, a csapdát vagy a köteléket megalkotó vonatkozó próbája ellenében.",
      lvl_1: "A képzettséggel ismerkedő karakter már megpróbált kioldani egy csuklóira kötött csomót, nem túl nagy sikerrel. Egyenlőre még csak tanulmányozza a régiek meséit és ha gúzsba kötnék nagy levegőt vesz, hogy azt majd kifújva szabadulhasson, szükséges próbáját -1 módosítóval dobhatja.",
      lvl_2: "A karakter már gyakorlott szabaduló. Egy csomó, vagy szíj nem állja útját, ismeri a láncok trükkjeit is, szükséges próbáját módosító nélkül dobhatja.",
      lvl_3: "A karakter teste szinte gumiból van, nem nagyon létezik olyan kaloda, vagy csapda, amiből ne tudna szabadulni, szükséges próbáját +1 módosítóval dobhatja.",
      lvl_4: "A karakter igazi mestere a szabadulásnak, trükkjeit már víz alatt, teljes sötétségben, vagy egyéb a KM által engedélyezett zavaró körülmény között is alkalmazhatja, szükséges próbáját +2 módosítóval dobhatja.",
      lvl_5: "A karakter igazi nagy művész, már bármilyen kötelékből, bilincsből képes kijutni, ahonnét mágia alkalmazása nélkül ez lehetséges, szükséges próbáját +3 módosítóval dobhatja."

    },
    {
      name: "Szerencsejáték",
      skillType: "Alvilági",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség", "Intelligencia"],
      description: "A szerencse forgandó, de néha segíthetünk neki egy kicsit... A legtöbb szerencsejáték hideg fejjel, vagy a partner alapos megfigyelésével sikeresebbé tehető a számunkra. Ha a játékos csalni is szeretne, hát lelke rajta, de ekkor egy átvert ellenfél haragjával is számolnia kell.",
      lvl_1: "A kezdő szerencsejátékos még csak ismerkedik a szerencsejátékokkal, kultúrköre egykét játékát ismeri. A játék megnyerésére, vagy a csalásra irányuló próbáit -1 módosítóval dobja.",
      lvl_2: "Az igazán gyakorlott játékos már kultúrköre 5 játékát ismeri. A próbáit módosító nélkül dobja.",
      lvl_3: "A karakter kultúrköre 10 játékát ismeri. A próbáit +1 módosítóval dobja. Ezen a szinten a karakter egy, a KM belátása szerint nehezített, sikeres próba után akár másra is terelheti a csalás gyanúját.",
      lvl_4: "A karakter már a kártyalapok, különféle bábuk és zsetonok mestere, kultúrköre 15 játékát ismeri, próbáit +2 módosítóval dobja. Ezen a szinten a karakter egy, a KM belátása szerint nehezített, sikeres próba után, akár másra is terelheti a csalás gyanúját úgy, hogy immáron kézzel fogható bizonyítékokat is képes kreálni. Lebuktatni csakis egy sikeres ellenpróbával lehetséges.",
      lvl_5: "A karakter szinte mágikus képességekkel bír egy általa választott játéktípusban, ebben próbadobásához +4, a többi általa ismert játékban +3 módosító járul. Valószínűleg már kidolgozott egykét játékot maga is."

    },
    {
      name: "Lopódzás",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség", "Érzékelés"],
      description: [
        "A képzettség megmutatja, hogy a karakter milyen halkan képes mozogni. Sikeres próba esetén léptei, sem egyéb mozdulatai nem vernek neszt. Nagy segítségére lehet ez az észrevétlen behatolásban, a meglepetésszerű támadásban.",
        "table:\tMódosítók\n\nTeljes sötétség\t+20%\n\nKőpadló\t+10%\n\nVastag szőnyeg\t+20%\n\nSzáraz avar\t-20%\n\nKavicságy\t-10%\n\nNyikorgó fapadló\t-20%",
      ],
      lvl_1: "A Lopódzásban alig járatosak még elsősorban csupán arra figyelnek, hogy járásuk minél puhább, minél halkabb legyen. Saját bőrükön tapasztalhatják meg, hogy mivel jár az, ha elvétenek egy lépést, ha figyelmetlenek. Nagy esélyük van rá, hogy figyelmen kívül hagynak számos olyan buktatót (recsegő padló, száraz ág, csúszós út, cuppogó sár...) amelyek egy tapasztalt lopódzónak nem jelentenek különösebb akadályt.",
      lvl_2: "Egy éjszakai légyottokról gyakorta hazasettenkedő ifjú feleség bír ezzel a fokkal. Léptei már meglehetősen halkak, és ismerős helyen ritkán üt zajt.",
      lvl_3: "Képzett fejvadász, vagy tolvaj, aki már arra is képes, hogy néhány pillantással felmérjék az előttük álló útszakaszt és jó eséllyel kihasználják azokat a részeket, amelyeken a legkevesebb zajt ütik.",
      lvl_4: "A lopódzás igazi mestere, aki léptei csak nagyon ritkán ütnek zajt, s akkor is leginkább csak akkor, ha ő úgy akarja. Megannyi trükköt ismer, hogy ruháján hogyan kösse le, csendesítse el az apróbb részeket, melyek hangot okozhatnának.",
      lvl_5: "Léptei csendesek, akár a nagyvadaké. Szinte koncentrálnia sem kell, a csendes mozgás már a vérébe ivódott, akár a lélegzetvétel."
    },
    {
      name: "Rejtőzködés",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség", "Érzékelés"],
      description: ["E Képzettség megmutatja, hogy a karakter mennyire képes elkerülni a fürkész tekinteteket, akár tereptárgyak, akár az emberi viselkedés ismeretének segítségével.\n\nA zavaró környezet, tereptárgyak hiánya, 1-gyel csökkenti a Képzettség aktuális fokát, illetve, szélsőséges körülmények között, akár teljesen lehetetlenné teszik."],
      lvl_1: "Egy sokadik gyermek, aki gyakran rejtőzik el a verés elől bírja a Képzettség ezen fokát. Legtöbbször csak a nagyobb tereptárgyakat, fákat, sziklákat vagy egy ágyat használ ki, hogy elrejtőzzék és így próbál meg észrevétlenné válni.",
      lvl_2: "Egy vadorzó, aki rendszeresen a cserjésben keres menedéket a herceg emberei elől. Ha teheti, ruházatát is előre a környék színeihez igazítja.\n\nA siker még itt sem hosszú életű. A fényviszonyok változhatnak, s előfordulhat, hogy neki magának is mozdulnia kell, ami behatárolhatja a rejtőzködés idejét.",
      lvl_3: "Képzett tolvaj, vagy fejvadász, aki remekül kihasználja az árnyakat. Nyilvánvalók számára a különféle árnyékos sarkok, függönyök, bútorok, szekerek és egyéb kisebb tárgyak jelentette lehetőségek.",
      lvl_4: "Az igazi mester, aki szinte egybeolvad a tereptárgyakkal, akár még fényes nappal is, hisz ismeri annyira az emberi viselkedést, hogy meghúzódjék a tekintetek holt-terében.",
      lvl_5: "A rejtőzködés nagymesterét szinte csak akkor pillantják meg, hogyha ő maga is akarja."
    },
    {
      name: "Zárnyitás",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: ["Mechanika"],
      stats: ["Ügyesség", "Érzékelés"],
      description: ["A Képzettség, magában foglalja a gyakorlásához szükséges minimális és célirányos mechanika tudományt: a zárak szerkezetét, működési elveit. Birtokosa álkulcskészlete - vagy jobb híján egy darab drót - segítségével, sikeres képzettségpróba után kinyithat, vagy akár be is zárhat zárakat,\n" +
        "lakatokat a hozzájuk tartozó kulcs nélkül is. A Képzettség csak a szükséges segédeszközök birtokában alkalmazható." +
        "\n\nA sikeres próba esélyét növelheti a kiváló minőségű felszerelés és csökkenti a zár bonyolultsága, összetettsége, hozzáférhetetlensége, netán egyedisége.",
      "Ugyanazon zárra kettőnél több próbadobást egyetlen karakter sem tehet.\n\n" +
      "Mágikus zárak ezzel a Képzettséggel nem nyithatók. Hogy ez sikerüljön, a karakternek legalább 1. fokon járatosnak kell lennie abban a mágiaformában, amellyel a zárat elkészítették. Ekkor sem biztos az, hogy a zárat képes lesz kinyitni, valószínűbb inkább, hogy tönkreteszi annyira, hogy ne láthassa el a feladatát." +
      "\n\nA Zárnyitás a zárakba rejtett csapdákat képtelen felfedni, vagy hatástalanítani. Ehhez sikeres Éberség, vagy Csapdaállítás próba szükséges."],
      lvl_1: "Kezdő tolvaj, aki jó eséllyel elbír már egyszerűbb lakatokkal.",
      lvl_2: "Hivatásos besurranó, aki megélhet tudásából. Egyszerű polgárok házaiba könnyedén bejut, hiszen ott nem találkozik bonyolultabb mechanikus zárokkal.",
      lvl_3: "Szakképzett kasszafúró, akit szívesen visznek magával társai akár még egy bank kifosztásához is.",
      lvl_4: "A zárnyitás mestere, akinek kisujjában vannak még a bonyolultabb mechanikus szerkezetek megnyitásának trükkjei is. Ha az első dobása sikertelen, ám tovább tanulmányozza a zárat, s öt perc elteltével ismét próbálkozhat, de csak egy alkalommal.",
      lvl_5: "A karakter tudása oly’ hatalma, hogy még talán a dzsad bankházak többszörösen összetett zárrendszerei sem okoznának neki nehézséget. A zárszerkezeteket olyannyira kiismerte, hogy második próbadobását már egy perc elteltével kísérelheti meg."

    },
    {
      name: "Zsebmetszés",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség", "Érzékelés"],
      description: "E Képzettség megmutatja, hogy használója mennyire hatékonyan képes - akár ujjai, vagy éles tárgyak (pengék, kifent pénzdarabok, s egyéb eszközök) segítségével - kisebb, kézben tartható tárgyakat ellenfele ruhájából, zsebeiből elemelni, vagy épp oda csempészni.\n\nA körülmények ez esetben is jelentősen befolyásolhatják a próba sikerét.",
      lvl_1: "A lelkes kezdő csak azokat a tárgyakat szerezheti meg, melyeket nem fed ruha (erszények, tőrök stb.), vagy könnyen hozzáférhető zsebekben vannak. A furmányosan elrejtett, vagy a ruházaton belül található értéktárgyak ilyen módon akkor sem kaparinthatok meg, ha a próbadobás egyébként sikeres." +
       "\n\nA tolvajszerszámok használatát még egyáltalán nem sajátította el, így azokat nem használhatja sikerrel.",
      lvl_2: "A jobban képzett tolvaj már megismerte a zsebmetszés segédeszközeit, és részesülhet az általuk biztosított előnyökből.",
      lvl_3: "A szakavatott tolvaj a ruhák megmetszésével képessé válik a szövetek mélyébe rejtett, rögzítetlen tárgyakhoz is hozzájutni. Ez mindenképpen gyors, hirtelen tevekénység, segítségével turkálni, keresgélni nemigen lehet.",
      lvl_4: "A zsebmetszés mestere képes feltérképezni az áldozat ruhája mélyén elrejtett tárgyakat. Ehhez elegendő, ha az alkalmazó, csupán „véletlenül” mellé kerül, nekitántorodik áldozatának, majd sikeres próbát tesz.",
      lvl_5: "E fok birtokosai elképesztő trükkökre is képesek. Megpróbálhatnak ellopni olyan dolgokat is, amelyek közvetlenül érintkeznek az áldozat bőrével, s ő csak némi késéssel fog rádöbbenni azok hiányára. Ilyenek a különféle nyakláncok, csizmaszárba rejtett fegyverek, alkarra erősített tárgyak.\n\nE fok kell ahhoz is, hogy olyan tárgyakat, értékekhez is hozzájuthasson, amelyek eltulajdonításához előbb csatokat, hurkokat kell kioldaniuk vagy egyéb módon „biztosított” dolgot kell elemelnie."
    },
    {
      name: "Állatismeret",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: [],
      description: "A karakter ezzel a képzettséggel bizonyos kultúrkörbe tartozó állatok szokásait, életmódját ismerheti meg, mint pl.: háziállatok, vagy mérsékelt égövi erdők természetes vadjai, esetleg a Nyugati puszták állatai... stb. De ezzel a képzettséggel lehet ismereteket szerezni egy bizonyos állati szörnytípusra, mint például sárkányok és sárkánygyíkok stb.",
      lvl_1: "A képzettség e fokú ismerője még csak ismerkedik az adott csoportba tartozó állatokkal, messziről felismeri a hímeket és nőstényeket, fokozatosan megismeri az életmódjukat, szokásaikat, hangjukat.",
      lvl_2: "Az ilyen szinten képzett személynek már beható ismeretei vannak az adott csoport állatainak viselkedéséről, életmódjáról, étrendjéről.",
      lvl_3: "A karakter már szakavatott ismerője az adott állat-, vagy szörnycsoportnak, tisztában van viselkedésük miértjeivel, a harcmodoruk nyújtotta lehetőségekkel, ezért ellenük való harc esetén harcértékeihez KÉ: +2, TÉ: +5, VÉ:+5, CÉ: +5 módosító járul. A karakter képes az állatok betegségeit felismerni, de csak gyógyító képzettségekkel tudja orvosolni azokat.",
      lvl_4: "A bonusz ezen a szinte már KÉ: +5, TÉ: +10, VÉ: +10, CÉ: +10-re nő, illetve a karakter innentől kezdve képes a választott állatcsoport betegségeinek azonosítására, s alapvető segítséget nyújthat nekik célirányos táplálásukkal.",
      lvl_5: "A karakter olyan szinten ismeri az adott csoport tagjait, hogy jöttére nem riadnak fel az állatok, még a ragadozók is megkímélik, ha épp nem ingerli őket."

    },
    {
      name: "Csapdaállítás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: ["Mechanika", "Csomózás"],
      hardReq: [],
      stats: ["Ügyesség"],
      description: "Jó csapdát állítani nem egyszerű feladat, főleg akkor nem, ha az ember huzamosabb ideig próbál fogva tartani valamilyen intelligens bestiát, ne adja az ég humanoidot. A karakter ezzel a képzettséggel nemcsak csapdák felállításában, hanem azok elkészítésében is járatossá válhat, illetve képessé válik a szerkezetek hatástalanítására is.\n\nA képzettség avatott bajnokai a törpe vár- és útvesztő-építészek, vadászok és vadorzók, illetve a tolvajcéhek és fej-vadászrendek mesterei.",
      lvl_1: "A képzettség birtokosa képes egyszerű, max 1k6 Fp sebzésű csapdák készítésére vagy jelzőcsapdák fabrikálására.",
      lvl_2: "A tudomány e fokú ismerője, már gyakorlott csapdaállító, csapdái akár 2K6 Fp sebzést is okozhatnak, állatokat fogva is tarthatnak, de egy ember hamar kiszabadul belőlük.",
      lvl_3: "A karakter szakavatott ismerője szakmájának, csapdái ezen a szinten már 3k6 Fp vagy 1k6 Ép sebzés okozására képesek, képzett készítőjüknek köszönhetően pedig -10%-os módosítóval sújtják a Csapdakeresés próbát, ez a módosító összeadódik az Álcázás képzettségből adódó módosítókkal.",
      lvl_4: "A karakter mesteri csapdái ezen a szinten már embert is huzamosabb ideig fogva tarthatnak, sebzésük pedig vagy 3k10 Fp, vagy 2K6 Ép. Jobban el is vannak rejtve, keresésük már 20%-kal nehezített feladat, ez a módosító összeadódik az Álcázás képzettségből adódó módosítókkal.",
      lvl_5: "A képzettség e fokának ismeretében már gyakorlatilag bármilyen csapda készíthető (nem mágikus, a csapda méretétől függően a KM belátására bízott sebzéssel), melyet alkotója igen jól elrejtett, a keresésük már 30%-kal nehezített feladat, ez a módosító összeadódik az Álcázás képzettségből adódó módosítókkal."

    },
    {
      name: "Csomózás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség"],
      description: "Egyszerű csomót kötni bárki tud, de e képzettség segítségével tudományát igen csak hasznosan bővítheti a bogok, csúszóhurkok, önoldó csomók és egyéb nyalánkságok titkaival. A csomók, kötelek mesterévé válhat; igen hasznos tudomány tengerészek, falmászók és kalandozók számára.",
      lvl_1: "Ezen a szinten a karakter már biztosan rögzíthet nagyobb terheket, s egy ember gúzsbakötése sem okoz gondot.",
      lvl_2: "A képzettség gyakorlott ismerője már képes nehezen vagy könnyen és gyorsan oldható csomók kötésére. Falmászó felszerelés készítéséhez és használatához elengedhetetlen a képzettség ilyen szintű ismerete.",
      lvl_3: "A karakter egyre jobban elmélyed ebben a tudományban, már hivatásos bogozó, kötöző.\n\nA hivatásos csomózó már utólag kioldható csomót is készíthet, hogy a csapatnak ne kelljen hátrahagyni minden egyes leereszkedés után a köteleit... Kérdés hogyan jutnak vissza, ha még egyszer kellene.\n\nA karakter a képzettség alkalmazásakor +1 módosítóval dobhatja Ügyességpróbáját.",
      lvl_4: "A népi művészek ismerik ilyen behatóan ezt a képzettséget, illetve egyes kultúrák, - pl. az ilanori - hírvivőinek rejtjelezői alkalmazzák. A csomóírás alkalmazásához elengedhetetlenül szükséges a képzettség ilyen fokú ismerete.\n\nA karakter a képzettség alkalmazásakor +2 módosítóval dobhatja Ügyességpróbáját.",
      lvl_5: "A karakter tudása már a fizika törvényeit megszégyenítő hurkok és bogok kitalálására is elegendő. Olyan helyekre képes terheket függeszteni vagy kötelet vetni, ahová senki más, illetve képes bizonyos idő után a terhelés alatt kibomló csomók elkészítésére is, megfelelő, maga által elkészíthető eszközökkel.\n\nA karakter a képzettség alkalmazásakor +3 módosítóval dobhatja Ügyességpróbáját."

    },
    {
      name: "Értékbecslés",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Intelligencia", "Érzékelés"],
      description: "A képzettség a KM belátása szerint korlátlanul alkalmazható, de csak a karakter által ismert kultúrákra, vagy ősibb tárgyak esetén Történelem, esetleg Legendaismeret képzettségekkel kombinálva, mágikus tárgyak esetén pedig, a vonatkozó mágiaforma ismeretével párosítva.\n\nA karakterek ezzel a képzettséggel megismerhetik Ynev egyes országainak értékviszonyait, a helyi fizetőeszközök, illetve ingóságok, ingatlanok értékét, vagy felbecsülhetik egy tárgy minőségét. Megóvhatják magukat a mindennapos kellemetlenségektől, melyek egy tapasztalatlan vásárlóra leselkedhetnek Ynev bazárjainak, piacainak mélyén.",
      lvl_1: "Minden átlagember sajátja... a piacon felismeri a silány vagy romlott árut.",
      lvl_2: "A karakter kultúrköre műremekeit és bármiféle értékkel bíró tárgyát, ingatlanát sikeres Intelligenciapróbával azonosíthatja és becsülheti fel.",
      lvl_3: "A szakavatott becsüs, már nagy biztonsággal nyilatkozik az általa ismert kultúrkörök alkotásairól, értékeiről +1 módosítóval dobott sikeres Intelligenciapróba után, illetve felismeri az idegen kultúra alkotta tárgyakban is az értéket, ha a fenti próbát sikeresen végzi el. A képzettség e fokán már a karakter egyfajta művészettörténeti tudással is bír.",
      lvl_4: "A fenti próbát az általa ismert kultúrák esetén +2, az idegen kultúrák esetében +1 módosítóval végezheti el.\n\nA karakter ezen a szinten kezdi el átlátni a nagy bankházak és kereskedőházak működését, az általuk képviselt értéket.",
      lvl_5: "A karakter művészettörténeti tudása kultúrköreire szinte hiánytalan, a fenti becslést +3 módosítóval végezheti el. Idegen kultúrák esetén +2 módosító járul a próbáihoz."

    },
    {
      name: "Futás",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Állóképesség", "Egészség"],
      description: "A képzettség a hosszútávfutás titkait fedi fel ismerői előtt. Nem a szélsebes vágtázás, a rohanás tartozik ide, hiszen azok sebessége csak a karakter Gyorsaságától függ, hanem az órákig tartó lassú egyenletes futás képességének elsajátítása. A képzettség szakavatott ismerői a futárok, hírvivők, esetleg az ork törzsek felderítő portyázói.\n\nEgy átlagos karakter képzetlenség esetén annyi mérföldet képes futni, amennyi Állóképességének az ötödé (felfelé kerekítve).\n\nA karakter a képzettség fokától függő távolságot képes egyhuzamban megtenni, majd pihennie kell. A táv megtétele után mérföldenként Akaraterő próbadobást köteles tenni, ha tovább akar futni. Minden újabb próba alkalmával további -1 módosítóval, mely módosítók összeadódnak. A sikeres próba esetén a karakter tovább haladhat, sikertelenség esetén pedig nem képes folytatni a futást.\n\nA karakternek a képzettség leírásában szereplő távolság megtétele után pihennie kell legalább 3 órát. Azonban, ha a futás befejeztekor megtett Állóképesség próba sikertelen, akkor ez az időtartam minimálisan 6 óra. Hosszabb, legalább félnapos pihenő nélkül egyetlen karakter sem tehet meg a fent említett rövid pihenő közbeiktatásával sem két teljes futószakasznál többet.\n\nA felszerelés komolyan hátráltatja a futót, ezért minden 20 ynevi font súlynyi teher eggyel csökkenti a képzettség alkalmazásának fokát.",
      lvl_1: "A karakter annyi ynevi mérföld lefutására képes, mint Állóképességének a fele.",
      lvl_2: "A gyakorlott futó Állóképességével egyenlő ynevi mérföld lefutására képes.",
      lvl_3: "A hivatásos futó Állóképességének kétszeresét képes lefutni.",
      lvl_4: "A karakter mestere a hosszútávfutásnak, képességei messze földön híresek, Állóképességének háromszorosát képes megtenni egyhuzamban.",
      lvl_5: "A karakter képességei legendásak, mozgása igen gördülékeny és rendkívül energiatakarékos. Egyhuzamban négyszer annyi ynevi mérföldet képes megtenni, mint az Állóképessége."

    },
    {
      name: "Hajózás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Ügyesség", "Állóképesség", "Intelligencia"],
      description: "Tengerek, tavak és folyók megzabolázásának és hasznunkra hajtásának titkait tárja fel e tudomány. Alacsonyabb fokú képzettség ismerete esetén még csak kisebb tutajok, csónakok, magasabb fokon már nagyobb hajók, esetleg tengeri járművek irányítását fedi a képzettség. Alkalmazásához szükséges lehet Csomózás, Időjóslás, Térképészet, Hadvezetés megfelelő fokú ismerete, ha a KM szerint a hajó felszereltsége, vagy mérete megköveteli.\n\nA képzettség ismerete növeli a hajó sebességét harmadik fok felett, szintenként 10%-kal.",
      lvl_1: "A karakter egyelőre csak ismerkedik a hajózás tudományával, maximálisan apró evezős alkalmatosságok, tutajok irányításához ért, nyugodt vízen.",
      lvl_2: "A gyakorlott karakter ezen a szinten, ha megvannak a megfelelő kiegészítő képzettségei már nagyobb hajókon is dolgozhat, vagy a korábban ismertetett evezős, tutajszerű járművekkel biztosabban bánik, még folyóvizeken vágj' háborgó tárakon is.",
      lvl_3: "Hivatásos hajós, matróz, megfelelő képzettségekkel, akár kormányos is vagy kisebb hajó kapitánya. Evezősöknél és tutajoknál már akár viharban is megállja a helyét.",
      lvl_4: "A mesteri hajós neve már ismert, mint tapasztalt kapitány vagy igen képzett kormányos, ha megvannak a megfelelő képzettségei. Már tengerjáró hajókon is parancsnokolhat, illetve evezősökön, tutajokon akár már zuhatagokon, vízeséseken is áthaladhat, ha ez végrehajtható.",
      lvl_5: "A karakter legendás kapitány, tengerjáró, felfedező, evezősöknél igazi ördög. Ezek a parancsnokok, már szinte bármire képesek hajójukkal, ami egyáltalán elképzelhető. Bármekkora hajókat is parancsnokolhat.\n\nItt megjegyzendő még, hogy tengeri csata esetén úgy dönthetjük el, hogy egy hajítógép, tűzköpő vagy bármely más alkalmatosság eltalálja-e hajónkat, hogy a hajót irányító személy Hajózás képzettségével ellenpróbát dobatunk az ostromgépet irányzó karakter Ostromgépkezelés Szakma képzettsége ellenében, ahol minden 100 ynevi láb távolság után, amely elválasztja a szerkezetet a célponttól -1 levonást kap a kezelőszemélyzet a próbájára."

    },
    {
      name: "Hangutánzás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "Mulatságos, olykor életet mentő képzettség. Vannak, akik kizárólag szájukat használják hangutánzásra, mások, főleg magasabb fokozatú képzettség esetén, már egyéb segédeszközöknek sincsenek híján pl. kezük, használati tárgyak.\n\nMagasabb szinteken már nem csak emberek, vagy állatok hangja, de bármilyen zörej, nesz vagy hang utánozható a KM beleegyezésével. A hangutánzót az általa elsajátított foknak megfelelő nehezítéssel, vagy a KM belátása szerint könnyített Érzékeléspróbával buktathatja csak le egy hallgatózó személy.",
      lvl_1: "A karakter még csak egy-két általa ismert állathangot képes utánozni élethűen.",
      lvl_2: "A gyakorlott hangutánzó képes már komolyabb állathangok utánzására is, az általa ismert fajok - Állatismeret képzettség 2. fok - teljes hangrepertoárját utánozza, illetve képe s egyszerűbb, a karakter életterében előforduló hangok (nyikorgások, neszek) valósághű utánzására.",
      lvl_3: "A szakavatott hangutánzó már egy valós személy hangját is utánozhatja, ha legalább három nap áll rendelkezésére az adott személy hangjának megfigyelésére és begyakorlásra.",
      lvl_4: "A mesteri szintű hangutánzó már egy óra alatt képes valaki hangját „ellopni”, ha jártas a Lélektan képzettségben \n\n- legalább 2. fokon - akkor akár az áldozat közeli ismerőseit, családtagjait, szeretőjét is könnyedén megtévesztheti.",
      lvl_5: "A legendás hangművész akár két ember párbeszédét is képes előadni, illetve fél óra tanulással ismeretlen beszélők hangjait utánozni. Szinte már bármilyen a KM által engedélyezett hangot leutánozhat, egy kecske mekegésétől egy komplett gyalogezred távolodó zajáig."

    },
    {
      name: "Helyismeret",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: [],
      description: "A karakter ismereteinek összessége egy hely térképészeti, szociális (akár alvilági) berendezkedéséről. Minden karakter sajátja, a klánok, rendek, iskolák beavatottjai, tagjai bizonyos, az adott szervezetnél megjelölt szintű ismerettel indulnak saját szülőföldjükre vonatkozóan.",
      lvl_1: "A karakter a képzettség e fokán még csak ismerkedik a tájjal, csak híresebb épületeket, illetve terepalakzatokat ismer fel.",
      lvl_2: "A képzettségben ennyire elmerült karakter már a híresebb személyek és lakhelyük, illetve nagyobb piacok, színházak, egyebek elhelyezkedésével, az őrség kaszárnyáinak helyzetével, a tömlöcök fellelhetőségével is tisztában van.",
      lvl_3: "A környéket ennyire ismerő személy, vagy tősgyökeres helybéli, vagy ha idegen, hát valami komoly terve van itt, mert már a helyi érdekességek és rejtettebb zugok nagy ismerőjének mondhatja magát, természetesen beállítottságától függően - Domvik papja valószínűleg az inkvizíció helyi központjainak, illetve a rejtett ispotályoknak a helyét ismeri, míg egy tolvaj inkább a biztos házak, megerősített italmérések, és bandaterületek határát vési eszébe.\n\nHa KM a próbát szükségesnek véli, azt a karakter +1 módosítóval dobhatja.",
      lvl_4: "A karakter már könnyen eligazodik bárhol, ismeri a negyedek, bandák területeinek határát, ritka az olyan épület, amelynek lakóiról ne bírna legalábbis minimális ismeretekkel. Szinte bármi származási helyét képes felfedni a falak között, amit venni szeretne, és egyáltalán előfordul az adott nagyvárosban, országrészben.\n\nHa KM a próbát szükségesnek véli, azt a karakter +2 módosítóval dobhatja.",
      lvl_5: "Az ilyen mélységében egy adott területet ismerő karakter hatalmas tudás birtokosa; már minden épületet, vízmosást és barlangot ismer. Mindenkiről van néhány szónyi ismerete, aki őslakos az adott területen, még a titkos társaságok rejtett helyeiről is van elképzelése.\n\nHa KM a próbát szükségesnek véli, azt a karakter +3 módosítóval dobhatja."

    },
    {
      name: "Idomítás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Állatismeret"],
      stats: ["Asztrál"],
      description: "Ynev világán rengeteg olyan állat és fél intelligens lény akad, amely beidomítható a karakter szolgálatára, amely némi foglalkozás és törődés után képes akár igen bonyolult feladatok végrehajtására is. Ezen lények száma szinte korlátlan, a játékos ötleteinek az idomítandó lény fajának csak a józanész és a KM döntése szabhat határt.\n\nA képzettség segítségével társra vagy szolgára tehet szert a karakter. Legmagasabb szintű művelői között elvétve akad ember, az idomítás inkább az elfek, félelfek tudománya.",
      lvl_1: "A karakter a képzettség e fokán csak barátságos és intelligens állatokat taníthat be kunsztokra, egyszerűbb parancsok követésére. Ilyen állatok pl. a kutya és a ló.",
      lvl_2: "A gyakorlott idomár már képes mindenféle háziállat idomítására, esetleg ezek vad rokonait is magához szoktathatja, de komolyabb eredményeket még nem érhet el velük.",
      lvl_3: "A szakavatott karakter egyre inkább elsajátítja az idomítás művészetét, kevésbé barátságos vagy intelligens állatokat taníthat be; akár vadállatokat is kiképezhet egyszerűbb munkákra, a háziállatokat már komolyabb feladatokra is oktathatja.",
      lvl_4: "A karakter már bármilyen kunszt betanítására képes az adott állat számára, feltéve, hogy az fizikailag képes rá. Ezen a szinten válik elérhetővé az állati harcostársak kiképzésének tudománya.",
      lvl_5: "Ezen a szinten már igazi kalandozó társat nevelhet a karakter a választott állatból, aki helyette őrködik, megvédelmezi, vagy intelligenciájának függvényében, megfelelő feladatokat hajt végre önállóan. Az állat és gazdája között egyfajta asztrális kapcsolat jön létre, amely nem nevezhető a szó szoros értelmében kommunikációnak, inkább afféle benyomások és hangulatok villanásnyi cseréjének."

    },
    {
      name: "Időjóslás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés", "Intelligencia"],
      description: "Az időjóslás ezer szempontból elengedhetetlen fontosságú Ynev világán is. A tengerészek életében a biztonság, hadjáratok esetén a győzelem, az utazók számára pedig a kényelem biztosítéka. Nem csoda hát, ha sokan igyekeznek kifürkészni az időjárás szeszélyeit, hogy megjósolhassák az eljövendőt. Ezer módszer létezik erre: az egyszerű, tapasztalatokon alapuló következtetések levonásától egészen a misztikus megoldásokig - mint amilyen a madarak röptének megfigyelése, vagy a leölt állatok belső szerveinek bűbájos megolvasása. Egyet azonban le kell szögeznünk. Ezek a módszerek igenis működnek.",
      lvl_1: "Egyenlőre még csak ismerkedik a karakter az időjóslás alapjaival. Maximum 1 napra előre képes előrejelzést felállítani, amely egy -1 módosítóval dobott sikeres Intelligenciapróba esetén pontos.",
      lvl_2: "A karakter már gyakorlottan állít fel helyes előrejelzést akár egy hétre előre is, sikeres Intelligenciapróba esetén.",
      lvl_3: "A karakter már gyakorlott és szakavatott időjós, rövid távú, két hetes előrejelzéseket készít, amelyek +1 módosítóval dobott Intelligenciapróba sikere esetén helyesek.",
      lvl_4: "Az időjóslás mesteri szintű alkalmazója már akár egy hónapra előre képes távlati előrejelzéseket készíteni, Intelligenciapróbáját +2 módosítóval dobja.",
      lvl_5: "A legendás időjós egy teljes év időjárását képes nagyjából előre jelezni, képes nyilatkozni egyes időjárás mágiák hosszabb távú kihatásairól, ha Intelligenciapróbáját +3 módosítóval sikeresen megdobja."

    },
    {
      name: "Kocsihajtás",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: ["Állatismeret"],
      hardReq: [],
      stats: ["Ügyesség"],
      description: "A karakter fogathajtó tudását jelenti ez a képzettség; kocsisok, udvaroncok, kereskedők, vidéki emberek sajátja. Leginkább a lovak húzta fogat vagy szekér hajtását jelenti, de ez a képzettség fedi a marhák, tevék stb. vontatta alkotmányok és a hatlovas úri hintók hajtását is.",
      lvl_1: "A karakter még a szerszámokkal és a kocsival is nehezen boldogul. A kocsit csak lassan és könnyű terepen tudja hajtani.",
      lvl_2: "Az ilyen fokon képzett kocsis már lassan biztosan hajt, akár nehezebb terepen is. Egyedül is képes befogni a lovakat.",
      lvl_3: "A képzett hajtó már nehéz terepen is képes közepes tempóval haladni, könnyű terepen akár gyorsan is. Érzékeli a kocsi hibáit, s a szakembert nem igénylő hibákat maga is kijavíthatja.",
      lvl_4: "A mesterien képzett karakter akár négyes- és hatos fogatok hajtására is képes. Járművét akár fegyverként is használhatja. A karakternek 5-30 körre van szüksége arra, hogy támadó helyzetbe navigálja magát. A kocsi TÉ-je 100, amihez a karakter Ügyességértéke is hozzáadódik, a megtámadott karakter a fegyvernélküli VÉ-jével védekezhet, illetve egy sikeres Gyorsaságpróbával ugorhat el a jármű útjából.",
      lvl_5: "A karakter kocsival való TÉ-je 150 + Ügyesség. Csodás kunsztokra képes, akár lépcsőzni is tud fogatával."

    },
    {
      name: "Lovaglás",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: ["Állatismeret"],
      hardReq: [],
      stats: ["Ügyesség"],
      description: "Széles körben elterjedt, igen hasznos ismeret, mely nem csupán lovakra, de bármely hátas állatokra alkalmazható. Igaz állatonként kell felvenni, de valamely lovagló stílus ismerete maga után vonja a többi ismeretét 1 fokkal alacsonyabb szinten. A karakter lóhátról csak a képzettség leírása szerinti, illetve a KM által engedélyezett képzettségeit használhatja, de maximálisan azon a fokon, amennyire a Lovaglás képzettséget ismeri.",
      lvl_1: "A karakter ismerkedik a lovaglással, csak lassú lépésben haladva képes nyeregben maradni.",
      lvl_2: "A gyakorlottabb lovas már szabályosan képes ügetni hátasával.",
      lvl_3: "A szakavatott lovas már vágtázik, akár nyeregből harcolni, íjászkodni is tud, természetesen csak 3. fokon alkalmazhatja ezeket a képzettségeket, illetve sújtja Harc mozgó lóról helyzeti módosító CÉ levonása.",
      lvl_4: "A mesteri lovas ezen a szinten már megkapja a Harc mozgó lóról bonuszait, illetve nem sújtja a CÉ levonás.",
      lvl_5: "A karakter lovagló tudása már legendás ezen a szinten, ördögi lovas, hátasa plusz egy támadást kap körönként, illetve az állat is meglopja a Harc mozgó lóról módosítókat saját értékeikhez."

    },
    {
      name: "Nyomolvasás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A képzettség leginkább vadászok, felderítők, nyomolvasók tudománya. Segítségével nyomokat, jeleket találhat, illetve ismerhet fel és értelmezhet a karakter. Képzetlenség esetén a KM joga eldönteni, hogy a karakter dobhat-e egyáltalán Érzékeléspróbát, és ha megtalálja a nyomokat, ki tud-e egyáltalán hüvelyezni belőlük valamit. A képzettség követelménye lehet a Vadonjárás megfelelő terepre vonatkozó ismerete, különleges bestiák esetén Állatismeret.",
      lvl_1: "Az alkalmazó felismeri az 1-2 óránál nem régebbi nyomokat. A nyomot akkor képes követni, illetve a helyes következtetéseket levonni, ha sikeres Érzékeléspróbát tesz -1 módosítóval.",
      lvl_2: "A gyakorlott nyomolvasó sikeres Érzékeléspróba esetén egy napnál nem régebbi nyomokat képes követni, ha ezt a terep lehetővé teszi. Az általa követett csoportok létszámát illetőleg csak becsléseket tehet.",
      lvl_3: "A szakavatott nyomkövető már nagyon nehéz (például sziklás) terepen is képes követni az egy napnál nem régebbi nyomokat, ha sikeres Érzékeléspróbát tesz +1 módosítóval. Könnyebb terepen pedig már néhány nap távlatából is képes ezt megtenni. Csoportok létszámára vonatkozó pontosabb becsléseket is felállíthat, esetlegesen azok haladási sebességére, leterheltségére is következtethet. A képzettség ilyen fokú ismerete esetén már képes saját, vagy társai nyomait is eltüntetni.",
      lvl_4: "A mesteri nyomolvasó akár egy hét távlatából is képes nyomokat követni, ha az időjárás, a terep vagy egyéb körülmények lehetővé teszik, ha sikeres Érzékeléspróbát tesz +2 módosítóval. Ezen a szinten már a nyomokból képes kikövetkeztetni nagy vonalakban az azokat hagyók legtöbb tevékenységét.",
      lvl_5: "A legendás nyomolvasó, ha a körülmények lehetővé teszik (zárt barlang, nem bolygatott épület belseje) - képes pontosan kikövetkeztetni az ott járt személyek számát, igen nagy pontossággal vázolja fel az általuk végzett tevékenységeket, ha sikeres Érzékeléspróbát tesz +3 módosítóval."

    },
    {
      name: "Szakma",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: [],
      description: "Ezen képzettség minden iparos és kézműves, földműves, vagy szellemi foglakozású ember sajátja, ismerete egy bizonyos szakma megfelelő szintű ismeretét takarja.\n\nA képzettség követelménye lehet a józanész megkövetelte bármely képzettség, ha szükséges, mint pl. az Intéző szakmához Számtan/mértan, Helyismeret stb. A Tulajdonság-követelmény szakmánként eltérő.",
      lvl_1: "A karakter kezdő tanonc, egyelőre jobban teszi, ha figyel.",
      lvl_2: "A karakter segéd egy mester mellett, az egyszerű folyamatokat ritka hibával végzi.",
      lvl_3: "A karakter a céh vagy társaság mesterembere, megbízható pontos munkát végez. A varázshasználathoz kellő szakmák (varázstárgyak készítése, drágakőmágia) is legalább ezt a szintet kívánják meg. Ezen a szinten már képes magát és családját eltartani munkájával, vagy egyes szakmák esetén akár nagy vagyonra is szert tenni, például ékkőcsiszoló, intéző, kereskedő.",
      lvl_4: "A karakter igazi mester szakmájában, igazi műremekeket készít, vagyonokat kereshet munkájával.",
      lvl_5: "A karakter mások számára érthetetlen módon és gyorsasággal, vagy minőségben dolgozik, művei mágia nélkül is már-már mágikus képességűek, igazi vagyonokat érő műalkotások. Más esetben pedig a rábízott vagyonokat kezeli úgy, kereskedik olyan szakértelemmel és sikerességgel, mely a józanész határait feszegeti."

    },
    {
      name: "Úszás",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Állóképesség", "Egészség"],
      description: "Ez a képzettség teszi képessé a karaktert arra, hogy ússzon, vagy legalább is tapossa a vizet alacsonyabb fok ismeretében. Képzettebb karakter esetén már viharos, vagy folyóvizekben is képes haladni.\n\nNehézvértezetben nem lehet úszni, a karakter azonnal elsüllyed.\n\nA felszerelés 20 ynevi fontonként 1-gyel csökkenti a képzettség alkalmazásának fokát, akárcsak a vihar vagy például az örvényes folyó.",
      lvl_1: "Az úszó csak egy helyben evickélni, illetve vízbe esés esetén kedvező körülmények esetén képes partra jutni, persze csak felszerelés nélkül vagy annak elvesztésével. A karakter legfeljebb Állóképességének megfelelő számú percig tud lebegni a felszínen, ha addig nem ér partot, akkor percenként Állóképesség próbát köteles dobni, alkalmanként -1 módosítóval nehezítve, ha elvéti elfárad és elsüllyed.",
      lvl_2: "A karakter már tud úszni, legfeljebb annyiszor öt percig, amennyi az Állóképessége. Ha addig nem ér partot, akkor percenként Állóképesség próbát köteles dobni, minden alkalommal -1 módosítóval nehezítve, ha elvéti elfárad és elsüllyed",
      lvl_3: "A hivatásos úszó már teljes felszerelésben is képes egy-két métert úszni, kedvező körülmények között. Annyiszor tíz percig képes felszerelés nélkül úszni, amennyi az Állóképessége. Tízpercenként köteles Állóképesség próbát dobni, ha túllépné az időhatárt, minden alkalommal -1 módosítóval nehezítve, ha elvéti elfárad és elsüllyed.",
      lvl_4: "A fáradhatatlan úszó annyiszor félórán át képes úszni a fent vázolt körülmények között felszerelés nélkül, amennyi az Állóképessége. Majd húszpercenként köteles Állóképesség próbát dobni, ha túllépné az időhatárt, minden alkalommal -1 módosítóval nehezítve.",
      lvl_5: "A karakter majdhogynem természetes közege a víz, annyiszor egy órán át képes úszni a fent vázolt körülmények között felszerelés nélkül, amennyi az Állóképessége. Majd félóránként köteles Állóképesség próbát dobni, ha túllépné az időhatárt, minden alkalommal -1 módosítóval nehezítve."

    },
    {
      name: "Vadonjárás",
      skillType: "Világi",
      skillDifficulty: "II",
      softReq: ["Állatismeret", "Herbalizmus"],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A képzettség a természet, illetve egy táj vonásainak jellegének ismeretét jelenti. Olyan tudás, melynek segítségével a karakter eligazodik az adott terepen, ismeri a ragadozókat, a zsákmányállatokat, tudja, mitől kell tartania és mitől nem. Megleli az ehető növényeket, mint ahogy felismeri a mérgezőeket is. Ismeri az adott terület életének ritmusát, képes hosszabb ideig életben maradnia az adott terepen. A területet tájanként kell felvenni, mint például füves síkság, esőerdő vagy épp hegyvidéki terep stb.",
      lvl_1: "A karakter még csak ismerkedik az adott terep formáival, színeivel. Könnyen veszélybe sodorhatja magát, egyelőre még csak egy-két napig képes létezni anélkül, hogy bármiben különösebb hiányt szenvedne.",
      lvl_2: "Az ilyen fokú ismerője az adott terepnek már sejti az itteni életforma rejtelmeit, képes akár egy hétig is életben maradni.",
      lvl_3: "Az ilyen szinten képzett személy már igazi túlélő, képes életben maradni akár egy hónapig is az általa ismert tereptípuson külső segítség, azaz bármilyen felszerelés nélkül. Alapvető eszközökkel akár saját magán kívül még egykét, embert is eltarthat. A terepen a képzetlen karaktereknél 10%-kal gyorsabban halad.",
      lvl_4: "A vadonjárás mestere már nem csak a túlélés fortélyairól, de az őslakos lényekről, illetve misztikus szörnyetegekről is beható tudással bír. Már korlátlan ideig képes eltartani magát a természetben. A terepen a képzetlen karaktereknél 20%-kal gyorsabban halad.",
      lvl_5: "Legendás hírű túlélő, már akár egy kisebb csoportot (max. 2-6 főt) is képes eltartani az általa ismert terepen, akár korlátlan ideig. Az adott területen a képzetlen karaktereknél 30%-kal gyorsabban halad."

    },
    {
      name: "Akrobatika",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Erő","Ügyesség"],
      description: "E Képzettség jelképezi karakter egyensúlyát, stabilitása, akrobatikus képességét, valamint, hogy milyen magasra vagy messzire tud ugrani. Gyakorlása során egyaránt szükség van az Ügyességre és az Erőre.\n\nA felszerelés 20 fontonként 1-gyel csökkenti a Képzettség aktuális fokát, akárcsak a zavaró környezet: szűk helyen, vagy éppen térdig futóhomokban senki sem hagyatkozhat pusztán az akrobatikus harcmodorra, a mély víz pedig teljesen ellehetetleníti a használatát. Sikeres képzettségpróbával fokonként legfeljebb 40 hüvelyk magasra, vagy 60 hüvelyk távolra ugorhat helyből, amely távolság nekifutás után a háromszorosára növekedhet.\n\nA fenti távolságok közepes méretű lények esetében értendők.",
      lvl_1: "A Képzettséget ezen a fokon ismeri minden gyermek, aki szeret kisebb árkokat átugrani, vagy átlendülni a szomszéd falán pár édesebb almáért. Mozgása meglehetősen labilis. Nem áll biztosan a lábán, ha hirtelen mozdulatsorokat vagy hosszan tartó koncentrációt követelő mozgásokat kell végrehajtani. Ne egyensúlyozzon kötélen vagy imbolygó erkélyeken...",
      lvl_2: "A legtöbb harci iskola a tudásnak e fokát követeli meg. Vetődései, pördülései nélkülözik a harmóniát, de harcban már hasznukat láthatja.\nSikeres Akrobatika-Harctéri gyakorlat ellenpróba után +5-öt adhat VÉ-jéhez, feltéve, ha elegendő hely van a támadások elől félreugrani. (Amennyiben több ellenféllel küzd, a próbát a leggyakorlottabb - legmagasabb Harctéri gyakorlattal rendelkező - ellen köteles tenni.",
      lvl_3: "Képzett akrobata, aki nemesi házakban vagy királyi udvarban biztos megélhetésre lelhet. De ha úgy akarja akkor ismeretét bármely vándorcirkuszban is kamatoztathatja. Magabiztosan, harmonikusan mozog, nem jelentenek neki különösebb akadályt a bonyolult, esetleg akrobatikus mozdulatsorok, a legnagyobb tengeri viharban is megmarad a talpán, s nem esik kétségbe, ha különféle tárgyak elől kell elmozognia.\n\nA VÉ módosító 10 pontra emelkedik.",
      lvl_4: "Mesteri akrobata, aki lélegzetelállító mutatványokra képes, akár ugrások, szaltók, vagy kötéltánc terén. A Képzettség mestere gyakorta kap meghívásokat mutatványosoktól, vagy megfelelő egyéb ismeretek birtokában színésztársulatoktól, színházakból, hisz’ bemutatóinak már szinte művészi értéke van.\n\nHarcban kiszámíthatatlan pördüléseivel, villámgyors elhajlásai és szaltói jócskán megnehezítik ellenfele dolgát. Ha sikerrel kamatoztatja tudását, a VÉ-je 15-tel nő.",
      lvl_5: "Mozgása akár egy nagymacskáé: kifinomult és harmonikus. Pördüléseire, szaltóira szinte nem is koncentrál, az összetett mozdulatsorok oly’ könnyen mennek neki, mint másnak a járás. Mesterségéből tisztesen és könnyedén megélhet.\n\nHarcban mozgása kiszámíthatatlan. Lélegzetelállító precizitással hajol, ugrik, és pördül el a csapások elől. VÉ-je sikeres ellenpróba után immár 20 ponttal emelkedik."
    },
    {
      name: "Esés",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Ügyesség"],
      description: "A karakter a képzettség birtokában képes lehet ügyesen kigurulni, tompítani az eséseket. Ha nagyon magasról zuhan, és érti a módját, hogy a keze ügyébe akadó rögzített tárgyak segítségével fékezheti, vagy akár meg is állíthatja a zuhanást.\n\nEzek a képességek kalandozások során sok felesleges sebesüléstől és fájdalomtól kíméli meg birtokosukat.\n\nSikertelen próba esetén, a zuhanásból származó sebzés képzettség fokonként 2, sikeres próba esetén fokonként 5 ponttal csökken.\n\nHa a levonással a sebzés értéke nulla vagy az alá esik, akkor a karakter nem zuhan a földre, valamilyen módon sikeresen megállította a zuhanását.\n\nA felszerelés 20 fontonként 1-gyel csökkenti a Képzettség aktuális fokát.",
      lvl_1: "A karakter az esés közben könnyen pánikba esik. Legtöbbször gyors, és hirtelen mozdulatokkal próbálja a zuhanás erejét csökkenteni, ami legtöbbször csak arra elég, hogy a sérülésektől a fejét megvédje.",
      lvl_2: "Frissen képzett harcos, aki alól gyakorta söpörték ki a lábát. Nem esik pánikba és nem kapkod rémületében hiábavaló segítség után - az csak nagyobb bajt okozna - hanem begyakorolt és biztonságos mozdulatsorokat alkalmaz a zuhanás, esés közben.",
      lvl_3: "A karakter meglehetősen jól képzett e mesterségben. Zuhanás közben gyors helyzetfelismerésének köszönhetően hatékonyan használja fel a keze ügyébe akadó tárgyakat, hogy lefékezze magát, esetleg teljesen megállítsa zuhanását.",
      lvl_4: "Megannyi gladiátorviadal győztese, aki többször zuhant a homokba, és csapdavermekbe, mintsem azt megszámolni tudná, végül mégis győzedelmeskedett.",
      lvl_5: "Legendás mester, aki egy kútba zuhanva, a kövek összeillesztésénél keletkező résekbe bele-belekapaszkodva is képes fékezni, sőt, kis idő múltán akár a falhoz tapadva meg is állítani az esést."
    },
    {
      name: "Mászás",
      skillType: "Világi",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Erő", "Ügyesség"],
      description: [
        "A Képzettség a fák, falak, sziklaormok megmászásához szükséges jártasságot fedi. Az igazán gyakorlott falmászók hihetetlenül sima felületeken is képesek kapaszkodót, támaszt találni, így fürgén és biztosan kúsznak fel az átlagember számára megmászhatatlannak ítélt meredélyeken is.","Nem jelentenek számukra akadályt a várak, lakóházak falai, a függőleges, vagy akár kifelé dőlő sziklák sem.\n\nA Mászás leginkább a tolvajok és fejvadászok sajátja, de sokan űzik még magas szinten.","A felszerelés 20 fontonként 1-gyel csökkenti a Képzettség aktuális fokát.\n\nA módosítók nélküli Mászás dobás olyan fára, falra, meredélyre vonatkozik, mellyel egy képzett átlagember is megbirkózik. Átlagos nehézségűnek minősül a függőleges, egymásra rakott dinnyényi kövekből halmozott várfal, ahol a kiálló kövek, és a repedések sűrű és könnyű kapaszkodót kínálnak. A karakter minden megtett 25 láb, vagy 3 perc tétlen kapaszkodás után próbát kell tegyen, így egy 50 láb magas várfal leküzdése két sikeres próbát igényel. Sikertelen próbálkozás esetén, feltéve, hogy a karakter nem volt valamilyen módon biztosítva, számolhat a zuhanásból származó sérülésekkel. Folyamatosan annyi percen át képes mászni a karakter, amennyi az Állóképessége. Aki mászik, kiszolgáltatott helyzetbe kerül. Ekkor a Harc helyhez kötve szabályai vonatkoznak rá.",
        "Az alábbi táblázat megmutatja, hogy egy kör alatt hány ynevi láb távolságot képes a felsorolt körülmények között megtenni a mászó.",
        "table:Felszín\tYnevi láb/kör\tPróba módosítója\n\nCsúszós, síkos felület\t0,1\t-80 %\n\nTeljesen sima felület\t0,1\t-50 %\n\nRepedezett felület\t0,5\t-15 %\n\nDurva felület\t0,5\t0\n\nKiszögelléses felület\t0,5\t+5 %\n\nFerde fal\t1\t+15 %\n\nKötél\t2\t+40 %\n\nFa\t3\t+30 %"
      ],
      lvl_1: "A szántóvető fia, aki képes felmászni a fára a meggyért.",
      lvl_2: "Frissen képzett tolvaj, aki már megbirkózik egy mászható nyolc-tíz lábnyi fallal.",
      lvl_3: "Jól képzett fejvadász, aki gyakran kihasználja a magaslatok nyújtotta előnyöket, így egy nehezen mászható fal sem jelent neki akadályt.",
      lvl_4: "Mesterkém, aki az éjszaka sötétjében hág fel szédítő várfalakra.",
      lvl_5: "A karakter kezei akár az acélsatuk, lábával bármilyen apró rést megtalál: bármilyen feladattal megbirkózik, ami fizikailag lehetséges."
    },
    {
      name: "Veszélyérzék",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A karakter összeszedett figyelmét, képzett megfigyelőkészségét %-ban mérő képzettség, tolvajok, fejvadászok, testőrök sajátja. A kezdők 20, hivatásos, alaposan megfizetett társaik majd 60-70%-kal rendelkeznek.",
      lvl_1: "Fiatal utcagyerek. Környezetét csak felszínesen figyeli meg, és jó eséllyel téves " +
        "következtetésre jut. Ezek az illetők gyakran kiáltanak farkast a legártatlanabb helyzetben is, és így " +
        "könnyen céltáblájává válnak mások haragjának. „Megérzéseik” könnyedén megcsalhatják őket, s " +
        "leggyakrabban még az egészen félreérthetetlen jelek mellett is gond nélkül elmennek.",
      lvl_2: "E fok a képzett tolvajok, fejvadászok sajátja. A karakter már körültekintőbben vonja le " +
        "következtetéseit, hiszen elegendő tapasztalata van, hogy milyen következményekkel jár, ha elsiklik " +
        "bizonyos jelek mellett, vagy tévútra jut. Ők már könnyebben „olvasnak” a körülöttük állók " +
        "mozdulataiból, egy-egy tárgy elhelyezkedéséből, esetleges hiányából.",
      lvl_3: "Igazi kalandor, vagy alaposan megfizetett testőr. Néha már maga is elhiszi, hogy minden mögé " +
        "belát, s a legsötétebb szándékról is könnyen lerántja a leplet. Ha nem elbizakodottsággal kezeli " +
        "tudását, valóban hasznára válik, különösen, ha nem kudarcként éli meg egy téves döntéseik " +
        "következményeit.",
      lvl_4: "A karakter már nem csupán a környezet helyes elemzésére képes, de „ráérezhet a leselkedő " +
        "veszélyekre, s ha nem is képesek pontosan meghatározni annak jellegét vagy mértékét, intuícióik " +
        "még gyakran hagyják cserben őket.\n\n" +
        "Tapasztalatait, hallomásból szerzett tudását felhasználva jó eséllyel felmérheti mindazon helyeket, " +
        "ahol nagyobb valószínűséggel kereshetők rejtekhelyek és csapdák. Tudja, hogy az adott vidéken hol " +
        "készítenek előszeretettel átjárókat, milyen típusú álcázásokat alkalmaznak a mesterek, milyenek a " +
        "jellemző csapdák és hol szokták azokat elhelyezni. Ha rejtekhelyet, vagy csapdát keresett, és " +
        "dobása sikertelen volt, akkor egy tíz perces kutakodás után újra dobhat, de csak egy alkalommal.",
      lvl_5: "A karakter minden komoly veszélyt, fenyegetést jelentő esetben próbadobást " +
        "tehet, még akkor is, ha azt a játékos nem jelenti be előre. Az ilyen szintű tudás szinte " +
        "megmagyarázhatatlan, afféle hatodik érzék, a rengeteg tapasztalat eredménye.\n\n" +
        "A rejtekhelyek terén már közvetett következtetéseket tehet az a vizsgált szoba, tárgy kialakítása, " +
        "elrendezése alapján, és megsejtheti, hogy a mesterek milyen szempontok alapján választják ki a egy " +
        "rejtekhely, vagy csapda végleges helyét. Amennyiben az első próbadobása sikertelen volt, ötpercnyi " +
        "újabb tanakodás után ismét dobhat.\n\n" +
        "Az Éberség nem alkalmazható távoli fenyegetéssel kapcsolatban: nem fogja jelezni egy egyén " +
        "hirtelen hangulatváltozásait, egy politikai lépés vagy bármilyen cselekedet következményeit."

    },
    {
      name: "Csapdakeresés",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A csapdák felkutatásának képessége %-ban mérve. A képzettség 30%-os ismerete még zsenge kezdőt jelent, az igazi kalandorok és tolvajok képessége 50% felett mozog.",
    },
    {
      name: "Rejtekhelykutatás",
      skillType: "Alvilági",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Érzékelés"],
      description: "A karakter titkosajtó- és egyéb rejtekhelykutató képessége %-ban mérve. A perlekedő, házsártos feleség, ki ura eldugott pálinkáját rendszeresen felkutatja 20%-kal bír, míg egy képzett besurranó már 60%-ot is birtokolhat.",
    },
    {
      name: "Alkímia",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: [],
      hardReq: ["Számtan/Mértan"],
      stats: ["Intelligencia"],
      description: "Az alkímia célja a Príma Matéria, azaz a Bölcsek Kövének előállítása, a Dicsőséges Transzmutáció. No persze mágiával mindez jóval könnyebb, de az alkímia nem csak egy tudomány, hanem világnézet is, és ha szükséges hasznos segítőtárs az avatott elme kezében.",
      lvl_1: "A kezdő alkimista gyenge savakat (Sebzés: 0) kellemetlen anyagokat ismer és képes előállítani.",
      lvl_2: "A gyakorlottabb tudós fő már közepesen erős savakat (1 pohárnyi anyag 1k3 sebzés okoz 1 körig) illetve gyengébb serkentőket, oldószereket és konzerváló hatású anyagokat képes előállítani. Kezdi átlátni az anyagok szerkezetét.",
      lvl_3: "A hivatásos alkimista már ismeri az erős savakat (1k6 Sp sebzést okoz 1 pohárnyi anyag 1k6 körig, körönként), képes narkotikumokat és bájitalokat főzni, illetve akár világító oldatokat is, melyek kísérteties zöldes, kékes fénnyel izzanak akár fertályórán át. Vagy bármiféle kártékony vagy hasznos szert, melyet a KM engedélyez.\n\nA képzettség ezen szintje szükségeltetik a Természeti anyagi mágia tanulmányozásának megkezdéséhez, az 1. anyagcsoportba tartozó anyagok teremtéséhez, formázásához és átváltoztatásához.",
      lvl_4: "A híres alkimista harci narkotikumokat gyárthat, melyek képességnövelése nem haladhatja meg a harc kábultan helyzet módosítóit, természetesen pozitív irányba értelmezve (KÉ: +10, TÉ: +20, VÉ: +10) és tíz-húsz percnél tovább nem hatnak.\n\nTermészeti anyagi mágia szempontjából fontos, hogy' a karakter immáron képes a 2. anyagcsoportba tartozó anyagok teremtésére, átváltoztatására és formázására is.",
      lvl_5: "A legendás alkimista, tudós már mágia alkalmazása nélkül is képes a Természeti anyagi mágia első két csoportjába tartozó anyagokat egymásba átalakítani korlátozások nélkül, ha van elég ideje és elég nagy laboratóriuma.\n\nTermészeti anyagi mágia szempontjából fontos, hogy a karakter immáron képes a 3. anyagcsoportba tartozó anyagok teremtésére, átváltoztatására és formázására is."
    },
    {
      name: "Élettan",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: ["Írás/Olvasás"],
      hardReq: [],
      stats: ["Intelligencia"],
      description: "Az alacsonyabb szinteken még csak a humanoidok anatómiája, később a szervezet működése kerül ismertetésre ezen képzettségen belül. Lénycsoportonként kell felvenni a képzettséget: pl. humanoidok, emlősök, gyíklények stb...",
      lvl_1: "A kezdő anatómus még csak sejti a belső szervek és izmok elhelyezkedését, a csontok pontos alakját.",
      lvl_2: "A karakter már képzett anatómusnak mondható az adott lénycsoporton belül.",
      lvl_3: "A képzettség ezen fotónak birtokosa hivatásos boncnok, bepillantást nyer az életfolyamatok működésébe.\n\nA karakter, ha a Nekromancia tudományával akar foglalkozni, akkor a képzettség ezen foka elengedhetetlen a számára.",
      lvl_4: "A tudós mester tisztában van a szervek működésével, a testnedvek szerepével.\n\nHa a karakter bír a megfelelő varázserővel, akkor megértve az élőlények felépítésének módozatait, akár egyszerűbb homonkuluszok megalkotására is képes.",
      lvl_5: "A legendás tudós akár már mágia nélkül is képes élő szervezeteket alkotni, de ezek csak alig egykét órát létezhetnek, s nem lehetnek nagyabbak egy kutyánál, mert hiányzik belőlük az élet princípiuma.\n\nA Varázstudó (anyagi mágus, nekromanta) karakterek igazi lényeket alkothatnak, mely egy újszülött elméjével születnek és magatehetetlenek, igazi lélekkel nem bírnak, mégis néhány esztendeig életképesek. Puszta létezésük is sok egyház és a Pyarroni Varázsló Tanács ellenszenvét váltja ki. A képzettség ezen szintű birtokosának, ha kiderül, hogy efféle lényt alkotott valószínűleg hamarosan menekülnie kell... Épp ezért nem köztudott, hogy egyeseknek már sikerült értelemmel bíró, hosszabb életű lényt alkotni, mely szaporodni ugyan nem képes, mégis tökéletes teremtmény. Egyesek Észak tudósfői közül efféle eseményeket gyanítanak az udvari örkök megjelenése mögött is."

    },
    {
      name: "Építészet",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: ["Írás/Olvasás"],
      hardReq: ["Számtan/Mértan"],
      stats: ["Intelligencia"],
      description: "Az építészet épületek, nagyobb méretű alakzatok emelését jelenti kőből, fémből, vagy fából. A képzettség komoly statikai és némi építészettörténeti ismeretet is takar, ami Történelem, vagy Legendaismeret képzettséggel párosulva komoly tudást adhat a karakter kezébe.",
      lvl_1: "A kezdő építész gyakorlati tudása egy kezdő kőművesé, művészettörténeti ismeretei a saját korára és kultúrkörére terjednek ki.",
      lvl_2: "A gyakorlott segéd tapasztalati tudása már egy egyszerű iparosé, ácsé, kőművesé. Ellenben egy épületről már nagyjából komolyabb véleményt alkot: mely kultúra emelte és körülbelül mely században.",
      lvl_3: "Az építész, kisebb épülteket tervez és nagyobb építkezéseket is levezethet már kész tervek alapján, képzettsége miatt Rejtekhelykutatás Képzettsége 10%kal hatékonyabb.",
      lvl_4: "A híres építőművész már minden humán kultúra építészetét ismeri a Hetedkorból, s nagyobb alakjairól is tud eztazt. Komolyabb épületek, kastélyok várak, nagyobb?\n\nhidak megtervezését is vállalhatja kockázat nélkül. Képzettsége miatt a Rejtekhelykutatás képzettségre +20%ot kap.",
      lvl_5: "A legendás építész már művészi fokra fejlesztette az építészetet. Katedrálisokat, uralkodói palotákat emel, új stílusokat talál ki, új technikákat eszel ki és alkalmaz. Képzettsége folytán +30%ot kap a Rejtekhelykutatás képzettségére."

    },
    {
      name: "Herbalizmus",
      skillType: "Tudományos",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: ["Intelligencia"],
      description: "A gyógyfüvek és ártalmas gizgazok ismerője, aki e képzettséggel bír. Tudja, mi milyen nyavalyát gyógyít, mi ehető, mi segít, vagy mi hallgattatja el az embert végleg.",
      lvl_1: "A karakter ártalmas és gyógyító kenőcsöket, főzeteket egyaránt készíthet, ezek csak lenyelve vagy nyílt sebbe kenve hatásosak és nagyon gyenge 0. szintű méregként funkcionálnak a KM belátása szerint. Az általa készített anyagok a sebek elfértőződésének esélyét nullára csökkenthetik.",
      lvl_2: "A karakter kezelte sebek Fp gyógyulása a kétszeresére gyorsul, 1. szintű betegségeket is gyógyíthat.",
      lvl_3: "A herbaiista által kezelt Ép sebek gyógyulása, a kétszeresére gyorsul, 2. szintű betegségeket is gyógyíthat. A karakter már 0. szintű komolyabb hatású mérgeket is előállíthat, ekkor már étel és italmérgeket is a KM belátása szerint.",
      lvl_4: "A karakter által kezelt sebek Fp gyógyulása a háromszorosára gyorsul, 3. szintű betegségeket is gyógyíthat.",
      lvl_5: "A karakter által kezelt sebek Ép gyógyulása a háromszorosára gyorsul, 4. szintű betegségeket is gyógyíthat."

    },
    {
      name: "Írás/olvasás",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: [],
      hardReq: ["Nyelvtudás"],
      stats: ["Intelligencia"],
      description: "A betűvetés és az olvasás tudománya, magasabb fokú ismerői a kalligráfia alkalmazói.",
      lvl_1: "A karakter még nem tud írni, csupán olvasni, azt is csak lassan és nehézkesen. Bármennyire erőlködik, általában többszöri olvasásra érti meg a szöveget.",
      lvl_2: "A képzettség ezen fokának birtokosa már szinte folyékonyan olvas, betűi még gyermeki ákombákomok, természetsen csak az általa beszélt nyelvek alfabétikumát használhatja.",
      lvl_3: "A hivatásos tollnokok szintje, elsajátítója folyékonyan olvas és olvashatóan, gyorsan ír. Általában valamely nemes úr vagy valamelyik egyház szolgálatában álló írnok.",
      lvl_4: "A híres tollforgató az összes humán nyelv ábécéjét felismeri, s azokat, ha beszéli az adott nyelveket, használni is tudja. Betűi szépek, formásak igazán mutatós okleveleket és iratokat készíthet, illetve ha bírja a Művészetek (Rajzolás) képzettséget, akár iniciálékat is alkothat.",
      lvl_5: "A karakter villámolvasással a KM belátása szerint képes akár félpercenként is végezni egy teljes, nagyméretű oldal szöveggel, illetve képes alkalmazni a gyorsírást, mellyel normál beszédtempójú szöveget képes lejegyezni."

    },
    {
      name: "Jog/törvénykezés",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: ["Írás/Olvasás"],
      hardReq: ["Kultúra"],
      stats: ["Intelligencia", "Asztrál"],
      description: "A kódexbe foglalt, szájhagyományban terjedő törvények, szokásjogok ismerete és alkalmazásuk, illetve megalkotásuk tudománya.",
      lvl_1: "A karakter már eligazodik az országa, szülőföldje törvényei között, akár már magát is képviselheti egy tárgyaláson, egyelőre még nem túl sok sikerrel.",
      lvl_2: "Az olvasottabb személy szülőhazája törvényeiben már igen gyakorlott, s egy általa választott rend vagy testvériség, esetleg céh belső törvénykezésében is járatos.",
      lvl_3: "A karakter már igazi jogász, hazája szomszédos kultúráiban is járatos, de igazi, komoly munkát csak szülőföldjén képes végezni.",
      lvl_4: "A híres jogtudor már igazi törvényalkotó, nem csak alkalmazza, de már át is látja a törvények kialakulásának és működésének dinamikáját, az összes általa ismert kultúrában képes alkalmazni tudását.",
      lvl_5: "Általában a nagyobb, törvénykező uralkodók vagy reformer főurak sajátja, de legtöbbször a mögöttük megbúvó szürke eminenciások birtokolják ezen a szinten a képzettséget."

    },
    {
      name: "Legendaismeret",
      skillType: "Tudományos",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Kultúra"],
      stats: ["Intelligencia"],
      description: "A legendaismeret tudománya a karakter tárgyi tudását ismerteti az adott kultúrkör legendáiban, meséiben, s azt, hogy mennyire képes kihüvelyezni azok igazságtartalmát.",
      lvl_1: "A karakter már nem csak szülőföldje, de a környék legendáit is ismeri, Intelligenciapróbáját a legenda valóságtartalmának kiszűrésére -1 módosítóval dobja.",
      lvl_2: "A karakter már saját kultúrköre legtöbb legendáját ismeri, próbáját módosítók nélkül dobhatja.",
      lvl_3: "A karakter már kultúrköre minden legendáját ismeri, ezek helyi változataival együtt is, akár kategorizálásuk folytán egyéb információkat is nyerhet azok torzulásaiból. Próbáját +1 módosítóval dobja.",
      lvl_4: "A karakter már a kapcsolódó, szomszédos kultúrkörök legendáiba is belelát, s a népeket összekötő regéket is elemezheti, s alaposan ismeri azokat. Próbáját +2 módosítóval dobja.",
      lvl_5: "A karakter megbecsült tudós, képes akár ősi mítoszok valóságtartalmának kielemzésére is, ha bírja az adott kultúrát. Igazi mesékben élő ember, próbáját +3 módosítóval dobja."

    },
    {
      name: "Mechanika",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: [],
      hardReq: ["Számtan/Mértan"],
      stats: ["Ügyesség", "Intelligencia"],
      description: "A Mechanika egyszerre elméleti és gyakorlati alkalmazhatóságú tudomány. Ismeretével a karakter hétköznapi eszközök működésének titkába láthat bele, magasabb szinteken, pedig maga is tervezhet efféléket.",
      lvl_1: "A karakter csak nagyon kezdő szinten ismeri a tudományt, csak egyszerűbb szerkezetek működési elvét ismeri fel, komolyabb gépezeteknél inkább mágiára gyanakszik. Új alkalmatosságot még nem tud tervezni.",
      lvl_2: "A karakternek már átfogó képe van a mechanikáról, az egyszerűbb szerkezetek működését már szétszedés nélkül értelmezi, s a bonyolultabbakról is egészen jó közelítésű véleményt alkot.",
      lvl_3: "A karakter tisztában van a tudomány alapvető szabályaival, hacsak az alkotó nem akarta elrejteni azt szem elől, akkor már szinte bármilyen nem mágikus gép működési elvét, szabályait felismeri. Bármilyen általánosnak mondható szerkezet megépítésére képes, mint mondjuk vízimalmok, ostromgépek.",
      lvl_4: "A karakter már igazi mérnök, zavarbeejtően kicsiny órákat, igen hatékony ostromgépeket, vagy épp más komolyabb mechanikus szerkezeteket épít. A tudomány mélyebb összefüggéseit is ismeri. Egyszerűbb mechanikus fegyvereket tervez, mint pl. tűvetők, vagy épp többvájatú, vagy tárral rendelkező nyílpuskák.",
      lvl_5: "A karakter már igen bonyolult rendszereket vázol fel, akár önjáró alkalmatosságok (gépszolga), vagy épp gondolkodónak tűnő (sakkgép) szerkezetek megalkotására is képes."

    },
    {
      name: "Oktatás",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: ["Lélektan"],
      hardReq: [],
      stats: ["Intelligencia", "Asztrál"],
      description: "A tanítás az egyike a legősibb tudományoknak, már a korai emberek sámánjai is elgyakoroltatták a vadászatott törzsük tagjaival.\n\nAz Oktatás képzettség birtokosai képesek könnyebben átadni azon képzettségeket, melyeket ismernek, de csakis azon fokig, ameddig saját maguk is bírnak az adott ismerettel. Emellett az Oktatás nyújtotta előnyöket is csak azon fok oktatásához képesek biztosítani tanulóik számára, amely fokon bírják az Oktatás képzettséget.\n\nTehát, ha Wilvaríen, a varázsló a csapat harcosát kívánja 3. fokú Oktatás képzettsége birtokában megtanítani írni és olvasni, akkor ezt megteheti, hiszen ő maga 4. fokon ismeri az írás/olvasás képzettséget. Ekkor képes legfeljebb 4. fokig képezni bajtárását, de a tanulás kp költségét csak a 3. fok elsajátításáig képes csökkenteni.\n\nHa nem bírna az Oktatás képzettséggel, tudását akkor is átadhatná 4. fokig, de ekkor a képzettség elsajátításának kp költsége nem csökkenne.",
      lvl_1: "A karakter már tisztában van az oktatás alapjaival, az általa tanított képzettség Kp költsége 1gyel csökken (de legalább 1).",
      lvl_2: "A kezdő tanár 2. fokú képzettségek átadására képes, a tanított képzettség Kp költsége 1gyel csökken (de legalább 1).",
      lvl_3: "A gyakorló tanár által oktatott képzettség Kp költsége 1gyel csökken (de legalább 1), Százalékos Jártasság esetén +1%-ot ad, minden a tanulni kívánt Százalékos képzettségre költött Kp után.",
      lvl_4: "A híres oktató által tanított képzettség Kp költsége 2vel csökken (de legalább 1), Százalékos Jártasság esetén +2%-ot ad, minden a tanulni kívánt Százalékos képzettségre költött Kp után.",
      lvl_5: "A legendás tanár, mester által tanított képzettség Kp költsége 3mal csökken (de legalább 1) Százalékos Jártasság esetén +3%-ot ad."

    },
    {
      name: "Orvoslás",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: [],
      hardReq: ["Lélektan", "Herbalizmus"],
      stats: ["Intelligencia"],
      description: "A gyógyítás, betegségek, sérülések orvoslása egyidős az ynevi civilizációkkal, s még a mágia egyeduralma mellett is igen szépen fejlődő, virágzó tudomány. A betegségek és mérgezések azonosításához Intelligenciapróba szükséges a leírásban szereplő módosítókkal.",
      lvl_1: "A karakter borbély; sebet varr, a fertőzések esélyét minimálisra csökkenti. Intelligenciapróbáját -1 módosítóval dobja.",
      lvl_2: "Az ilyen szinten képzett gyógyító 2. szintű betegségeket, mérgezéseket diagnosztizálhat és gyógyíthat. Az Fp és Ép sebek gyógyulását a kétszeresére gyorsítja. Intelligenciapróbáját módosító nélkül dobja.",
      lvl_3: "Igazi orvos, 3. szintű betegségeket, mérgezéseket diagnosztizálhat és gyógyíthat. Intelligenciapróbáját +1 módosítóval dobja.",
      lvl_4: "A karakter messze földön híres gyógyító. Az Fp és Ép sebek gyógyulását a háromszorosára gyorsítja, negyedik fokú betegségeket, mérgezéseket diagnosztizálhat és gyógyíthat. Intelligenciapróbáját +2 módosítóval dobja.",
      lvl_5: "A karakter már igazi csodadoktor. Ötödik fokú betegségeket, mérgezéseket diagnosztizál és gyógyít. Akár még végtagok visszavarrására is vállalkozhat. Intelligenciapróbáját +3 módosítóval dobja."

    },
    {
      name: "Ősi nyelv",
      skillType: "Tudományos",
      skillDifficulty: "IV",
      softReq: ["Írás/Olvasás"],
      hardReq: [],
      stats: ["Intelligencia"],
      description: [
        "A karakter valamely ősi nyelvben való jártasságát jelenti e képzettség, mind a beszélt nyelv egy átmeneti, kimentett formáját, mind pedig írásbeliségének tudományát.",
        "small:Humán kultúrák:\n\nCrantai, Északfölde első nagy emberbirodalmának nyelve, melyet a kyr hódítók tapostak sárba és feledésbe a birodalommal együtt. Főleg északi természeti népek nyelveiben fedezhetőek fel jövevényszavai, illetve egyes nagyobb könyvtárak titkos rekeszeiben találhatunk efféle nyelven íródott iratokat, melyek jórészt természetszellemek és a síkmágia, késő Cranta idején pedig a nekromancia titkaiba nyújthatnak bepillantás, írásmódja a kép és szimbólumírás érdekes keveréke.\n\nLupár és dolamin. A már Cranta ideje előtt, majd huszonötezer esztendeje itt élő nomád, majd földművelő népesség nyelve, amely először a crantai, majd a kyr uraknak behódolva őrizte meg majdnem eredeti formáját. írásbelisége csakis az uralkodó kaszt számára létezett, mely bukása nyomán a feledés homályába veszett. Jelenlegi ismert formája a Quironeia déli partját lakó lupárok és dolaminok rontást és balszerencsét űző csaska jelei, hurkai, melyeket még ma is alkalmaznak a partvidék tapasztalati mágiát űző sámánjai, boszorkányai. Megjegyzendő mindenesetre, hogy a helyi szájhagyomány állja a versenyt a kyr írásbeliséggel az általa átölelendő idő távlatában, és meglepő módon, kevéssé torzítja az ekképpen megőrzött tudást.\n\nGodon, a Délvidék első nagy emberek alapította varázslóbirodalma, melyet évezredes tündöklés után Krán taszított a nemlétbe. A pyarronita, LarDor városában tanult varázstudók mágikus nyelve, a godoni egyszerűsített változata. Az általa történő varázslás, csak a Mágikus fogékonyság előny felvételével, illetve a varázslóiskola elvégzésével válik lehetővé.\n\nInhumán kultúrák:\n\nAz óelf nyelv, a hatodkor előtt élt elfek misztikus hatalomtól átjárt nyelve, melyet csakis az elf királyságok valamelyikében, esetleg Haonwellben vagy Erionban tanulmányozhat a kíváncsi karakter.\n\nA nyelvben rejlő mágikus hatalom csakis tisztavérű óelfek számára elérhető. A játékos karakter csupán az emberelőtti történetírás kincseihez férhet közelebb általa. írásbelisége a hólyagírás.\n\nA kyr nyelv, a majd húszezer esztendeig virágzó kyr birodalom nyelve, mely kiforrottságában képessé tette a hódítókat Ynev jelenlegi egyik leghatalmasabb misztikus művészetének megalkotására. írásbelisége rúnák és jelek sorozata, a világegyetem mágikus leírása.\n\nÉszakfölde minden varázslóiskolája ezen nyelv és rúnáinak használatát oktatja, az általa történő varázslás csak a Mágikus fogékonyság előny felvételével, illetve a varázslóiskola elvégzésével válik lehetővé.\n\nAquir, a káoszt és halált szolgáló ősi népek, az Első, Másodkor szülte, más létsíkokról bevándorolt, romlott ősfajok összefoglaló neve, és az általuk használt valamennyire egységes nyelv elnevezése. Az isteni nyelvekhez legközelebb álló, főleg a pusztítás dialektusaiban elmélyedt varázsnyelv. A nyelvből eredő mágikus hatású hatalomszavak használatához a karakternek aquir vérű ősökkel kellene büszkélkednie, így használata játékosok számára nem elérhető.\n\nírásbelisége igen fejlett és sokrétű, a csak térben értelmezhető látványfeliratoktól, a szimbolikus értelmű festménysoroktól, a rúnaírásig bezárólag. A karakter valamely egyetemi könyvtár zárolt rekeszeiben, vagy a sötét birodalmak, Gorvik, Toron varázslóiskoláiban, esetleg valamely gonosz szekta szolgálatában tanulhatja a nyelvet és írásmódjait.\n\nTörpe, ÉszakYnev szorgos, dolgos népe, kikben viszonylag kevesen ismernék fel a kyrek előtti korok egyik hatalmas, az ómágiát még ma is birtokló fajainak egyikét.\n\nA híl nyelv ma már nem telítődik az ősök hatalomtól zengő, tárnákat rengető erejével, mégis nagy kincs birtokába juthat ezen nyelv ismerője, már ha a keményfejű törpék titkaikba avatják. Hiszen az északi historikusok rákfenéjétől, a Kyr Birodalom és utódállamainak elfogult történetírásától független, csak a törpékre jellemzően egyenes leírásokra és forrásokra bukkanhat az illető."
      ],
      lvl_1: "A karakter felismeri az adott nyelvet, ismeri néhány írásjelét, esetleg rettegettebb rúnái közül maximum egyetkettőt.",
      lvl_2: "A karakter lassan, betűnként olvassa a nyelvet, s egyszerűbb szövegeket még ugyan nagyobb hézaggal, de fordít is. Már biztos tudással bír a veszedelmes jelek nagy részéről.",
      lvl_3: "A karakter néha ugyan hibákkal, de írja az adott nyelvet és egyszerűbb szövegeket magabiztosan fordít. Ha létezik az adott nyelvnek ma is beszélt formája, annak legelemibb szavait megformálni is képes.",
      lvl_4: "A karakter töredékesen, bár de beszéli a nyelvet, bonyolultabb értekezések fordításával is megpróbálkozhat.",
      lvl_5: "A karakter már következtetni is bír bizonyos a szöveg származását, íróját érintő információkra, akkor is, ha a szövegben tartalmi utalás erre nem található. Afféle nyelvészeti, nyelvtörténeti háttértudást kap a kezébe a képzettség ezen szintű birtokosa.",
      special: "Humán kultúrák:\n\nCrantai, Északfölde első nagy emberbirodalmának nyelve, melyet a kyr hódítók tapostak sárba és feledésbe a birodalommal együtt. Főleg északi természeti népek nyelveiben fedezhetőek fel jövevényszavai, illetve egyes nagyobb könyvtárak titkos rekeszeiben találhatunk efféle nyelven íródott iratokat, melyek jórészt természetszellemek és a síkmágia, késő Cranta idején pedig a nekromancia titkaiba nyújthatnak bepillantás, írásmódja a kép és szimbólumírás érdekes keveréke.\n\nLupár és dolamin. A már Cranta ideje előtt, majd huszonötezer esztendeje itt élő nomád, majd földművelő népesség nyelve, amely először a crantai, majd a kyr uraknak behódolva őrizte meg majdnem eredeti formáját. írásbelisége csakis az uralkodó kaszt számára létezett, mely bukása nyomán a feledés homályába veszett. Jelenlegi ismert formája a Quironeia déli partját lakó lupárok és dolaminok rontást és balszerencsét űző csaska jelei, hurkai, melyeket még ma is alkalmaznak a partvidék tapasztalati mágiát űző sámánjai, boszorkányai. Megjegyzendő mindenesetre, hogy a helyi szájhagyomány állja a versenyt a kyr írásbeliséggel az általa átölelendő idő távlatában, és meglepő módon, kevéssé torzítja az ekképpen megőrzött tudást.\n\nGodon, a Délvidék első nagy emberek alapította varázslóbirodalma, melyet évezredes tündöklés után Krán taszított a nemlétbe. A pyarronita, LarDor városában tanult varázstudók mágikus nyelve, a godoni egyszerűsített változata. Az általa történő varázslás, csak a Mágikus fogékonyság előny felvételével, illetve a varázslóiskola elvégzésével válik lehetővé.\n\nInhumán kultúrák:\n\nAz óelf nyelv, a hatodkor előtt élt elfek misztikus hatalomtól átjárt nyelve, melyet csakis az elf királyságok valamelyikében, esetleg Haonwellben vagy Erionban tanulmányozhat a kíváncsi karakter.\n\nA nyelvben rejlő mágikus hatalom csakis tisztavérű óelfek számára elérhető. A játékos karakter csupán az emberelőtti történetírás kincseihez férhet közelebb általa. írásbelisége a hólyagírás.\n\nA kyr nyelv, a majd húszezer esztendeig virágzó kyr birodalom nyelve, mely kiforrottságában képessé tette a hódítókat Ynev jelenlegi egyik leghatalmasabb misztikus művészetének megalkotására. írásbelisége rúnák és jelek sorozata, a világegyetem mágikus leírása.\n\nÉszakfölde minden varázslóiskolája ezen nyelv és rúnáinak használatát oktatja, az általa történő varázslás csak a Mágikus fogékonyság előny felvételével, illetve a varázslóiskola elvégzésével válik lehetővé.\n\nAquir, a káoszt és halált szolgáló ősi népek, az Első, Másodkor szülte, más létsíkokról bevándorolt, romlott ősfajok összefoglaló neve, és az általuk használt valamennyire egységes nyelv elnevezése. Az isteni nyelvekhez legközelebb álló, főleg a pusztítás dialektusaiban elmélyedt varázsnyelv. A nyelvből eredő mágikus hatású hatalomszavak használatához a karakternek aquir vérű ősökkel kellene büszkélkednie, így használata játékosok számára nem elérhető.\n\nírásbelisége igen fejlett és sokrétű, a csak térben értelmezhető látványfeliratoktól, a szimbolikus értelmű festménysoroktól, a rúnaírásig bezárólag. A karakter valamely egyetemi könyvtár zárolt rekeszeiben, vagy a sötét birodalmak, Gorvik, Toron varázslóiskoláiban, esetleg valamely gonosz szekta szolgálatában tanulhatja a nyelvet és írásmódjait.\n\nTörpe, ÉszakYnev szorgos, dolgos népe, kikben viszonylag kevesen ismernék fel a kyrek előtti korok egyik hatalmas, az ómágiát még ma is birtokló fajainak egyikét.\n\nA híl nyelv ma már nem telítődik az ősök hatalomtól zengő, tárnákat rengető erejével, mégis nagy kincs birtokába juthat ezen nyelv ismerője, már ha a keményfejű törpék titkaikba avatják. Hiszen az északi historikusok rákfenéjétől, a Kyr Birodalom és utódállamainak elfogult történetírásától független, csak a törpékre jellemzően egyenes leírásokra és forrásokra bukkanhat az illető."
    },
    {
      name: "Számtan/Mértan",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: ["Írás/Olvasás"],
      hardReq: [],
      stats: ["Intelligencia"],
      description: "A Számtan/mértan tudománya igen hasznos és Yneven jóval ritkábban előforduló tudás, mint azt sejtenénk, hiszen a hétköznapi életben nem okoz fennakadást hiánya. Az egyszerű ember tapasztalataira támaszkodva vásárol a piacon, illetve arasszal, vagy lépésben méri ki a szükséges dolgokat. Ez a képzettség a pénzváltók, kereskedők, építő és alkimista mesterek sajátja. Segítségével magasabb szinteken a világ egész működésének leírását közelítő misztikus egyenletek közelébe is eljuthatnak.",
      lvl_1: "A karakter tisztában van a számjegyek sorrendjével, még papíros segítségével, de kivon, összead. A mértan alapjaival még csak ismerkedik, de már a hétköznapi életben is hasznát veszi, pl. a derékszög egyszerűbb kimérési módozatainak egy gerenda földbeállításakor.",
      lvl_2: "A karakter már osztani és szorozni is tud, igaz csak papíroson. Nem hozzák zavarba az egyjegyű számoknál nagyobb műveletek sem, maradéktalanul bírja az alapvető trigonometria tudományát.",
      lvl_3: "A karakter már kamatos kamatot is képes számolni, illetve tudásanyaga nagy részét fejben is el tudja végezni, munkája biztosabbá válik. Immáron a testek törvényszerűségeit, szabályait is ismeri.\n\nA Mozaikmágia térmágikus, időmágikus mozaikjainak használatához is a képzettség ezen fokának ismerete szükséges.",
      lvl_4: "A karakter már minden matematikai műveletekre vonatkozó ismerettel bír, azokat alkalmazza is. Mértanilag már röppályát számol, akár a szél beiktatásával, halmazokkal és folyamatábrákkal dolgozik.",
      lvl_5: "A karakter már bír a nagy egyenletrendszerek tudományával, matematikai becslések és jóslások felállítására képes, akár mondjuk hadjáratok sikerét illetőleg, ha bír a Hadvezetés képzettséggel.\n\nMértanilag korszakalkotó ötletei vannak, főleg a tapasztalati építészeti, mechanikai felhasználásokban, de páran a világegyetem, Ynev felépítésének titkait is feszegetik."

    },
    {
      name: "Térképészet",
      skillType: "Tudományos",
      skillDifficulty: "III",
      softReq: ["Művészetek"], //TODO: rajz
      hardReq: ["Számtan/Mértan"],
      stats: ["Intelligencia"],
      description: "Kezdetben hajósnépek, kereskedők, hadvezérek birtokolták e tudományt, majd egyre többen rájöttek a térképolvasás és készítés hasznosságára, s mostanság már virágzó, szerteágazó tudásanyaggal áll a köznép rendelkezésére is.",
      lvl_1: "A karakter még csak az egyszerűbb, legalapvetőbb kartográfiai jeleket ismeri fel, de azért egy primitívebb térképen némi üggyel-bajjal eligazodik.",
      lvl_2: "A gyakorlott térképész már az általa ismert nyelven íródott térképeket nagy biztonsággal használja, s maga is készíthet használható vázlatokat egy helyszínről vagy épp területről, de ezek még messze nem részletesek és a méretarány is hibázik néha.",
      lvl_3: "A hivatásos térképész már jól használható térképeket készít és a nem a saját nyelvén íródott térképekből is képes használható információkat kinyerni, amelyek gyakran azért eléggé pontatlanok. A képzettség ezen szintjén akár hajózva is képes felmérni egy partszakaszt.",
      lvl_4: "A tudomány mestere már minden műszert ismer, amelyet a térképészet alkalmaz, pontos és igen részletes térképeket készít, s igen jól navigál.",
      lvl_5: "A legendás hírű utazó már ritkaságszámba menő térképeket készíthet, akár útleírásokból is. A számára teljesen idegen jelekkel íródott térképeket is megfejtheti, ha elég ideje van rá."

    },
    {
      name: "Történelem",
      skillType: "Tudományos",
      skillDifficulty: "II",
      softReq: ["Írás/Olvasás"],
      hardReq: [],
      stats: ["Intelligencia"],
      description: "A karakter történelemtudását, és magasabb szinteken historikus elemző képességét jelenti ez a képzettség.",
      lvl_1: "A karakter csak saját kultúrköre nagyobb eseményeit, helyszíneit, személyeit ismeri. De a hazája történelmében felmerülő rejtélyekre sem tud még mit mondani.",
      lvl_2: "A tudomány ezen szintű birtokosa saját kultúrköre eseményeit már behatóbban ismeri, felidézhet történeteket, legendákat a nagyobb személyiségekről, a miértekkel még mindig nincs teljesen tisztában, de a kultúrkör egyes titokzatos rendjeiről, szervezeteiről már hallomásból tud dolgokat.",
      lvl_3: "A karakter igazi történész már behatóan ismeri kultúrköre történelmét, saját, legtöbbször helytálló véleménye is van a rejtélyekről, s a politikai mozgásokat is felismeri a történelmi szálak között. A kultúrkör egyik titkos szervezetének történelméről már homályos, de biztos alapokra épített tudása van.",
      lvl_4: "A legendáriumok mesteri, szakavatott ismerője, a karakter igazi történész, átlátja a politikai erővonalakat az események mögött. A történelmi folyamatok kimenetelére is lehetnek valószínűsíthető elképzelései. Kultúrköre minden titokzatos szervezetéről tud egy keveset, s a választott szervezet teljes történelméről beható ismeretekkel bír, ami adott esetben nem életbiztosítás.",
      lvl_5: "A legendás hírű tudós fő tisztában van minden kultúrkörébe tartozó nyílt és titkos szervezet történelmével jóllehet az utóbbiak közül néhány még számára is rejtély). Már nem csak elemzi, de meg is jósolhatja nagy valószínűséggel az eljövendőben lezajló folyamatok végkifejletét. Igazán érdekessé a hadvezetés képzettség társításával válik a karakter tudománya."

    },
    {
      name: "Vallásismeret",
      skillType: "Tudományos",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Kultúra"],
      stats: ["Intelligencia", "Asztrál"],
      description: "A képzettséget istenekre, vagy panteonokra kell felvenni. Alapszinten lexikális ismereteket, magasabb szinten már a szertartások levezetéséhez is elegendő tudást ad a képzettség. Egészen magas szinten pedig már hitvitákra, szekták, irányzatok vezetésére is vállalkozhat a karakter.\n\nAmennyiben a karakter igazán belső meggyőződéssel és vallását gyakorolva, annak szabályait betartva hisz, akkor, a KM engedélyével képes hitét védekezésül az őt támadó asztrál-, mentálvarázslatok ellen fordítani.",
      lvl_1: "A képzettséggel ismerkedő karakter már hallott az adott vallásról és ismeri alapvető törvényeit. A szertartásokat, fohászokat egy -1 módosítóval dobott Intelligenciapróbával ismerheti fel, ha a halló, illetve látótávolságán belül tartózkodik a kiszemelt pap vagy paplovag.",
      lvl_2: "A közeli tapasztalatokkal bíró karakter már részt vett jónéhány szertartáson és felismeri az egyszerűbb elemeit a liturgiának. A szertartásokat és kegytárgyakat egy módosítók nélkül dobott Intelligenciapróbával ismerheti fel.\n\nA beavatott karakter immáron nem csak saját istensége, de más szférák urai által gyakorolt hatalmat is képes beazonosítani, azaz fogalmat alkotni más istenek papjai által bemutatott varázslatokról, ha járatos az adott kultúrában. Ebben az esetben sikeres Intelligenciapróbával azonosíthatja a létrehozott fohászt.\n\nTermészetesen ez alól kivételt képeznek a különböző egyedi varázslatok.",
      lvl_3: "A karakter rendszeresen gyakorolja vallását és aktív egyházi életet él, rendszeresen meghallgatja, és magáévá teszi a szertartásokon elhangzottakat, részt vesz laikusként az egyház működésében. A szertartásokat és kegytárgyakat egy +1 módosítóval dobott Intelligenciapróbával ismerheti fel.\n\nHa karakter bír a Kegyelt előnnyel, akár istene papja is lehet. A karakter a Kegyelt előny birtokában az adott istenség varázslatait alkalmazza és képes a Kegy pontjai által megengedett varázslatokat a Szakrális mágia fejezetben leírtak szerint létrehozni.\n\nA pap, vagy paplovag a képzettség ezen fokán minden Tapasztalati szinten (már az elsőn is) +1 Kegy pontot nyer hitéből. Az így nyert Kegy pontok esetén mindig az adott szinten aktuális képzettség fok számít. Tehát, ha Assero atya 4. ről 5. Tsz.re lépve felveszi a képzettség 5. fokát, s eddig csak a 4. fokkal bírt akkor immáron már majd minden szintlépéskor innentől kezdve 3 plusz Kegy pontot kap. Ez azonban nem befolyásolja a korábban kapott Kegy pontjai számát.\n\nHa a karakter igazán erős hittel bír, akkor szintenként 1 pont járul az Asztrális és Mentális TMEhoz. Ezt a fajta védelmet nem lehet lerombolni, csakis akkor, ha a karakter hitét képesek megingatni. A Statikus pszi pajzsokkal ellentétben ez a fajta védelem képes lebontása nélkül is beengedni a varázslatokat, ha a játékos ezt kívánja.\n\nA képzettség szakavatott ismerője az Intelligenciapróbáját +1 módosítóval dobja, a fenti megkötések továbbra is érvényesek. Sikeres próba esetén a KM belátására bízva, akár a fohász hátrahagyta jelekből is kiolvashat némi információt.",
      lvl_4: "A hírneves hittantudós az adott vallás nagy ismerője, akár hitvitákban is részt vehet. A szertartásokat, kegytárgyakat, esetleges ismertebb ereklyéket és eretnek tanokat, a Szakrális mágia fohászait egy +2 módosítóval dobott Intelligenciapróbával ismerheti fel.\n\nA karakter a képzettség ezen fokán már hitéből eredően, szintenként 2 pontot kap az Asztrális és a Mentális TMEhoz.\n\nA pap vagy paplovag a képzettség ezen fokán minden Tapasztalati szinten +2 Kegy pontot nyer hitéből.\n\nA felszentelt személy ezen a szinten már komoly mágikus erővel és igen nagy elmélyüléssel bír istene tanaiban, ezért az Általános varázslatokat alap Erősítésen Kegy pontok feláldozása nélkül idézi meg.",
      lvl_5: "A legendás egyháztudós, egyházfő az adott vallás istenének, isteneinek nagy ismerője, képes akár az istenségek más megjelenési formáit is azonosítani esetleg más vallásokban, ha erre megfelelő forrás akad a kezébe. Tudományával mindenesetre csínján kell bánni, hiszen esetleges ellenlábasai könnyen máglyára küldhetik. A szertartásokat, kegytárgyakat, esetleges ismertebb ereklyéket és eretnek tanokat, a Szakrális mágia fohászait egy +3 módosítóval dobott Intelligenciapróbával ismerheti fel.\n\nA karakter a képzettség ezen fokán már, hitéből eredően szintenként 3 pontot kap az Asztrális és a Mentális TMEhoz.\n\nA pap vagy paplovag a képzettség ezen fokán minden Tapasztalati szinten +3 Kegy pontot nyer hitéből.\n\nA pap vagy paplovag ezen a szinten már annyira elmélyedt istene tanaiban, annyira magáévá tette az ő igazságait, hogy képes új rituálékat és litániákat kérni istenétől hétévente egyszer. Természetesen a fohász csak az istenség jóindulatából lehet sikeres. (Ám minden esetben a KMé a döntő szó, ő bírálja el a játékos által megalkotott új fohászt is.)"

    },

    {
      name: "Ékesszólás",
      skillType: "Szociális",
      skillDifficulty: "II",
      softReq: ["Lélektan"],
      hardReq: ["Kultúra"],
      stats: ["Intelligencia", "Asztrál", "Karizma"],
      description: "Ynev az élőszó világa, a könyvek igen ritkák és meglehetősen borsos az áruk, a népesség jó része írástudatlan; ilyen körülmények között nem csak egy fejedelmi udvarbéli pályának, de a nyilvánosság előtti szerepvállalásnak is elengedhetetlen követelménye a jó szónoki képesség.",
      lvl_1: "Az első fokon képzett karakter egyszerűen jó mesemondó, képes történeteivel lenyűgözni akár egy tucat főnyi hallgatóságát is. Ha korábban a hallgatók semlegesek voltak vele, akkor most egy -1 módosítóval végrehajtott karizmapróbával a barátaivá teheti őket.",
      lvl_2: "A már gyakorlott szónok képes hallgatóságát akár tettlegességig is feltüzelni egy sikeres karizmapróbával, igaz az érzelmek célpontját még nem ő, hanem a tömeg alapirányultsága szabja meg. A tömeg +1 Bátorságot kap. A tömeg egy-kétszáz főnél nem lehet nagyobb.",
      lvl_3: "A hivatásos szónok képes a tömeg érzelmét új célpontra irányítani, bár ehhez briliáns szerepjátékra van szükség a játékos részéről. A karizmapróbát a karakter +1 módosítóval dobja. A hallgatóság háromszáz főnél nem lehet nagyobb",
      lvl_4: "A mesterien szónokló karakter képes a tömeget immáron nem csak feltüzelni, de lecsillapítani is. karizmapróbáját már +2 módosítóval dobja, a képzettség alkalmazásának felső létszámhatára ezer fő.",
      lvl_5: "A karakter legendás szónokká válik, akár egy népvándorlást megindító szónoklatot vagy nyilvános egyházszakadást elérő előadást is képes prezentálni, ha járatos az adott témákban. karizmapróbáját +3 módosítóval dobja."

    },
    {
      name: "Heraldika",
      skillType: "Szociális",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Kultúra"],
      stats: ["Intelligencia"],
      description: "Ynev különféle címereinek, jeleinek, tetoválásainak ismeretét és azok mögött rejlő összefüggésének értelmezését fedi a képzettség.",
      lvl_1: "A tudománnyal ismerkedő karakter kultúrköre fontosabb címereit, zászlójeleit, tetoválásait felismeri, de értelmezésükkel, csak a legegyszerűbbeknél próbálkozhat, ha sikeres Intelligenciapróbát tesz -1 módosítóval.",
      lvl_2: "A címertan gyakorlott ismerője, a kultúrköre vagy foglalkozása körébe tartozó jelek nagy részét felismeri és értelmezi is, ha sikeres Intelligenciapróbát tesz.",
      lvl_3: "A karakter már szakavatott gyakorlója a heraldikának, képes kultúrköre jeleinek, címereinek, tetoválásainak, zászlóinak értelmezésére és használatára, kevés jel hozza zavarba, ha sikeres Intelligenciapróbát tesz +1 módosítóval.",
      lvl_4: "A Heraldika mestere ezen a fokozaton új jeleket is alkothat, a jelek értelmezése és kialakulása mögé lát, messzemenő következtetéseket vonhat le a címert, jelet, vagy tetoválást megalkotó mesterről, a szervezetről, melyhez tartozik, vagy a nemesi családokról, amelyek ezeket birtokolják, ha sikeres Intelligenciapróbát tesz +2 módosítóval.",
      lvl_5: "A legendás címertudós belelát a jelek mögötti összefüggésrendszerekbe, szövetségek és nemesi házak titkai nem maradnak előtte rejtve...\n\nezen a fokozaton akár még igazi tudós fők számára is hitelesnek tűnő csalásokat, eszelhet ki, vagy nemesi családok származását vonhatja kétségbe, ha sikeres Intelligenciapróbát tesz +3 módosítóval."

    },
    {
      name: "Kultúra",
      skillType: "Szociális",
      skillDifficulty: "I",
      softReq: [],
      hardReq: ["Nyelvtudás"],
      stats: [],
      description: "A karakter az adott terület, vagy népcsoport szokásaiba, szociális berendezkedésébe nyer bepillantást. Alacsonyabb fokú képzettség esetén még csak látogatóként ismeri a dolgok menetét, magasabb fokú képzettség birtokában már a helyi néprajz rejtelmeivel is tisztában van. A képzettséget valamely civilizáció vagy népcsoport kultúrájára kell felvenni, pl.: Kultúra (Erv) 3. fok",
      lvl_1: "Az idegenek ezen a szinten még csak ismerkednek a helyi szokásokkal, könnyedén belesétálhatnak egy kínos helyzetbe, főleg, ha nem ismerik készség szinten az adott nyelvet.",
      lvl_2: "A helyi szokásokban az ilyen fokon képzett karakter, már annyira járatos, hogy képes ügyeit egymaga intézni, de zárt közösségek esetén még bajba kerülhet.",
      lvl_3: "A közösségbe besimuló idegen vagy tősgyökeres helybeli lakos bírja ezen a fokon az adott Kultúra ismeretét, már könnyedén adja ki magát helybélinek az idegen, illetve tisztában van a számára szükséges szokások, helyzetek által megkövetelt viselkedésformák mibenlétével.",
      lvl_4: "A közösség valamely tanultabb vezetője, vagy idegen, aki lassan őslakosnak is kiadhatja magát, bírja ezen a fokon a képzettséget. A karakter már az adott kultúra fiókkultúráinak dolgaiban is járatos, elzárt, titkos közösségekkel szembeni fellépés mikéntjében sem ejt vérlázító hibát. Ezen a szinten már történeti alapossággal képes nyilatkozni egy kultúra fejlődéséről, átalakulásairól.",
      lvl_5: "A tudós fők és papok sajátja, esetleg mesterkémek és kereskedők birtokolják ezt a fokot. Az ennyire képzett karakter már tisztában van az adott kultúra rétegkultúráinak minden apróbb szokásával, illetve kimerítően képes nyilatkozni ezek kialakulásáról is."

    },
    {
      name: "Lélektan",
      skillType: "Szociális",
      skillDifficulty: "III",
      softReq: [],
      hardReq: [],
      stats: ["Intelligencia", "Asztrál", "Érzékelés"],
      description: "A psziché megismerésének tudománya. Birtokosa könnyebben férkőzik közel mások lelkéhez, érti meg a szándékaik mögött megbúvó indítékaikat, leplezi le hazugságaikat, vagy magasabb szinteken hajtja befolyása alá az illetőt. Ha a képzettség célpontja bármely leplező képzetséggel bír, akkor a képzettségek összevetésére vonatkozó szabályok a mérvadóak. Azonban a fent említett szabályok által megállapított siker esetén sem mentesül a karakter az alábbi leírásban szereplő próbadobás alól.",
      lvl_1: "Empátia, enyhe fogékonyság másokkal szemben. Ezen a szinten az apróbb változások még nem, de a durvább esetleges mágikus beavatkozások már felfedezhetőek a célpont viselkedésében, ha a varázstudó nem volt elég elővigyázatos. A karakternek -1 módosítóval dobott sikeres Asztrálpróba esetén tűnhetnek fel a változások.",
      lvl_2: "A már gyakorlott lélekbúvár a képzettség ezen fokának birtokában már nagyobb sikerrel számolhat. A karakternek sikeres Asztrálpróba esetén tűnhetnek fel a gyanús jelek, és csak ekkor értelmezheti őket.",
      lvl_3: "Papok és varázslók bírják legtöbbször ezt a tudásszintet, innentől válik lehetővé az asztrális, mentális varázslatok alkalmazása a Mozaikmágián belül. Ezen szint nélkül a varázsló nem ismeri eléggé a pszichét, hogy befolyást gyakoroljon rá.\n\nA karakter innentől kezdve próbálkozhat, ha ideje engedi lelki torzulások gyógyításával, +1 módosítóval dobott sikeres Asztrálpróba esetén.",
      lvl_4: "A karakter mestere a lélektannak, ha elegendő ideje és lehetősége van, hosszas munkával kondicionálhat, vagy kondicionálás alól szabadíthat fel másokat - a KM beleegyezésével. A gyanús jelek, elváltozások keresésére dobott próbáját a karakter +2 módosítóval végezheti el.",
      lvl_5: "Az igazán sokat látott bölcs mesterek az ilyen szintű tudás birtokosai, tapasztalataikat felhasználva egyre inkább elmélyültek a tudományban, emiatt a képzettség ezen fokú ismerői a gyanús jelek, elváltozások keresésére dobott próbájukhoz +3 módosítót adhatnak."

    },
    {
      name: "Művészetek",
      skillType: "Szociális",
      skillDifficulty: "II",
      softReq: [],
      hardReq: [],
      stats: [],
      description: "A karakter valamely művészeti ágban tökéletesíti tudását és egyre csodálatosabb műveket képes alkotni, előadni.\n\nA Tulajdonságkövetelmény művészeti áganként eltérő lehet, ez a KM belátására és fantáziájára van bízva, bár leggyakrabban az Asztrál és valamely másik Tulajdonság kombinációja.\n\n(Pl. éneklés, zenélés, tánc, költészet, szobrászat, színjátszás stb.)",
      lvl_1: "Egyszerű műkedvelő, esetleg az adott irányzat alapfogásaival ismerkedő személy. Próbálkozásai még legtöbbször komikusak, de már „sejti merre van a helyes irány”.",
      lvl_2: "Az ezen fokon képzett karakter már tűrhető művelője irányzatának, alkotásai pontosak, már némi harmóniát is sugároznak.",
      lvl_3: "A képzettség ezen foka már igazi iparos mestert jelez, akinek munkája pontos és szép, tetszetős, de nem lenyűgöző, még nem igazi művész.",
      lvl_4: "Igazi művész, műveivel, előadásaival már szép summákat kereshet. Megérintette a felsőbb harmónia, előadásaiba, műremekeibe akár rejtett mondanivalót is becsempészhet.",
      lvl_5: "Csak Művésztehetség Háttérrel rendelkező karakter veheti fel. Ihletett nagy művész, százévente ha egy születik."

    },
    {
      name: "Nyelvtudás",
      skillType: "Szociális",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: [],
      description: "A képzettség a karakter anya nyelvének, illetve attól eltérő nyelvek ismeretét fedi. Alacsonyabb fokon a nyelv használatát, magasabb fokú képzettség esetén pedig már igazi, irodalmi szintű nyelvtudást jelent. Yneven papok, művelt tudós fők, varázslók, esetleg művészek bírnak a nyelvek magasabb fokú ismeretével.",
      lvl_1: "Alig néhány szót makog a karakter az adott nyelvből, kézzel lábbal mutogat és legtöbbször csak nagyon hiányosan értelmezik mondanivalóját.",
      lvl_2: "Alapszintű, de már érthető szókincs, gyenge nyelvtan... a karakter ezen a szinten már kevés nehézséggel, de majd mindennel elboldogul.",
      lvl_3: "Majdnem tökéletes, akcentusos hétköznapi nyelvtudás, anyanyelvét kezdetben így beszéli egy karakter a szülőföldjére jellemző tájszólásban.",
      lvl_4: "Kiművelt nyelvtudás, egykét tájszólást is beszél már a karakter a képzettség ezen fokán. Ha úgy hozza a szükség irodalmilag is elég választékos.",
      lvl_5: "Mesteri tudás, a nyelv virtuóza, az adott nyelv minden dialektusát beszéli, utánozza bármelyik tájszólást vagy akcentust. Elengedhetetlenül szükséges ez a fokozat az igazán komoly irodalmi művek megalkotásához, azok élvezhető, felemelő vagy épp a mélységekbe taszító előadásához."

    },
    {
      name: "Párbaj",
      skillType: "Szociális",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Udvari etikett/intrika"],
      stats: ["Intelligencia", "Asztrál", "Karizma"],
      description: "A párbajok, legyen az bajvívó, nemesi, lovagi torna vagy varázstudók közötti összecsapás törvényeinek szokásainak és legendáriumának ismeretét jelenti e képzettség, a karakter által ismert kultúrák vonatkozásában. A választott párbajformát fel kell tüntetni a karakterlapon az adott képzettség mellett, mint pl. Párbaj (lovagi torna) 2. fok",
      lvl_1: "A karakter ismeri nagy vonalakban az adott párbajforma mikéntjét és szabályait. Értő szemlélőként vehet részt egy efféle összecsapás megtekintésében.",
      lvl_2: "A képzettség gyakorlott alkalmazója párbajképes, ismeri a vonatkozó szabályokat, szokásokat. Nem vét tudtán kívül semmiféleképp a szabályok ellen.",
      lvl_3: "A szakavatott karakter ismeri a kultúrkör minden párbajstílusát, jó részükben járatos is, párbajhős, hivatásos párbajsegéd vagy herold.",
      lvl_4: "A tudomány mesterfokú ismerője a kultúrkör minden párbajfajtájának minden apró kiskapuját, csínját-bínját ismeri, ceremóniamester. A képzettség ezen fokán akár már a becsület vagy hírnév elvesztése nélkül is találhat kibúvót egy párbaj alól, vagy párbajra kényszeríthet valakit.",
      lvl_5: "A karakter az illem és a szokások ismeretének tárháza, maga is valószínűleg hírneves párbajhős, akár egy párbajkódexet is megalkothat, tettei legendásak, tudása páratlan."

    },
    {
      name: "Politika/diplomácia",
      skillType: "Szociális",
      skillDifficulty: "III",
      softReq: ["Történelem"],
      hardReq: ["Udvari etikett/intrika"],
      stats: ["Asztrál", "Karizma", "Intelligencia"],
      description: "A Politika/diplomácia a meggyőzés, információszerzés, behízelgés tudománya. A karakter ezen képzettség birtokában nemcsak a tárgyalások folyamán mérheti fel ellenfelei szándékait, győzheti meg őket a maga igazáról, de afféle fogódzót is kap arra nézve, hogy milyen ügyekben kivel érdemes tárgyalnia, ki vagy mi lehet a kulcs kényes szituációkban. A KM a Tulajdonságpróba dobásakor saját belátása szerint, helyzetfüggően pluszmódosítóként beszámíthatja a karakter Lélektan, Színészet, vagy akár Szexuális kultúra képzettségének szintjét.",
      lvl_1: "A karakter még csak megfigyelő, látásból ismer pár fontos embert, de még aktív szereplőként nem jelent meg a politika színpadán.",
      lvl_2: "A kezdő politikus már átlátja az erőviszonyokat, esetlegesen következtethet bizonyos folyamatok, merényletek mögött megbúvó csoportok vagy személyek kilétére. Szintén következtethet a történések végkifejletére, ha a Politika/diplomácia képzettségre dobott próbán felülmúlja a másik tábort vezető személyt. A KM sikertelenség esetén is elhinthet pár részletet, információt a sikertelenség mértéke szerint, illetve teljesen valótlan dolgokat is, ha a karakter nagyon elhibázta a próbát.",
      lvl_3: "Az igazi politikus már bejáratos az udvarba, aktív szereplője, egyelőre csak gyalogként a politikának. Már behatóan ismeri kultúrköre irányzatait és némi információval is bír azok vezetőiről, céljaikról.",
      lvl_4: "A képzettség ezen fokának birtokosa már személyesen is ismer egykét befolyásos embert, neki is neve van, vagy szürke eminenciásként van jelen a politikában. Már gazdasági, hadászati ügyek politikai ki és behatásait is ismeri, és ha bír a vonatkozó Kultúrával, akkor már külpolitikai kérdésekben is mérvadó a véleménye.",
      lvl_5: "A legendás államférfi vagy befolyásos hölgy diplomáciai zseni, nem ritkán kérik fel bizonyos titkos szervezetekkel történő tárgyalásra. Pontosan tudja ki vagy mi áll az események hátterében, rövidtávra akár meg is jósolhatja az események kihatásait, nagy valószínűséggel... hacsak ellenfelei nem állítanak egy hasonlóan képzett diplomatát ügyeik intézésére."

    },
    {
      name: "Szexuális kultúra",
      skillType: "Szociális",
      skillDifficulty: "I",
      softReq: [],
      hardReq: [],
      stats: ["Asztrál", "Karizma"],
      description: "A karakter szexuális ismereteinek köre. Nemcsak a szeretkezés tudománya, de egyfajta lélektani tudás is az ellenkező nemmel szemben. A karakter a másik nemmel kapcsolatban Lélektan, illetve Színészet ellen próbáknál a Szexuális kultúra képzettségét is használhatja, ha az számára kedvezőbb és ezt KM engedélyezi.",
      lvl_1: "A karakter gyakorlatilag elveszítette szüzességét, és okult a tapasztalataiból. Gyakorlati elképzelései vannak a partnerét is kielégítő szexuális életről.",
      lvl_2: "Az ilyen fokú beavatott kulturált, igényes szerető saját kultúrköre tagjai szerint, képes a szocializált, boldog párkapcsolatra, hacsak partnerének nincsenek különösebb igényei.",
      lvl_3: "A képzettség ezen fokának birtokosa igen szakavatott, kiművelt szerető. Szexuális játékai ritkán mondanak csődöt, híre van a társaságban. Sikeres, +1 módosítóval dobott karizmapróbával képes magához kötni alkalmi, vagy állandó szeretőit. A függés pusztán lelki természetű, a KM belátására bízott módosítókkal végrehajtott Akaraterő próbával legyőzhető.",
      lvl_4: "A karakter igazi művész, még az ellene ágálókat is képes a pártjára csábítani, ha a KM szerint ez elképzelhető... Az ehhez szükséges karizmapróbát a játékos +2 módosítóval dobja.",
      lvl_5: "Igazi szeretőművész, képességeivel képes másokat a legmagasabb mennyektől a legmélyebb pokolbugyrokig eljuttatni. Szexuális játékai olyan szinten őrjítik meg szeretőit és oly járatossá vált az ellentétes nem vágyaiban, hogy karizma próbáját +3 módosítóval dobhatja."

    },
    {
      name: "Színészet",
      skillType: "Szociális",
      skillDifficulty: "III",
      softReq: [],
      hardReq: ["Lélektan"],
      stats: ["Asztrál", "Karizma"],
      description: "A színészet a tettetés, a beleélés, az alkalmazkodás és a színészi átalakuló képesség tudománya, a karakter nem csak művészetként, de hazudozásaihoz, csalásaihoz is felhasználhatja... főleg Álcázás/álruha képzettséggel együtt. Ha a karakter valakit át szeretne ejteni és szerepjátéka a KM szerint nem elég meggyőző, vagy a célpont gyanakodni kezd, akkor képes leleplezni a karaktert a vonatkozó képzettségek (Lélektan) összevetését taglaló szabályok szerint.",
      lvl_1: "A karakter műértő, illetve már próbálkozott az alakoskodással, nem túl nagy sikerrel. Ha hazudozni vagy tettetni kényszerül köteles Asztrálpróbát dobnia -1 módosítóval.",
      lvl_2: "Az ilyen szinten képzett karakter gyakorlott hazudozó, gyakorló színész, Asztrálpróbáját, már módosítók nélkül dobhatja.",
      lvl_3: "A képzettség ezen fokát még bárki elsajátíthatja, igazi „iparos” mesterré válhat, akinek munkája pontos és szép, tetszetős, de nem lenyűgöző, még nem igazi művész. De már igen képzett füllentő és alakoskodó, Asztrálpróbáját +1 módosítóval dobhatja.",
      lvl_4: "Igazi művész, előadásaival már szép summákat kereshet. A vonatkozó Asztrálpróbát +2 módosítóval dobhatja.",
      lvl_5: "Már csak a tehetség előnnyel rendelkező karakter veheti fel. Ihletet nagy művész, százévente, ha egy születik... arca szinte gumiból van, bármilyen érzelmet képes megjeleníteni rajta és villanásnyit sem látszanak saját gondolatai érzelmei, ha csak nem akarja. A vonatkozó Asztrál próbát +3 módosítóval dobhatja."

    },
    {
      name: "Udvari etikett/intrika",
      skillType: "Szociális",
      skillDifficulty: "II",
      softReq: [],
      hardReq: ["Kultúra"],
      stats: ["Intelligencia", "Asztrál", "Karizma"],
      description: "A karakter az udvarok, klánok, rendek szertartásrendjébe, belső elrendeződésébe, erővonalaiba láthat bele a képzettség segítségével, magasabb szinten pedig átrendezheti őket. Tetszése szerint taposhat el, vagy emelhet fel bárkit az adott közösségen belül.",
      lvl_1: "A karakter még csak ismerkedik a szabályokkal, komoly segítségre szorul. Ha „udvarképesen” akar viselkedni, netalán bele akar folyni a társaság ügyeibe, akkor feszültebb helyzetekben - ennek megítélése a KM joga -1 módosítóval kell sikeres Tulajdonságpróbát dobnia.",
      lvl_2: "A gyakorlott karakter még nem teljesen udvarkész, de már kezd a társasági élet tényezőjévé válni. A feszült helyzetek könnyen hibázásra késztetik, ennek elkerülésére sikeres Tulajdonságpróbát kell dobnia.",
      lvl_3: "A karakter már járatos az apróbb szokásokban, szabályokban is, ismeri a politikai erővonalakat és néhány fontosabb embert. A feszült helyzetek kezelésekor felmerülő nehézségek orvoslásának sikerét eldöntő Tulajdonságpróba dobást +1 módosítóval teheti meg.",
      lvl_4: "Vérbeli politikus, szertartásmester. A karakter már komolyan képes befolyásolni az adott helyszín, udvar, bál szertartásmenetét, egyes szabályok alkalmazásával. Ha úgy kívánja szavaival, intrikus megnyilvánulásaival földbe tiporhat, vagy az egekig magasztalhat bárkit a társaság szemében, ha sikeres Tulajdonságpróbát dob +2 módosítóval.",
      lvl_5: "Igen befolyásos politikus, a társasági élet titkos vezetője. Szertartásmesterként a tudás végső forrása, igazán fontos ceremóniák és szertartások ismerője. Tettei még évszázadok távolából is híresek, a történelem részét képezik. Tulajdonságpróbáját +3 módosítóval teheti."

    },

    {
      name: "Démonológia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: ["Ősi nyelv"],
      stats: ["Intelligencia", "Akaraterő"],
      description: "A legsötétebb praktikák egyike, melyet ynevi varázstudó valaha is művelhet. Eredendően két irányzata létezik: az egyik a démonok és szolgáik elleni hadakozást tűzte zászlajára a köztes síkok lényei ellen fordítva tudását, a másik a hatalmat gátlástalanul áhító varázstudók tábora, mely sajnos jóval elterjedtebb. Ők a démoni alkuk és a démoni hatalom kijátszásának vagy megkaparintásának lehetőségeit vizsgálják.",
      lvl_1: "A démonikus hagyománnyal még csak éppen ismerkedő személy sikeres -1 módosítóval dobott Intelligenciapróba esetén felismeri az 1. démonológiai osztályba sorolt démonokat, az adott mágiaformát űző varázstudót a varázsláshoz szükséges mozdulatok és mágikus igék alapján.",
      lvl_2: "A démoni tudományokba avatott karakter sikeres Intelligenciapróba esetén képes azonosítani az 1. és a 2. démonológiai osztályba sorolt démonokat, azok képességeiről kimerítően tud nyilatkozni, egy módosítók nélkül elvégzett sikeres Intelligenciapróba után.",
      lvl_3: "A tapasztalt varázstudó, vagy tudósfő már nagy gyakorlatra tett szert a köztes síkokkal foglalkozó tudományban, az Intelligenciapróbáját +1 módosítóval végezheti el, siker esetén felismeri az 1-3. démonológiai osztályba sorolt túlvilági lényeket, azok képességeiről, elpusztításuk, vagy idézésük módozatairól kimerítően tud nyilatkozni.\n\nHa a karakter a Mozaikmágia alkalmazója, akkor képessé válik a démonikus mozaikok megidézésére.\n\nA karakter ettől a szinttől képes szeráfi paktum megkötésére, ha valaki megszerezte számára a kiszemelt lény igaz nevét, lásd a Démonológia c. fejezetben a 384. oldalon.",
      lvl_4: "A démonikus hagyományok mestere az Intelligencia próbáját +2 módosítóval végezheti el, siker esetén felismeri az 1-4. démonológiai osztályba sorolt túlvilági lényeket, azok képességeiről, elpusztításuk vagy megidézésük módozatairól kimerítően tud nyilatkozni.\n\nHa bír asztrál/mentál alapú varázslatokkal, akkor innentől kezdve azokat képes alkalmazni a démonokra is. Lásd Démonológia c. fejezetben a 384. oldalon.",
      lvl_5: "A legendás hírű pap, varázsló vagy démonvadász az Intelligenciapróbáját +3 módosítóval végezheti el, siker esetén felismeri az 1-5. démonológiai osztályba sorolt köztes síkokról származó lényeket, azok képességeiről, elpusztításuk vagy megidézésük, létrehozásuk módozatairól kimerítően tud nyilatkozni.\n\nA karakter képes szeráfi paktum megkötésére, lásd a Démonológia c. fejezetben a 384. oldalon."

    },
    {
      name: "Drágakőmágia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: ["Szakma"], //TODO: dragakocsiszolas
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "A Drágakőmágia az ékkövek sajátos szerkezetében rejlő mágikus hatalmat aknázza ki. Alkalmazói képesek a különböző drágakövek mágikus töltéssel való felruházására, magasabb szinten akár komplett varázslatok eltárolására is.",
      lvl_1: "A képzettség ezen fokú beavatottja még csak kevés ismerettel rendelkezik a módszer gyakorlati alkalmazásáról. Sikeres, -1 módosítóval végrehajtott Intelligenciapróba esetén felismeri a Drágakőmágia tárgykörébe tartozó varázstárgyakat.",
      lvl_2: "A képzettség beavatottja sikeres Intelligenciapróba esetén képes felismerni a drágakövekben rejtőző erők típusát, azaz felismeri, hogy a drágakőbe foglalt varázslat mely mágikus hagyomány követőjének műve: mely tapasztalati hagyomány, szakrális vagy magasmágia eredetű e.",
      lvl_3: "A képzettség ezen fokának birtokosa az Intelligenciapróbáját +1 módosítóval dobja, sikeres próba esetén még a varázslatot is képes meghatározni, melyet a drágakő rejt.\n\nA karakter képes a drágaköveket mágikus töltéssel felruházni, így azok alkalmassá válnak a Detekció típusú hatásokra. Illetve a drágakőmágia beavatottja ettől a szinttől képes az adott mágikus hagyománynál felsorolt drágakőmágikus varázstárgyak elkészítésére. Bővebben lásd a Drágakőmágia című fejezetben a 395. oldalon.",
      lvl_4: "A drágakőmágikus hagyományok avatott mestere az Intelligenciapróbát +2 módosítóval dobja.\n\nA képzettség ezen fokának birtokosa már képes a drágaköveket Védelem típusú hatásokkal feltölteni, igazi drágakövekben Mp-ot tárolni.",
      lvl_5: "A legendás hírű mester az Intelligenciapróbáját már +3 módosítóval dobja.\n\nImmár képes a drágaköveket Okozás típusú hatásokkal feltölteni, illetve igazi drágakövekben komplett varázslatokat tárolni."

    },
    {
      name: "Magasmágia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: ["Ősi nyelv"],
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "A Mozaikmágia rejtelmeit ismerheti meg a karakter ezen a tudományon keresztül. Alacsonyabb szinteken csak a formulák és a varázslatok jellemző jeleit, magasabb szinteken magának a mozaikokból történő varázslásnak a mikéntjét.",
      lvl_1: "Ha a karakter halló, illetve látótávolságán belül tartózkodik a kiszemelt varázsló, akkor sikeres -1 módosítóval elvégzett Intelligenciapróba esetén felismeri, hogy Mozaikmágiával áll szemben, sőt jó eséllyel a beavatott iskoláját, avagy rendjét is meghatározza.",
      lvl_2: "A képzettség ilyen fokú beavatottja képes felismerni az általa látott, hallott mozaikokat, a hatásukról sikeres Intelligenciapróba után tud felvilágosítást adni.",
      lvl_3: "A szakavatott mágiaelméletí tudással bíró karakter az Intelligenciapróbáját +1 módosítóval dobja, a fenti megkötések továbbra is érvényesek. Sikeres próba esetén a KM belátására bízva, akár a varázslat hátrahagyta jelekből is kiolvashat némi információt.\n\nA karakter a Mágikus fogékonyság Háttér birtokában a varázslói Mozaikmágiát alkalmazza, képes a Mpjai, illetve képzettségei által megengedett varázslatokat a Magasmágia c fejezetben leírtak szerint létrehozni.\n\nA mágikus tanokba való ilyen szintű elmélyedés miatt a karakter minden Tapasztalati szinten (már az elsőn is) +1 Mana pontot kap. Az így nyert Mpok esetében mindig az adott szinten aktuális képzettség fok számít. Tehát, ha Wilvarien a varázsló 4. ről 5. TSZ.re lépve felveszi a képzettség 5. fokát, s eddig csak a 4. fokkal bírt akkor immáron már majd minden szintlépéskor innentől kezdve 3 plusz Mpot kap, de ez nem befolyásolja a korábban kapott Mpjai számát.",
      lvl_4: "A mágiaelméleti tudomány avatott mestere a karakter a képzettség ezen fokán, az Intelligenciapróbáját +2 módosítóval dobja, a fenti megkötések továbbra is érvényesek.\n\nA varázsló képes a varázslatot befejező Végjei megformázását akár egy körrel is elodázni, ezáltal később, vagy egyáltalán nem létrehozni az adott mozaikot. Az idevágó szabályokat bővebben lásd a Mozaikmágia c. fejezetben a 355. oldalon.\n\nA mágikus tanokba való ilyen szintű elmélyedés miatt a karakter minden Tapasztalati szinten +2 Mpot kap.",
      lvl_5: "A legendás hírű mester az Intelligenciapróbáját +3 módosítóval dobja, a fenti megkötések továbbra is érvényesek.\n\nA varázsló ezen a szinten már az általa gyakorolt iskolaformák nagymestere, képes új mozaikot alkotni, de csak az általa megfelelő fokon űzött iskolaformákon belül. Pl. Ha Dián magiszter új jelmágikus rajzolatokat akarna kreálni, akkor a Rúnamágia képzettség 5. fokával kell bírnia, míg ha inkább a Természetes anyagok mágiájában akar maradandót alkotni, akkor az Alkímia képzettség 5. fokát kell előbb tanulmányoznia.\n\n(Am minden esetben a KMé a döntő szó, ő bírálja el a ótékos által megalkotott új varázslatot.)"

    },
    {
      name: "Nekromancia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: ["Élettan"],
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "Az életerő keletkezésének és áramlásának titkát kutató tudomány, melynek ezen rejtélyekre ugyan még nem sikerült maradéktalanul fény derítenie, de mintegy mellesleg a halál nagymestereivé avatta művelőit.",
      lvl_1: "A sötét tudománnyal még csak éppen ismerkedő beavatott sikeres -1 módosítóval végrehajtott Intelligenciapróba esetén felismeri az 1 nekrográfiai osztályba sorolt élőhalottakat, az adott mágiaformát űző varázstudót, valamint jó eséllyel azonosítja a varázsláshoz szükséges mozdulatokat és mágikus igéket.",
      lvl_2: "A beavatott a képzettség ezen fokán sikeres Intelligenciapróba esetén képes azonosítani az 1. és a 2. nekrográfiai osztályba sorolt élőholtakat, azok képességeiről kimerítően tud nyilatkozni.",
      lvl_3: "A nekromantikus tudományok avatott ismerője az Intelligenciapróbáját +1 módosítóval végezheti el, siker esetén felismeri az 1-3. nekrográfiai osztályba sorolt túlvilági lényeket, azok képességeiről, elpusztításuk vagy idézésük, létrehozásuk módozatairól kimerítően tud nyilatkozni.\n\nHa a karakter bír a Mágikus fogékonyság Háttérrel, illetve Magasmágia képzettség hasonló fokával, akkor képes nekromantikus mozaikok megidézésére.",
      lvl_4: "A sötét tudományok mestere az Intelligenciapróbáját +2 módosítóval végezheti el, siker esetén felismeri az 1-4. nekrográfiai osztályba sorolt túlvilági lényeket, azok képességeiről, elpusztításuk vagy megidézésük, létrehozásuk módozatairól kimerítően tud nyilatkozni.\n\nHa bármely mágikus hagyomány művelője és bír asztrál/mentál alapú varázslatokkal, akkor képes hatni a tudattal vagy személyiséggel bíró élőhalottakra is.",
      lvl_5: "A legendás hírű tudós fő az Intelligenciapróbáját +3 módosítóval végezheti el, siker esetén felismeri az 1-5. nekrográfiai osztályba sorolt túlvilági lényeket, azok képességeiről, elpusztításuk, vagy idézésük, létrehozásuk módozatairól kimerítően tud nyilatkozni.\n\nA karakter képes a saját, vagy mások életerejéből is varázsolni. Ha a saját életerejét használná varázslásra, akkor képes 1 Épért 5 Mpot nyerni szervezetéből. Ez a rituálé mindösszesen némi összpontosítást és egy kör időtartamot vesz igénybe. Ebben az esetben nem vonatkoznak a mágiahasználóra az Életerő szabályainak megkötései az eszméletvesztésre és a halálra vonatkozóan, míg a varázslás folyik. A mágia befejeztével viszont számolnia kell a kiszipolyozott teste reakcióival.\n\nMások életerejéből fertályórányi felkészülés után tud varázsolni. A rítushoz fel kell rónia az életerőből származó energiákat fókuszáló jeleket, mégpedig az áldozatok vérével, mely majd közvetíti ezen erőket a jel közepén álló varázstudóhoz. Az áldozatok csak a varázslás befejeztével sebződnek meg vagy hunynak el."

    },
    {
      name: "Őselemi mágia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: ["Ősi nyelv"],
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "A képzettség az elemi mágia szabályaival, az őselemi síkok törvényeivel, és az ott őshonos lények tulajdonságaival foglakozik. Magasabb szinteken betekintést enged az őselemek megidézésének fortélyaiba és formázásuk rejtelmeibe a Mozaikmágia által, lásd az Elemi mágia c. fejezet a 358. oldalon.",
      lvl_1: "A karakter tisztában van az őselemek fogalmával, az anyagi síkon való megjelenésük formációival, ismeri veszélyeiket. Képes felsorolni, illetve felismeri a hírhedtebb őselemi lények fajtáját, hozzávetőleges képességeikről sikeres -1 módosítóval végrehajtott Intelligenciapróba után képes nyilatkozni. A karakter által ismert lények meghatározásának joga mindig a KMé.",
      lvl_2: "A karakter már ismeri a paraelemeket, tisztában van előnyeikkel, hátrányaikkal, azonosítja az alapvető Formázásokat, igen nagy pontossággal nyilatkozik az adott mágiaformák hatásait illetően. Az őselemi síkok teremtményeinek nagy részét felismeri azok képességeiről sikeres Intelligenciapróba után tud nyilatkozni.",
      lvl_3: "Az őselemi síkok teremtményeit felismeri azok képességeiről +1 módosítóval dobott sikeres Intelligenciapróba után tud nyilatkozni.\n\nA karakter a Magasmágia képzettség hasonló szintű ismeretének, illetve a Mágikus fogékonyság Háttér birtokában képes őselemek megidézésére, illetve az alapvető Formázás mozaikok használatára.",
      lvl_4: "Az őselemi síkok teremtményeit felismeri, immáron azok képességeiről +2 módosítóval dobott sikeres Intelligenciapróba után tud nyilatkozni.\n\nA képzettség ezen fokának ismerője az elemi mágia mestere, képes az egyszer már megidézett őselemeket újabb Formázás mozaikokkal kordában tartani, egyre újabb és újabb alakba kényszeríteni az időtartam letelte előtt. Bővebben lásd az Elemi mágia c. fejezetben az 358. oldalon.",
      lvl_5: "A őselemi mágia letéteményese, a világot alakító erők avatott ismerője. Az őselemi síkok minden teremtményét felismeri, immáron azok képességeiről +3 módosítóval dobott sikeres Intelligenciapróba után tud nyilatkozni.\n\nA varázsló ezen a szinten már képes az elemeket teljesen uralma alá hajtani, képes a Formázás mozaikkal szabad elemi formák megalkotására. Bővebben lásd az Elemi mágia c. fejezetben a 358. oldalon."

    },
    {
      name: "Pszi",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: [],
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "A világegyetem legnagyobb hatalma a képzelet, mely alkotásra, tettekre sarkallja a teremtett világok lényeit, s ennek a hihetetlen erőnek a forrása a gondolkodó elme. Ahány faj és világ, annyi módon próbálták a tudat erejét az idők folyamán közvetlenül felhasználni a külső, belső és az anyagi világok lakói. Voltak, akik csak egy lépcsőfokot láttak a mentális energiákban a magasabb rendű formáló erő, a mágia megértése és megzabolázása félé, voltak, akik magát az utat.\n\nYnev mai lakói a pszi (VF) energiák alkalmazásának művészetét három forrásból, három különböző felfogású irányzat birtokosaitól sajátították el, évezredek bölcselkedése, évszázadok háborúi folyamán. A kyr mágusok, a káoszkorok démonai, az ellenük hadakozó hősök és Godon varázslói adták a mai pszi tudomány alapjait. Az alkalmazók hasonló szellemi felépítése miatt viszont mára a tudásanyag jórészt kicserélődött, s inkább csak a jellegzetesebb diszciplínákban tér el.\n\nA játék megkülönböztet kyr, slan, és pyarroni pszionikát, ezeknek sajátságairól és alkalmazásáról bővebben lásd a Pszi c. fejezetet a 217. oldalon. A képzettség felvételéhez szükséges a Pszi érzékenység Háttér.",
      lvl_1: "Ezen a szinten még csak a belső önmegismerés útjának elején jár a karakter. Szemét ugyan már felnyitotta a belső síkokon, de még csak saját énjének formáival, sajátságaival ismerkedik; képes alkalmazni az 1. foknál feltüntetett diszciplínákat, természetesen csak saját magára.",
      lvl_2: "A képzettség ezen szintű alkalmazója már gyakorlott, képzett, fegyelmezett elmével bír, könnyedén mozgósítja belső erőit, de még csalt készül a nagy ugrásra, még mindig teste rabja. A karakter képes alkalmazni a 2. foknál feltüntetett diszciplínákat is, ám még mindig csak saját magára.",
      lvl_3: "A Kitekintés szintje. A gyakorlott elme a képzettség ezen fokán már harmadik szemével vizsgálja a rejtett világot és képes reagálni rezdüléseire. A karakter képes alkalmazni a 3. foknál feltüntetett diszciplínákat - ha oktatói lehetővé teszik, akkor a Kyr Metódus elemeit is - ám még mindig csak saját magára.\n\nA karakter minden szintlépéskor a belső erők tudományában való elmélyülése miatt +1 Pszi pontot kap. Ez mindig csak az adott Tapasztalati szinten kapott ?pok számát befolyásolja, tehát a magasabb fokú képzettség elérésekor a karakter nem kapja meg visszamenőleg a plusz ?pokat.\n\nA 3. fokon képzett pszionistának ezen a szinten választani kell a Test vagy az Elme ágak közül, hogy tanulmányait mely irányba folytatja, a legtöbb klán, rend, iskola azonban ezt általában megszabja tanítványainak.",
      lvl_4: "Az Érintés szintje. A fegyelmezett elme ezen a szinten képes áthidalni a fizikai világ szakadékait, melyek a belső síkokon is megmutatkoznak. A karakter már képes más elmékre, vagy a fizikai valóság elemeire, tárgyakra hatni, ismeri és alkalmazza a 4. foknál feltüntetett diszciplínákat közül az általa választott ág diszciplínáit is - ha oktatói lehetővé teszik a Kyr Metódus vagy a Slan Út elemeit is.\n\nA karakter minden szintlépéskor a belső erők tudományában való elmélyülése miatt +2 Pszi pontot kap.",
      lvl_5: "A elme művészetének magasiskolája, az uralom szintje, a karakter erre a szintre csakis a Slan Út vagy a Kyr Metódus tanulmányozásával juthat. Az ilyen szinten képzett pszi alkalmazó már komolyan formálja, a valóságot. A belső síkokon keresztül képes elérni, megfigyelni és befolyásolni mások elméjét. A karakter ismeri és alkalmazza a 5. foknál feltűntetett, az általa választott ágon található diszciplínákat, azaz oktatói által elérhetővé tett Kyr Metódust vagy a Slan pszit.\n\nA karakter minden szintlépéskor a belső erők tudományában való elmélyülése miatt +3 Pszi pontot kap."

    },
    {
      name: "Rúnamágia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: ["Ősi nyelv"],
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "Ynev majd minden népcsoportja idővel megörökölte, vagy újra felfedezte magának a jelmágikus rajzolatokban rejtőző, céljaikhoz igazítva átrendezett mágikus erők tudományát. A képzettség ismerete ezen örökkévaló, a kontinenssel egyidős kultúrától független jelek felismerését, működésük megértését, esetleg maguknak a rúnáknak az alkalmazását jelenti.",
      lvl_1: "A Rúnamágiával ismerkedő személy képes felismerni sikeres -1 módosítóval végrehajtott Intelligenciapróba esetén a rúnamágia tárgykörébe tartozó jeleket.",
      lvl_2: "A Rúnamágia beavatottja sikeres Intelligenciapróba esetén képes érzékelni a jelmágikus rajzolatok rejtette erők típusát, azaz felismerni, hogy a rúnába foglalt varázslat mely mágikus hagyomány követőjének műve: szakrális, tapasztalati vagy magasmágikus eredetű e.\n\nA képzettség ezen szintű ismerője képes varázstekercseket felolvasni, aktivizálni.",
      lvl_3: "A szakavatott ismerője a Rúnamágiának az Intelligenciapróbáját +1 módosítóval dobja. Ha rendelkezik az adott hagyomány vonatkozó képzettségével, akkor sikeres próba esetén a varázslatot is képes meghatározni, melyet a rúna rejt, illetve képes biztonságosan megtörni a mágikus jeleket sikeres próba eseten.\n\nA megfelelő képzettség (valamely szakma), valamely mágikus hagyomány beavatottjaként a karakter képes jelmágikus rajzolatok készítésére. Ezeket bővebben lásd a Rúnamágia c fejezetet a 373. oldalon.\n\nAbban az esetben, ha a karakter nem a magasmágia beavatottja, hanem tapasztalati mágiahasználó, akkor csakis a Végrehajtó Varázskor, Kisugárzó Varázsjel, illetve, ha bír Asztrál-, Mentálmágiával, akkor az Asztrál-, Mentál- bélyegek, alkalmazása elérhető a számára.\n\nA karakter a Mágikus fogékonyság előny birtokában az adott mágiaformát alkalmazni is képes.\n\nA Mp-jai által megengedett varázslatokat a Mágia fejezetben leírtak szerint hajthatja végre.\n\nA mágikus tanokba való ilyen szintű elmélyedés miatt a karakter minden Tapasztalati szinten (már az elsőn is) +1 Mana pontot kap. Az így nyert Mp-ok esetén mindig az adott szinten aktuális képzettség fok számít. Tehát, ha Ricára a boszorkány 4. ről 5. TSZ.-re lépve felveszi a képzettség 5. fokát, s eddig csak a 4. fokkal bírt akkor ezentúl minden szintlépéskor innentől kezdve 1 plusz Mp-ot kap, de ez nem befolyásolja a korábban kapott Mp-jai számát.",
      lvl_4: "A képzettség mesteri fokozatú beavatottja a fenti Intelligenciapróbát +2 módosítóval dobja.\n\nA karakter már teljesen átlátja a jelmágia működését, mozaikjait egyetlen jelbe sűrítve készíti el, így a varázslási idő a felére csökken.",
      lvl_5: "A legendás hírű ismerője ezen képzettségnek a fenti Intelligenciapróbát +3 módosítóval dobja.\n\nA varázstudó rúnajeleibe a Leplezés varázslat mozaikját - ha bír a Mozaikmágia használatának - is képes belefoglalni, így rejtve el azt a kíváncsiskodók elől."

    },
    {
      name: "Tapasztalati mágia",
      skillType: "Misztikus",
      skillDifficulty: "IV",
      softReq: [],
      hardReq: [],
      stats: ["Intelligencia", "Akaraterő", "Asztrál"],
      description: "A hagyományokon, az évezredeken átöröklődő, mágikus procedúrákon alapuló mágikus fortélyok ismeretébe, illetve magasabb szinteken azok használatába enged betekintést e képzettség. Felvételekor természetesen meg kell jelölni az adott hagyományt, mint pl. Tapasztalati mágia - bárd varázslatok (iskola, vagy magányos mester).",
      lvl_1: "Ha a beavatott személy halló-, illetve látótávolságon belül tartózkodik a kiszemelt varázstudóhoz képest, akkor sikeres -1 módosítóval végrehajtott Intelligenciapróba esetén azonosítja, hogy az általa tanulmányozott hagyomány követőjével áll-e szemben.",
      lvl_2: "Ha a képzettség ezen fokát birtokló személy halló-, illetve látótávolságon belül tartózkodik a kiszemelt varázstudóhoz képest, akkor sikeres Intelligenciapróba esetén azonosítja a létrehozott varázslatot, ha az az általa tanulmányozott mágikus hagyományba tartozik. Az egyedi, iskolákra jellemző mágiákat csak akkor ismeri fel, ha pont a megfelelő rend tudásanyagába nyert bepillantást.",
      lvl_3: "képzettség ezen fokának szakavatott birtokosa az Intelligenciapróbáját +1 módosítóval dobja, a fenti megkötések továbbra is érvényesek. Sikeres próba esetén a KM belátására bízva akár a varázslat hátrahagyta jelekből is kiolvashat-e némi információt.",
      lvl_4: "A ilyen fokú birtokosa a képzettségnek az Intelligencia próbáját +2 módosítóval dobja, a fenti megkötések továbbra is érvényesek.\n\nA karakter már mestere a választott misztikus hagyománynak, mozdulatai, elejtett szavai mágikus erőket rejtenek. Az ilyen fokon képzett varázstudó képes létrehozni egy varázslatot, majd testében, mozgásában megkötni a mágikus hatalmat, s akár órákkal később életre hívni azt.\n\nJátéktechnikailag a varázstudó megidézi az adott varázslatot, elkölti a szükséges Mana pontokat - amennyiben szükséges felhasználja az egyéb kellékeket, -, majd nem fejezi be varázslatát, mintegy testében köti le, majd később 1 szegmens alatt egy korábban meghatározott formulával - ez mindig ugyanaz: egy intés, egy mosoly vagy egy szó - beindítja a varázslatot. Ha a karakter elalszik, vagy bármilyen más módon, de eszméletét veszti, elvész a varázslat és a belefoglalt varázserő, mely sebzés okozása és hatás nélkül, némi fényjelenség kíséretében visszaáramlik a Manahálóba. Amíg a mágiahasználó egy varázslatot efféleképp birtokol, addig semmilyen koncentrálást igénylő feladatot nem végezhet: azaz nem használhat pszit, nem varázsolhat és varázserejét sem nyerheti vissza.\n\nA mágikus tanokba való ilyen szintű elmélyedés miatt a karakter minden Tapasztalati szinten +2 Mp-ot kap.",
      lvl_5: "A karakter az adott hagyomány nagymestere, ősi titkok és regulák ismerője, tisztelt, vagy rettegett személy. Az Intelligenciapróbáját +3 módosítóval dobja, a fenti megkötések továbbra is érvényesek.\n\nA játékos ezen a szinten már saját varázslatokat is megalkothat, de csak azon mágiaformából, melynek vonatkozó képzettségéből szintén bír az 5. fokkal. Pl. Varsarco a tűzvarázsló új tűzmágiák megalkotását tűzte ki maga elé célul, ezt akkor teheti meg, ha az Őselemi mágia képzettséget szintén 5. fokon birtokolja, míg új bájolások kiötléséhez Syrának a boszorkánynak 5. fokú Lélektan képzettség szükséges.\n\n(Ám minden esetben a KM-é a döntő szó, ő bírálja el a játékos által megalkotott új varázslatot.)\n\nA mágikus tanokba való ilyen szintű elmélyedés miatt a karakter minden Tapasztalati szinten +3 Mp-ot kap."

    },
  ];


export type Skill =
  // harci
  "Fájdalomtűrés" | "Fegyverhasználat" | "Fegyverismeret" | 'Hadvezetés' | "Harci láz" | "Harcművészet" | "Harctéri gyakorlat" | "Kétkezes harc" | "Pajzshasználat" | "Pusztakezes harc" | "Pusztítás" | "Taktika" | "Vakharc" | "Vértviselet"
  // alvilagi
  | "Álcázás/álruha" | "Hamisítás" | "Jelbeszéd" | "Kocsmai verekedés" | "Méregkeverés/semlegesítés" | "Orvtámadás" | "Kínzás" | "Szabadulóművészet" | "Szerencsejáték"
  | "Lopódzás" | "Rejtőzködés" | "Zárnyitás" | "Zsebmetszés"
  // vilagi
  | "Állatismeret" | "Csapdaállitás" | "Csomózás" | "Értékbecslés" | "Futás" | "Hajózás" | "Hangutánzás" | "Helyismeret" | "Idomítás" | 'Időjóslás' | "Kocsihajtás" | "Lovaglás" | "Nyomolvasás" | "Szakma" | "Úszás" | "Vadonjárás"
  | "Akrobatika" | "Esés" | "Mászás" | "Éberség"
  // tudományos
  | "Alkímia" | "Élettan" | "Építészet" | 'Herbalizmus' | "Írás/Olvasás" | "Jog/törvénykezés" | "Legendaismeret" | "Mechanika" | "Oktatás" | "Orvoslás" | "Ősi nyelv" | "Számtan/Mértan" | "Térképészet" | "Történelem" | "Vallásismeret"
  // szociális
  | "Ékesszólás" | "Heraldika" | "Kultúra" | "Lélektan" | "Művészetek" | "Nyelvtudás" | "Párbaj" | "Politika/diplomácia" | "Szexuális kultúra" | "Színészet" | "Udvari etikett/intrika"
  // misztikus
  | "Démonológia" | "Drágakőmágia" | "Magasmágia" | "Nekromancia" | "Őselemi mágia" | "Pszi" | "Rúnamágia" | "Tapasztalati mágia";
