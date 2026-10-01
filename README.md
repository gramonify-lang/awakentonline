# Awaken’t — bewoners versus ghost

Een aparte multiplayer-versie op basis van **Awakent fix.html**, niet op basis van de visual-overhaul. De oorspronkelijke Three.js-renderer, huisgeometrie, procedurele textures, meubels, shaders, belichting, spiegels en geluiden zijn behouden. `original.html` is een ongewijzigde kopie van jouw aangeleverde bestand. `index.html` bevat de multiplayer-integratie.

## Snel online via GitHub en Vercel

1. Pak dit ZIP-bestand uit. Zet de **inhoud van de projectmap** in een nieuwe GitHub-repository. In de root moeten `index.html`, `package.json`, `vercel.json`, `api/` en `lib/` staan. Upload het ZIP-bestand zelf niet als website.
2. Importeer die repository in Vercel. Kies **Framework Preset: Other**. Stel **Build Command: npm run build** en **Output Directory: .** in. Root Directory is de map waar package.json staat. Kies Node.js 22 of hoger. Je bestaande domein kun je aan dit Vercel-project koppelen.
3. Maak een **Upstash Redis**-database, eventueel via de Vercel Marketplace-integratie. Kies een regio dichtbij de Vercel Function. Kopieer de REST URL en REST Token van de database.
4. Voeg in Vercel → Project Settings → Environment Variables de onderstaande twee variabelen toe voor Production en, als je previewdeployments gebruikt, ook Preview:

   ```text
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   ```

   De waarden komen van Upstash. Het token hoort uitsluitend in Vercel; zet het niet in je HTML of GitHub-repository. `.env.example` bevat alleen placeholders.
5. Deploy of redeploy na het instellen van de variabelen. Open de website, klik op Begin, kies je rol en maak een lobby. Deel de code of uitnodigingslink. Eén speler kiest Ghost, één tot vier anderen kiezen Bewoner. De host start de ronde.

**Alleen een HTML uploaden is voor deze versie niet voldoende:** de API en database zijn nodig om verschillende apparaten hetzelfde huis te laten delen. Zonder Redis-instellingen geeft de online versie een uitleg in de lobby.

