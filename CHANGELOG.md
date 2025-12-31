# Changelog

Všechny významné změny v tomto projektu budou zdokumentovány v tomto souboru.

## [1.24] - 2025-12-31

### ✨ Nové funkce
- **PDF Export** - Export měsíčních dat do PDF s profesionálním formátem
- **Mobilní náhled** - Fullscreen modal pro náhled PDF přímo v aplikaci (bez popup oken)
- **Souhrn v PDF** - Zobrazuje měsíc, celkové hodiny a minuty na začátku
- **Tabulka s 5 sloupci** - Den, Směna, Hodiny, Přesčasy, Poznámka

### 🎨 Vylepšení UI
- Optimalizace tabulky pro tisk - černobílé barvy (#444 header, #ddd pozadí)
- Responsive layout PDF náhledu pro mobilní zařízení
- Flex layout s pevným headerem/footerem a scrollovatelným obsahem
- Šířky sloupců optimalizovány pro čitelnost

### 🔧 Technické detaily
- Skrytý element pro PDF export bez CSS omezení na výšku
- Automatický výpočet směn z rotačního plánu nebo DB
- HTML tabulka se inline CSS pro PDF generování
- Použití `html2pdf.js` v1.0.1 z CDN

### 📱 Mobilní vylepšení
- Fixní header a footer PDF náhledu
- Scrollovatelný obsah v prostřední sekci
- Touch-friendly tlačítka pro Save/Back
- Odstraněn problém s position:fixed a 60px offsetem

---

## [1.23] - 2025-12-30

### 🎨 UI/UX Changes
- **Odebrání holiday markeru** - Zrušen červený "S" marker pro svátky
- **Přemístění vacation markeru** - "D" marker přesunut na top-left roh (místo top-right)
- **Červené hodiny na svátcích** - Hodiny se zobrazují červeně na svátkových dnech

### 🔧 Technické opravy
- Zrušeny všechny CSS pravidla pro `.day-holiday-marker`
- Upraveno CSS pro `.day-vacation-marker` na `right: 4px` (top-left)
- Přidáno pravidlo pro červené barvy hodin na svátcích

---

## [1.22] - 2025-12-27

### 🎨 Design Redesign
- Moderní modrý motiv pro edit a settings obrazovky
- Jednotný design s calendar screenim
- Zlepšené vizuální hierarchie

---

## [1.21] - 2025-12-25

### ✨ Nové funkce
- Zobrazení typu směny vedle hodin a přesčasů v info panelu
- Odebrán redundantní řádek se směnou

---

## [1.20] - 2025-12-24

### ✨ Nové funkce
- Zobrazení typu směny u normálních hodin a přesčasů v info panelu

---

## [1.19] - 2025-12-23

### 🔧 Refactoring
- Přestrukturování edit formu - párované input+select fields
- Oprava saveDayData() pro shift field

---

## Poznámka

Projekt je PWA (Progressive Web App) se Service Workerem, IndexedDB pro persistenci a responzivním dizajnem pro mobily.

