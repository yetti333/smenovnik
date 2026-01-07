// ===============================
//      REGISTRACE SERVICE WORKERU
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    console.log("Registrace SW, pathname:", window.location.pathname);
    
    navigator.serviceWorker
      .register("service-worker.js", { scope: "/smenovnik/" })
      .then(reg => {
        console.log("Service Worker registrován:", reg.scope);
      })
      .catch(err => {
        console.error("Chyba při registraci Service Workeru:", err);
      });
  });

  // Posluchač pro notifikace o nové verzi
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data.type === "NEW_VERSION_AVAILABLE") {
      console.log("Nová verze dostupná!");
      
      // Zobrazit notifikaci uživateli
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff8c00;
        color: #000000;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 11000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-weight: 600;
        display: flex;
        gap: 1rem;
        align-items: center;
      `;
      
      notification.innerHTML = `
        <span>Dostupná je nová verze! Aktualizovat?</span>
        <button id="update-btn" style="
          background: #000000;
          color: #ff8c00;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        ">Ano</button>
        <button id="dismiss-btn" style="
          background: transparent;
          color: #000000;
          border: none;
          cursor: pointer;
          font-weight: 600;
        ">Později</button>
      `;
      
      document.body.appendChild(notification);
      
      document.getElementById("update-btn").addEventListener("click", () => {
        window.location.reload();
      });
      
      document.getElementById("dismiss-btn").addEventListener("click", () => {
        notification.remove();
      });
    }
  });
}

const smenaA = [0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0]; //28x, 1-11-2025
const smenaB = [1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1];
const smenaC = [3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3];
const smenaD = [0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2];
const smenaR = [0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1]; // rotační volno každý 7.den
const days = ["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
const shifts = ["Volno", "Ranní", "Odpolední", "Noční"];

// returns true when dateObj matches a holiday in svatky or velikonoce
function isHoliday(dateObj) {
  const key = `${dateObj.getDate()}-${dateObj.getMonth() + 1}`;
  if (svatky[key]) return true;
  const year = dateObj.getFullYear();
  if (velikonoce[year] && velikonoce[year][key]) return true;
  return false;
}

// Seznam svátků s názvy
const svatky = {
  "1-1": "Nový rok",
  "1-5": "Svátek práce",
  "8-5": "Den vítězství",
  "5-7": "Den slovanských věrozvěstů Cyrila a Metoděje",
  "6-7": "Den upálení mistra Jana Husa",
  "28-9": "Den české státnosti",
  "28-10": "Den vzniku samostatného československého státu",
  "17-11": "Den boje za svobodu a demokracii",
  "24-12": "Štědrý den",
  "25-12": "1. svátek vánoční",
  "26-12": "2. svátek vánoční"
};
const velikonoce = {
  2025: { "18-4": "Velký pátek", "21-4": "Velikonoční pondělí" },
  2026: { "3-4": "Velký pátek", "6-4": "Velikonoční pondělí" },
  2027: { "26-3": "Velký pátek", "29-3": "Velikonoční pondělí" },
  2028: { "14-4": "Velký pátek", "17-4": "Velikonoční pondělí" },
  2029: { "30-3": "Velký pátek", "2-4": "Velikonoční pondělí" },
  2030: { "19-4": "Velký pátek", "22-4": "Velikonoční pondělí" },
  2031: { "11-4": "Velký pátek", "14-4": "Velikonoční pondělí" },
  2032: { "26-3": "Velký pátek", "29-3": "Velikonoční pondělí" },
  2033: { "15-4": "Velký pátek", "18-4": "Velikonoční pondělí" },
  2034: { "7-4": "Velký pátek", "10-4": "Velikonoční pondělí" }
};
let currentYear = new Date().getFullYear(); //datum kalendáře
let currentMonth = new Date().getMonth(); // 0 = leden, 11 = prosinec
let shiftText = "";
let currentSelectedDate = "";
let selectedShiftValue = -1;
const actualDate = new Date(); //reálné datum
const actualDay = actualDate.getDate();
const actualMonth = actualDate.getMonth();
const actualYear = actualDate.getFullYear();
const vibr = 7;

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Map stored shift codes or values to display labels used in the edit form
function formatShiftLabel(shiftVal) {
  if (!shiftVal) return '';
  const s = String(shiftVal).toLowerCase();
  const map = {
    'ranni': 'Ranní',
    'odpoledni': 'Odpolední',
    'nocni': 'Noční',
    'volno': 'Volno',
    'dovolena': 'Dovolená',
    'nemoc': 'Nemoc',
    'nahr': 'Náhradní volno'
  };
  if (map[s]) return map[s];
  // if it's already a readable label (with diacritics), just capitalize
  return capitalizeFirst(shiftVal);
}

// =========================
//  PŘEPÍNÁNÍ OBRAZOVEK
// =========================
const calendarScreen = document.getElementById('calendar-screen');
const settingsScreen = document.getElementById('settings-screen');
const editScreen = document.getElementById('edit-screen');

// ===================================
//      FUNKCE ZOBRAZENÍ OBRAZOVEK
// ===================================
function showScreen(screen) {
  // schovat všechny obrazovky
  calendarScreen.classList.remove('active');
  settingsScreen.classList.remove('active');
  editScreen.classList.remove('active');
  
  // PDF preview screen
  const pdfPreviewScreen = document.getElementById('pdf-preview-screen');
  if (pdfPreviewScreen) {
    pdfPreviewScreen.classList.remove('active');
  }

  // Manual screen
  const manualScreen = document.getElementById('manual-screen');
  if (manualScreen) {
    manualScreen.classList.remove('active');
  }

  // zobrazit vybranou obrazovku
  screen.classList.add('active');

  // pokud se vracíme na kalendář, obnov označení vybraného dne
  if (screen === calendarScreen) {
    const savedSelectedDate = localStorage.getItem("selectedDate");
    if (!savedSelectedDate) return;

    // počkej do dalšího snímku, ať je DOM připravený
    requestAnimationFrame(() => {
      // pomocí kontextu omez dotaz na správný kalendář
      const cellHours = calendarScreen.querySelector(`.day-hours[data-date="${savedSelectedDate}"]`);

      if (cellHours) {
        calendarScreen.querySelectorAll(".day.selected").forEach(el => el.classList.remove("selected"));
        cellHours.parentElement.classList.add("selected");
      } else {
        // fallback: pokud buňka neexistuje (např. měníš měsíc), znovu vyrenderuj aktuální měsíc
        renderCalendar(actualYear, actualMonth);

        // a po renderu zkus obnovu ještě jednou
        requestAnimationFrame(() => {
          const retryHours = calendarScreen.querySelector(`.day-hours[data-date="${savedSelectedDate}"]`);
          if (retryHours) {
            calendarScreen.querySelectorAll(".day.selected").forEach(el => el.classList.remove("selected"));
            retryHours.parentElement.classList.add("selected");
          }
        });
      }
      // Update btn-edit enabled state: enable only if the saved date is in the currently displayed month/year
      const btnEditEl = document.getElementById('btn-edit');
      if (btnEditEl) {
        try {
          const parts = savedSelectedDate.split('-');
          const selYear = parseInt(parts[0], 10);
          const selMonth = parseInt(parts[1], 10) - 1;
          if (selYear === currentYear && selMonth === currentMonth) {
            btnEditEl.disabled = false;
            btnEditEl.style.pointerEvents = 'auto';
          } else {
            btnEditEl.disabled = true;
            btnEditEl.style.pointerEvents = 'none';
          }
        } catch (e) {
          // if parsing fails, keep button disabled
          btnEditEl.disabled = true;
          btnEditEl.style.pointerEvents = 'none';
        }
        // also show info panel if selection belongs to this month
        try {
          const parts = savedSelectedDate.split('-');
          const selYear = parseInt(parts[0], 10);
          const selMonth = parseInt(parts[1], 10) - 1;
          if (selYear === currentYear && selMonth === currentMonth) {
            showDayInfoPanel(savedSelectedDate);
          } else {
            hideDayInfoPanel();
          }
        } catch (e) {
          hideDayInfoPanel();
        }
      }
    });
  }
}

// =============================
//      AKČNÍ LIŠTA
// ============================
// tlačítko ⚙️ Nastavení
document.getElementById('btn-settings').addEventListener('click', () => {
  showScreen(settingsScreen);
  document.body.classList.add("settings-open");
  if (navigator.vibrate) navigator.vibrate(vibr);
});

// tlačítko 📄 Export PDF
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  exportMonthToPDF(currentYear, currentMonth);
  //console.log('Export do PDF zatím není dostupný.');
  if (navigator.vibrate) navigator.vibrate(vibr);
});

// tlačítko ✏️ Editovat
const btnEdit = document.getElementById("btn-edit").addEventListener("click", () => {
  showScreen(editScreen);
  document.body.classList.add("edit-open");
  if (navigator.vibrate) navigator.vibrate(vibr);
});

// Zobrazení vybraného dne v edit-screen
function showSelectedDay(dateString) {
  const dateObj = new Date(dateString);

  const dayName = days[dateObj.getDay()];
  const formatted = `${dayName} ${dateObj.getDate()}.${dateObj.getMonth()+1}.${dateObj.getFullYear()}`;

  document.getElementById('selected-date').textContent = formatted;
  document.getElementById('selected-shift').textContent = shiftText.toLowerCase();
}

// Helper: get day data (from DB or defaults)
async function getDayData(dateKey) {
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const store = tx.objectStore('days');

  return new Promise((resolve) => {
    const req = store.get(dateKey);
    req.onsuccess = () => {
      const data = req.result;
      if (data) {
          resolve({
            hours: data.hours || '0',
            overtime: data.overtime || '0',
            shift: data.shift || '',
            hoursShift: data.hoursShift || '',
            overtimeShift: data.overtimeShift || '',
            note: data.note || '',
            fromDB: true
          });
      } else {
          // default values from localStorage, except when rotačně je to volno -> 0
          const dateObj = new Date(dateKey);
          const weekday = dateObj.getDay();
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth();
          const day = dateObj.getDate();
          // compute shift text from rotation arrays and treat 'volno' days as zero hours
          const smena = getShiftArray();
          const shiftDayStart = daysBetween(new Date(year, month, 1));
          const shiftDayIndex = (shiftDayStart + day - 1) % 28;
          const shiftTextLocal = shifts[smena[shiftDayIndex]] || '';
          const shiftCodeFromRotation = ["volno","ranni","odpoledni","nocni"][smena[shiftDayIndex]] || 'ranni';
            if (smena[shiftDayIndex] === 0) {
            resolve({ hours: '0', overtime: '0', shift: shiftTextLocal, hoursShift: 'volno', overtimeShift: '', note: '', fromDB: false });
          } else {
            const defaultHours = localStorage.getItem(weekdayMapHours[weekday]) || '0';
            const defaultOvertime = localStorage.getItem(weekdayMapOvertime[weekday]) || '0';
            resolve({ hours: defaultHours, overtime: defaultOvertime, shift: shiftTextLocal, hoursShift: shiftCodeFromRotation, overtimeShift: shiftCodeFromRotation, note: '', fromDB: false });
          }
      }
    };
    req.onerror = () => resolve({ hours: '0', overtime: '0', shift: '', hoursShift: '', overtimeShift: '', note: '' });
  });
}

// Info panel controls
function showDayInfoPanel(dateKey) {
  if (!dateKey) return hideDayInfoPanel();
  // ensure it's in the current month/year
  try {
    const parts = dateKey.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (y !== currentYear || m !== currentMonth) return hideDayInfoPanel();
  } catch (e) {
    return hideDayInfoPanel();
  }

  return getDayData(dateKey).then(data => {
    // pokud existuje měsíční souhrn, skryj ho při zobrazení detailu dne (rychlejší než odstraňovat)
    const existingSummary = document.getElementById('info-summary');
    if (existingSummary) existingSummary.style.display = 'none';
    // ujistíme se, že řádek 'Poznámka' je viditelný pro detail dne
    const noteRow = document.getElementById('info-note') ? document.getElementById('info-note').parentElement : null;
    if (noteRow) noteRow.style.display = '';
    // skryjeme řádek s celkovými hodinami při zobrazení detailu dne
    const totalRow = document.getElementById('info-total') ? document.getElementById('info-total').parentElement : null;
    if (totalRow) totalRow.style.display = 'none';
    const totalMinutesRow = document.getElementById('info-total-minutes') ? document.getElementById('info-total-minutes').parentElement : null;
    if (totalMinutesRow) totalMinutesRow.style.display = 'none';
    document.getElementById('info-hours').textContent = data.hours;
    document.getElementById('info-overtime').textContent = data.overtime;
    
    // Zobrazit typ směny pro normální hodiny
    const shiftDisplayMap = {
      'ranni': 'Ranní',
      'odpoledni': 'Odpolední',
      'nocni': 'Noční',
      'volno': 'Volno',
      'dovolena': 'Dovolená',
      'nemoc': 'Nemoc',
      'nahr': 'Náhradní volno'
    };
    
    let hoursShiftDisplay = '';
    if (data.fromDB && data.hoursShift) {
      hoursShiftDisplay = shiftDisplayMap[data.hoursShift] || data.hoursShift;
    } else {
      // z rotace
      hoursShiftDisplay = shiftDisplayMap[data.hoursShift] || '';
    }
    document.getElementById('hours-shift-info').textContent = hoursShiftDisplay ? `— ${hoursShiftDisplay.toLowerCase()}` : '';
    
    // Zobrazit typ směny pro přesčasy - POUZE pokud jsou přesčasy > 0
    let overtimeShiftDisplay = '';
    const overtimeValue = parseFloat(data.overtime) || 0;
    if (overtimeValue > 0) {
      if (data.fromDB && data.overtimeShift) {
        overtimeShiftDisplay = shiftDisplayMap[data.overtimeShift] || data.overtimeShift;
      } else {
        // z rotace
        overtimeShiftDisplay = shiftDisplayMap[data.overtimeShift] || '';
      }
    }
    document.getElementById('overtime-shift-info').textContent = overtimeShiftDisplay ? `— ${overtimeShiftDisplay.toLowerCase()}` : '';
    
    // header: formatted date + shift
    const dateObjHeader = new Date(dateKey);
    // use rotation-derived shift in header as well
    // header: prefer DB shift, otherwise rotation
    let headerShift = '';
    try {
      const sm = getShiftArray();
      const shiftDayStartH = daysBetween(new Date(dateObjHeader.getFullYear(), dateObjHeader.getMonth(), 1));
      const shiftDayIndexH = (shiftDayStartH + dateObjHeader.getDate() - 1) % 28;
      const rot = shifts[sm[shiftDayIndexH]] || '';
      if (data.fromDB && data.shift) headerShift = formatShiftLabel(data.shift);
        else headerShift = formatShiftLabel(rot || data.shift);
    } catch (e) {
      headerShift = capitalizeFirst(data.shift);
    }
    const headerStr = `${headerShift} — ${dateObjHeader.getDate()}.${dateObjHeader.getMonth()+1}.${dateObjHeader.getFullYear()}`;
    const headerEl = document.getElementById('info-header');
    if (headerEl) headerEl.textContent = headerStr;

    // holiday text
    const dateObj = new Date(dateKey);
    const key = `${dateObj.getDate()}-${dateObj.getMonth()+1}`;
    let holidayText = '';
    if (svatky[key]) holidayText = svatky[key];
    else if (velikonoce[dateObj.getFullYear()] && velikonoce[dateObj.getFullYear()][key]) holidayText = velikonoce[dateObj.getFullYear()][key];
    document.getElementById('info-holiday').textContent = holidayText;
    // note text
    const noteEl = document.getElementById('info-note');
    if (noteEl) noteEl.textContent = data.note || '\u00A0';

    const panel = document.getElementById('day-info-panel');
    if (panel) panel.classList.remove('hidden');
  }).catch(err => {
    console.error('Failed to populate day info panel', err);
  });
}

function hideDayInfoPanel() {
  // místo skrytí panelu zobrazíme souhrn měsíce (panel zůstane vždy viditelný)
  try {
    showMonthSummary(currentYear, currentMonth);
  } catch (e) {
    const headerEl = document.getElementById('info-header');
    if (headerEl) headerEl.textContent = '\u00A0';
  }
}

// Zobrazí souhrn pro zadaný měsíc (celkové odpracované hodiny + rozpis)
async function showMonthSummary(year, month) {
  const panel = document.getElementById('day-info-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  const monthStart = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthName = monthStart.toLocaleString('cs-CZ', { month: 'long' });
  const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const headerEl = document.getElementById('info-header');
  if (headerEl) headerEl.textContent = `${monthNameCap} ${year}`;

  const holidayEl = document.getElementById('info-holiday');
  if (holidayEl) holidayEl.textContent = '';
  const totalEl = document.getElementById('info-total');
  if (totalEl) totalEl.textContent = '—';
  const totalMinutesEl = document.getElementById('info-total-minutes');
  if (totalMinutesEl) totalMinutesEl.textContent = '—';
  
  // Skrýt info o směnách pro normální hodiny a přesčasy (viditelné jen při detailu dne)
  const hoursShiftInfoEl = document.getElementById('hours-shift-info');
  if (hoursShiftInfoEl) hoursShiftInfoEl.textContent = '';
  const overtimeShiftInfoEl = document.getElementById('overtime-shift-info');
  if (overtimeShiftInfoEl) overtimeShiftInfoEl.textContent = '';

  // otevřeme DB a spočítáme součty
  let totalNormal = 0;
  let totalOvertime = 0;
  try {
    const db = await openDB();
    const tx = db.transaction('days', 'readonly');
    const store = tx.objectStore('days');

    const promises = [];
    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      promises.push(new Promise((resolve) => {
        const req = store.get(dateKey);
        req.onsuccess = () => {
          const data = req.result;
          if (data && (data.hours || data.overtime)) {
            resolve({ hours: parseFloat(data.hours || 0), overtime: parseFloat(data.overtime || 0) });
          } else {
            const dateObj = new Date(dateKey);
            // pokud je podle rotačního plánu daný den 'volno', započítáváme 0 hodin
            try {
              const sm = getShiftArray();
              const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
              const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
              if (sm[shiftDayIndex] === 0) {
                resolve({ hours: 0, overtime: 0 });
                return;
              }
            } catch (e) {
              // ignore and fall back to defaults
            }
            const weekday = dateObj.getDay();
            const defaultHours = parseFloat(localStorage.getItem(weekdayMapHours[weekday]) || '0');
            const defaultOvertime = parseFloat(localStorage.getItem(weekdayMapOvertime[weekday]) || '0');
            resolve({ hours: defaultHours, overtime: defaultOvertime });
          }
        };
        req.onerror = () => resolve({ hours: 0, overtime: 0 });
      }));
    }

    const results = await Promise.all(promises);
    results.forEach(r => {
      totalNormal += Number(r.hours) || 0;
      totalOvertime += Number(r.overtime) || 0;
    });
  } catch (e) {
    // v případě chyby použijeme 0
    console.error('Chyba při počítání měsíčních součtů', e);
  }

  const totalAll = totalNormal + totalOvertime;

  const hoursEl = document.getElementById('info-hours');
  const overtimeEl = document.getElementById('info-overtime');
  const shiftEl = document.getElementById('info-shift');
  const noteEl = document.getElementById('info-note');

  // Zobrazíme: pod nadpisem Celkem odpracované hodiny (stejným stylem jako ostatní řádky), poté graf a rozpis
  if (totalEl) {
    totalEl.textContent = formatHours(totalAll);
    if (totalEl.parentElement) totalEl.parentElement.style.display = '';
  }
  if (totalMinutesEl) {
    const minutesVal = Math.round(totalAll * 60);
    totalMinutesEl.textContent = String(minutesVal);
    if (totalMinutesEl.parentElement) totalMinutesEl.parentElement.style.display = '';
  }
  if (hoursEl) hoursEl.textContent = formatHours(totalNormal);
  if (overtimeEl) overtimeEl.textContent = formatHours(totalOvertime);
  // skryjeme řádky směny a poznámky pro měsíční souhrn
  if (shiftEl && shiftEl.parentElement) shiftEl.parentElement.style.display = 'none';
  if (noteEl && noteEl.parentElement) noteEl.parentElement.style.display = 'none';

  // No graphical summary: only textual totals are displayed
}

function formatHours(n) {
  if (!isFinite(n)) return '0';
  if (Math.abs(Math.round(n) - n) < 1e-9) return String(Math.round(n));
  return String(Number(n.toFixed(2)));
}

// ================================
// Export měsíce do PDF
// ================================
async function exportMonthToPDF(year, month) {
  const monthStart = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthName = monthStart.toLocaleString('cs-CZ', { month: 'long' });
  const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Načti data z DB
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const store = tx.objectStore('days');

  const dataMap = new Map();
  await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      req.result.forEach(data => {
        if (data.date) {
          dataMap.set(data.date, data);
        }
      });
      resolve();
    };
  });

  // Vypočítej celkové hodiny a minuty
  let totalHours = 0;
  for (let day = 1; day <= lastDay; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateKey);
    
    let data = dataMap.get(dateKey);
    if (!data) {
      const weekday = dateObj.getDay();
      const sm = getShiftArray();
      const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
      
      if (sm[shiftDayIndex] !== 0) {
        const hours = parseFloat(localStorage.getItem(weekdayMapHours[weekday]) || '0');
        const overtime = parseFloat(localStorage.getItem(weekdayMapOvertime[weekday]) || '0');
        totalHours += hours + overtime;
      }
    } else {
      totalHours += parseFloat(data.hours || 0) + parseFloat(data.overtime || 0);
    }
  }
  const totalMinutes = Math.round(totalHours * 60);

  // Vytvoř HTML tabulku
  const monthNameFull = `${monthNameCap} ${year}`;
  let html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 10px; }
      h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #333; padding: 8px; text-align: left; }
      th { background-color: #ddd; color: #000; font-weight: bold; }
      tr:nth-child(even) { background-color: #ddd; }
      .summary-table { margin-bottom: 15px; }
      .summary-table td { font-weight: bold; background-color: #ddd; border: 2px solid #333; }
    </style>
    <table class="summary-table">
      <tr>
        <td style="width: 33%;">${monthNameFull}</td>
        <td style="width: 33%;">Celkem hodiny: ${formatHours(totalHours)}</td>
        <td style="width: 34%;">Celkem minuty: ${totalMinutes}</td>
      </tr>
    </table>
    <table>
      <colgroup>
        <col style="width: 15%;">
        <col style="width: 15%;">
        <col style="width: 12%;">
        <col style="width: 12%;">
        <col style="width: 46%;">
      </colgroup>
      <thead>
        <tr>
          <th>Den</th>
          <th>Směna</th>
          <th>Hodiny</th>
          <th>Přesčasy</th>
          <th>Poznámka</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let day = 1; day <= lastDay; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateKey);
    const dayName = days[dateObj.getDay()];
    
    let data = dataMap.get(dateKey);
    let shiftText = '';
    
    if (!data) {
      // Vypočítej defaultní hodnoty
      const weekday = dateObj.getDay();
      const sm = getShiftArray();
      const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
      
      let hours = '0';
      let overtime = '0';
      if (sm[shiftDayIndex] !== 0) {
        hours = localStorage.getItem(weekdayMapHours[weekday]) || '0';
        overtime = localStorage.getItem(weekdayMapOvertime[weekday]) || '0';
      }
      data = { hours, overtime, note: '' };
      
      // Направenie z rotace
      shiftText = shifts[sm[shiftDayIndex]] || '';
    } else {
      // Shift z DB
      shiftText = formatShiftLabel(data.shift) || '';
    }

    const hours = formatHours(parseFloat(data.hours || 0));
    const overtime = formatHours(parseFloat(data.overtime || 0));
    const note = (data.note || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    html += `
      <tr>
        <td>${dayName} ${day}.${month + 1}.</td>
        <td>${shiftText}</td>
        <td>${hours}</td>
        <td>${overtime}</td>
        <td>${note}</td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  // Zobraz náhled na fullscreen v aplikaci
  const pdfPreviewScreen = document.getElementById('pdf-preview-screen');
  const pdfPreviewContent = document.getElementById('pdf-preview-content');
  const pdfExportContent = document.getElementById('pdf-export-content');
  
  // Vytvoř obsah s tlačítky
  pdfPreviewContent.innerHTML = `
    <style>
      h1 { text-align: center; margin-bottom: 20px; font-size: 24px; color: var(--text); }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid var(--border-strong); padding: 8px; text-align: left; color: var(--text); }
      th { background-color: var(--accent); color: white; font-weight: bold; }
      tr:nth-child(even) { background-color: var(--form-bg); }
    </style>
    ${html}
  `;
  
  // Ulož stejný obsah do skrytého exportního kontejneru (bez CSS omezení)
  pdfExportContent.innerHTML = `
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      h1 { text-align: center; margin: 5px 0 10px 0; font-size: 18px; line-height: 1; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 2px solid #333; padding: 3px 5px; text-align: left; }
      th { background-color: #2196f3; color: white; font-weight: bold; }
      tr:nth-child(even) { background-color: #f5f5f5; }
      table { page-break-inside: avoid; }
    </style>
    ${html}
  `;
  
  // Ulož měsíc a rok pro pozdější export
  window._pdfExportMonth = month;
  window._pdfExportYear = year;
  window._pdfExportMonthName = monthNameFull;
  
  // Zobraz screen
  showScreen(pdfPreviewScreen);
  if (navigator.vibrate) navigator.vibrate(vibr);
}

