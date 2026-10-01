# Awaken’t — multiplayer update 2

Een aparte multiplayer-versie op basis van **Awakent fix.html**, niet op basis van de visual-overhaul. De oorspronkelijke Three.js-renderer, huisgeometrie, procedurele textures, meubels, shaders, belichting, spiegels en geluiden zijn behouden. `original.html` is een ongewijzigde kopie van jouw aangeleverde bestand. `index.html` bevat de multiplayer-integratie.

## Bestaande installatie bijwerken

Lees `UPDATE_NL.md`. Vervang de projectbestanden in je GitHub-repository met dit volledige pakket. Je twee bestaande Redis-variabelen blijven geldig. Laat Vercel opnieuw bouwen en laat alle spelers de pagina volledig verversen en een nieuwe lobby maken.

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

De ghost heeft maximaal 100 energie en herstelt 4 energie per seconde. Dezelfde krachten zijn beschikbaar als knoppen op mobiel. De ghost wint wanneer de tijd verstrijkt of alle achtergebleven, verbonden bewoners uitgeschakeld zijn. De bewoners winnen als alle nog actieve bewoners ontsnapt zijn. Bij meer dan zestig seconden verbindingsverlies wordt een speler als afwezig behandeld; de resterende spelers kunnen doorgaan. Verlaat de ghost de ronde, dan winnen de bewoners. Escape en de lobby blokkeren alleen jouw bediening. De lokale gameloop, geluid, animaties en serverupdates blijven actief. Je blijft zichtbaar op je plek en kunt geraakt en uitgeschakeld worden; schade en de uitslag verschijnen ook met het menu open. Een puzzelscherm geeft evenmin bescherming. In een verborgen browsertab kan de browser de rendering vertragen; de server blijft schade en tijdslimieten verwerken.

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

Wijzig `multiplayer.js` voor lobby, HUD en de multiplayer-integratie. `network.js` verzorgt de directe verbindingen en `rendering.js` groepeert de oorspronkelijke avataronderdelen. `shared/protocol.js` is gedeeld tussen browser en server. `npm run build` verwerkt die adapter in de originele HTML. Vercel doet dit ook bij elke deployment, dus een wijziging aan multiplayer.js komt na een GitHub-commit automatisch in de site terecht. Pas de serverregels aan in `lib/game.mjs`. Puzzelposities/labels staan ook in multiplayer.js; houd beide kanten gelijk.

`original.html` blijft het uitgangspunt voor het huis en de graphics. Verander je muren of deurposities, werk dan ook `lib/house-walls.json` en de server-deurposities bij. De meegeleverde huisbotsingsdata is uit het oorspronkelijke huis gehaald. De technische test kan die data opnieuw exporteren met `node tools/runtime-smoke.mjs --export-walls`.

## Wat in deze update is veranderd

- **Directe beweging via WebRTC:** een mesh tussen maximaal vijf spelers. Bewegingen, kijkrichting, loopfase, bukken en zaklampstand worden circa twintigmaal per seconde verstuurd. Het bewegingskanaal wacht niet op oude pakketten en laat nieuwe bewegingen niet achter een serverrequest aansluiten. Ontvangers gebruiken ongeveer 60 ms interpolatie en maximaal 100 ms extrapolatie; bij pakketverlies stopt voorspelling snel.
- **Serverupdates zonder kamerconflicten:** de heartbeat schrijft alleen de pose van die speler. Gewone ticks verhogen de kamerversie niet meer. Redis-reads en de rate limit worden in één REST-pipeline opgehaald. Alleen spelacties en veranderingen aan de uitslag gebruiken de vergrendelde kamerwrite.
- **Acties blijven servergestuurd:** schade, rollen, energie, cooldowns, puzzels, deuren en uitslagen worden op Vercel gevalideerd. Direct ontvangen posities kunnen bij een aanval worden meegestuurd, ondertekend door de betreffende speler, zodat een oude serverpositie een actuele aanval niet blokkeert. Een andere speler kan daarmee geen gezondheid of positie van zijn slachtoffer verzinnen. Na een geslaagde actie vragen verbonden spelers meteen de nieuwe serverstaat op.
- **Correcte beweging rond hoeken:** de server controleert de recente route met korte tussenpunten. Hij trekt geen rechte lijn door een muur tussen twee ver uit elkaar liggende updates. Afstands- en muurcontroles blijven actief.
- **Actieve menu's:** Escape stopt uitsluitend bediening en muisvangst. De wedstrijd en de lokale wereld blijven lopen. Doodgaan en geholpen worden werken ook met een menu open; hervatten geeft geen nieuwe levens.
- **Minder renderwerk:** menselijke avatars behouden hun oorspronkelijke materialen, geometrie en bewegende gewrichten, maar hebben 23 in plaats van 34 meshes. Avatars gebruiken nu de bestaande kamerculling. Rook wordt alleen bijgewerkt als die relevant is, met 1.000 deeltjes voor een multiplayerghost. Spiegelbeelden worden maximaal ongeveer 30 keer per seconde opnieuw gerenderd; het hoofdbeeld blijft op de gewone framerate lopen. HUD-updates zijn begrensd en de lobbylijst wordt alleen opnieuw opgebouwd wanneer die verandert.