Officiële documentatie: [Vercel buildinstellingen](https://vercel.com/docs/builds/configure-a-build), [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi).

## Spelregels

Minimaal twee spelers: één ghost en één bewoner. Maximaal vijf: één ghost en vier bewoners. Een ronde duurt twaalf minuten.

Bewoners herstellen drie onderdelen; voortgang is voor iedereen hetzelfde:

- **Zekeringkast bij de keldertrap:** schakelaars 3 → 1 → 4 → 2.
- **Radio in de keuken:** laag → hoog → midden → laag.
- **Klokritueel in de kelder:** III → III → III.

Loop dichtbij en druk E, of gebruik de Interactieknop op je telefoon. Er zit een korte wachttijd tussen puzzelstappen. Een verkeerde keuze reset alleen die puzzelreeks. Voltooide puzzels blijven voltooid. Daarna gaat de voordeur open; bewoners moeten bij de voordeur opnieuw E gebruiken om te ontsnappen.

Elke bewoner heeft twee levens. Bij nul levens kan hij nog kijken, maar niet lopen. Een andere bewoner kan dichtbij E gebruiken, vijf seconden dichtbij blijven en daarna opnieuw E gebruiken om hem met één leven te helpen. Weglopen onderbreekt dit. Na een aanval is een bewoner kort beschermd tegen een volgende aanval.

De ghost is normaal onzichtbaar voor bewoners, beweegt door dezelfde doorgangen en heeft deze krachten:

| Toets | Kracht | Energie | Wachttijd | Effect |
|---|---|---:|---:|---|
| 1 | Zichtbaar worden | 25 | 16 s | 6,5 seconden zichtbaar; nodig om aan te vallen |
| 2 | Aanvallen | 20 | 7 s | Eén kwetsbare bewoner binnen 2,2 meter raakt een leven kwijt; muren en gesloten deuren blokkeren |
| 3 | Black-out | 25 | 20 s | Huisverlichting 6,5 seconden sterk gedimd; zaklampen blijven bruikbaar |
| 4 | Deuren slaan | 15 | 10 s | Nabije binnendeuren slaan dicht |
| 5 | Fluisteren | 10 | 8 s | Ruimtelijk fluistergeluid vanaf de positie van de ghost |
| 6 | Sabotage | 30 | 25 s | Reset de voortgang van een nabije, onvoltooide puzzel |

De ghost heeft maximaal 100 energie en herstelt 4 energie per seconde. Dezelfde krachten zijn beschikbaar als knoppen op mobiel. De ghost wint wanneer de tijd verstrijkt of alle achtergebleven, verbonden bewoners uitgeschakeld zijn. De bewoners winnen als alle nog actieve bewoners ontsnapt zijn. Bij meer dan zestig seconden verbindingsverlies wordt een speler als afwezig behandeld; de resterende spelers kunnen doorgaan. Verlaat de ghost de ronde, dan winnen de bewoners. Het menu pauzeert alleen jouw lokale bediening; de gezamenlijke ronde loopt door.

WASD / pijltjes: lopen. Shift: rennen. Muis: kijken. F: zaklamp. E: interactie. Esc: menu. De oorspronkelijke touchbediening en instellingen blijven beschikbaar.

## Lokaal testen

Installeer Node.js 22 of hoger en open een terminal in deze map:

```bash
npm run dev
```

Open `http://localhost:3000` in meerdere afzonderlijke browsers of browserprofielen. Lokale tests gebruiken geheugenopslag; een herstart wist de lobbies. Er zijn geen npm-pakketten nodig. Met echte Redis-variabelen in de shell gebruikt dezelfde ontwikkelserver Redis. Voor een `.env`-bestand kun je `node --env-file=.env dev.mjs` gebruiken. Een HTML rechtstreeks dubbelklikken start de multiplayer-API niet.

```bash
npm test
npm run test:runtime
```

## Wijzigen via GitHub

Wijzig `multiplayer.js` voor lobby, HUD en de multiplayer-integratie. `npm run build` verwerkt die adapter in de originele HTML. Vercel doet dit ook bij elke deployment, dus een wijziging aan multiplayer.js komt na een GitHub-commit automatisch in de site terecht. Pas de serverregels aan in `lib/game.mjs`. Puzzelposities/labels staan ook in multiplayer.js; houd beide kanten gelijk.

`original.html` blijft het uitgangspunt voor het huis en de graphics. Verander je muren of deurposities, werk dan ook `lib/house-walls.json` en de server-deurposities bij. De meegeleverde huisbotsingsdata is uit het oorspronkelijke huis gehaald. De technische test kan die data opnieuw exporteren met `node tools/runtime-smoke.mjs --export-walls`.

## Getest en huidige grenzen

- 17 automatische tests geslaagd: vijf gelijktijdige clients, lobbylimiet, ghostrol, gedeelde deuren, sessietokens, herhaalde acties, puzzels, energie/wachttijden, ontsnappen, helpen, tijdslimiet en aanvallen door gesloten deuren.
- Oorspronkelijke HTML gecontroleerd op byte-identieke inhoud. Beide embedded scripts syntactisch gecontroleerd.
- Het echte oorspronkelijke Three.js-huis, de acteurs en een multiplayer-ronde met avatars opgebouwd in een technische test met nagebootste DOM/canvas. Dit controleert JavaScript-integratie, niet de daadwerkelijke GPU-weergave.
- Geen volledige grafische browsertest: een testbrowser kon in deze omgeving niet worden geïnstalleerd. Ook geen live Vercel/Upstash-test; er zijn geen deployment- of databasegegevens aangeleverd. Test na deployment samen een hele ronde, vooral keldertrap, deuren en mobiele bediening.

Dit is een eerste multiplayer-versie met eenvoudige volgordepuzzels en zes ghostkrachten. Netwerkupdates gebruiken HTTPS-polling elke 300 ms, met vloeiende interpolatie van andere spelers. De vertraging hangt ook af van netwerk en database. Posities worden lokaal voorspeld; de server controleert verplaatsingsafstand, muren, rollen, puzzelafstand, aanvalafstand, energie en uitkomsten. Het is geen volledig competitief anti-cheatsysteem of complete physicsserver.

Bij vijf verbonden spelers zijn circa 60.000 API-verzoeken per uur mogelijk; Redis gebruikt meerdere opdrachten per verzoek. Houd Vercel/Upstash-quota en verbruik in de gaten. Deze implementatie claimt geen gegarandeerd gratis onbeperkt multiplayergebruik. Voor veel lobbies of snellere actie is een realtime transport een verdere optimalisatie. Voicechat is niet toegevoegd.

Lobbydata verloopt na twee uur zonder requests. Sessieherstel na een paginaverversing werkt via sessionStorage in dezelfde tab; het volledig sluiten van de tab maakt een nieuwe sessie nodig.