// Otevření IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WorkHoursDB', 1);

    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('days')) {
        db.createObjectStore('days', { keyPath: 'date' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Načtení dat pro konkrétní den
async function loadDayData(selectedDate) {
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const store = tx.objectStore('days');
  const request = store.get(selectedDate);

  request.onsuccess = () => {
    const data = request.result;
    if (data) {
      // existuje záznam v IndexedDB
      document.getElementById('day-hours').value = data.hours;
      document.getElementById('day-shift-hours').value = data.hoursShift || 'ranni';
      document.getElementById('day-overtime').value = data.overtime;
      document.getElementById('day-shift-overtime').value = data.overtimeShift || 'ranni';
      document.getElementById('day-note').value = data.note || '';
    } else {
      // kdyz v WorkHoursDB nic není, tak načteme defaultní hodnotu z localStorage z defaultních hodin
      const dateObj = new Date(currentSelectedDate);
      const weekday = dateObj.getDay(); // 0 = neděle, 1 = pondělí, ...
      const defaultHours = localStorage.getItem(weekdayMapHours[weekday]);
      const defaultOvertime = localStorage.getItem(weekdayMapOvertime[weekday]);
      
      // Načti defaultní směnu z kalendáře (rotace)
      const sm = getShiftArray();
      const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
      const defaultShiftValue = sm[shiftDayIndex];
      const shiftMapSelector = ["volno","ranni","odpoledni","nocni"];
      const defaultShift = shiftMapSelector[defaultShiftValue] || 'ranni';
      
      document.getElementById('day-hours').value = defaultHours || '7.5';
      document.getElementById('day-shift-hours').value = defaultShift;
      document.getElementById('day-overtime').value = defaultOvertime || '0';
      document.getElementById('day-shift-overtime').value = defaultShift;
      document.getElementById('day-note').value = '';
    }
  };
}

// Uložení dat
async function saveDayData(selectedDate) {
  const db = await openDB();
  const tx = db.transaction('days', 'readwrite');
  const store = tx.objectStore('days');

  const data = {
    date: selectedDate,
    hours: document.getElementById('day-hours').value,
    hoursShift: document.getElementById('day-shift-hours').value,
    overtime: document.getElementById('day-overtime').value,
    overtimeShift: document.getElementById('day-shift-overtime').value,
    note: document.getElementById('day-note').value,
    shift: document.getElementById('day-shift-hours').value
  };

  store.put(data);
}

// Obsluha tlačítek

const btnEditOk = document.getElementById('btn-ok').addEventListener('click', async (e) => {
  e.preventDefault();
  if (navigator.vibrate) navigator.vibrate(vibr);
  const selectedDate = currentSelectedDate; // definováno při kliknutí na kalendář
  await saveDayData(selectedDate);
  // návrat na kalendář
  showScreen(calendarScreen);
  document.body.classList.remove("edit-open");
  // Re-render calendar to show updated D markers and hours from DB changes
  renderCalendar(currentYear, currentMonth);
});

const btnEditCancel = document.getElementById('btn-cancel').addEventListener('click', async (e) => {
  e.preventDefault();
  if (navigator.vibrate) navigator.vibrate(vibr);
   // návrat na kalendář
  showScreen(calendarScreen);
  document.body.classList.remove("edit-open");
});

// tlačítko 📅 Dnes v akční liště
document.getElementById("btn-today").addEventListener("click", () => {
  if ((currentMonth != actualMonth) || (currentYear != actualYear)) {
    currentMonth = actualMonth;
    currentYear = actualYear;
    if (navigator.vibrate) navigator.vibrate(vibr);
    animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
  } else {
    if (navigator.vibrate) navigator.vibrate(vibr);
  }
});

// tlačítko ⬅️ předchozího měsíce v akční liště
document.getElementById("btn-prev").addEventListener("click", () => {
  if (currentYear === 2025 && currentMonth === 10) {
    return;
  }
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } 
  if (navigator.vibrate) navigator.vibrate(vibr);
  animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
});

// tlačítko ➡️ dalšího měsíce v akční liště
document.getElementById("btn-next").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  if (navigator.vibrate) navigator.vibrate(vibr);
  animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
});

