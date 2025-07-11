# ActivityPlanner
Projektdokument – Private Planungs-Web-App für Freundeskreise

(Alle im Chat genannten Informationen sind vollständig übernommen. Nichts wurde weggelassen.)

⸻

1 · Ziel & Grundidee

Eine schlanke Web-App, die lokal (z. B. auf einem MacBook M1 oder Windows-PC) gehostet und ausschließlich im Freundeskreis geteilt wird.
Sie dient dazu, gemeinsame Aktivitäten schnell zu planen und jederzeit zu sehen, wer teilnimmt.

⸻

2 · Funktionaler Umfang

Bereich	Anforderungen
Registrierung & Profile	• Account besteht nur aus Nutzername + Passwort (keine E-Mail).• Beim Anlegen wird ein Profilbild hochgeladen; erscheint überall als rundes Icon.
Hauptansicht (Home)	• Oben rechts: kleines rundes Profilbild des eingeloggten Users.• Zentrales Karten-Karussell (Tinder-Look).• Jede Karte = 1 Aktivität, bedienbar mit zwei Buttons: — „Ich bin dabei“ (grün) — „Ich bin raus“ (rot)• Kartenelemente: — Titel oben — Datum darunter (kleine Schrift) — Bild in der Mitte (vom Ersteller gewählt) — Unten Leiste mit Profil-Icons aller Zusagen
Detailansicht einer Aktivität	• Öffnet sich beim Klick aufs Bild.• Zeigt: — ausführliche Beschreibung (externe Links erlaubt) — vollständige Teilnehmerliste (Namen) — Möglichkeit, eigene Zusage zu ändern
Karussell-Logik	• Endlosschleife: nach letzter Karte kommt wieder die erste.• Sortierung: nach Datum (nächstes Event vorn).• Abgelehnte Aktivitäten verschwinden sofort aus dem Karussell, bleiben aber erhalten: — Unter Profilbild Menüpunkt „Abgelehnt“ zum Wiederherstellen.
Spontane Aktionen – „Kommt her“	• Oben links kleiner grüner Button „Kommt her“.• Eingabe nur Titel + Beschreibung.• Alle Nutzer erhalten sofortige Benachrichtigung.• Aktion erscheint als erste Karte mit leuchtendem Rahmen.
„Ready“-Status	• Button „Ready“ unter Profilbild.• Bei Aktivierung erscheint Nutzer als bereit in schmaler Leiste oben rechts (neben „Kommt her“).
Weitere Profil-Menüpunkte	• „Vergangene Aktivitäten“ – chronologische Liste abgeschlossener Events.• Kalender-Reiter – alle angenommenen Aktivitäten tabellarisch nach Datum/Uhrzeit sortiert.


⸻

3 · Technische Anforderungen

Thema	Vorgaben
Hosting	• Lokaler Betrieb auf MacBook (M1) und Windows-PC möglich.• Cloud-Hosting optional, Budget ≤ 10 €/Monat.
Performance	• Kleiner Speicherabdruck.• Bilder in guter, aber nicht HDR/4K-Auflösung.
Benachrichtigungen	• Push-/Browser-Notifications, trotz reiner Web-App.
Sicherheit	• Hoher Schutz vor Web-Angriffen (CSRF, XSS, SQL-Injection u. a.).


⸻

4 · Nicht-technische / UX-Anforderungen
	•	Moderne Optik: geschmeidige Animationen, kein statisches, veraltetes Design.
	•	Farbkodierung nach Funktion:
	•	Grün = „Ich bin dabei“ / positive Aktionen
	•	Rot = „Ich bin raus“ / negative Aktionen

⸻

5 · Entwicklungs-Setup
	•	Umsetzung mithilfe von ChatGPT Codex (Code-Generierung via Prompts).
	•	Zielplattform: Standard-Browser, responsive Design.

⸻

Ergebnis: Eine fokussierte, private Planungsplattform mit maximaler Übersicht, blitzschnellen Reaktionen und minimalem Overhead – perfekt abgestimmt auf kleine Freundeskreise.

⸻

6 · Projekt-Bootstrap

### Lokale Ausf\xC3\xBChrung
1. Node.js (>=18) installieren.
2. Im Projektverzeichnis `npm install` ausf\xC3\xBChren.
3. App per `npm run dev` starten und unter http://localhost:3000 aufrufen.

### Docker-Compose
1. `docker-compose up` baut und startet den Container in einem Schritt.

### Optionale Cloud-Deployments
G\xC3\xBCnstige Hoster wie **fly.io** oder **Railway** unterst\xC3\xBCtzen Node.js-Container und kosten im Einsteigerplan unter 10 \xE2\x82\xAC pro Monat.
Kurzer Ablauf:
- **fly.io:** `fly launch` ausf\xC3\xBChren, danach `fly deploy`.
- **Railway:** `railway login`, dann `railway init` im Projektordner und anschließend `railway up` zum Starten.


7 · Schritt-f\xC3\xBCr-Schritt Einrichtung

Diese Anleitung beschreibt die komplette Einrichtung ab Installation von Visual Studio Code.

1. **Visual Studio Code installieren**
   - Download von https://code.visualstudio.com/ und entsprechend dem Betriebssystem installieren.
2. **Repository herunterladen**
   - Terminal \xC3\xB6ffnen und `git clone <repo-url>` ausf\xC3\xBChren oder ZIP herunterladen und entpacken.
3. **Projektordner in VS Code \xC3\xB6ffnen**
   - In VS Code \xC3\xBCber *File \xE2\x86\x92 Open Folder...* das zuvor geklonte Verzeichnis w\xC3\xA4hlen.
4. **Node.js installieren**
   - Version 18 oder neuer von https://nodejs.org/ herunterladen und installieren.
5. **Abh\xC3\xA4ngigkeiten installieren**
   - Im integrierten Terminal `npm install` ausf\xC3\xBChren.
6. **Entwicklungsserver starten**
   - `npm run dev` starten und die App unter http://localhost:3000 aufrufen.
7. **Tests ausf\xC3\xBChren (optional)**
   - `npm test` f\xC3\xBChrt die automatischen Tests aus.
8. **Docker verwenden (optional)**
   - Alternativ `docker-compose up` nutzen, um die Anwendung in Containern zu starten.
9. **Auf Railway deployen (optional)**
   - Railway-CLI installieren: `npm i -g railway`.
   - `railway login` ausführen.
   - Im Projektordner `railway init` gefolgt von `railway up`.
   - Die URL erscheint nach erfolgreichem Upload in der Konsole.
