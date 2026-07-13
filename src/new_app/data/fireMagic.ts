export type FireMagicType =
  "Alapvető tűzmágiák"
  | "Védőmágiák"
  | "Iskolaformák"
  | "Szabad elemi formák"
  | "Tűzmágia magasiskolája"
  | "Közönséges tüzek befolyásolása"
  | "Őstüzek befolyásolása"
  | "Tűzlények idézése"

export interface FireMagicInfo {
  name: string
  type: FireMagicType
  castingTime: string
  duration: string
  cost: string
  combatModifier?: string
  size?: string
  description: string | string[]
}

export const FireMagicValues: FireMagicInfo[] = [{
  name: "Tűzgyűjtés",
  type: "Alapvető tűzmágiák",
  cost: "3",
  castingTime: "1 p",
  duration: "Korlátlan",
  description: "A metódus a tűz azon nyilvánvaló tulajdonságát használja ki, hogy fókuszálja a Világegyetemben természetes formában jelenlévő mágikus szubsztanciát, a manát. Ennek kinyerésére a tűzvarázslók a transz egy formáját használják, egy ősi godoni diszciplína tökéletlenül fennmaradt változatát, mely ma már csak managyűjtésre használatos. Bizonyos tekintetben hasonlít a Pszi Pyarroni módszerének Transzához, ám annál sokkal mélyebb tudatállapotba ragadja alkalmazóját. Elméletileg bármely varázstudó felhasználhatná managyűjtésre, de Ordan tűzvarázslói féltékenyen őrzik elsajátításának titkát.\n\nA diszciplína segítségével a tűzvarázsló mély transzállapotba kerül. Ehhez 1 percig mozdulatlanul meditál, s teljes akaratával az elmélyülésre összpontosít. Az idő leteltével transzba kerül, s csak ekkor veszi kezdetét - továbbra is ebben a tudatállapotban - a Mana pontok begyűjtése. A tűzvarázsló csak akkor képes egy tűz manafókuszáló tulajdonságát kiaknázni, ha a tűz fényerején belül tartózkodik\n\na távolságról a tűz erősségének függvényében az alábbi táblázat tudósít. A tűz manafókuszából a tűzvarázsló 1 perc alatt annyi Mana pontot képes az elméjébe gyűjteni, amennyi a Tapasztalati szintje, plusz a tűz- vagy a hőhatás Erőssége (E). Ha az adott fényudvaron belül több tűz is elhelyezkedik, úgy erősségük nem adódik össze, csak a legerősebb érvényesül. Legkevesebb 1 E tűzerősség szükséges, tűz nélkül vagy kisebb erősítésnél a manakinyerés nem történik meg.\n\nA Tűzgyűjtés nem alkalmazható olyan tűz vagy tűzhely mellett, melyen papi Áldás vagy Szertartás varázslat hat, továbbá szent tüzekből. Szintén sikertelen, ha a tűz nem folyamatos, megszakad vagy elalszik. Utóbbi esetben a megszakadásig begyűjtött Mana pontok megmaradnak, de a meditációt újra kell kezdeni - elsőként is a kialudt tűz meggyújtásával, majd újabb Ψ-pontok feláldozásával.\n\nA transzállapot elérésére és további fenntartására a végrehajtónak percenként 3 Ψ-pontot kell áldoznia. A Tűzgyűjtés ideje alatt nem végezhet semmilyen fizikai vagy szellemi tevékenységet, mozdulatlanul ül. Magától bármikor visszatérhet a köznapi tudatállapotba, de külső erők nem képesek kizökkenteni: hiába beszélnek hozzá, rázzák stb., a külső jelekből nem érzékel semmit. Transzát megszakítani csak Fp- vagy Ép-veszteség okozásával lehet, ekkor az addig begyűjtött Mp-k megmaradnak.\n\nPélda: egy 2. szintű tűzvarázsló egy tábortűz (3 E) hatósugarán (fényerősségén) belül meditálva percenként 5 Mana pontot gyűjthet az elméjébe. Ha maximális Mana pontja 15 és az összes hiányzik - a teljes Tűzgyűjtés ideje 4 perc lesz és 9 Ψ-pontba kerül."
}, {
  name: "Fellobbanó láng",
  type: "Alapvető tűzmágiák",
  cost: "5",
  castingTime: "1 kör",
  duration: "6 kör",
  description: "A varázslat befejeztekor a tűzvarázsló a Zónáján belül eső területen tízszer annyi pontot jelölhet meg, mint amennyi a Tapasztalati szintje. Ezen pontok mindegyikén apró Őstűz lángnyelv lobban fel, s a varázslat időtartama alatt éghető anyag híján sem enyészik el."
}, {
  name: "Időzített tűzteremtés",
  type: "Alapvető tűzmágiák",
  cost: "18",
  castingTime: "2 p",
  duration: "6 kör",
  description: "A varázslat mindenben hasonlít a Tűzteremtésre. A különbség az, hogy az Időzített lángteremtés varázslathoz hasonlóan a varázsló megjelölheti az időpontot (egy másodperctől az örökkévalóságig), amikor a varázslat aktivizálódik, és a tűz felcsap. A helyet bal hüvelykujjának érintésével kell megjelölnie, s ahol halovány, lángnyelvet mintázó varázsjel keletkezik."
}, {
  name: "Tűztáncoltatás",
  type: "Alapvető tűzmágiák",
  cost: "4",
  castingTime: "1 szegmens",
  duration: "6 kör",
  description: "A varázslás befejeztével a tűzvarázsló a Zónáján belül eső területen képes lesz minden természetes tüzet befolyásolni. (Természetesnek minősül az olyan tűz, melynek lángjait\n\ngyúlékony anyagok táplálják és nem Őselemi elvek alapján lobog - azaz semmilyen varázslattal létrehozott tűz nem tekinthető természetesnek; míg az ennek nyomán elharapózó, éghető anyagok táplálta lángok már igen!).\n\nA befolyásolás annyit tesz, hogy a tűzvarázsló a lángokat eredeti méretük felére csökkentheti, vagy duplájára nyújthatja, mi több, meghatározhatja a tűz továbbterjedésének irányát is. Ennek sebessége körönként 1 ynevi láb."
}, {
  name: "Tűzelemzés",
  type: "Alapvető tűzmágiák",
  cost: "2",
  castingTime: "1 szegmens",
  duration: "Egyszeri",
  description: "A tűzvarázsló a varázslat segítségével egy, a Zónáján belül lévő, működő tűzvarázslatról szerezhet információkat: megtudhatja Erősségét és Időtartamának hosszát. A tűzvarázsló tisztában lesz a tűz természetes vagy mágikus mivoltával is."
}, {
  name: "Tűzészlelés",
  type: "Alapvető tűzmágiák",
  cost: "1",
  castingTime: "1 szegmens",
  duration: "Egyszeri",
  description: "A tűzvarázsló meg tudja állapítani, hogy a Zónájában az adott pillanatban egyidejűleg hány darab, és mekkora Erősségű természetes eredetű és leplezetlen Őstűz lobog."
}, {
  name: "Tűzteremtés",
  type: "Alapvető tűzmágiák",
  cost: "3",
  castingTime: "3 szegmens",
  duration: "6 kör",
  description: "A varázslat segítségével a tűzvarázsló nem apró lángnyelvet, hanem egy tábortűz méretű máglya lángját teremti meg. Az éghető anyagok nyomban meggyulladnak, és a környékén komoly hőhatás is érzékelhető."
}, {
  name: "A Szalamandra bőre",
  type: "Védőmágiák",
  cost: "2",
  castingTime: "5 szegmens",
  duration: "6 kör",
  description: "Akin a tűzvarázsló e varázslatot végrehajtja, az az időtartam lejártáig képes lesz ellenállni a hőhatásoknak. Ez Erősségenként 100 Celsius-fokos hőséget jelent, valamint minden egyes E 1-es Sebzésfelfogó értéket biztosít tűzhatások sebzésével szemben. Vagyis: 1 E esetén 100 fokos hőségben tartózkodhat büntetlenül, és 1-et vonhat le minden tűzalapú sebzésből. 2 E estén 200 fok, 2 SFÉ; 3 E esetén 300 fok, 3 SFÉ stb.\n\nA tűzvarázsló a varázslatot bárkin végrehajthatja, aki a Zónáján belül tartózkodik, ám egyszerre csak egyetlen személyen. Az illető felszerelése, ruhái és egyéb tárgyai nem élvezik a védelmet. Ha saját magán alkalmazza, különleges képességei (Tűzelnyelés, Tűzelvonás) zavartalanul működnek."
}, {
  name: "A Sárkány pikkelye",
  type: "Védőmágiák",
  cost: "4",
  castingTime: "1 kör",
  duration: "6 kör",
  description: "Akin a tűzvarázsló a varázslatot végrehajtja, az Időtartam lejártáig képes lesz ellenállni az elemi és közönséges tüzeknek, illetve a hőhatásoknak. A varázslat minden E-je egy E-t semlegesít a tűzalapú hatás Erősségéből. A védelemnek feszülő varázslatok és tüzek nem gyengülnek le, csak a varázslat védettjére hatnak gyengében. A védelem mindenre kiterjed, ami a Személyes Aurához tartozik. Ha a tűzvarázsló magára alkalmazza, úgy különleges képességei (Tűzelnyelés, Tűzelvonás) zavartalanul működnek, tehát a tüzek eredeti erősségének megfelelően. A sebzést előbb a varázslat csökkenti, a különleges képességek védelme csak eztán vonandó le - vagyis a védelmek összeadódnak. A varázslat bárkin végrehajtható, aki a Zónán belül tartózkodik, ám egyszerre csak egyetlen személyen."
}, {
  name: "A Sárkánykirály pikkelye",
  type: "Védőmágiák",
  cost: "40",
  castingTime: "1 p",
  duration: "10 p",
  description: "Hasonló A sárkány pikkelye varázslathoz, de jelen esetben a varázslat alanya teljesen sebezhetetlenné válik a tűz és a hő minden megjelenési formájával szemben - legyenek azok bármekkora Erősségűek (E). Ha a tűzvarázsló magán alkalmazza, úgy a Tűzelnyelés és a Tűzelvonás különleges képességeit a varázslat időtartama alatt nem tudja használni. Ekkor csak a hagyományos godoni managyűjtéssel és a Tűzgyűjtéssel kísérletezhet, ám még ezek is fele hatékonysággal (kétszeres időtartammal) alkalmazhatók. Emellett a mana-források is kiaknázhatatlanokká válnak számára."
}, {
  name: "Tűzaura",
  type: "Iskolaformák",
  cost: "6",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "A varázslat befejeztekor a tűzvarázslót - vagy azt a kizárólag egyetlenegy, Zónáján belül tartózkodó személyt, akit meghatároz - Tűzaura veszi körül. Ez úgy hat, mint valami lángokból álló vértezet: beborítja, védelmezi az illetőt. Testétől mintegy tíz ynevi hüvelyk távolságra lobog, védettjét a mozgásban és a látásban egyáltalán nem akadályozza, és nem is sebzi; mi több, a ruháit, tárgyait sem lobbantja lángra; befelé semmilyen hőhatást nem fejt ki. Ellenben azoknak, akik az Aura védettjét megérinteni, puszta kézzel megütni szándékoznak - vagyis az Aurán átnyúlni kívánnak - égési sebet okoz, valamint a kívülről behatoló éghető anyagokat lángra lobbantja. Ez a sebzés minden benyúlási kísérlet esetén Erősségenként 1k6 Sp."
}, {
  name: "Tűzcsóva",
  type: "Iskolaformák",
  cost: "5",
  castingTime: "1 szegmens/E",
  duration: "1 kör",
  description: "A Tűzkitörés különleges változata, s ebből következően főként támadásra használható. A tűzvarázsló itt is összesűríti az általa létrehozott elemet, ami azonban nem a tér minden irányában, hanem egyetlen irányított Csóvában tör ki. A Csóva mindig a végpontján éri el az 1 ynevi lábnyi átmérőt.\n\nA Csóvába formázott elem Erőssége (E) az első lábon annyi, amennyi a teremtett elem erőssége, attól kezdve pedig ynevi lábanként eggyel csökken (akár a Kitörésnél). Ebből máris kiviláglik, hogy a Csóva annyi láb hosszú, amennyi az Erőssége. A másik szembeötlő különbség a Kitöréshez képest, hogy a Csóva időtartama nem egyszeri, hanem egy teljes kör. Ez idő alatt a teremtett elem folyamatosan áramlik a Csóva kiindulási pontjától a végpontjáig.\n\nA tűzvarázsló, mikor a mágikus igék elkántálása és rúnák felrajzolása után létrehozta a varázslatot még köteles meghatározni a Csóva irányát, amerre az idézett Őstűz majd kitör. A Csóvát később már nem irányíthatja új célpontra."
}, {
  name: "Tűzfal",
  type: "Iskolaformák",
  cost: "8",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "E varázslattal a tűzvarázsló a Zónáján belül létrehozhat egy fél ynevi láb vastag, 2 ynevi láb sugarú függőleges Tűzfalat - ami valójában egy félbevágott, függőleges Tűzszőnyeg. Alsó vonala követi a terep egyenetlenségeit.\n\nA Tűzfal lángra lobbant minden éghető anyagot, ami belekerül, és körönként a varázslat minden egyes E-je után 1k6 Sp sebet okoz azoknak, akik érintkeznek vele, vagy rajta keresztülhatolni kívánnak.\n\nA Mana pontok többszörözésével az Időtartam és az Erősség igen, a Tűzfal mérete nem növelhető."
}, {
  name: "Tűzkard",
  type: "Iskolaformák",
  cost: "6",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "A varázslattal a tűzvarázsló lángokkal övezheti egy tetszés szerinti formájú fegyvert. A tűz körülöleli a pengét - akár a Tűzaura az embert -, és a fegyver sebzésén túl égési sebeket okoz, valamint lángra lobbantja a gyúlékony anyagokat, melyeket megérint.\n\nA Tűzkardot a markolatánál bárki megfoghatja és forgathatja; a harc során éppúgy viselkedik, akár egy hétköznapi fegyver: támadni szükséges vele, s éppúgy használható védekezésre is - a Harcrendszer szabályai szerint. Sebzés csak sikeres támadás esetén éri az áldozatot: a fegyver eredeti sebzésén túl a varázslat minden egyes E-je után 1k6 Sp. Azonban túlütés esetén csak a fegyver sebez automatikusan Ép-t, a tűzvarázslat nem!"
}, {
  name: "Tűzkitörés",
  type: "Iskolaformák",
  cost: "5",
  castingTime: "1 szegmens/E",
  duration: "Egyszeri",
  description: "A tűzvarázsló a Zónáján belül eső területen meghatározhat egy tetszés szerinti pontot, amely a robbanás epicentrumaként fog szolgálni. A robbanás mindazoknak, akik a középpont 1 ynevi láb körzetén belül tartózkodnak, minden E után 1k6 sebet fog okozni. Ha a tűzvarázsló a tűzkitörést - több Mp felhasználásával - nagyobb erősséggel idézi meg, akkor már a távolabb állók is részesülnek a hatásából - minél távolabb tartózkodnak, annál kevésbé. A sebzés az epicentrumtól távolodva lábanként 1k6-tal csökken."
}, {
  name: "Tűznyíl",
  type: "Iskolaformák",
  cost: "4",
  castingTime: "1 szegmens/E",
  duration: "Egyszeri",
  description: "A tűzvarázsló bal kezének mutatóujjából Tűznyíl csap elő. Ezzel akkor találja el ellenfelét, ha sikeres Célzó Dobást tesz. A Tűznyíl CÉ-je 30, amihez a tűzvarázsló fegyver nélküli CÉ-je is hozzáadódik, sebzése pedig Erősségenként 1k6 Sp."
}, {
  name: "Tűzszőnyeg",
  type: "Iskolaformák",
  cost: "8",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "A varázslattal a tűzvarázsló egy 5 ynevi láb sugarú körben fél ynevi láb magas Tűzszőnyeget hoz létre. Ezt úgy a legegyszerűbb elképzelni, mint egy hosszú szárú fűvel benőtt területet - csakhogy a fűszálak itt lobogó lángnyelvek. Mindazok, akik ebbe belekerülnek vagy belelépnek, a varázslat minden egyes E-je után körönként 1k6 Sp sebet szenvednek. Minden éghető anyag, melyet a szőnyeg lángnyelvei érnek, tüzet fog.\n\nA Tűzszőnyegnek csupán Erőssége és Időtartama növelhető, mérete nem."
}, {
  name: "Tűzgolyó",
  type: "Szabad elemi formák",
  cost: "6",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "A varázslat utolsó igéjének elhangzása után 1 ynevi láb átmérőjű Tűzgolyó jön létre a tűzvarázsló Zónáján belül eső, tetszés szerinti ponton. A tűzvarázsló a Zónáján belül az időtartam lejártáig tetszés szerint mozgathatja a golyót, mely körönként 20 ynevi lábat képes megtenni. Belsejében iszonyú forróság uralkodik - akit megérint, E-nként 1k6 Sp-t szenved el. Ha az áldozatok félreugrani igyekszenek a Tűzgolyó útjából, sikeres Gyorsaságpróbát kell tenniük, hogy elkerülhessék."
}, {
  name: "Tűzgyűrű",
  type: "Szabad elemi formák",
  cost: "6",
  castingTime: "1 szegmens/E",
  duration: "4 kör",
  description: "A varázslat létrejöttekor a tűzvarázsló egyetlen mozdulattal kijelöl egy 3 ynevi láb átmérőjű körívet, ahol Tűzgyűrű keletkezik, melynek lángnyelvei maximum húsz ynevi hüvelyk magasak. Mikor bárki vagy bármi áthatolni kíván a gyűrűn, a tűz felcsap és lángba borítja a behatolót. Az éghető anyagok nyomban meggyulladnak, az élőlények Erősségenként 1k6 Sp sebet szenvednek el."
}, {
  name: "Tűzhenger",
  type: "Szabad elemi formák",
  cost: "5",
  castingTime: "1 szegmens/E",
  duration: "6 kör",
  description: "A varázslat hatására a tűzvarázsló Zónáján belül bárhol egy 3 ynevi láb hosszú, 1 ynevi láb magas Tűzhenger keletkezik, s gurulni kezd. Haladásának iránya nem befolyásolható, az kizárólag a domborzati viszonyoktól függ. A henger haladási sebessége 10 lépés körönként. 6 kör múltán magától eltűnik, de amerre elhaladt, az éghető anyagok lángra kapnak - így a tűz könnyen elharapózhat. Akit a tűzhenger elér, az a varázslat minden egyes E-je után 1k6 Sp égési sebet szenved el."
}, {
  name: "Tűzhullám",
  type: "Szabad elemi formák",
  cost: "12",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "A varázslat létrejöttekor gyűrű alakban egyre erősebb lánghullámok indulnak útnak a középpontban álló tűzvarázsló felől, aki bal nyitott tenyerével a föld felé sújtva indítja útnak a lángokat, egészen Zónájának határáig (20 ynevi láb). A hullámok 1 kör alatt megteszik ezt a távolságot, és minden útjukba eső éghető anyagot lángra lobbantanak. Minden körben egy-egy új hullám születik, az első annyiszor 1k6-ot sebez, amennyi a varázslat E-je, a második hullám 1k6-tal többet, a harmadik újabb 1k6-tal többet, és így tovább, az Időtartam végeztéig."
}, {
  name: "Tűzzápor",
  type: "Szabad elemi formák",
  cost: "10",
  castingTime: "1 szegmens/E",
  duration: "3 kör",
  description: "A varázslat hatására a tűzvarázsló Zónáján belül a levegőben 20 ynevi láb magasan lángfellegek jelennek meg, melyekből 3 körön keresztül tűzzápor hull a földre. Az érintett terület 5 ynevi láb sugarú kör. Mindenki, aki ezen belül tartózkodik, körönként 1k6 Sp-t veszít - a vértek SFÉ-tényezője azonban ilyenkor is érvényesül."
}, {
  name: "Sárkány lehelete",
  type: "Tűzmágia magasiskolája",
  cost: "8",
  castingTime: "1 szegmens/E",
  duration: "30 kör",
  description: "A varázslat segítségével a tűzvarázsló az időtartam alatt három alkalommal lángot képes fújni a szájából, akárcsak az erről nevezetes sárkányok. A tűzcsóva egy láb széles és annyi ynevi láb hosszú, amennyi a varázslat Erőssége. E-nként 1k6 sebzést okoz."
}, {
  name: "Tűz ropogása",
  type: "Tűzmágia magasiskolája",
  cost: "15",
  castingTime: "üzenet hossza",
  duration: "Egyszeri",
  description: "A tűzvarázsló ezzel a varázslattal valamely általa jól ismert személlyel veheti fel a kapcsolatot. A rövid üzenetet (maximum egy perc) valamely tűz (akár egy mécses is elegendő) lángjába kell elsuttognia. A szöveg, ha akad bármekkora, akár gyertyányi láng az üzenet címzettje közelében, azonnal kézbesítődik, mintha a lángok suttognának a távoli helyen. Ha azonban a célpont közelében nincsenek lángok, akkor a varázslat az üzenetet egészen addig tárolja, míg amaz tűz közelébe nem kerül.\n\nA lángok üzenetét bárki meghallhatja, ha elég közel áll a tűzhöz, ezért titkokat ritkán bíznak erre a kihallgatható közlésformára. Ordan nagyjaira azonban jellemző, hogy ellenfeleiknek, az esetlegesen renegáttá vált társaiknak is efféleképpen üzenik meg a Rend ítéletét."
}, {
  name: "Fémizzítás",
  type: "Tűzmágia magasiskolája",
  cost: "6",
  castingTime: "1 szegmens/E",
  duration: "1 kör/E",
  description: "A tűzvarázsló bármely, a Zónáján belül eső nem mágikus fémtárgyat megjelölhet a varázslat célpontjául (de egyszerre csak egyet), mely ettől kezdve rohamos sebességgel forrósodni kezd. Az első körben még csak éget, a másodikban sötétvörösen, a harmadikban sárgán, a negyedikben fehéren izzik, az ötödikben megolvad, a hatodikban pedig már képlékennyé válik. Ha az érintett tárgyat valaki a testén viseli, akkor minden körben annyiszor 1k6 Sp-t veszít, ahányadik az adott kör a fentebb ismertetett fokozatok sorában.\n\nAbban az esetben, ha a tárgy kikerül a tűzvarázsló Zónájából, vagy az Időtartam lejár, körönként egy fokozatot hűl - és ennek megfelelően továbbra is sebez. Természetesen, ha újra izzítani kezdik, a folyamat nem elölről, hanem az éppen aktuális fokozattól folytatódik."
}, {
  name: "Forró nyom",
  type: "Tűzmágia magasiskolája",
  cost: "20",
  castingTime: "2 kör",
  duration: "1 nap",
  description: "A tűzvarázslók nem csak a tűz feletti uralmukról, de az egyes szektáik közötti békétlenkedésekről is híresek. Ez a mágikus praktika is ezen viszálykodások eredményeképpen született. A varázslat segítséget ad a tűzvarázslók számára, hogy valamely személy nyomára bukkanhassanak, akinek valamely fontos, személyes tárgya (szimpatikus viszony fennállása szükséges) a birtokukban van. A varázslat végrehajtása nyomán a személyes tárgyat, vagy annak egy darabját tűzbe vetik, majd követik az abból felszálló füstöt, mely, ha még nem jutott a varázslat hatótávján túl az üldözött, akkor a nyomára vezeti a tűzvarázslókat. A füstkígyó maximum vágtató ló sebességével követi a célpontot, de semmiféleképpen nem távolodik el 20 ynevi lábnál jobban megidézőjétől.\n\nA varázslat hatótávja, tehát amilyen messziről még megtalálja célpontját a füstkígyó a megidézője minden Tapasztalati szintje után 20 ynevi mérföld. A füstkígyó maximum egy napig követi a célpontot, aztán szétoszlik, ellenben újból megidézhető, hacsak az áldozat ki nem ért a hatótáv jelentette veszélyzónából."
}, {
  name: "Hamvasztó tekintet",
  type: "Tűzmágia magasiskolája",
  cost: "10",
  castingTime: "1 szegmens/E",
  duration: "6 kör",
  description: "A varázslat létrejöttével a tűzvarázsló az időtartam lejártáig képes arra, hogy tekintetével megperzselje azokat a Zónáján belül eső tárgyakat, amelyekre pillant. Ez az éghető anyagokat nyomban lángra lobbantja, a kevésbé éghetőeket pedig megperzseli, fémek felolvasztására nem alkalmas. A gyújtópontban a hőmérséklet E-nként megközelítőleg 100 Celsius-fok, amely az élőlényeknek a varázslat minden Erőssége után 1k6 Sp sebet okoz körönként.\n\nA varázslat hatóideje alatt a tűzvarázsló szeme halvány vörös fénnyel parázslik."
}, {
  name: "Harcos hívása",
  type: "Tűzmágia magasiskolája",
  cost: "40",
  castingTime: "3 kör",
  duration: "30 kör",
  description: "A Szolga hívása varázslathoz hasonlóan kaput nyit a Tűz Elemi Síkjára, ám az éteri hívásnak most egy jóval hatalmasabb lény, egy lángokból fogant Harcos elementál válaszol, és lép át az Elsődleges Anyagi Síkra. Engedelmeskedik a tűzvarázsló összes parancsának, az Időtartam lejártával pedig szertefoszlik. Értékei a könyv végén található Bestiáriumban olvashatók a 490. oldalon."
}, {
  name: "Izzó érintés",
  type: "Tűzmágia magasiskolája",
  cost: "8",
  castingTime: "1 szegmens/E",
  duration: "6 kör",
  description: "Mindenben megegyezik a Hamvasztó tekintet nevű varázslattal, a különbség annyi, hogy itt a tűzvarázsló bal kezének érintésével tudja megperzselni áldozatát. Ehhez sikeres Támadó dobást kell tennie. Kezét halványvörös izzás veszi körül, érintése az éghető anyagokat nyomban lángra lobbantja, a kevésbé éghetőket csak megperzseli. Az érintési pontban a hőmérséklet E-nként megközelítőleg 100 C fok, ami 1k6 Sp égési sebet okoz."
}, {
  name: "Kémtűz",
  type: "Tűzmágia magasiskolája",
  cost: "3",
  castingTime: "1 szegmens",
  duration: "30 kör",
  description: "Ez a varázslat azon kevesek közé tartozik, amely nem közvetlen támadásra szolgálnak. A tűzvarázsló által megidézett Őselemi Tűz tenyérnyi nagyságú gömbként jelenik meg, és egy helyben lebeg. A gömböt a tűzvarázsló koncentrálással mozgathatja, körülbelül egy futó ember sebességével. Érintésekor a Kémtűz csupán egyetlen Sp-t sebez, viszont segítségével a varázslat alkalmazója egy könnyen és gyorsan mozgatható fényforrást nyer.\n\nEzzel be lehet világítani a sötétbe vesző folyosók kanyarulatát, mély vermeket és kutakat, gyanús kőfülkéket és alkóvokat. A tűz egy közepes erejű fáklya fényével ég, így körülbelül 5 lépés sugarú körben világítja be környezetét. A Kémtűz az Időtartam lejárta előtt akkor is elalszik, ha bármivel érintkezésbe kerül."
}, {
  name: "Lángvihar",
  type: "Tűzmágia magasiskolája",
  cost: "95",
  castingTime: "1 p",
  duration: "6 kör",
  description: "A varázslat létrejöttekor a tűzvarázsló kijelöl egy tőle legfeljebb 1 ynevi mérföldre lévő pontot, ahol 10 kör alatt soha nem látott, világító lángfellegek gyűlnek össze az égen. Ezután tűzeső hullik belőlük a földre, amely 20 ynevi láb sugarú, kör alakú területet érint. Mindazon éghető anyagok, melyek e területen belül találhatók, rövid idő alatt meggyulladnak és elhamvadnak, sőt az első perc múltán a talaj is megolvad. Mindazok, akik az érintett területen belül tartózkodnak, körönként 8k6 Sp tűzsebzést szenvednek el.\n\nA lángfellegeket a tűzvarázsló megközelítőleg 60 mérföld/órás sebességgel képes mozgatni, ami körönként 160 ynevi lábat jelent, szegmensenként pedig 16 ynevi lábat. Tájékoztatásul közöljük, hogy egy fürgének számító vágtató ló végsebessége 60 mérföld/óra körül mozog."
}, {
  name: "Lávafolyam",
  type: "Tűzmágia magasiskolája",
  cost: "45",
  castingTime: "6 kör",
  duration: "10 p",
  description: "A Lávafolyam igazában csak lejtős terepen alkalmazható varázslat. A tűzvarázsló Zónájának teljes szélességében meghasad a föld, és izzó láva tör elő. A lejtő ahhoz szükséges, hogy az olvadék tovább is folyjon. Az áramlás sebessége a lejtő meredekségétől függően percenként 10-20 ynevi láb lehet. A láva haladási irányát a tűzvarázsló nem határozhatja meg, az kizárólag a domborzattól függ. Mindazok, akik belekerülnek, nyomban életüket vesztik."
}, {
  name: "Perzselő aura",
  type: "Tűzmágia magasiskolája",
  cost: "10",
  castingTime: "1 szegmens/E",
  duration: "4 kör",
  description: "A varázslat szinte mindenben megegyezik a Tűzaura varázslattal, csupán egy fontos különbség van a kettő között. A Perzselő aura nem a testtől 5-10 ynevi hüvelykig öleli körül a tűzvarázsló testét, hanem annál távolabb. Az aura testtől való távolsága 1-120 ynevi hüvelyk között változtatható a tűzvarázsló kívánsága szerint. Így sokkal könnyebb lesz egyszerre védekezni és támadni is, hiszen a kicsivel több, mint egy ynevi lábnyi maximális távolságú aura már minden 5. kategóriánál kisebb fegyver forgatóján sebez, ha a támadó megpróbál közelharcra alkalmas távolságon belülre kerülni.\n\nAz aura éppen aktuális távolsága egy szegmensnyi koncentráció után egy újabb szegmens alatt megváltoztatható. A tűzvarázsló természetesen támadásra is felhasználhatja a Perzselő aurát, amely minden rajta keresztülhaladón 1k6 Sp-t sebez a varázslat minden E-je után."
}, {
  name: "Szolga hívása",
  type: "Tűzmágia magasiskolája",
  cost: "24",
  castingTime: "3 kör",
  duration: "30 kör",
  description: "A varázslat feltétele, hogy a Tűzvarázsló Zónáján belül lobogjon egy legalább 5 E Erősségű tűz. A mágia hatására a tűz megelevenedni látszik, s felölti egy Elementálszolga alakját. Valójában a már égő tűzön keresztül a tűzvarázsló kaput nyit a Tűz Elemi Síkjára, ahonnan egy elementállény lép át az Elsődleges Anyagi Síkra. Engedelmeskedik a tűzvarázsló minden parancsának, de önálló gondolkodásra nem képes, s bonyolult utasításokat is képtelen követni. Értékei a könyv végén található Bestiáriumban olvashatók a 490. oldalon."
}, {
  name: "Távoli tűz",
  type: "Tűzmágia magasiskolája",
  cost: "1",
  castingTime: "3 kör",
  duration: "1 kör",
  description: "A varázslat a közönséges tüzek felhasználásának egyik legősibb formája. Lehetővé teszi, hogy a tűzvarázsló a tűz segítségével képeket közöljön bárkivel, akit személyesen ismer. A képek elmosódottak és aligha sokszínűek; a lángnyelvek között derengnek fel, mintha azok rajzolnák ki őket. Annyit már megállapítottak róla a mágia tudorok, hogy a tüzek manafókuszáló erejét és szimpatikus viszonyát használja ki.\n\nA kapcsolat egyoldalú, hacsak a „beszélgetőtárs” nem járatos szintén a tűzmágiában, hogy a maga erejéből képes legyen „felelni”. Az üzenetet fogadó személynek és a tűzvarázslónak is a varázslat teljes időtartama alatt egy legalább 1 E közönséges tűz közelében kell tartózkodnia. A tűzvarázsló a varázslat teljes ideje alatt a transzhoz hasonló állapotban marad, míg az üzeneteket fogadó jóformán bármit cselekedhet. Arra azonban mindkettejüknek vigyáznia kell, hogy ne lépjenek ki a tűz fényerősségének sugarán kívülre, mert akkor a kapcsolat megszakad. Ha a tűzvarázsló a varázslat végrehajtása után kutató tudatával nem „találja” a keresett személyt, az bizonyára nem tartózkodik tűz közelében. Ekkor a Mana pontok elvesznek és természetesen, a kapcsolat sem jön létre.\n\nA varázslat Hatótávolsága végtelen. Mágiaellenállás nem dobható ellene, mivel mentális kapcsolat nem épül ki.\n\nA varázslatot kizárólag a Fény Ösvényét járó tűzvarázslóknak tanítják Ordanban."
}, {
  name: "Tűzcsapda",
  type: "Tűzmágia magasiskolája",
  cost: "15",
  castingTime: "1 kör",
  duration: "3 óra",
  description: "A varázslat valójában egy láthatatlan pentagramma, ami a varázslás befejeztével egy pillanatra felragyog a földön, majd kihuny, és várakozási állapotba kerül. Ez az állapot az Időtartammal egyenlő ideig áll fenn. Ha ez idő alatt bárki a pentagramma területére téved (3 ynevi láb átmérőjű kör), áldozatául esik a felcsapó lángoknak, melyektől ruhája, felszerelése lángra kap, ő maga pedig 2k6 Sp sebet szenved el. A Tűzcsapdát a tűzvarázsló Zónáján belül bárhol létrehozhatja."
}, {
  name: "Tűzkapu",
  type: "Tűzmágia magasiskolája",
  cost: "20",
  castingTime: "1 kör",
  duration: "Egyszeri",
  description: "A tér- és szimpatikus mágia sajátos felhasználási módja. A tűzvarázsló és minden személyes aurájához tartozó holmi „teleportál\" a különféle tüzek - mint manafókuszok - szimpatikus viszonyát kihasználva.\n\nA varázslat feltétele, hogy a tűzvarázsló Zónájában, illetve a kiválasztott érkezési ponton egy legalább 4 E-s természetes, vagy Őselemi Tűz lobogjon. A varázsló a varázslat megkezdésekor belép a tűzbe, mely nem sebzi őt, sem felszerelését; majd a megfelelő igék kimondása után a fellobbanó lángok közt eltűnik, hogy akár mérföldek százaival odébb lépjen elő a másik tűzből.\n\nA tűzvarázsló csakis olyan helyre képes így eljutni, amelyen már korábban járt, vagy épp jelenleg lát (bármiféle módon, akár mágikus praktikák segítségével). A varázslat maximális hatótávja 100 ynevi mérföld Tapasztalati szintenként. A varázsló a Mp-ok többszörözésével képes másokat is magával vinni, de maximálisan a Tapasztalati szintjének felével megegyező számú utast."
}, {
  name: "Tűzszem",
  type: "Tűzmágia magasiskolája",
  cost: "8",
  castingTime: "1 kör",
  duration: "1 óra",
  description: "Miután a tűzvarázsló befejezte a varázslást, 1 kör áll rendelkezésre, hogy bal keze hüvelykujjával megjelöljön egy pontot, ahol érintése nyomán apró varázsjel vöröslik föl. A jel érzékel minden előtte elhaladót és minden alkalommal akkora Erősségű Tűznyilat lő ki rá, mint a Tűzszem aktuális E-je. A varázslat minden kilőtt lövedék után egyet veszít Erősségéből (egy 24 Mp-os Tűzszem első elhaladáskor tehát 3k6, második alkalommal 2k6, harmadik alkalommal 1k6 Sp égési sebet okoz, majd szertefoszlik).\n\nAlapesetben a Tűznyíl 1 ynevi láb távolságig érzékel és hat, azonban ez a távolság kitolható, minden +1 Mp-ért egy lábbal. Az időtartam is növelhető, minden +1 Mp-ért egy órával tovább maradnak fönt a varázslatot egybetartó kötések.\n\nA Tűznyíl CÉ-je 30, mely alapértékkel kell Célzó dobást tenni a sikeres találathoz. A nyíl csakis találat esetén okoz sebet."
}, {
  name: "Fekete tűz",
  type: "Közönséges tüzek befolyásolása",
  cost: "2",
  castingTime: "2 szegmens",
  duration: "6 kör",
  description: "A misztikusan csengő nevű varázslat a közönséges tűz fény-hő arányát változtatja meg, méghozzá a hő javára. Segítségével elérhető, hogy az összes égés során felszabaduló energia hő formájában távozzon anélkül, hogy bármennyi is kisugárzott fénnyé alakulna. Az ilyen mágiával megváltoztatott tűz minden fénye elenyészik, a lángok teljesen láthatatlanná válnak. Az így nyert energia mind hővé alakul, és a tűz sebzését, hőfokát növeli meg. A sebzés a másfélszerese lesz az eredetinek (felfelé kerekítve), például egy tábortűz lángjának sebzése nem 3k6 Sp, hanem 5k6 Sp lesz. Ez a varázslat nem használható a Tűzválasztással együtt, hiszen nincs mit elválasztani, így a tűz helye ezen a módon nem változtatható meg. A tűzvarázslók különösen kedvelik ezt a varázslatot, mivel viszonylag kevés befektetett Mana ponttal nagyon magas sebzést érhetnek el."
}, {
  name: "Füstmarás",
  type: "Közönséges tüzek befolyásolása",
  cost: "2",
  castingTime: "2 szegmens",
  duration: "6 kör",
  description: "A varázslat hatására a tűz fénye és hőjének nagy része maró füstté változik. Végrehajtása után a tűzvarázsló Zónájában\n\na kiválasztott tűz lelohad, szinte csak parázslik, sebzése is minimális lesz (például 1 Sp esetén 0, 1k6 Sp esetén 1, 2k6 Sp esetén 2 stb.).\n\nFényt nem ad, de fényerősségének határáig sűrű szürkés-fekete füstöt ereszt. A keletkező füst akadályozza a légzést, csípi a szemet és sűrűségéből adódóan a látótávolságot is rontja. A benne tartózkodók kötelesek a 0. szintű méregnek számító füst ellen Egészségpróbát dobni, s vétés esetén Rosszullét fogja el őket. Ha a Tulajdonságpróbát sikeresen megdobták, úgy csak az Émelygés szabályai vonatkoznak rájuk. Ezen kívül a füstben távolsági fegyvert használni, illetve a füstben állókra célozni csak -50 CÉ-vel lehet, mivel a benne tartózkodók alig láthatók. A füstben a közelharc is módosul, minden támadás TÉ-je 25-tel csökken.\n\nAkik kikerülnek a füstből, még 1k6 percig nyögik a füst szervezetre gyakorolt hatását. A füst az időtartam lejárta előtt csak mágiával oszlatható el, utána a légmozgás játékszerévé válik."
}, {
  name: "Hidegtűz",
  type: "Közönséges tüzek befolyásolása",
  cost: "2",
  castingTime: "2 szegmens",
  duration: "6 kör",
  description: "A varázslat tökéletes ellentéte a Feketetűznek, ugyanúgy a tűz kettős természetének megváltoztatásával fejti ki hatását. Ritkábban alkalmazzák, mint párját, de mindenképp érdemes szem előtt tartanunk több előnyét is. A tűzvarázsló ezzel a mágiával egy egyszerű fáklyát is tábortűz fényességűvé tehet, tökéletes fényforrást biztosítva ezzel nagyobb terek bevilágítására. A fényesség ugyanis a hő teljes átalakításával háromszorosára növelhető, azaz a bevilágítandó terület sugara ennyivel szorzandó meg. Ennek alapján egy máglya, amelynek a hőjét fénnyé alakítják, egy 60 ynevi láb sugarú kör teljes megvilágítására lesz alkalmas. Ez már jelzőfénynek sem utolsó, meglehetősen látványos jelenség."
}, {
  name: "Tűzcsapás",
  type: "Közönséges tüzek befolyásolása",
  cost: "2",
  castingTime: "2 szegmens",
  duration: "Egyszeri",
  description: "A Tűzcsapás a tűzvarázslók egyik veszedelmes fegyvere, amely már többször okozta a túlzottan magabiztos ellenfelek vesztét. A mágia hatására a tűz egy pillanatra megelevenedik, és megtámadja a tűzvarázsló által megjelölt célpontot. Az áldozat nem állhat 5 ynevi lábnál messzebbre a tűztől, különben a varázslat nem jön létre.\n\nA varázslat CÉ-je 30, a találathoz a tűzvarázslónak sikeres Célzó dobást kell tennie a fegyvertelen CÉ-jéhez adott +30 módosítóval. A támadás után minden visszatér eredeti állapotába."
}, {
  name: "Tűzébresztés/tűzlohasztás",
  type: "Közönséges tüzek befolyásolása",
  cost: "Lásd a leírást!",
  castingTime: "2 szegmens",
  duration: "2 kör",
  description: "A tűzvarázsló ezen varázslata többek szerint átmenet az Elemi Tűz Idézése és a Közönséges Tüzek Befolyásolása közt. A mágia segítségével a tüzek nagysága változtatható meg, bárminemű éghető anyag hozzáadása nélkül. A tűz csak néhány pillanatra nő vagy csökken a kívánt mértékben, majd a természet újra kézbe veszi a dolgok irányítását, és minden visszatér az eredeti állapotba.\n\nA tűzvarázsló tehát Mana pontok befektetésével 2 kör erejéig a tűz kategóriáját változtathatja meg, még egy gyertya lángjából is készíthet - legalábbis\n\nrövid időre - tábortüzet. A varázslat Mana pont igénye a kiindulási és a kívánt kategóriák különbségétől függ.\n\nHa a különbség csupán egy Erősség, a befektetendő Mp-k száma 2. Két kategóriánál 4, háromnál 8, négynél 16. Ebből is látható, hogy fáklyából könnyen lehet kandallóban égő láng, de máglya már sokkal nehezebben. A fenti különbségek a tűz kioltására is vonatkoznak, azaz egy fáklya fénye 2 Mp ráfordításával tompítható gyertyányi lánggá. A Tűzlohasztás több előnnyel is bír, például kezdődő tűzvészek előzhetőek meg vele.\n\nA tüzek befolyásolása - bármelyik hasonló varázslattal\n\nminden esetben megváltoztatja az adott hely fény-árnyék viszonyait. Így a tüzek tompításával a rejtőzés könnyebbé, vagy ellenkezőleg, erősítésükkel nehezebbé válik. A tűzvarázsló ennek segítségével meglehetősen könnyen fedezheti fel az árnyakban lapuló ellenfeleit, mivel a tüzek méretének\n\nazaz az árnyékoknak - a megváltozása kívülállók számára kiszámíthatatlan, azonnal létrejövő hatás."
}, {
  name: "Tűzválasztás",
  type: "Közönséges tüzek befolyásolása",
  cost: "4",
  castingTime: "2 szegmens",
  duration: "3 kör",
  description: "A varázslat hatására a tűz fény- és hőhatásai térben elválaszthatóak. Ez azt jelenti, hogy a láng e két összetevője a tűzvarázsló körüli tíz ynevi láb sugarú körben tetszőleges helyen fejtheti ki hatását. A varázslat használatát korlátozza, hogy az egyik komponensnek mindenképpen a láng eredeti helyén kell maradnia. A tűzvarázsló ezzel a varázslattal komoly károkat okozhat ellenfeleinek, ugyanis megteheti, hogy a tűz képét a kandallóban hagyja, de a hővel támad, és minden látható jel nélkül sebez. A sikeres találathoz a tűzvarázslónak Célzó dobást kell tennie, +30-cal. A találat majdnem bizonyos, hiszen a láthatatlan láng elől szinte lehetetlen kitérni.\n\nAz áldozaton persze meglátszanak az égés nyomai, még az esetleges gyúlékony anyagok is lángra lobbanhatnak. A tűzvarázsló előszeretettel alkalmazza a Tűzválasztást nagyobb ütközetek, ostromok alkalmával is, hiszen a legtöbb efféle esemény alatt akár mágia, akár fáklyák hatására is gyúlhatnak nagy, elszabaduló tüzek.\n\nAmennyiben a tűzvarázsló a hőhatást hagyja a láng eredeti helyén, és a fényt mozgatja, ezzel nagy csarnokokat, termeket deríthet fel."
}, {
  name: "Átformázás",
  type: "Őstüzek befolyásolása",
  cost: "6",
  castingTime: "1 szegmens/E",
  duration: "Egyszeri",
  description: "A tűzvarázsló e varázslat által képessé lesz arra, hogy más varázshasználók által idézett Őstüzet átformáljon a saját igényeinek megfelelő formába. A formázás tekintetében csak a hét iskolaformát használhatja, míg az átalakítandó tűz formája tetszőleges. Azok az Őstüzek, melyeket egy tűzvarázsló, vagy egy elementalista akarata irányít (lásd a Tűzlényeknél, de ilyen a Tűzgolyó és a Tűzpenge is, és a szabad elemi formák) nem reagálnak az átformázásra. A felhasznált mana elvész.\n\nEzzel a varázslattal elképzelhető az a jelenet is, hogy a tűzvarázsló ellen harcoló ellenfélt körülvevő aura tűzkitöréssé alakul. Az Erősségnek legalább annyinak kell lenni, mint az átformázni kívánt tűz erőssége. A személyes aura nem véd ellene, mert a tűzvarázsló misztikus tűzzel való kapcsolata miatt (melyet a varázslat által használ ki) olyan lesz, mintha az Őstűz a saját Személyes Aurájának lenne a része és nem az áldozaté."
}, {
  name: "Tűznyelés",
  type: "Őstüzek befolyásolása",
  cost: "10",
  castingTime: "1 szegmens",
  duration: "Egyszeri",
  description: "A tűzvarázsló ezen varázslata egyesíti magában a támadást és a védekezést. A tűzvarázsló elnyelheti a rá ható tüzet, majd csóva formában visszafújhatja ellenfelére. Jellemző még, hogy a tűzvarázsló varázslás közben érzi, hogy szükség van-e még mágikus energia befektetésére, azaz hogy mekkora erősséggel kell varázsolnia a varázslatot. Még így is fenyegeti azonban az a veszély, hogy Mana pontjai hamarabb fogynak el, minthogy az összes tüzet elnyelte volna, azaz a tűz erősítése még mindig nagyobb, mint a varázslaté. Ebben az esetben a tűz csökkentett Erősséggel hat. A tűzvarázslónak a varázslat után 1 teljes köre van, hogy az elnyelt tüzet kifújja, ellenkező esetben a tűz hatni fog az elnyelt Erősségben, azonban, mivel a tűz a tűzvarázsló testében van, a tűz sebzése maximális (E-nként 6 Sp) lesz.\n\nEbből is látszik, hogy a varázslat használata nem veszélytelen, ámde nem kis meglepetést okozhat a pusztító lángokat elnyelő és a támadóra visszalehelő tűzvarázsló. A visszafújásnál a varázslat teljesen megegyezik a Tűzcsóva nevű tűzvarázslói varázslattal. A visszafújás nem igényel Mana pont ráfordítást.\n\nMivel a varázslat lényege az időzítés, a tűzvarázsló csak akkor alkalmazhatja sikeresen, ha összpontosít a megfelelő időpontra. Ezt úgy teheti meg, hogy az adott harci kör elején bejelenti, hogy abban az esetben, ha tüzet használnak ellene, akkor Tűznyelést varázsol. Az adott körben más varázslatot nem idézhet meg. Ha a tűzzel való támadás bekövetkezik, akkor a varázslat létrejön, méghozzá a másodperc törtrésze alatt"
}, {
  name: "Tűzrablás",
  type: "Őstüzek befolyásolása",
  cost: "4",
  castingTime: "Lásd a leírást!",
  duration: "Egyszeri",
  description: "A varázslat képessé teszi használóját arra, hogy varázslatát megformálva kevesebb manát használjon fel. A Zónán belül égő összes tűz E-jét felhasználhatja varázslatához, amik annak Erősségét fogják ezentúl növelni. A tűzvarázslónak legalább 1 E Erősségű varázslatot kell létrehoznia, és ahhoz hozzáfűznie annyi E Tűzrablást, amennyit szükségesnek lát. Minden E Tűzrablás a Zónán belül lobogó Őstüzek E-jéből kiolt 1 E-t. A tűz ezután a tűzvarázsló varázslatát erősíti. Ha több E Tűzrablást varázsolt, mint amennyi E Őstűz a Zónán belül jelen van, akkor a Mana pontok elvesznek.\n\nA tűzvarázsló ezt a varázslatot csak a hét iskolaformával és a szabálytalan elemi formákkal kapcsolatban alkalmazhatja."
}, {
  name: "Lángfestés",
  type: "Őstüzek befolyásolása",
  cost: "Lásd a leírást!",
  castingTime: "1 szegmens/E",
  duration: "Lásd a leírást!",
  description: [
    "Misztikus varázslat, melynek segítségével a tűzvarázsló megváltoztathatja az Őstűz mágikus tulajdonságait, olyan praktika, melyet önmagában soha nem alkalmaznak, hanem mindig valamilyen tűzvarázslathoz fűznek hozzá, vagy már létező tűzmágiát alakítanak át vele. A varázslás idejénél feltüntetett 1 szegmens/E mindig hozzáadandó az eredeti varázslat varázslási idejéhez.",
    "table:Szín\tHatás\tMp/E\n\nVakító fehér\tA tüzek E-jét magába olvasztja\t6\n\nKék\tŐsvíz ellen 2xE\t2\n\nMéregzöld\tCsak a célpontokra hat\t4+2\n\nAranysárga\tA tűzvarázslóra nem hat\t3\n\nBíborvörös\tFele sebzés, kétszeres időtartam\t2\n\nFekete\tCsak a tűzvarázslóra hat\tSpeciális",
    "A fenti táblázat azt mutatja, hogy a tűzvarázsló által létrehozandó varázslat lángfestése mennyi Mp-ba kerül E-jének függvényében. A már létező varázslatok dupla annyi Mana pontért festhetők meg.\n\nHa a varázslathoz kevesebb E lángfestést alkalmaz, mint amekkora a tűz E-je, akkor a tűz színe feketére vált. Célszerű ezért vagy Őstűz észlelése vagy a Tűzelemzés varázslatokat alkalmazni, már amennyiben erre idő és lehetőség van. Nem egy tűzvarázsló végzete lett a kockáztatás...\n\nNagyon fontos, hogy a KM szigorúan ügyeljen a varázslat használatakor, ha értelmetlenül próbálják felhasználni, akkor a tűz mindenképpen visszaüt: Fekete színű lángok tűzkitörése kellő eszköz a Játékosok megfékezésére.",
    "Az egyes színek bővebb magyarázatra szorulnak:\n\n**Vakító fehér** fényben tündöklő tűz a Zónában lévő összes természetes tüzet is Őstűzzé alakítja, magába olvasztva, ezáltal saját E-jét növeli. Ugyanezt teszi az összes olyan Őstűzzel, mellyel fizikailag érintkezik. Ha két Fehér láng találkozik, akkor a nagyobb E-jű magába olvasztja a kisebb E-jűt. Ha E-jük egyenlő, akkor egyik sem olvasztja magába a másikat. Ha a Fehér láng más festett lánggal találkozik, akkor a magába olvasztott tűz festése megszűnik, teljesen a Fehér tűz részévé válik. A Fehérre festett láng ötször annyi természetes, és háromszor annyi őstüzet tud magába olvasztani, mint a varázslat eredeti Erőssége.\n\n**A Kéken** lángoló tűz ellenállóbbá válik az őt egyébként kioltó Ősvíz ellen, E-je az ilyen hatások ellen kétszeresére növekszik.\n\n**A Zölden** lobogó tűz sajátossága, hogy csak a tűzvarázsló által megadott célpontokra, vagy csoportra hat. Mások hiába tartózkodnak a területén, rájuk a tűzmágia nem fejti ki hatását. A tűz zöldre festéséhez 4 Mp/E kell egy célpont ellen, és további 2 Mp/E célpontonként. Ha a tűzvarázsló mást talál el, azokra a tűz hatástalan.\n\n**Az Aranysárga** színezetű lángok pusztító ereje az őket létrehozó tűzvarázslóra, vagy az általa kijelölt célpontokra teljes mértékben hatástalan, ebben az esetben azonban minden további célpont többszörözi a varázslat Mp-igényét. Azaz 3 védett személy esetén a feltüntetett Mp-igény háromszorosa számolandó a színezett tűz minden egyes E-je után.\n\n**A Bíborvörös** tűz színe teljesen elsötétül, szinte már feketébe hajlik. A hőfoka (ezáltal a Sebzése) és a fényereje fele az ugyanolyan Erősségű tűznek. Azonban az Időtartama kétszerese az ugyanolyan erősségű varázslatnak. Ezzel a színnel nem színezhető az olyan tűz, amely Időtartam nélküli (mint például Tűznyíl, Tűzkitörés).\n\n**A Fekete** színű láng speciális eset, mely akkor jön létre, ha a tűzvarázsló a varázslat átalakításakor hibázott, megzavarta az érzékeny egyensúlyt. Ekkor a tűz kitöréssé alakul, csak őt fogja sebezni, függetlenül eredeti rendeltetésétől."
  ]
}, {
  name: "Tűzkígyó",
  type: "Tűzlények idézése",
  cost: "16",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+20",
  size: "6",
  description: "A tűzlény kígyó alakot vesz fel, ami leginkább egy nyolc ynevi lábnyi kobrára emlékeztet. A levegőben kígyózva halad, spirálszerűen repülve. Kétszer támad körönként, egyszer fejével csapva le, másszor pedig farkával. Nagy hosszúsága miatt (8 ynevi láb) egymástól igen távoli áldozatokat képes támadni."
}, {
  name: "Tűzmadár",
  type: "Tűzlények idézése",
  cost: "24",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+25",
  size: "2",
  description: "Egy főnixalak jelenik meg, magasan a tűzvarázsló fölött. Onnan csap le a harcolókra, körönként egyszer, élvezve a Harc magasabbról és Roham módosítókat, s minden sikeres támadásával automatikusan átsuhan ellenfelén."
}, {
  name: "Tűzpárduc",
  type: "Tűzlények idézése",
  cost: "20",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+25",
  size: "3",
  description: "Egy lángnyelvekből álló fantom jelenik meg a varázslat eredményeképp, mely leginkább egy hatalmas fekete párducra emlékeztet. Körönként kétszer támad, fejével, mancsaival, mintha harapna, vagy ütne, ha túlüti ellenfelét, akkor egy párducra jellemző ugrással átveti magát rajta."
}, {
  name: "Tűzpolip",
  type: "Tűzlények idézése",
  cost: "36",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+35",
  size: "7",
  description: "A tűz nyolckarú polip alakját vesz föl, ami képes minden körben négy támadásra. Mind a négy a polip karjaival történik, amik ostorokhoz hasonlóan csapkodják a támadókat, a harc magasabbról módosítókkal együtt, mivel a polip a harctér fölött képes lebegni, ahonnan az egész Zóna területét képes elérni."
}, {
  name: "Tűzsárkány",
  type: "Tűzlények idézése",
  cost: "24",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+40",
  size: "6",
  description: "A megidézett tűz a tűzvarázsló akarata által formázva sárkány alakját veszi fel, ami tüzet okád az ellenfeleire 20 ynevi láb magasból. A sárkánynak ahhoz, hogy eltalálja áldozatát, sikeres Célzó dobást kell véghezvinnie. A sárkány körönként egyszer támadhat, harcérték módosítója 40. Ha támadása sikeres, úgy számolandó, mintha teljes felületen érte volna az áldozatot. Ha teheti, akkor nem ereszkedik olyan mélyre, hogy eltalálhassák, repülés híján az áldozatok csak célzófegyverekkel és mágiával támadhatják."
}, {
  name: "Tűzgólem",
  type: "Tűzlények idézése",
  cost: "28",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+30",
  size: "4",
  description: "A tűzgólem nyúlánk majd' 3 ynevi láb magas humanoid alakú tűzlény, mely leginkább karjaival támad ellenfeleire, vagy megpróbál átrohanni rajtuk. Körönként kétszer képes támadni, azonban, ha a körben mindkét találata sikeres, akkor belekapaszkodik az ellenfelébe, és innentől kezdve az áldozatra a Harc helyhez kötve módosítók érvényesek. Szabadulni öleléséből csakis egy, a megidézett Őstűz E-jével megegyező mínuszokkal végrehajtott sikeres Erőpróbával lehet."
}, {
  name: "Lángdarazsak",
  type: "Tűzlények idézése",
  cost: "25",
  castingTime: "5 szegmens",
  duration: "6 kör",
  combatModifier: "+20",
  size: "1",
  description: "A varázslat nagyjából ökölnyi, a megidézett Őstűz E-jével megegyező számú lángból formált darazsat teremt, melyek dühödten rontanak a célpontra. A darazsak körönként csupán egyszer támadnak, azonban darabonként külön ellenfélként viselkednek, azaz külön Támadó dobást tesznek és darabonkénti 1k6 Sp-sebzésük is külön-külön érvényes; igazán veszedelmessé nagy tömegben válnak, a vonatkozó túlerőszabályok miatt. Emellett még megjegyzendő, hogy a darazsak mindig igyekeznek hátulról lecsapni az ellenfélre, s folyamatosan védtelen oldala felől támadni. Az összeadódó negatív módosítók alól mentesülni csak sikeres Gyorsaságpróbával elugorva, vagy a Harctéri gyakorlat képzettségre tett sikeres próbával elmanőverezve lehetséges."
}]