// tlačítko 🕒Zobrazit/skrýt pracovní hodiny
const btnHours = document.getElementById("btn-hours");
const weekdayMapHours = ["sun-hours","mon-hours","tue-hours","wed-hours","thu-hours","fri-hours","sat-hours"];
const weekdayMapOvertime = ["sun-overtime","mon-overtime","tue-overtime","wed-overtime","thu-overtime","fri-overtime","sat-overtime"];


btnHours.addEventListener("click", async () => {
  document.body.classList.toggle("show-hours");
  btnHours.classList.toggle("active");
  if (navigator.vibrate) navigator.vibrate(vibr);
  
  //uloz do localstorage stav zmacknutí btm-hours
  localStorage.setItem("btn-hours-on",true);
  const hoursCells = document.querySelectorAll(".day-hours");

  if (document.body.classList.contains("show-hours")) {
    // otevřeme DB
    const db = await openDB();
    const tx = db.transaction('days', 'readonly');
    const store = tx.objectStore('days');

    // projdeme všechny buňky s atributem data-date
    hoursCells.forEach(async cell => {
      const dateKey = cell.getAttribute("data-date"); // např. "2025-12-26"
      const request = store.get(dateKey);

      request.onsuccess = () => {
        const data = request.result;
        const dayCell = cell.parentElement;
        if (data) {
          // použij data z DB (i pokud jsou nuly)
          const totalHours = parseFloat(data.hours || 0) + parseFloat(data.overtime || 0);
          if (totalHours === 0) {
            cell.textContent = '0';
          } else {
            cell.textContent = totalHours;
          }
          // Set vacation attribute for CSS-controlled D marker
          if (data.shift === 'dovolena') {
            dayCell.setAttribute('data-vacation', 'true');
          } else {
            dayCell.removeAttribute('data-vacation');
          }
        } else {
              // když v DB nic není, ale den je podle rotace 'volno', pak nezobrazujeme žádné defaultní hodiny
              const dateObj = new Date(dateKey);
              const sm = getShiftArray();
              const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
              const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
              if (sm[shiftDayIndex] === 0) {
                // volno — neukazovat žádné hodiny
                cell.textContent = "";
              } else {
                const weekday = dateObj.getDay(); // 0 = neděle, 1 = pondělí, ...
                const defaultHours = localStorage.getItem(weekdayMapHours[weekday]);
                const defaultOvertime = localStorage.getItem(weekdayMapOvertime[weekday]);
                const totalHours = parseFloat(defaultHours || "0") + parseFloat(defaultOvertime || "0");
                cell.textContent = totalHours;
              }
              // Without DB record, ensure vacation attribute is cleared
              dayCell.removeAttribute('data-vacation');
          }
        };
    });
  } else {
    // při skrytí vyčistíme buňky
    localStorage.removeItem("btn-hours-on");
    hoursCells.forEach(cell => cell.textContent = "");
    }
});

