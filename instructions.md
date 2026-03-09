# Nächste Schritte zur Fehlerbehebung in der App

Nach jedem Fertigen Schritt teste direkt die Funktion aus damit du dir sicher bist ob alles geklapt hat oder nicht. Wenn es nicht geklappt hat, mach es nochmal und schau dir die Logs an um den Fehler zu finden. Sonst gehe weiter zum nächsten Schritt.

## 1) Sparschweine können nicht verbunden werden ("Code funktioniert nie")

### Ziel
Stabile Verbindung von Sparschweinen mit klaren Fehlermeldungen und reproduzierbarer Diagnose.

### Nächste Schritte
1. **Fehlerbild klar eingrenzen**
   - Definieren, was "nicht verbunden" genau bedeutet:
     - Verbindung über Code schlägt direkt fehl?
     - Verbindung wird als erfolgreich angezeigt, aber Daten fehlen?
     - Verbindung klappt nur manchmal?
   - Für 3–5 reale Fälle jeweils notieren:
     - eingegebener Code (ggf. maskiert),
     - Nutzerrolle,
     - Zeitpunkt,
     - Netzwerktyp (WLAN/Mobilfunk),
     - sichtbare Fehlermeldung.

2. **End-to-End Ablauf dokumentieren**
   - Den kompletten Verbindungs-Flow als Sequenz festhalten:
     - Eingabe des Codes,
     - Validierung im Frontend,
     - Request ans Backend/Supabase,
     - Berechtigungsprüfung,
     - DB-Write,
     - UI-Update.
   - Pro Schritt definieren: erwartetes Ergebnis vs. tatsächliches Ergebnis.

3. **Logging- und Fehlerkonzept schärfen**
   - Einheitliche Fehlercodes festlegen (z. B. ungültiger Code, abgelaufen, keine Rechte, Serverfehler).
   - Frontend- und Backend-Logs so strukturieren, dass eine Anfrage eindeutig nachverfolgt werden kann (Korrelation über Request-ID).
   - Alle generischen Fehlertexte durch verständliche Nutzertexte ersetzen.

4. **Daten- und Rechteprüfung**
   - Prüfen, ob Verbindungs-Codes korrekt gespeichert/ausgewertet werden (Format, Länge, Gültigkeit).
   - Prüfen, ob Row-Level Security/Policies den Join-Prozess blockieren.
   - Sicherstellen, dass der aktuelle Nutzer die erforderlichen Rechte zum Verbinden besitzt.

5. **Testmatrix aufbauen**
   - Fälle definieren: gültig, ungültig, abgelaufen, bereits verwendet, falscher Nutzer, Offline.
   - Erwartetes Ergebnis je Fall dokumentieren.
   - Erst nach grüner Testmatrix in Release übernehmen.

---

## 2) Es sollen nur 10 Transaktionen angezeigt werden, dann per Button weitere 10 laden

### Ziel
Performante und verständliche Transaktionsliste mit klarer Pagination.

### Nächste Schritte
1. **UX-Verhalten festlegen**
   - Initial immer genau 10 Einträge laden.
   - Button-Label definieren (z. B. "Weitere 10 laden").
   - Wenn keine weiteren Einträge vorhanden sind: Button ausblenden oder deaktivieren + Hinweistext.

2. **Backend/Query-Strategie definieren**
   - Offset-basierte oder Cursor-basierte Pagination auswählen (Cursor bevorzugt bei großen Datenmengen).
   - Sortierreihenfolge eindeutig machen (z. B. neueste zuerst, stabiler Tiebreaker über ID).

3. **Ladezustände und Fehlerfälle spezifizieren**
   - Während Nachladen: Button deaktivieren + Spinner.
   - Bei Fehler: Retry-Möglichkeit mit klarer Meldung.
   - Duplikate beim Nachladen vermeiden (Deduplication-Regel festlegen).

4. **Akzeptanzkriterien festhalten**
   - Startansicht zeigt exakt 10 Einträge.
   - Jeder Klick erhöht um exakt 10 (sofern vorhanden).
   - Keine doppelten oder übersprungenen Einträge.

---

## 3) Es gibt 2 App-Hilfen in den Einstellungen; es soll nur eine geben

### Ziel
Eine zentrale Hilfe-Funktion mit klarer Struktur statt doppelter Navigationspunkte.

### Nächste Schritte
1. **Bestandsaufnahme beider Hilfen**
   - Inhalte, Einstiegspunkte, Unterschiede und Überschneidungen tabellarisch erfassen.