De onderliggende Three.js-renderer, huis, textures, meubels, shaders, sfeer en oorspronkelijke instellingen blijven behouden. `original.html` is nog steeds byte-identiek aan het aangeleverde originele bestand.

## Netwerk controleren en TURN instellen

Onderaan de spel-HUD staat bijvoorbeeld **Realtime 2/2 · 20 updates/s** wanneer je met drie spelers verbonden bent. De ms-waarde op deze regel is de retourtijd van de directe verbinding. **Server ... ms** bij een onvolledige realtimeverbinding is de API-retourtijd; dat is een andere meting.

Een realtimeverbinding begint automatisch met de ingebouwde STUN-instelling. Tijdens het verbinden blijft de HTTPS-fallback actief. Verbinden duurt doorgaans enkele seconden. Bij volledig verbonden spelers gebruikt de server ongeveer één heartbeat per seconde; bij een ontbrekende directe verbinding probeert de client een serverupdate elke 250 ms, zonder overlappende requests. RTT en browserbelasting bepalen de werkelijke frequentie.

Voor netwerken die geen directe verbinding toelaten is een **TURN-relay** nodig om WebRTC te kunnen gebruiken. Vercel Functions kunnen deze relay zelf niet leveren. Maak bij een TURN-service een set game-credentials aan en voeg in Vercel de volgende variabelen toe:

```text
WEBRTC_TURN_URLS=turn:relay.example.com:3478,turns:relay.example.com:5349
WEBRTC_TURN_USERNAME=<TURN-gebruikersnaam>
WEBRTC_TURN_CREDENTIAL=<TURN-wachtwoord>
```

Dit zijn voorbeelden: gebruik de exacte URLs en credentials van jouw service, kies Production/Preview zoals nodig en redeploy. Vul geen beheerderswachtwoord of account-API-key in. De TURN-gebruikersnaam en het TURN-wachtwoord worden aan ingelogde lobbyleden gegeven omdat hun browsers de relay moeten kunnen gebruiken. Redis-secrets blijven uitsluitend op de server. Voor publieke, grootschalige hosting zijn kortlevende TURN-credentials en een eigen uitgifte-endpoint een volgende stap; deze versie ondersteunt een vaste set game-credentials.

Als je geen TURN instelt en de directe verbinding niet lukt, blijft de game via de server werken. Die fallback houdt merkbaar meer bewegingsvertraging dan WebRTC. De HUD maakt dit zichtbaar. Er wordt geen camera, microfoon of voicechat gebruikt.

Officiële uitleg: [WebRTC peer connections](https://webrtc.org/getting-started/peer-connections), [TURN-relays](https://webrtc.org/getting-started/turn-server), [Datachannels](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel), [Upstash REST-pipelines](https://upstash.com/docs/redis/features/restapi).

## Getest en grenzen

- 28 automatische tests: bestaande spelregels, vijf gelijktijdige heartbeatclients zonder kamerwrites, routecontrole rond hoeken, ondertekende posities, verkeerde handtekeningen, oude pakketten, oude rondes, interpolatie, signalingautorisatie, tien peerparen voor vijf browseradapters, directe bewegingsberichten, ICE-berichten vóór een offer en 20 Hz verzending bij 30 renderframes per seconde.
- De echte oorspronkelijke gamecode met Three.js wordt technisch opgebouwd en de gameloop wordt uitgevoerd met nagebootste DOM/canvas. Escape, actief doorlopende wereld, schade/uitgeschakeld zijn met het menu open, hervatten, helpen, puzzel- en lobbymenu's en het opruimen van avatars worden gecontroleerd. De gemeten avatargrenzen blijven gelijk na het samenvoegen van meshes.
- De WebRTC-test simuleert het browsertransport. Er is geen testbrowser/GPU beschikbaar in de testomgeving, en er is geen live Vercel/Upstash/TURN-test uitgevoerd. Werkelijke FPS, RTT en verbinding door jouw router moeten na deployment op jullie apparaten worden gemeten. Dit pakket belooft geen vaste 60 FPS of verbinding op ieder netwerk zonder relay.

Bij veel lobbies blijven Vercel-, Redis- en eventuele TURN-limieten en verbruik relevant. Deze versie geeft geen competitieve anti-cheatgarantie; posities worden lokaal berekend en de server controleert beweging en spelacties. De zaklampstand en het zichtbare lampmodel worden gedeeld; de oorspronkelijke shader tekent de lichtbundel van de lokale speler. Rookvormen en kleine visuele ruis worden lokaal berekend, zodat niet ieder deeltje via het netwerk verstuurd hoeft te worden.

Lobbydata verloopt na twee uur zonder requests. Sessieherstel na een paginaverversing werkt via sessionStorage in dezelfde tab; het volledig sluiten van de tab maakt een nieuwe sessie nodig.