// =============================
//      ZÍSKÁNÍ POLE SMĚNY
// ============================
function getShiftArray() {
  const shift = localStorage.getItem("shift") || "D";

  switch (shift) {
    case "A": return smenaA;
    case "B": return smenaB;
    case "C": return smenaC;
    case "D": return smenaD;
    case "R": return smenaR;
  }
}

// =============================
//      RENDER KALENDÁŘE
// ============================
async function renderCalendar(year, month) {
  const calendar = document.getElementById('calendar');
  const monthYear = document.getElementById('month-year');
  const prevButton = document.getElementById('btn-prev'); 

  const smena = getShiftArray();
 
  calendar.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  // Pomocná funkce pro formátování ISO bez posunu
  function formatDateISO(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Zobrazit název měsíce (první písmeno velké) a rok
  const monthName = firstDay.toLocaleString('cs-CZ', { month: 'long' });
  const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  monthYear.textContent = `${monthNameCap} ${year}`;
  
  // Zakázat tlačítko předchozí měsíc pro listopad 2025
 if (year === 2025 && month === 10) {
    prevButton.disabled = true;
    prevButton.style.pointerEvents = 'none';
  } else {
    prevButton.disabled = false;
    prevButton.style.pointerEvents = 'auto';
  }
  
  // Skrýt tlačitko Dnes pokud je aktuální měsíc a rok
  const btnToday = document.getElementById('btn-today');
  if (year === actualYear && month === actualMonth) {
    btnToday.disabled = true;
    btnToday.style.pointerEvents = 'none';
  } else {
    btnToday.disabled = false;
    btnToday.style.pointerEvents = 'auto';
  }

  // Prázdné buňky před začátkem měsíce
  for (let i = 0; i < startDay; i++) {
    calendar.innerHTML += `<div></div>`;
  }

  // Dny v měsíci
  const currentSelectedDateRender = localStorage.getItem("selectedDate");
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    let shiftDayIndex = 0;
    let shiftDayStart = 0;
    let classes = '';
    let tooltip = '';
    
    // Dnes
    if (day === actualDay && month === actualMonth && year === actualYear) classes += ' dnes';

    // když je v locakStorage vybraný den, tak ho označíme
    if (currentSelectedDateRender === formatDateISO(year, month, day)) {
      classes += ' selected';
      console.log("currentSelectedDate in render:", currentSelectedDateRender);
    }
    
    // Směny
    shiftDayStart = daysBetween(new Date(year, month, 1));
    shiftDayIndex = (shiftDayStart + day - 1) % 28;
    if (smena[shiftDayIndex] === 0) classes += ' volno';
    if (smena[shiftDayIndex] === 1) classes += ' ranni';
    if (smena[shiftDayIndex] === 2) classes += ' odpoledni';
    if (smena[shiftDayIndex] === 3) classes += ' nocni';
    
    // převod smeny na text
    const shiftValue = smena[shiftDayIndex];
    shiftText = shifts[shiftValue];
    
     // svátky
    const key = `${day}-${month+1}`; // měsíc +1 protože Date.getMonth() je 0-based
    const isHolidayDay = svatky[key] || (velikonoce[year] && velikonoce[year][key]);
    if (isHolidayDay) {
      classes += ' svatek';
      tooltip = isHolidayDay;
    }
    
    const dateKey = formatDateISO(year, month, day);
    
   
    calendar.innerHTML += `
      <div class="day ${classes.trim()}" title="${tooltip}">
        <span class="day-number">${day}</span>
        <span class="day-hours" data-date="${dateKey}"></span>
        <span class="day-vacation-marker">D</span>
      </div>
    `;
  }

  // Zvýraznění dne po kliknutí
  const dayCells = calendar.querySelectorAll('div');
  let selectedDay = null;
  const btnEdit = document.getElementById('btn-edit');
  
  updateEditButtonState();
  // If hours view is active, populate the hours for visible month (preserve until user toggles btn-hours)
  if (document.body.classList.contains('show-hours') || localStorage.getItem("btn-hours-on")) {
    const hoursCells = calendar.querySelectorAll('.day-hours');
    (async () => {
      try {
        const db = await openDB();
        const tx = db.transaction('days', 'readonly');
        const store = tx.objectStore('days');

        hoursCells.forEach(cell => {
          const dateKey = cell.getAttribute('data-date');
          const request = store.get(dateKey);
          request.onsuccess = () => {
            const data = request.result;
            const dayCell = cell.parentElement;
            if (data) {
              const totalHours = parseFloat(data.hours || 0) + parseFloat(data.overtime || 0);
              if (totalHours === 0) {
                cell.textContent = '0';
              } else {
                cell.textContent = totalHours;
              }
              // Set vacation attribute for CSS-controlled D marker
              if (data.shift === 'dovolena') {
                dayCell.setAttribute('data-vacation', 'true');
              } else {
                dayCell.removeAttribute('data-vacation');
              }
            } else {
              // pokud je podle rotace volno, nezobrazujeme defaultní hodiny
              const dateObj = new Date(dateKey);
              const sm = getShiftArray();
              const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
              const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
              if (sm[shiftDayIndex] === 0) {
                cell.textContent = "";
              } else {
                const weekday = dateObj.getDay();
                const defaultHours = localStorage.getItem(weekdayMapHours[weekday]);
                const defaultOvertime = localStorage.getItem(weekdayMapOvertime[weekday]);
                const totalHours = parseFloat(defaultHours || "0") + parseFloat(defaultOvertime || "0");
                cell.textContent = totalHours;
              }
              // Without DB record, ensure vacation attribute is cleared
              dayCell.removeAttribute('data-vacation');
            }
          };
        });
      } catch (e) {
        console.error('Error populating hours for month:', e);
      }
    })();
  }
  // show/hide info panel depending on whether the stored selection is in this month
  const savedSel = currentSelectedDateRender;
  if (savedSel) {
    try {
      const p = savedSel.split('-');
      const sy = parseInt(p[0], 10);
      const sm = parseInt(p[1], 10) - 1;
      if (sy === year && sm === month) {
        await showDayInfoPanel(savedSel);
      } else {
        hideDayInfoPanel();
      }
    } catch (e) {
      hideDayInfoPanel();
    }
  } else {
    hideDayInfoPanel();
  }
  
  dayCells.forEach(cell => {
    if (cell.textContent.trim() !== '') {
      cell.addEventListener('click', () => {

        // Číslo dne
      const dayNum = parseInt(cell.textContent, 10);
        
      // Sestav plné datum (bez posunu časové zóny)
      const selectedDateISO = formatDateISO(year, month, dayNum);

      // Pokud je vybraný den jiný než předchozí, zruš předchozí výběr a ulož nový
      if (selectedDateISO !== currentSelectedDate) {
        dayCells.forEach(c => c.classList.remove('selected'));
        currentSelectedDate = selectedDateISO;
        localStorage.setItem('selectedDate', currentSelectedDate);
      } else {
        // Pokud je stejný den, zruš výběr a smaž z localStorage
        cell.classList.remove('selected');
        currentSelectedDate = "";
        localStorage.removeItem('selectedDate');
        // Deaktivuj tlačítko Editovat
        btnEdit.disabled = true;
        btnEdit.style.pointerEvents = 'none';
        // skryj info panel taky
        hideDayInfoPanel();
        if (navigator.vibrate) navigator.vibrate(vibr);
        return; // ukonči funkci
      }
            
      // Přidej zvýraznění na kliknutý den
      cell.classList.add('selected');
      selectedDay = parseInt(cell.textContent);

      // Zjisti směnu pro vybraný den
      const selectedShift = "";
      const shiftDayStart = daysBetween(new Date(currentYear, currentMonth, 1));
      const shiftDayIndex = (shiftDayStart + selectedDay - 1) % 28;
      const smena = getShiftArray();
      selectedShiftValue = smena[shiftDayIndex];
      shiftText = shifts[selectedShiftValue];

      // Zobraz vybraný den do nadpisu a edit-screen
      showSelectedDay(selectedDateISO, selectedShiftValue);
      // vždy zobrazíme pouze měsíc (s velkým počátečním písmenem) a rok — bez směny
      const clickedMonthName = firstDay.toLocaleString('cs-CZ', { month: 'long' });
      const clickedMonthNameCap = clickedMonthName.charAt(0).toUpperCase() + clickedMonthName.slice(1);
      monthYear.textContent = `${clickedMonthNameCap} ${firstDay.getFullYear()}`;
      // Načti data pro vybraný den     
      loadDayData(selectedDateISO);
      // Aktivuj tlačítko Editovat
      btnEdit.disabled = false;
      btnEdit.style.pointerEvents = 'auto';
      // zobraz info panel pro vybraný den (pokud se nacházíme v tomto měsíci)
      showDayInfoPanel(selectedDateISO);
      if (navigator.vibrate) navigator.vibrate(vibr);
    });
   }
  });

  // (Removed global outside-click deselect handler)

  function updateEditButtonState() {
    const savedSelectedDate = localStorage.getItem("selectedDate") || currentSelectedDate;
    if (savedSelectedDate) {
      // savedSelectedDate is in format YYYY-MM-DD
      const parts = savedSelectedDate.split('-');
      const selYear = parseInt(parts[0], 10);
      const selMonth = parseInt(parts[1], 10) - 1; // zero-based month
      // enable only if the selected date belongs to the currently rendered month/year
      if (selYear === year && selMonth === month) {
        btnEdit.disabled = false;
        btnEdit.style.pointerEvents = 'auto';
      } else {
        btnEdit.disabled = true;
        btnEdit.style.pointerEvents = 'none';
      }
    } else {
      btnEdit.disabled = true;
      btnEdit.style.pointerEvents = 'none';
    }
}
}