2. **"Single Source of Truth" definieren**
   - Entscheiden, welche bestehende Hilfe als Basis bleibt.
   - Die zweite Hilfe vollständig entfernen (Entry Point, Routing, ggf. veraltete Texte).

3. **Informationsarchitektur verbessern**
   - Hilfe in Bereiche gliedern:
     - Erste Schritte,
     - Sparschwein verbinden,
     - Transaktionen,
     - Benachrichtigungen,
     - FAQ/Support.

4. **Qualitätscheck**
   - Alle Einstellungen auf tote Links oder doppelte Menüpunkte prüfen.
   - Sicherstellen, dass Hilfe von allen relevanten Screens erreichbar bleibt.

---

## 4) Box-Tutorial hinzufügen (mit Platzhaltern für späteren Inhalt)

### Ziel
Tutorial-Rahmen bereitstellen, damit Inhalte später schnell ergänzt werden können.

### Nächste Schritte
1. **Tutorial-Struktur definieren**
   - Festlegen, ob Schritt-für-Schritt, Kartenansicht oder modaler Guide.
   - Platzhalter-Sektionen vorbereiten (Titel, Kurzbeschreibung, optional Bild/Video-Hinweis).

2. **Content-Placeholder planen**
   - Pro Schritt einheitliche Felder definieren:
     - Titel,
     - Ziel,
     - Platzhaltertext,
     - "Noch auszuarbeiten"-Marker.

3. **Einbindung in die Hilfe**
   - Box-Tutorial als festen Unterpunkt in der verbleibenden Hilfe integrieren.
   - Sichtbar machen, dass Inhalte in Arbeit sind (damit Nutzer den Status verstehen).

4. **Abnahme-Kriterien definieren**
   - Tutorial ist aufrufbar,
   - Struktur vollständig vorhanden,
   - Platzhalter klar als vorläufig markiert.

---

## 5) Beim Wechsel auf Englisch wird nicht alles in der App übersetzt

### Ziel
Konsistente Internationalisierung (i18n) über alle Screens, Komponenten und Meldungen.

### Nächste Schritte
1. **i18n-Audit durchführen**
   - Alle Screens/Komponenten auf Hardcoded Strings prüfen.
   - Ergebnisliste erstellen mit:
     - Datei/Screen,
     - String,
     - Kontext,
     - Priorität (hoch/mittel/niedrig).

2. **Übersetzungs-Schlüssel standardisieren**
   - Einheitliches Namensschema festlegen (z. B. `settings.help.title`, `transactions.loadMore`).
   - Doppelte oder inkonsistente Keys bereinigen.

3. **Laufzeitverhalten prüfen**
   - Sicherstellen, dass Sprachwechsel ohne App-Neustart alle sichtbaren Texte aktualisiert.
   - Auch modale Fenster, Toasts, Fehlermeldungen und leere Zustände prüfen.

4. **Fallback-Strategie definieren**
   - Wenn ein EN-Key fehlt: geordneter Fallback (z. B. auf DE) plus internes Logging.
   - Fehlende Übersetzungen im QA-Bericht sichtbar machen.

5. **Regressions-Checkliste erstellen**
   - Deutsch ↔ Englisch auf zentralen Flows testen:
     - Login,
     - Dashboard,
     - Sparschwein verbinden,
     - Einstellungen/Hilfe,
     - Tutorial,
     - Transaktionen.

---

## 6) Empfohlene Reihenfolge (Roadmap)

1. **Kritisch zuerst:** Sparschwein-Verbindung stabilisieren (Blocker für Kernfunktion).
2. **Danach UX/Performance:** Transaktions-Pagination mit 10er-Schritten.
3. **Dann Konsolidierung:** Doppelte Hilfe auf eine zentrale Hilfe reduzieren.
4. **Parallel vorbereitbar:** Box-Tutorial-Struktur mit Platzhaltern.
5. **Abschlussqualität:** Vollständiger i18n-Audit und Sprachwechsel-Fixes.

---

## 7) Definition of Done (projektweit)

- Für jedes der 5 Themen existieren klare Akzeptanzkriterien.
- Alle definierten Testfälle sind dokumentiert und bestanden.
- Keine doppelten Hilfemenüs mehr in den Einstellungen.
- Sprachwechsel DE/EN ist konsistent über alle relevanten Screens.
- Offene Punkte (z. B. Tutorial-Inhalte) sind als Backlog-Aufgaben mit Verantwortlichkeit erfasst.