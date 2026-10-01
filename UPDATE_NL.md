# Je bestaande Awaken’t-installatie bijwerken

1. **Pak de ZIP uit.** Open de map `awakent-multiplayer`. Upload de bestanden én submappen uit deze map naar de root van je bestaande GitHub-repository. Vervang de eerdere versies. Upload niet alleen `index.html` en upload de ZIP zelf niet als website.
2. **Controleer de nieuwe bestanden.** Vooral `api/signal.js`, `lib/store.mjs`, `lib/poses.mjs`, `shared/protocol.js`, `network.js` en `rendering.js` moeten erbij staan. `original.html` blijft ongewijzigd het uitgangspunt. Zet je echte secrets uitsluitend in Vercel; `.env.example` bevat voorbeelden.
3. **Commit naar de branch die Vercel deployt.** Vercel bouwt daarna automatisch. De projectinstellingen blijven Framework Preset **Other**, Build Command **npm run build**, Output Directory **.** en een Root Directory waarin `package.json` staat. Gebruik Node.js 22 of hoger.
4. **Behoud je bestaande Redis-instellingen.** `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN` blijven geldig. Nieuwe Redis-tabellen of een nieuwe database aanmaken is niet nodig.
5. **Wacht op een geslaagde deployment.** Laat iedereen de website volledig verversen: Ctrl+Shift+R op Windows/Linux, Cmd+Shift+R op Mac. Maak een nieuwe lobby en laat alle spelers de nieuwe versie openen. Oude en nieuwe clients samen gebruiken de langzamere fallback.
6. **Controleer de netwerkregel in de HUD.** Met twee spelers hoort er na het verbinden `Realtime 1/1 · 20 updates/s` te staan; met vijf spelers `Realtime 4/4`. Loop naast elkaar en wissel kijkrichting en zaklampstand om bewegingen te vergelijken.
7. **Test Escape.** Laat een bewoner het menu openen terwijl de ghost erbij staat. Na de eerste 15 seconden van de ronde kan de ghost zichtbaar worden en aanvallen. Het aantal levens moet ook in het menu afnemen. Bij een tweede geldige aanval kan de bewoner uitgeschakeld worden. De cooldowns en de zichtbaarheidstijd blijven gelden.
8. **Vergelijk de FPS.** Zet via de instellingen de performanceweergave aan of druk P. Test in dezelfde kamer, met dezelfde graphicsinstelling en hetzelfde aantal spelers als voorheen. Laat de automatische graphicsinstelling even stabiliseren. Er is geen gegarandeerde FPS-waarde; de optimalisaties besparen vooral avatar-, rook-, spiegel- en HUD-werk.

## Als Realtime niet volledig verbindt

Blijft na ongeveer 20 seconden `Realtime 0/1` of een ander onvolledig aantal staan, dan werkt nog de HTTPS-fallback. De API is in dit pakket efficiënter, maar een fallback houdt meer vertraging dan een directe verbinding.

Een firewall, VPN, bedrijfs-/schoolnetwerk of bepaalde NAT-configuraties kan een TURN-relay vereisen. Stel de drie optionele variabelen uit `.env.example` in met de waarden van jouw TURN-service en redeploy. Gebruik de concrete instructies in `README.md`. Vercel kan de game en signaling hosten, maar levert zelf geen TURN-server.

Wanneer Realtime wel volledig verbindt en beweging alsnog vertraagd voelt, vergelijk de RTT in de HUD op beide apparaten. Voor verdere diagnose zijn de netwerkregel, FPS, browser/apparaat en de vraag of beide spelers op hetzelfde wifi-netwerk zitten bruikbaar.