// ===================================
//      ANIMACE AKTUALIZACE KALENDÁŘE
// ===================================
function animateCalendarUpdate(callback) {
  const calendar = document.getElementById('calendar');
  // keep stored selection so it persists when navigating back to the month
  // only remove the visual selected state during the animation to avoid flicker
  const prevSelected = calendar.querySelectorAll('.selected');
  prevSelected.forEach(el => el.classList.remove('selected'));

  calendar.classList.add('fade-out');

  setTimeout(() => {
    callback(); // vykresli nový měsíc
    calendar.classList.remove('fade-out');
    calendar.classList.add('fade-in');

    setTimeout(() => {
      touchEndX = 0;
      calendar.classList.remove('fade-in');
    }, 300);
  }, 300);
}

// =============================
//      GESTA PŘETAŽENÍ
// ============================
let touchStartX = 0;
let touchEndX = 0;
const calendarContainer = document.querySelector('.calendar-container');

calendarContainer.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

calendarContainer.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture();
});

function handleSwipeGesture() {
  const threshold = 50; // minimální vzdálenost pro gesto

  if (touchEndX < touchStartX - threshold) {
     // swipe vlevo → další měsíc
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
  }

  if (touchEndX > touchStartX + threshold) {
    // swipe vpravo → předchozí měsíc
    if (currentYear === 2025 && currentMonth === 10) {
    return;
  }
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
  }
}

