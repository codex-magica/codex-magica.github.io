// Attribute (Tulajdonság) descriptions — the book chapter 02 sections, incl. the value ladder.
// Shown in the attribute info modal (character sheet + attribute editor). **bold** markers are rendered.

import { Stat } from "./attributes";

export const ATTRIBUTE_INFO: Record<Stat, string> = {
  "Erő": `Ez az egyik legnyilvánvalóbb képesség, a karakter fizikai erejéről tájékoztat. Megmutatja, hogy bírja a személy a hirtelen fizikai terhelést, milyen maximális erőkifejtésre képesek izmai. A rövid izommunkával kapcsolatban használjuk, a hosszú, kevésbé intenzív, de folyamatos megterhelés mutatója az Állóképesség.

A karakter Teherbírása szintén az Ereje függvénye. Egy humanoid az Erő értékének tízszeresét ynevi fontban mérve képes megmozdítani, és annyi felszerelést képes magával cipelni maximálisan huzamosabb ideig testén megfelelően elosztva, amennyi az Ereje háromszorosa. E felett minden megkezdett öt ynevi font csomag után 1 MGT sújtja a karaktert. Azt természetesen a KM jogköre eldönteni, a karakter képzettségei és Állóképesség értéke ismeretében, hogy ezen súlyokkal mennyi ideig képes haladni vagy munkát végezni, esetleg hadakozni a karakter.

Az Erő fontos szerepet kap a közelharcban is, így a harcosok egyik meghatározó Tulajdonsága, mivel hozzáadódik a TÉ-hez, 15-ös érték fölött pedig pontonként 1 sebzést eredményez közelharci fegyverek esetén.

**1-3:** A karakter teljesen bénult vagy rokkant, netán valamilyen ártó mágia sorvasztotta el izomrendszerét. Gyakorlatilag magatehetetlen, az ágyban is alig tud felülni vagy a dolgát elvégezni. Az életben maradáshoz mások segítségére van szüksége.

**4-5:** Gyermekek bírnak ekkora értékkel, avagy kórságban szenvedő felnőttek. Fegyvert képtelen forgatni, egy hátizsák alatt már meg-megtántorodik.

**6-8:** Az illető valószínűleg írnok, számvevő vagy más tollforgató személy, netán egyszerűen már öregember.

**9-12:** Az átlagos ember, aki nem is túl izmos, nem is igazán vézna. Lógva, függeszkedésből csak kínlódva képes felhúzni magát.

**13-15:** Kiemelkedő fizikum, erőtől duzzadó karok, tiszteletet parancsoló vállak.

**16-18:** Robosztus termetével bárhol képes utat törni magának. Hivatásos verekedő vagy erőművész válhat belőle.

**19-20:** Kápráztató dolgokra képes: acélt hajlíthat meg puszta kézzel, s ütései nemritkán csontokat zúznak szét. Képességei a józan ész határait feszegetik.`,
  "Gyorsaság": `Gyorsaságon a karakter fürgeségét, reakcióinak sebességét értjük. Ez a szám megmutatja azt, hogy milyen gyorsan futhat valaki, de jellemzi a cselekvések gyorsaságát is. Tehát nem ez dönti el, hogy valaki milyen gyorsan fejt meg egy logikai feladványt, hanem hogy a karakter el tud-e ugrani egy felé száguldó lovas elől.

A Gyorsaság még egy nagyon fontos értéket, a karakter Sebességét adja meg. Ebből a Tulajdonságból számítható ki, hogy a karakter 1 kör, illetve 1 szegmens alatt mekkora távolságot képes megtenni. Minden karakter egy körben ötször annyi ynevi láb távolságot képes megtenni, mint amennyi a Gyorsaság értéke. Egyetlen szegmens alatt pedig legfeljebb a Gyorsasága felének (lefelé kerekítve) megfelelő ynevi láb távolságra juthat. Ez az érték természetesen változik, ha a karakter Gyorsasága valamilyen okból (például MGT) csökken.

Sokat számít a Gyorsaság a harcban is. Vitathatatlan szerepe van egyrészt a támadások előli kitérésben, másrészt a karakter saját támadásának eredményességében. Minél gyorsabb ugyanis a támadás, hárítása annál nehezebb. A támadás pillanatát is befolyásolja ez az érték, így a Gyorsaság hozzáadódik a KÉ-hez, továbbá a TÉ-hez és a VÉ-hez is.

**1-3:** Általában rokkantak, nyomorékok sajátja. A biztonság kedvéért mindig tartanak egy ágytálat a közelben.

**4-5:** Az ismeretlenek általában segítenek neki, mert nem győzik kivárni, amíg megtölti a boroskancsót. A lépcsők komoly kihívást jelentenek számára.

**6-8:** Mire utánakapna, a pohár már rég eltörött...

**9-12:** Az átlagos emberi érték. Az idős földműves általában félre tud ugrani, ha az asszonya megdobálja a lábosokkal az esti kimaradás miatt.

**13-15:** Remek futó vagy kiválóak a reflexei. Nem egy párbajt nyert már meg a fürgébb kardrántással.

**16-18:** Ha valaki lelöki a söröskupát az asztalról, szerencse ha ott van. Kár lenne akár egyetlen csepp drága nedűért is.

**19-20:** Hihetetlen gyors a mozgása. Kár, hogy senki nem hisz neki, amikor azt meséli, hogyan kapta el a kilőtt nyílvesszőt.`,
  "Ügyesség": `E tulajdonság alatt a mozgáskoordinációt, az egyensúlyérzéket és a kézügyességet értjük. Az agy és az izmok tökéletes összhangja szükséges az igazán finom és összetett mozgások kivitelezéséhez, s ennek mutatója az Ügyesség. Meghatározó szerepe van az alvilági képzettségek legtöbbjében, a zárnyitásban vagy a zsebmetszésben.

Fontos az Ügyesség a közelharcban, hiszen a legjobb technika is veszendőbe megy, ha a test nem azt hajtja végre, amit az elme diktál. Az Ügyesség hozzáadódik a TÉ-hez, a VÉ-hez és a CÉ-hez. Egyes százalékos képzettségek esetében az Ügyesség képezi a karakter alap százalékértékét.

**1-3:** Rokkant, bénult emberek sajátja. Egy imbolygó, rothádó élőhalott kötéltáncos hozzá képest.

**4-5:** Minél jobban igyekszik, annál rosszabb. Csak ne nyúljon semmi törékenyhez!

**6-8:** Ügyefogyott, kétbalkezes. Kiskorában mindig csúfolták, amiért sose tudta elkapni a labdát, de azért azóta se nagyon engedik számszeríj közelébe.

**9-12:** Átlagos emberi érték. Elboldogul három pohárral egy kézben.

**13-15:** Rugalmas, hajlékony, elegáns a mozgása. A nézők sosem látják, hol a csel a kártyatrükkben.

**16-18:** Bámulatos a kézügyessége, szokatlan, nem mindennapi mozdulatkora képes: az ember azt hinné, ilyen tartásból fogást kell váltani a dobótőrön ahhoz, hogy el lehessen hajítani. Pedig csak a megfelelő csuklómozdulat kérdése az egész...

**19-20:** "Az istenekre! Te láttad hogyan csinálja?" "Ez biztos varázslat, nekem elhiheted!"`,
  "Állóképesség": `Az Állóképesség a karakter kitartásának, fizikai tűrőképességének mutatója. A harcos és harcművész kalandozók fontos tulajdonsága, s szerepe van az Fp meghatározásában is. Minél magasabb az Állóképessége valakinek, annál jobban tűri a fájdalmat és a folyamatos megterhelést. Tovább tud megállás nélkül harcolni, lovagolni vagy futni; jobban ellenáll a fájdalomnak és a hidegnek.

Az átlagnál jóval alacsonyabb Állóképességűek már rövidtartam futás vagy munka után is kifulladnak, arcuk kipirul, izmaik fájdalmasan sajognak. Az átlag 12-es érték ebben az esetben is a hétköznapok emberének felel meg. A 18-as vagy annál nagyobb Állóképesség lehetővé teszi több tucat mérföld lefutását, 25-30 percnyi aktív küzdést, nehéz terhek folyamatos cipelését.

Az Állóképesség adja a karakter Fájdalomtűrés pontjait, az Akaraterő értékével együtt.

**1-3:** Képtelen akár a szobán is átkúszni.

**4-5:** Hamar elfárad, az ilyen alacsony érték általában a korral jár.

**6-8:** Ha napközben gyakran leülhet pihenni, délután pedig tarthat egy párórás sziesztát, egész jól bírja a hétköznapokat.

**9-12:** Az átlagos emberi érték. Gond nélkül elsétál a szomszéd faluba és vissza, egész nap kint dolgozik a földeken, de a hosszú, megerőltető feladatoktól ő is kifárad.

**13-15:** Kiemelkedő a kitartása. A többiek már rég feladták volna, de ő a második napot is végiglovagolja. Nem hiába lett a Vittadora Postakocsi-szolgálat gyorsfutára.

**16-18:** Lenyűgöző mire képesek ezek az emberek. Az órákon át tartó futást pár perc alatt kipiheni, az egész napos ostromot mellvértben tölti a gyilokjárókon.

**19-20:** Tetteiről legendákat zengenek, "Vasember" mondogatják.`,
  "Karizma": `A Karizma egyik összetevője a karakter fizikai szépsége, ugyanakkor nem teljesen egyenlő azzal. Magában foglalja a vezetőkészséget, a tekintélyt, megjelenést, hanghordozást, magabiztosságot is.

A nagy Karizma segít a kapcsolatteremtésben, különösen ha az ellentétes nem képviselőjével kíván összeismerkedni a karakter, de szintén elengedhetetlen a politika területén, vagy a kényes szituációkból való kimagyarázkodáshoz. A nagy Karizma igazi értéke számmal nem igazán mérhető, de meg kell mutatkoznia a szerepjátékban. Általában a nemesen született karakterek, valamint lovagok, papok, szerencsevadászok (különösen a bárdok) szinte létfontosságú Tulajdonsága.

Fontosságára minden játékos rendszerint később ébred rá, mint a többi Tulajdonság értékére, mert csak a játék közben mutatkozik meg igazi jelentősége.

A rendkívül alacsony Karizma sokszor megbosszulja magát a karakter életében: sokan bizalmatlanok lesznek vele szemben, szélsőséges esetben kimondottan ellenségesen bánnak vele.

**1-3:** "Kotródj innét! Úgy rohad az arcod, menten hányingert kapok... itt ugyan nem kapsz italt, még elriasztod a vendégeimet!"

**4-5:** Mondhatni, nem túl épületes látvány. Természetes érték nem lehet ilyen alacsony.

**6-8:** Az illető látványos testi fogyatékossággal bír: púpos, kancsal és ráadásul erősen gátlásos, társaságban képtelen megszólalni.

**9-12:** Sosem volt a nők bálványa, de nem is igen volt oka panaszra. Ha ki kell állni az emberek elé, általában nem ő viszi a szót.

**13-15:** Igen vonzó hölgy, esetleg férfiember, könnyen elegyedik szóba másokkal, ritkán marad fedél és hálótárs nélkül, ha ismeretlen helyre vetődik.

**16-18:** Nem pusztán férfias és jóképű. Van a mozgásában, a hangsúlyában valami, aminek a nők képtelenek ellenállni. Szinte sugárzik belőle az ösztönös magabiztosság, ami csak a nagyragadozók sajátja.

**19-20:** Az emberek csak nehezen tudják kivonni magukat személyisége befolyása alól. A gyengébb jellemekben akár fanatikus rajongás is kialakulhat, de nincs ember, akit hidegen hagyna megjelenése.`,
  "Egészség": `Ez a tulajdonság jellemzi a karakter ellenálló képességét betegségekkel, mérgekkel és sérülésekkel szemben. Értéke nem függ össze a fizikai erővel, inkább a szervezet belső egyensúlyának harmóniájával, a jó kondícióval.

A nagyon alacsony Egészségűek sokszor betegszenek meg, gyengének érzik magukat, s a mérgek is nagyon súlyosan hathatnak rájuk. Magas Egészség értékkel viszont a köznapi kórok többsége elkerüli a karaktert, a romlott étel sem jelent mindig gondot, szinte vasgyomorral táplálkozhatnak.

Az Egészség Tulajdonság 10 feletti részével állhat ellen a karakter a mérgeknek és betegségeknek, továbbá az Egészség adja a karakter Ép-jét.

**1-3:** Általában halálos kórok végső stádiumában szenved így az ember. Szerencsére nem sokáig.

**4-5:** Gyakorlatilag állandóan beteg. Csak gyógynövények, teák és egyéb készítmények, netán mágia tartja életben. Immunrendszere annyira gyenge, hogy az első betegség is szinte halálos kimenetelű lehet számára.

**6-8:** Nagyon sokat betegeskedik. Egész télen náthás, tavasztól őszig pedig valami fránya növény miatt prüszköl állandóan. Az orvos hetente, havonta látogatja, s ha meleg ruházat nélkül megy ki a szélbe, biztosra veheti a másnapi tüdőgyulladást. A közeledő hideg időtől mindig sajog a dereka.

**9-12:** Átlagos emberi érték. A betegségek egy részét elkapja, a másik felét elkerüli. Azért jobban teszi ha az esti duhajkodás után a hajnal már fedél alatt találja és nem az ajtó előtt.

**13-15:** Kiemelkedő az ellenállóképessége. Idejét sem tudja mikor volt utoljára beteg, sebei gyorsan és könnyedén gyógyulnak.

**16-18:** A másnaposságot, betegségeket csak hírből ismeri. Romlott étel vagy más áfiumok nehezen döntik le a lábáról. Kora tavaszi reggeleken felfrissülésképpen néha vesz egy gyors fürdőt a folyóban.

**19-20:** A szervezete vasból van. Szinte bármilyen sérülést képes túlélni.`,
  "Intelligencia": `A karakter mentáltestét a könnyebb kezelhetőség végett két különböző tulajdonságra osztja fel a M.A.G.U.S. rendszere: az Intelligenciára és az Akaraterőre. Előbbi a gondolkodási képességet, az események logikus rendszerének átlátását és globális szemléletű világkép kialakítását teszi lehetővé. Elengedhetetlen a mágiahasználók számára, de a papok és boszorkánymesterek is híresek lehetnek magas Intelligenciájukról. A tények logikus egymásután fűzésén, teóriák és önálló vélemény kialakításán kívül az Intelligencia nagysága hatással van a Pszi pontok számára is.

Az Intelligencia adja a karakter induló Kp-ját és a Pszi pontját.

**1-3:** A karakter értelmi szintje egy nyáladzó idiótáé, személyisége (ha lehet ilyesmiről esetében egyáltalán beszélni) nem emelkedik túl az állati ösztönök kusza halmazán.

**4-5:** Intelligenciája már meghaladja egy jól fejlett karórépa szintjét. Három réz. Nem érted? H-Á-R-O-M. Mindegy, hagyjuk. Add ide amennyid van..."

**6-8:** Kisgyermekek vagy szenilis vénemberek sajátja. A karakter ritkán veszi szívére ha csúnyán átejtik, mivel rendszerint nem is veszi észre.

**9-12:** Az átlagos emberi érték, a józan paraszti ész. A szemenszedett hazugságokon átlát, a logikai fejtörők jó részét hosszas gondolkozással bár, de megoldja. Mágiaelméleti és elvont matematikai vitákba azért ne bocsátkozzon.

**13-15:** Figyelemre méltó intelligencia. Ravasz fickó, pontosan tudja mennyivel okosabb másoknál, és épp ezért azt is tudja jól, jobban teszi, ha ezzel nem kérkedik, inkább kihasználja.

**16-18:** Kiemelkedő szellemiség, a dolgokat összefüggéseiben vizsgáló és rendszerező elme. Mindenben az okokat és a következményeket vizsgálja, hamar felfedezi a párhuzamokat, átlátja a bonyolultabb összefüggéseket.

**19-20:** Ha valamivel korábban születik, valószínűleg ő találja fel a Menzini sakkot.`,
  "Akaraterő": `A Mentáltest másik összetevője az Akaraterő. Lényeges szerepe van az agy felsőbbségének fenntartásában a test igényeivel szemben, legyen az valamely kísértés vagy a testi kínzás. Meghatározza továbbá, hogy a karakter mennyire ura érzelmeinek, képes-e hidegvérrel mérlegelni, félretenni érzéseit és csupán eszére hagyatkozni. A fájdalom eltűréséhez is ez adja a lelki, szellemi alapot, a fizikait pedig az Állóképesség.

Az Akaraterő hozzáadódik a karakter Fp-jéhez, illetve a lelkierő ilyen, tudatos megjelenése mellett komoly szerepe van a Mentáltest védelmében is, mert ez képezi a karakter tudatalatti Mágiaellenállását a mentális támadások ellen.

**1-3:** Ösztönlény. Elhatározásai ritkán tartanak perceknél tovább. Önkontrollja egyáltalán nincs, gyakorta cserélik alatta a lepedőt.

**4-5:** Életét dührohamok és sírógörcsök félórárankénti váltakozása tölti ki. Képtelen rászánni magát bármi hasznos vagy önálló cselekvésre. Pillanatok alatt elbizonytalanodik, ha bárki visszakérdez: "Biztos?"

**6-8:** Az érzelmeinek rabja. Apró ingerlésre is hevesen reagál, képtelen valamire huzamosabb ideig koncentrálni. Könnyedén meggyőzhető bármiről, ha elég sokat és elég erélyesen bizonygatják.

**9-12:** Az átlagos emberi érték. Ha nagyon muszáj, bármiré rászánja magát, nehéz felingerelni, de ha magával ragadja a hév, képtelen uralkodni magán. Hagyja magát sodorni az eseményekkel, s csak ritkán képes elég elszántságot összegyűjteni, hogy kezébe vegye saját sorsát.

**13-15:** Nem mindennapi önuralommal rendelkezik. A szélsőségek néha még magukkal ragadják ugyan, ám általában józan eszére hallgat.

**16-18:** Az akarat győzelme az érzelmek felett. Hidegvéréből, nyugalmából semmi sem tudja kizökkenteni.

**19-20:** Az önuralom csúcsa. Érzelmeit régen levetkezte már. Ő az, akire valóban igaz a mondás: "Csak akarnia kell..."`,
  "Asztrál": `A karakter asztráltestének jellemzésére szolgáló érték. Az érzelmi gazdagság, a lelki harmónia mértéke; minél nagyobb, annál nyitottabb a karakter mások érzelemvilágára.

> *Egy kiforrott lelkivilággal rendelkező egyéniséget sokkal nehezebb mágia útján érzelmileg befolyásolni, mint azt, aki közel sem fordít annyi figyelmet saját vagy mások érzéseire. Őket könnyebb is haragra, gyűlöletre vagy éppenséggel megbékélésre kényszeríteni. Így az Asztrál képezi a karakter tudatalatti Mágiaellenállását az asztrális támadások ellen.*

**1-3:** Lelki társát régen meglelte csizmatalpa képében. Érzelemvilága nem terjed túl a puszta vegetatív léten.

**4-5:** Érzelemvilágának kifinomultsága az állati ösztönök szintjén mozog.

**6-8:** A legtöbb nő a fejéhez vágta már: "Érzéketlen tuskó!" Lelkivilága sivárságát mi sem példázza jobban, mint hogy ez egy cseppet sem érdekli. Sekélyes, középszerű jellem.

**9-12:** Átlagos emberi érték. Az érzelmek, emberi kapcsolatok fontosak számára, de néha értetlenül áll mások reakciói előtt.

**13-15:** Az árnyalatok már fontosak számára, érzelmei gazdagok, amolyan művészlélek; kár hogy csak képzeli magáról.

**16-18:** Valódi művészlélek. Nem csak fejlett az esztétikai érzéke, de szépség utáni vágyát alkotás útján is képes kifejezésre juttatni. Empátiájával nem csak befogadni képes mások érzéseit, de azokra igen finoman reagálni is tud.

**19-20:** "Nézz a szemembe, megmondom ki vagy."`,
  "Érzékelés": `Mint a nevéből is következik, az érzékszervek működésére, hatékonyságára, összehangoltságára valamint a helyzetfelismerés sebességére is utal, ami alatt nem a tudatos gondolkozást, hanem az ösztönös veszélyfelismerést értjük.

Ugyan nem létfontosságú, ám igen hasznos képesség. Ha ez az érték alacsony, az azt jelzi, hogy a karakter szétszórt, figyelmetlen, felületes szemlélő. Nem veszi észre, ha követik. Nem fedezi fel az ágy mellé ejtett kulcsokat, nem veszi észre, ha az éjjeli erdőben hirtelen elhallgatnak az állatok.

Az érzékelés hozzáadódik a karakter KÉ-jéhez, CÉ-jéhez és ez képezi egyes százalékos Képzettségek esetében a karakter alap százalékértékét.

**1-3:** Csakis valamely testi fogyatékossággal rendelkezők sajátja (süketnéma stb.)

**4-5:** Csak bambán néz ki a fejéből és retteg. A külvilág számára egy nagyon távoli, ismeretlen, veszélyes valami.

**6-8:** Szétszórt, figyelmetlen. Az ilyen emberek gondolkodás nélkül ráülnek a széken felejtett holmikra, belekönyökölnek a borfoltba vagy hosszú pecekig keresik az asztalon, a zsebükben felejtett kulcsot.

**9-12:** Az átlagos emberi érték. Minden érzékszerve az emberi normának felel meg.

**13-15:** Jó megfigyelő. Pillanatok alatt kiszúrja az oda nem illő dolgokat, a szeme sarkából képes figyelni az őt követő alakot.

**16-18:** A legtöbb ember már csak azt veszi észre, hogy mozdul, nem pedig azt, hogy mi miatt.

**19-20:** "Figyelnek minket. Érzem."`,
};
