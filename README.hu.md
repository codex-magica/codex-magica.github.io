<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.png">
  <img src="docs/assets/logo-light.png" alt="Codex Magica pecsét" width="96">
</picture>

# Codex Magica

**Digitális kompendium és karakterlap a _M.A.G.U.S. Új Törvénykönyv_ szabályrendszeréhez.**

[English](README.md) · **Magyar**

[![CI](https://github.com/marcigo36/codex-magica/actions/workflows/ci.yml/badge.svg)](https://github.com/marcigo36/codex-magica/actions/workflows/ci.yml)
[![Kód licenc: MIT](https://img.shields.io/badge/k%C3%B3d-MIT-6E7781)](LICENSE)

</div>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.webp">
  <img src="docs/assets/hero-light.webp" alt="Egy első szintű elf bárd karakterlapja">
</picture>

## Mi ez?

A csapatunk az Új Törvénykönyv szerint játszik, a nyomtatott könyvből és egy gyenge minőségű
szkennelt PDF-ből. Emiatt három dolog volt a kelleténél nehezebb:

- **Játék közben** sokáig tartott kikeresni egy varázslatot vagy szabályt a könyvben vagy a PDF-ben.
- **Két alkalom között** a szintlépés rengeteg adminisztrációval járt: a költségek, előfeltételek és
  bónuszok egy tucat táblázatban voltak szétszórva.
- **A KM-nek** fáradságos volt kézzel, a szabályok szerint megalkotni a mesélői karaktereket.

Ezekre készült ez az alkalmazás:

- 📖 **Kompendium:** az összes képzettség, varázslat, ima, pszi diszciplína, fegyver, vért és méreg
  kereshetően, mindegyik a szabályszövegével.
- 🧙 **Karakteralkotó:** faj, kaszt, iskola, hátterek, pontvásárlás, szintenkénti képzettségvásárlás és
  szintlépés. A KAP-költségeket, a tulajdonság-előfeltételeket és a kaszt által adott képzettségeket a
  program számolja. A KM ugyanígy használhatja a mesélői karakterek (NJK-k) elkészítéséhez.
- 📜 **Karakterlap az asztalhoz:** ÉP, FP, Mana, Pszi és Kegy, állapotok, fegyverek, vértek, társállatok.
  Telefonon, iPaden és gépen is jól használható.

## Amit tud

- **Értékek levezetése:** bármelyik számra (TÉ, VÉ, KÉ, MME…) koppintva látod, mi
  mennyivel járul hozzá: tulajdonságok, HM, fegyver, képzettség, KM-módosítás.
- **Gyorskereső (<kbd>⌘K</kbd>)** az összes varázslatra, képzettségre és tárgyra. Ékezetek nélkül is
  működik: a `tuzgolyo` megtalálja a _Tűzgolyót_.
- **Olvasó nézet:** a mágia- és képzettség-fejezetek táblázat helyett folyó szövegként, a könyv
  sorrendjében is olvashatók, követő tartalomjegyzékkel.
- **Szintenkénti napló:** a karakter döntései szintenként tárolódnak, így bármelyik korábbi szint utólag
  is szerkeszthető.
- **KM-eszközök:** egyedi kaszt, szintenkénti KM-jutalmak és módosítók, egyedi képességek saját
  szabályszöveggel.
- **Házi szabály:** választható átdolgozott képzettségrendszer (karakterenként, a létrehozáskor rögzítve).
- **Világos és sötét téma**, a kezdőképernyőre tehető alkalmazás, karakterek exportja és importja
  JSON-fájlként.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/mobile-dark.webp">
  <img src="docs/assets/mobile-light.webp" alt="A karakterlap telefonon, lapozható oldalakra bontva">
</picture>

## Hogyan próbálhatod ki?

Nyilvános példány jelenleg nincs, de a saját gépeden pár perc alatt elindítható. Ehhez
[Node.js](https://nodejs.org) 22 vagy újabb kell:

```sh
git clone https://github.com/marcigo36/codex-magica.git
cd codex-magica
npm ci
npm run dev          # megnyílik: http://localhost:3000
```

Az alkalmazás a karakterlistával indul. A karakterek a böngésző helyi tárolójában maradnak, fiók nem kell.
Másik eszközre a karakter menüjéből exportálva (**Exportálás fájlba**), majd ott importálva
(**Karakter importálása**) vihetők át.

## Hibát találtál?

A szöveg egy rossz minőségű szkennelésből, OCR-rel készült, és bár alaposan át lett olvasva, maradhattak
benne hibák. Ha elírást, hibás táblázatértéket vagy rosszul számolt szabályt találsz, nyiss egy
[issue-t](https://github.com/marcigo36/codex-magica/issues). Írd meg az oldalszámot vagy a fejezetet, és
azt, hogy mi szerepel a könyvben. Pull requestet is szívesen fogadunk.

## Hogyan készült?

Az egész könyv szkennelt oldalakból indult: tesseract OCR (magyar nyelvi modellel) adta a szöveget,
nyelvi modellek a szerkezetet és a táblázatokat, utána pedig rengeteg kézi korrektúra következett. A
részletek angolul, a [fő README-ben](README.md#how-it-was-built) és a
[folyamat leírásában](docs/pdf-pipeline.md) olvashatók.

## Köszönet és jogok

A repóban található **forráskód** [MIT licenc](LICENSE) alatt szabadon felhasználható.

Az `src/data/` mappában lévő szabályadatok a szabálykönyvből lettek átírva és újrarendezve ehhez a
projekthez, így **származékos művek**: ezek, valamint a játék nevei és fogalmai **nem** tartoznak e licenc
alá, azok a mindenkori jogtulajdonosokat illetik. A szabálykönyv teljes szövegét a repó nem tartalmazza. A Codex Magica nem hivatalos,
nonprofit rajongói projekt, amely nem áll kapcsolatban velük. A könyv eredeti közreműködőinek listája a
[NOTICE.md](NOTICE.md) fájlban található. Ha jogtulajdonosként bármit módosítanál vagy eltávolíttatnál,
nyiss egy [issue-t](https://github.com/marcigo36/codex-magica/issues).

<div align="center">
<br>
<sub>Egy játékoscsapatnak készült, és mindenkinek szól, aki még mindig Yneven kalandozik. 🎲</sub>
</div>