// (Removed global click handler that cleared selection when clicking outside the calendar)

// =============================
//      POČET DNŮ MEZI DATY
// ============================
function daysBetween(day1) {
  const day2 = new Date(Date.UTC(2025, 10, 1)); // listopad 2025 jako základ
  const d1 = new Date(Date.UTC(day1.getFullYear(), day1.getMonth(), day1.getDate()));
  const diff = (d1 - day2) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

// ===================================
//      AKTIVACE SEGMENTOVÉHO OVLÁDÁNÍ
// ===================================
function activateSegment(container, value) {
  const buttons = container.querySelectorAll("button");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

// logika pro přepínání záložek
const tabButtons = document.querySelectorAll(".tab-header button");
const tabPanes = document.querySelectorAll(".tab-pane");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (navigator.vibrate) navigator.vibrate(vibr);

    const target = btn.dataset.tab;
    tabPanes.forEach(pane => {
      pane.classList.toggle("active", pane.id === target);
    });
  });
});

const themeControl = document.getElementById("theme-control");
/* ============================
      MOTIV ZOBRAZENÍ
============================ */
// Načíst uložený motiv
let savedTheme = localStorage.getItem("theme") || "light";
document.body.dataset.theme = savedTheme;
activateSegment(themeControl, savedTheme);

// Kliknutí na segment motivu
themeControl.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  if (navigator.vibrate) navigator.vibrate(vibr);

  savedTheme = e.target.dataset.value;
  localStorage.setItem("theme", savedTheme);

  document.body.dataset.theme = savedTheme;
  activateSegment(themeControl, savedTheme);
  
  // Okamžitě překreslit kalendář s novým tématem
  renderCalendar();
});

// ================================================
//      ZAKLADNÍ NASTAVENÍ HODIN 
// ================================================
const inputsDefaultHours = document.querySelectorAll('#hours input[type="number"]');
  // načtení a obsluha inputů
inputsDefaultHours.forEach(input => {
  // načtení uložené hodnoty
  const savedValue = localStorage.getItem(input.id);
  if (savedValue !== null) {
    input.value = savedValue;
  }
  // při kliknutí do pole se vymaže obsah
  input.addEventListener('focus', function() {
    this.select();
  });

  // volitelně i při kliknutí myší
  input.addEventListener('click', function() {
    this.value = '';
  });

  // Enter = vyskočení z pole
  input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.blur(); // ztratí focus
    }
  });

  // tlačítko OK uloží všechny hodnoty
  const btnOk = document.getElementById('btn-settings-ok');
  btnOk.addEventListener('click', () => {
    inputsDefaultHours.forEach(input => {
      localStorage.setItem(input.id, input.value);
    });
    showScreen(calendarScreen);
    document.body.classList.remove("settings-open");
    if (navigator.vibrate) navigator.vibrate(vibr);
    // Re-render calendar to reflect any changes from settings
    renderCalendar(currentYear, currentMonth);
  });

  // tlačítko Cancel vrátí hodnotu z localStorage
  const btnCancel = document.getElementById('btn-settings-cancel');
  btnCancel.addEventListener('click', () => {
    const savedValue = localStorage.getItem(input.id);
    if (savedValue !== null) {
      input.value = savedValue;
    }
    showScreen(calendarScreen);
    document.body.classList.remove("settings-open");
    if (navigator.vibrate) navigator.vibrate(vibr);
    // Re-render calendar to reflect any changes from settings
    renderCalendar(currentYear, currentMonth);
  });
});
// ================================
//      OŠETŘENÍ INPUTU EDITACE DNŮ
// ================================
const editInputs = document.querySelectorAll('#edit-screen input, #edit-screen textarea');
editInputs.forEach(input => {
  // při kliknutí do pole se vymaže obsah
  input.addEventListener('focus', function() {
    this.select();
  });
  // volitelně i při kliknutí myší
  input.addEventListener('click', function() {
    this.value = '';
  });
  // Enter = vyskočení z pole
  input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.blur(); // ztratí focus
    }
  });
});

// =============================
//      SMĚNA - ZOBRAZENÍ
// ============================
const shiftControl = document.getElementById("shift-control");

// Načíst uloženou směnu nebo použít D jako výchozí
let savedShift = localStorage.getItem("shift") || "D";
activeShift = savedShift;
activateSegment(shiftControl, savedShift);

// Kliknutí na segment směny
shiftControl.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  if (navigator.vibrate) navigator.vibrate(vibr);

  activeShift = e.target.dataset.value;
  localStorage.setItem("shift", activeShift);

  activateSegment(shiftControl, activeShift);
  renderCalendar(currentYear, currentMonth);
});

// Reset dat - vymaže IndexedDB 'days' a vybrané položky localStorage
const btnReset = document.getElementById('btn-reset-data');
if (btnReset) {
  btnReset.addEventListener('click', async () => {
    const ok = confirm('Opravdu chcete smazat všechna data? Tato akce je nevratná.');
    if (!ok) return;
    if (navigator.vibrate) navigator.vibrate(vibr);
    try {
      // clear IndexedDB 'days' store
      const db = await openDB();
      const tx = db.transaction('days', 'readwrite');
      const store = tx.objectStore('days');
      const clearReq = store.clear();
      await new Promise((resolve, reject) => {
        clearReq.onsuccess = () => resolve();
        clearReq.onerror = () => reject(clearReq.error);
      });
    } catch (e) {
      console.error('Chyba při vymazávání IndexedDB', e);
    }

    // odstranit relevantní položky z localStorage
    try {
      const keys = [];
      weekdayMapHours.forEach(k => keys.push(k));
      weekdayMapOvertime.forEach(k => keys.push(k));
      ['shift','theme','selectedDate','btn-hours-on'].forEach(k => keys.push(k));
      keys.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error('Chyba při vymazávání localStorage', e);
    }

    // refresh UI
    renderCalendar(currentYear, currentMonth);
    try { showMonthSummary(currentYear, currentMonth); } catch(e){}
    alert('Data byla smazána.');
  });
}

// =============================
//      ZOBRAZENÍ MANUÁLU
// =============================
const btnShowManual = document.getElementById('btn-show-manual');
const manualScreen = document.getElementById('manual-screen');
const btnManualBack = document.getElementById('btn-manual-back');

if (btnShowManual) {
  btnShowManual.addEventListener('click', async () => {
    if (navigator.vibrate) navigator.vibrate(vibr);
    
    // Načíst MANUAL.md a převést na HTML
    try {
      const response = await fetch('MANUAL.md');
      const markdown = await response.text();
      
      // Rozdělit na řádky
      const lines = markdown.split('\n');
      let html = '';
      let inList = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Prázdný řádek
        if (line.trim() === '') {
          if (inList) {
            html += '</ul>';
            inList = false;
          }
          continue;
        }
        
        // Nadpisy
        if (line.startsWith('### ')) {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<h3>' + line.substring(4) + '</h3>';
        } else if (line.startsWith('## ')) {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<h2>' + line.substring(3) + '</h2>';
        } else if (line.startsWith('# ')) {
          if (inList) { html += '</ul>'; inList = false; }
          html += '<h1>' + line.substring(2) + '</h1>';
        }
        // Odrážkový seznam
        else if (line.match(/^[\-\*] /)) {
          if (!inList) {
            html += '<ul>';
            inList = true;
          }
          let content = line.substring(2)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          html += '<li>' + content + '</li>';
        }
        // Číslovaný seznam
        else if (line.match(/^\d+\. /)) {
          if (!inList) {
            html += '<ol>';
            inList = true;
          }
          let content = line.replace(/^\d+\. /, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          html += '<li>' + content + '</li>';
        }
        // Normální odstavec
        else {
          if (inList) { html += '</ul>'; inList = false; }
          let content = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          html += '<p>' + content + '</p>';
        }
      }
      
      if (inList) html += '</ul>';
      
      document.getElementById('manual-content').innerHTML = html;
      showScreen(manualScreen);
    } catch (e) {
      console.error('Chyba při načítání manuálu:', e);
      document.getElementById('manual-content').innerHTML = 
        '<h1>📖 Návod k použití</h1><p>Manuál se nepodařilo načíst. Zkuste to prosím později.</p>';
      showScreen(manualScreen);
    }
  });
}

if (btnManualBack) {
  btnManualBack.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(vibr);
    showScreen(settingsScreen);
    document.body.classList.add("settings-open");
  });
}

// =============================
//      OBSLUHA TLAČÍTEK PDF NÁHLEDU
// =============================
const btnPdfSave = document.getElementById('btn-pdf-save');
const btnPdfBack = document.getElementById('btn-pdf-back');
const pdfPreviewScreen = document.getElementById('pdf-preview-screen');

if (btnPdfSave) {
  btnPdfSave.addEventListener('click', async () => {
    if (navigator.vibrate) navigator.vibrate(vibr);
    
    const element = document.getElementById('pdf-export-content');
    const monthNameFull = window._pdfExportMonthName || 'Export';
    
    const opt = {
      margin: 10,
      filename: `${monthNameFull}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      // Po úspěšném exportu se vrátíme na kalendář
      showScreen(calendarScreen);
      document.body.classList.remove("pdf-preview-open");
    } catch (err) {
      console.error('Chyba při exportu PDF:', err);
      alert('Chyba při exportu PDF');
    }
  });
}

if (btnPdfBack) {
  btnPdfBack.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(vibr);
    showScreen(calendarScreen);
    document.body.classList.remove("pdf-preview-open");
  });
}

// =============================
//      INICIALIZACE PRVNÍ SPUŠTĚNÍ
// =============================
function initializeFirstRun() {
  // Zkontroluj zda existují defaultní hodiny v localStorage
  const isFirstRun = !localStorage.getItem('mon-hours');
  
  if (isFirstRun) {
    // Defaultní pracovní doba - 7.5 hodin pro všední dny, 0 pro víkendy
    const defaultHours = {
      'sun-hours': '0',      // Neděle
      'mon-hours': '7.5',    // Pondělí
      'tue-hours': '7.5',    // Úterý
      'wed-hours': '7.5',    // Středa
      'thu-hours': '7.5',    // Čtvrtek
      'fri-hours': '7.5',    // Pátek
      'sat-hours': '0'       // Sobota
    };
    
    const defaultOvertime = {
      'sun-overtime': '0',
      'mon-overtime': '0',
      'tue-overtime': '0',
      'wed-overtime': '0',
      'thu-overtime': '0',
      'fri-overtime': '0',
      'sat-overtime': '0'
    };
    
    // Ulož defaultní hodnoty
    Object.entries(defaultHours).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    Object.entries(defaultOvertime).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    // Nastav defaultní shift na "D" (Smena D)
    localStorage.setItem('shift', 'D');
    
    // Zobraz upozornění uživateli
    console.log('%c🎉 První spuštění! Defaultní hodiny byly nastaveny.', 'background: #2196f3; color: white; padding: 8px; border-radius: 4px;');
    console.log('Podrobnosti najdeš v ⚙️ Nastavení');
    
    // Volitelně: Zobraz malé upozornění v DOM
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      left: 10px;
      right: 10px;
      background: #2196f3;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 5000;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: slideDown 0.3s ease-out;
    `;
    notification.textContent = '📋 První spuštění! Defaultní hodiny nastaveny. Jdi do ⚙️ pro úpravu.';
    document.body.appendChild(notification);
    
    // Smaž notifikaci po 5 sekundách
    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// =============================
//      ZÁLOHOVÁNÍ A OBNOVA
// =============================

/**
 * Zobrazí notifikaci uživateli
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    max-width: 90%;
    text-align: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Zobraz notifikaci
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);

  // Smaž notifikaci po 3 sekundách
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Vytvoří zálohu pro daný měsíc
 * @param {number} year - Rok
 * @param {number} month - Měsíc (0-11)
 * @returns {Promise<Object>} Záloha s daty všech dní měsíce
 */
async function createBackupForMonth(year, month) {
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const store = tx.objectStore('days');
  
  // Počet dní v měsíci
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const backupData = {
    year,
    month,
    date: new Date().toISOString(),
    days: {}
  };

  // Projdi všechny dny měsíce
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekday = dateObj.getDay();

    // Pokus se načíst z DB
    const request = store.get(dateStr);
    
    await new Promise((resolve) => {
      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          backupData.days[dateStr] = {
            hours: data.hours,
            hoursShift: data.hoursShift,
            overtime: data.overtime,
            overtimeShift: data.overtimeShift,
            note: data.note
          };
        } else {
          // Použij default hodnoty
          const defaultHours = localStorage.getItem(weekdayMapHours[weekday]) || '0';
          const defaultOvertime = localStorage.getItem(weekdayMapOvertime[weekday]) || '0';
          
          // Shift z rotace
          const sm = getShiftArray();
          const shiftDayStart = daysBetween(new Date(year, month, 1));
          const shiftDayIndex = (shiftDayStart + day - 1) % 28;
          const defaultShiftValue = sm[shiftDayIndex];
          const shiftMapSelector = ["volno", "ranni", "odpoledni", "nocni"];
          const defaultShift = shiftMapSelector[defaultShiftValue] || 'ranni';
          
          backupData.days[dateStr] = {
            hours: defaultHours,
            hoursShift: defaultShift,
            overtime: defaultOvertime,
            overtimeShift: defaultShift,
            note: ''
          };
        }
        resolve();
      };
    });
  }

  return backupData;
}

/**
 * Uloží zálohu do localStorage
 */
async function saveBackupToStorage(year, month) {
  const backup = await createBackupForMonth(year, month);
  const timestamp = new Date(backup.date);
  const dateStr = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}`;
  const backupKey = `backup_${dateStr}_${timeStr}`;
  localStorage.setItem(backupKey, JSON.stringify(backup));
  updateBackupInfo();
  return backupKey;
}

/**
 * Vrátí seznam všech dostupných záloh
 */
function getAvailableBackups() {
  const backups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('backup_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        backups.push({
          key,
          year: data.year,
          month: data.month,
          date: new Date(data.date),
          label: `${String(data.month + 1).padStart(2, '0')}/${data.year}`,
          displayDate: new Date(data.date).toLocaleDateString('cs-CZ', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
      } catch (e) {
        console.error('Chyba při parsování zálohy:', key, e);
      }
    }
  }
  // Seřaď od nejnovější
  return backups.sort((a, b) => b.date - a.date);
}

/**
 * Obnoví data z zálohy do IndexedDB
 */
async function restoreFromBackup(backupKey) {
  const backupJSON = localStorage.getItem(backupKey);
  if (!backupJSON) {
    console.error('Zálohování nenalezeno:', backupKey);
    return false;
  }

  const backup = JSON.parse(backupJSON);
  const db = await openDB();
  const tx = db.transaction('days', 'readwrite');
  const store = tx.objectStore('days');

  // Obnoví všechny dny ze zálohy
  for (const dateStr in backup.days) {
    const dayData = backup.days[dateStr];
    const data = {
      date: dateStr,
      hours: dayData.hours,
      hoursShift: dayData.hoursShift,
      overtime: dayData.overtime,
      overtimeShift: dayData.overtimeShift,
      note: dayData.note,
      shift: dayData.hoursShift
    };
    store.put(data);
  }

  return true;
}

/**
 * Zobrazí dialog pro výběr a obnovu zálohy
 */
async function showRestoreBackupDialog() {
  const backups = getAvailableBackups();
  
  if (backups.length === 0) {
    showNotification('❌ Žádné dostupné zálohování', 'error');
    return;
  }

  // Vytvoř dialog
  const dialog = document.createElement('div');
  dialog.className = 'backup-dialog-overlay';
  dialog.innerHTML = `
    <div class="backup-dialog">
      <h3>Dostupné zálohování (${backups.length})</h3>
      <div class="backup-list">
        ${backups.map((b, i) => `
          <div class="backup-item" data-key="${b.key}">
            <strong>${b.label} - ${b.displayDate}</strong>
          </div>
        `).join('')}
      </div>
      <div class="backup-dialog-buttons">
        <button id="backup-cancel">Zrušit</button>
        <button id="backup-confirm" disabled>Obnovit</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);

  let selectedBackupKey = null;

  // Obsluha výběru
  dialog.querySelectorAll('.backup-item').forEach(item => {
    item.addEventListener('click', () => {
      dialog.querySelectorAll('.backup-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedBackupKey = item.dataset.key;
      document.getElementById('backup-confirm').disabled = false;
    });
  });

  // Obsluha tlačítek
  document.getElementById('backup-cancel').addEventListener('click', () => {
    dialog.remove();
  });

  document.getElementById('backup-confirm').addEventListener('click', async () => {
    if (selectedBackupKey) {
      // Zjisti rok a měsíc ze zálohy
      const backupJSON = localStorage.getItem(selectedBackupKey);
      const backup = JSON.parse(backupJSON);
      
      const success = await restoreFromBackup(selectedBackupKey);
      dialog.remove();
      
      if (success) {
        showNotification('✅ Zálohování bylo obnoveno', 'success');
        
        // Přeskoč na měsíc obnovené zálohy
        currentYear = backup.year;
        currentMonth = backup.month;
        localStorage.setItem('selectedDate', `${backup.year}-${String(backup.month + 1).padStart(2, '0')}-01`);
        
        // Zavři nastavení a zobraz kalendář
        showScreen(calendarScreen);
        document.body.classList.remove("settings-open");
        renderCalendar(currentYear, currentMonth);
      } else {
        showNotification('❌ Chyba při obnovování zálohy', 'error');
      }
    }
  });
}

/**
 * Kontroluje, zda je dnes první den měsíce, a vytvoří zálohu
 */
async function checkAndCreateMonthlyBackup() {
  const today = new Date();
  const isFirstDay = today.getDate() === 1;
  
  if (isFirstDay) {
    // Vytvoř zálohu minulého měsíce
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    const backupKey = await saveBackupToStorage(lastMonth.getFullYear(), lastMonth.getMonth());
    console.log('Měsíční zálohování vytvořeno:', backupKey);
  }
}

/**
 * Aktualizuje informaci o poslední záloze na UI
 */
function updateBackupInfo() {
  const backups = getAvailableBackups();
  const infoElement = document.getElementById('last-backup-info');
  
  if (!infoElement) return;

  if (backups.length === 0) {
    infoElement.textContent = '⏱️ Zatím nebyla vytvořena žádná záloha';
    infoElement.style.color = 'var(--text-muted, #999)';
  } else {
    const lastBackup = backups[0]; // První je nejnovější (jsou seřazené od nejnovější)
    const formatted = lastBackup.date.toLocaleDateString('cs-CZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    infoElement.textContent = `✅ Poslední záloha: ${lastBackup.label} (${formatted})`;
    infoElement.style.color = 'var(--success, #4caf50)';
  }
}

/**
 * Vytvoří zálohu pro aktuální měsíc
 */
async function createBackupNow() {
  try {
    const today = new Date();
    const backupKey = await saveBackupToStorage(today.getFullYear(), today.getMonth());
    showNotification(`✅ Zálohování vytvořeno: ${backupKey.replace('backup-', '').replace('-', '/')}`, 'success');
    
    // Automaticky nabídni ke stažení
    setTimeout(() => {
      downloadBackup(backupKey);
    }, 500);
  } catch (error) {
    console.error('Chyba při vytváření zálohy:', error);
    showNotification('❌ Chyba při vytváření zálohy', 'error');
  }
}

/**
 * Stáhne zálohu jako JSON soubor
 */
function downloadBackup(backupKey) {
  const backupJSON = localStorage.getItem(backupKey);
  if (!backupJSON) {
    showNotification('❌ Zálohování nenalezeno', 'error');
    return;
  }

  const backup = JSON.parse(backupJSON);
  const timestamp = new Date(backup.date);
  const dateStr = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}`;
  const fileName = `smena_backup_${dateStr}_${timeStr}.json`;
  
  // Vytvoř blob a stáhni
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showNotification(`✅ Zálohování staženo: ${fileName}`, 'success');
}

/**
 * Otevře dialog pro výběr zálohy ze souboru
 */
function openImportBackupDialog() {
  const fileInput = document.getElementById('backup-file-input');
  fileInput.click();
}

/**
 * Importuje zálohu ze souboru
 */
async function importBackupFromFile(file) {
  try {
    // Validuj název souboru - musí být smena_backup_YYYY-MM-DD_HH-MM.json
    const validNamePattern = /^smena_backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/;
    if (!validNamePattern.test(file.name)) {
      throw new Error('InvalidFileName');
    }

    const text = await file.text();
    const backup = JSON.parse(text);

    // Validuj strukturu zálohy
    if (!backup.year || backup.month === undefined || !backup.days) {
      throw new Error('InvalidFormat');
    }

    // Vytvoř unikátní klíč s timestamp
    const backupDate = new Date(backup.date);
    const dateStr = `${backupDate.getFullYear()}-${String(backupDate.getMonth() + 1).padStart(2, '0')}-${String(backupDate.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(backupDate.getHours()).padStart(2, '0')}-${String(backupDate.getMinutes()).padStart(2, '0')}`;
    const backupKey = `backup_${dateStr}_${timeStr}`;
    
    localStorage.setItem(backupKey, JSON.stringify(backup));
    
    updateBackupInfo();
    return true;
  } catch (error) {
    // Pouze v dev módu: console.debug('Chyba importu:', error);
    return false;
  }
}

// Obsluha tlačítka pro manuální zálohu
const btnBackupManual = document.getElementById('btn-backup-manual');
if (btnBackupManual) {
  btnBackupManual.addEventListener('click', createBackupNow);
}

// Obsluha tlačítka pro import
const btnImportBackup = document.getElementById('btn-import-backup');
if (btnImportBackup) {
  btnImportBackup.addEventListener('click', openImportBackupDialog);
}

// Obsluha file inputu pro import
const backupFileInput = document.getElementById('backup-file-input');
if (backupFileInput) {
  backupFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      let successCount = 0;
      let errorCount = 0;
      
      // Zpracuj všechny vybrané soubory
      for (let file of e.target.files) {
        const success = await importBackupFromFile(file);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      // Zobraz shrnutí
      if (successCount > 0) {
        showNotification(`✅ Importováno ${successCount} záloh${successCount === 1 ? 'ování' : ''}${errorCount > 0 ? `, ${errorCount} chyb` : ''}`, 'success');
      } else if (errorCount > 0) {
        showNotification(`❌ Všechny soubory se nepodařilo importovat`, 'error');
      }
      
      e.target.value = ''; // Reset input
    }
  });
}

// Obsluha tlačítka pro obnovu
const btnRestoreBackup = document.getElementById('btn-restore-backup');
if (btnRestoreBackup) {
  btnRestoreBackup.addEventListener('click', showRestoreBackupDialog);
}

// Aktualizuj informaci o poslední záloze při startu
updateBackupInfo();

// Zkontroluj zálohování při spuštění aplikace
checkAndCreateMonthlyBackup();

// Zkontroluj zálohování každý den v poledne
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 12 && now.getMinutes() === 0) {
    checkAndCreateMonthlyBackup();
  }
}, 60000); // Kontrola každou minutu

// =============================
//      INICIALIZACE KALENDÁŘE
// ============================
initializeFirstRun();
animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));