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

const days = ["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
const shifts = ["Volno", "Ranní", "Odpolední", "Noční"];

const smenaA = [2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2]; //28x, 1-1-2025
const smenaB = [3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3];
const smenaC = [0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0];
const smenaD = [1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1];
const smenaR = [1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1]; // ranní směna

// =============================
//      DEFAULTNÍ HODINY PO SMĚNÁCH
// =============================
// Index: 0=Ne, 1=Po, 2=Út, 3=St, 4=Čt, 5=Pá, 6=So
const DEFAULT_HOURS = {
  A: [7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 11],  // Ne, Po-Pá, So
  B: [7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 11],
  C: [7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 11],
  D: [7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 11],
  R: [0, 7.5, 7.5, 7.5, 7.5, 7.5, 0]      // víkend 0
};

const DEFAULT_OVERTIME = {
  A: [0, 0, 0, 0, 0, 0, 0],
  B: [0, 0, 0, 0, 0, 0, 0],
  C: [0, 0, 0, 0, 0, 0, 0],
  D: [0, 0, 0, 0, 0, 0, 0],
  R: [0, 0, 0, 0, 0, 0, 0]
};

/**
 * Vrátí defaultní hodiny pro daný den v týdnu a směnu
 * @param {number} weekday - Den v týdnu (0=Ne, 1=Po, ..., 6=So)
 * @param {string} shift - Směna (A, B, C, D, R) - volitelné, použije activeShift
 */
function getDefaultHours(weekday, shift) {
  const s = shift || activeShift || localStorage.getItem('shift') || 'D';
  return DEFAULT_HOURS[s] ? DEFAULT_HOURS[s][weekday] : 7.5;
}

/**
 * Vrátí defaultní přesčasy pro daný den v týdnu a směnu
 * @param {number} weekday - Den v týdnu (0=Ne, 1=Po, ..., 6=So)
 * @param {string} shift - Směna (A, B, C, D, R) - volitelné, použije activeShift
 */
function getDefaultOvertime(weekday, shift) {
  const s = shift || activeShift || localStorage.getItem('shift') || 'D';
  return DEFAULT_OVERTIME[s] ? DEFAULT_OVERTIME[s][weekday] : 0;
}

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

  // Salary screen
  const salaryScreen = document.getElementById('salary-screen');
  if (salaryScreen) {
    salaryScreen.classList.remove('active');
  }

  // Salary preview screen
  const salaryPreviewScreen = document.getElementById('salary-preview-screen');
  if (salaryPreviewScreen) {
    salaryPreviewScreen.classList.remove('active');
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
        // fallback: pokud buňka neexistuje (např. měníš měsíc), znovu vyrenderuj aktuální zobrazený měsíc
        renderCalendar(currentYear, currentMonth);

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

// tlačítko 💵 Výplata
document.getElementById('btn-salary').addEventListener('click', () => {
  showScreen(document.getElementById('salary-screen'));
  document.body.classList.add("salary-open");
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
            const defaultHours = getDefaultHours(weekday);
            const defaultOvertime = getDefaultOvertime(weekday);
            resolve({ hours: String(defaultHours), overtime: String(defaultOvertime), shift: shiftTextLocal, hoursShift: shiftCodeFromRotation, overtimeShift: shiftCodeFromRotation, note: '', fromDB: false });
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
          const dateObj = new Date(dateKey);
          const weekday = dateObj.getDay();
          
          // Zjistíme defaultní hodiny pro tento den
          let defaultHoursForDay = 0;
          try {
            const sm = getShiftArray();
            const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
            const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
            if (sm[shiftDayIndex] !== 0) {
              defaultHoursForDay = getDefaultHours(weekday);
            }
          } catch (e) {
            defaultHoursForDay = getDefaultHours(weekday);
          }
          
          if (data && (data.hours || data.overtime)) {
            // Pokud je dovolená, odečteme hodiny dovolené z defaultních hodin
            if (data.shift === 'dovolena') {
              const dovolenaHours = parseFloat(data.hours || 0);
              const odpracovaneHours = Math.max(0, defaultHoursForDay - dovolenaHours);
              resolve({ hours: odpracovaneHours, overtime: parseFloat(data.overtime || 0) });
            } else {
              resolve({ hours: parseFloat(data.hours || 0), overtime: parseFloat(data.overtime || 0) });
            }
          } else {
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
            const defaultHours = getDefaultHours(weekday);
            const defaultOvertime = getDefaultOvertime(weekday);
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
        const hours = getDefaultHours(weekday);
        const overtime = getDefaultOvertime(weekday);
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
        hours = String(getDefaultHours(weekday));
        overtime = String(getDefaultOvertime(weekday));
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
      const defaultHours = getDefaultHours(weekday);
      const defaultOvertime = getDefaultOvertime(weekday);
      
      // Načti defaultní směnu z kalendáře (rotace)
      const sm = getShiftArray();
      const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
      const defaultShiftValue = sm[shiftDayIndex];
      const shiftMapSelector = ["volno","ranni","odpoledni","nocni"];
      const defaultShift = shiftMapSelector[defaultShiftValue] || 'ranni';
      
      document.getElementById('day-hours').value = defaultHours;
      document.getElementById('day-shift-hours').value = defaultShift;
      document.getElementById('day-overtime').value = defaultOvertime;
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
  if (currentYear === 2025 && currentMonth === 0) {
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
                const defaultHours = getDefaultHours(weekday);
                const defaultOvertime = getDefaultOvertime(weekday);
                const totalHours = defaultHours + defaultOvertime;
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
    default: return smenaD; // Fallback pro neznámé hodnoty (např. historické "0")
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
  
  // Zakázat tlačítko předchozí měsíc pro leden 2025
 if (year === 2025 && month === 0) {
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
                const defaultHours = getDefaultHours(weekday);
                const defaultOvertime = getDefaultOvertime(weekday);
                const totalHours = defaultHours + defaultOvertime;
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
    if (currentYear === 2025 && currentMonth === 0) {
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
  const day2 = new Date(Date.UTC(2025, 0, 1)); // leden 2025 jako základ
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
//      TLAČÍTKA NASTAVENÍ OK/CANCEL 
// ================================================
const btnSettingsOk = document.getElementById('btn-settings-ok');
btnSettingsOk.addEventListener('click', () => {
  showScreen(calendarScreen);
  document.body.classList.remove("settings-open");
  if (navigator.vibrate) navigator.vibrate(vibr);
  renderCalendar(currentYear, currentMonth);
});

const btnSettingsCancel = document.getElementById('btn-settings-cancel');
btnSettingsCancel.addEventListener('click', () => {
  showScreen(calendarScreen);
  document.body.classList.remove("settings-open");
  if (navigator.vibrate) navigator.vibrate(vibr);
  renderCalendar(currentYear, currentMonth);
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
      ['shift','theme','selectedDate','btn-hours-on'].forEach(k => localStorage.removeItem(k));
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
// TLAČÍTKO "ZPĚT" V SALARY SCREEN
// =============================
const btnSalaryBack = document.getElementById('btn-salary-back');
if (btnSalaryBack) {
  btnSalaryBack.addEventListener('click', () => {
    showScreen(calendarScreen);
    document.body.classList.remove("salary-open");
    if (navigator.vibrate) navigator.vibrate(vibr);
  });
}

// =============================
// NASTAVENÍ VÝPLATY - PLATOVÁ TŘÍDA
// =============================
const salaryClassSelect = document.getElementById('salary-class');
if (salaryClassSelect) {
  // Načíst uloženou hodnotu
  const savedClass = localStorage.getItem('salary-class');
  if (savedClass) {
    salaryClassSelect.value = savedClass;
  }
  
  // Při změně uložit
  salaryClassSelect.addEventListener('change', (e) => {
    localStorage.setItem('salary-class', e.target.value);
    if (navigator.vibrate) navigator.vibrate(vibr);
    updatePreviewButtonState();
  });
}

// =============================
// NASTAVENÍ VÝPLATY - PPÚ (průměrná sazba Kč/hod)
// =============================
const salaryPpuInput = document.getElementById('salary-ppu');
if (salaryPpuInput) {
  // Načíst uloženou hodnotu
  const savedPpu = localStorage.getItem('salary-ppu');
  if (savedPpu) {
    salaryPpuInput.value = savedPpu;
  }
  
  // Při změně uložit
  salaryPpuInput.addEventListener('change', (e) => {
    localStorage.setItem('salary-ppu', e.target.value);
    if (navigator.vibrate) navigator.vibrate(vibr);
    updatePreviewButtonState();
  });
  
  // Při focusu vybrat obsah
  salaryPpuInput.addEventListener('focus', function() {
    this.select();
  });
  
  // Při input změně také updatovat stav tlačítka
  salaryPpuInput.addEventListener('input', updatePreviewButtonState);
}

// =============================
// NASTAVENÍ VÝPLATY - ODBORY
// =============================
const salaryUnionSelect = document.getElementById('salary-union');
if (salaryUnionSelect) {
  // Načíst uloženou hodnotu
  const savedUnion = localStorage.getItem('salary-union');
  if (savedUnion) {
    salaryUnionSelect.value = savedUnion;
  }
  
  // Při změně uložit
  salaryUnionSelect.addEventListener('change', (e) => {
    localStorage.setItem('salary-union', e.target.value);
    if (navigator.vibrate) navigator.vibrate(vibr);
    updatePreviewButtonState();
  });
}

// =============================
// NASTAVENÍ VÝPLATY - ODHAD PRÉMIÍ
// =============================
const salaryPremieInput = document.getElementById('salary-premie');
if (salaryPremieInput) {
  // Načíst uloženou hodnotu
  const savedPremie = localStorage.getItem('salary-premie');
  if (savedPremie) {
    salaryPremieInput.value = savedPremie;
  }
  
  // Při změně uložit
  salaryPremieInput.addEventListener('change', (e) => {
    localStorage.setItem('salary-premie', e.target.value);
    if (navigator.vibrate) navigator.vibrate(vibr);
  });
  
  // Při focusu vybrat obsah
  salaryPremieInput.addEventListener('focus', function() {
    this.select();
  });
}

// =============================
// NASTAVENÍ VÝPLATY - PENZIJNÍ PŘIPOJIŠTĚNÍ
// =============================
const salaryPenzijniInput = document.getElementById('salary-penzijni');
if (salaryPenzijniInput) {
  // Načíst uloženou hodnotu nebo použít default 2300
  const savedPenzijni = localStorage.getItem('salary-penzijni');
  if (savedPenzijni) {
    salaryPenzijniInput.value = savedPenzijni;
  }
  
  // Při změně uložit
  salaryPenzijniInput.addEventListener('change', (e) => {
    localStorage.setItem('salary-penzijni', e.target.value);
    if (navigator.vibrate) navigator.vibrate(vibr);
  });
  
  // Při focusu vybrat obsah
  salaryPenzijniInput.addEventListener('focus', function() {
    this.select();
  });
}

/**
 * Kontroluje, zda jsou všechna povinná pole vyplněna
 */
function validateSalaryFields() {
  const salaryClass = salaryClassSelect?.value || '';
  const ppu = parseFloat(salaryPpuInput?.value) || 0;
  const union = salaryUnionSelect?.value || '';
  
  return salaryClass !== '' && ppu > 0 && union !== '';
}

/**
 * Aktualizuje stav tlačítka Náhled výplaty
 */
function updatePreviewButtonState() {
  const btnPreviewSalary = document.getElementById('btn-preview-salary');
  if (btnPreviewSalary) {
    btnPreviewSalary.disabled = !validateSalaryFields();
  }
}

// REKAPITULACE MĚSÍCE - TLAČÍTKO
const btnRecapMonth = document.getElementById('btn-recap-month');
if (btnRecapMonth) {
  btnRecapMonth.addEventListener('click', async () => {
    if (navigator.vibrate) navigator.vibrate(vibr);
    await exportMonthToPDF(currentYear, currentMonth);
  });
}

// =============================
// NÁHLED VÝPLATY - TLAČÍTKO
// =============================
const btnPreviewSalary = document.getElementById('btn-preview-salary');
if (btnPreviewSalary) {
  btnPreviewSalary.addEventListener('click', () => {
    generatePayslipPreview();
    showScreen(document.getElementById('salary-preview-screen'));
    if (navigator.vibrate) navigator.vibrate(vibr);
  });
}

// Inicializace stavu tlačítka
updatePreviewButtonState();

/**
 * Generuje náhled výplatní pásky
 */
async function generatePayslipPreview() {
  const payslipBody = document.getElementById('payslip-body');
  if (!payslipBody) return;
  
  // Získáme data z aktuálního měsíce
  const year = currentYear;
  const month = currentMonth;
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  // Aktualizujeme nadpis s měsícem a rokem
  const monthNames = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
                      'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
  const salaryPreviewMonthEl = document.getElementById('salary-preview-month');
  if (salaryPreviewMonthEl) {
    salaryPreviewMonthEl.textContent = `— ${monthNames[month]} ${year}`;
  }
  
  // Načteme data z DB
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const store = tx.objectStore('days');
  
  const dataMap = new Map();
  await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      for (const item of req.result) {
        dataMap.set(item.date, item);
      }
      resolve();
    };
  });
  
  // Spočítáme hodiny (stejná logika jako měsíční souhrn v info panelu)
  let odpracHodiny = 0;
  let svatkyHodiny = 0;
  let prescasyHodiny = 0;
  let dovolenaHodiny = 0;
  let nemocHodiny = 0;
  let nocniHodiny = 0;
  let prescasyNocniHodiny = 0;
  let prescasyNedeleHodiny = 0;
  let praceSvatekHodiny = 0;
  let odpoledniHodiny = 0;
  let prescasyOdpoledniHodiny = 0;
  let vikendHodiny = 0;
  const shiftArrayForHours = getShiftArray();
  
  for (let day = 1; day <= lastDay; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const data = dataMap.get(dateKey);
    let hours = 0;
    let overtime = 0;
    let isNocni = false;
    
    // Zjistíme index směny pro tento den
    const shiftDayStart = daysBetween(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
    const shiftDayIndex = (shiftDayStart + dateObj.getDate() - 1) % 28;
    const weekday = dateObj.getDay();
    
    // Zjistíme defaultní hodiny pro tento den
    let defaultHoursForDay = 0;
    if (shiftArrayForHours && shiftArrayForHours[shiftDayIndex] !== 0 && shiftArrayForHours[shiftDayIndex] !== 'V') {
      defaultHoursForDay = getDefaultHours(weekday);
    }
    
    if (data && (data.hours !== undefined || data.overtime !== undefined)) {
      overtime = parseFloat(data.overtime || 0) || 0;

      if (data.shift === 'nemoc') {
        const nemocHoursDay = parseFloat(data.hours || 0) || 0;
        nemocHodiny += nemocHoursDay;
      }
      
      // Pokud je nastavena dovolená, započítáme hodiny do plac.nepřítomností
      // a odpracované hodiny = default - dovolená
      if (data.shift === 'dovolena') {
        const dovolenaHoursDay = parseFloat(data.hours || 0) || 0;
        dovolenaHodiny += dovolenaHoursDay;
        hours = Math.max(0, defaultHoursForDay - dovolenaHoursDay);
      } else {
        hours = parseFloat(data.hours || 0) || 0;
      }
      
      // Zkontrolujeme jestli je noční směna (z DB nebo z rotace)
      if (data.hoursShift === 'nocni') {
        isNocni = true;
      } else if (!data.hoursShift && shiftArrayForHours && shiftArrayForHours[shiftDayIndex] === 3) {
        isNocni = true;
      }
    } else {
      // fallback podle směny a defaultních hodin z localStorage
      try {
        if (shiftArrayForHours && (shiftArrayForHours[shiftDayIndex] === 0 || shiftArrayForHours[shiftDayIndex] === 'V')) {
          hours = 0;
          overtime = 0;
        } else {
          const defaultHours = getDefaultHours(weekday);
          const defaultOvertime = getDefaultOvertime(weekday);
          hours = defaultHours;
          overtime = defaultOvertime;
          
          // Zkontrolujeme jestli je noční směna z rotace
          if (shiftArrayForHours && shiftArrayForHours[shiftDayIndex] === 3) {
            isNocni = true;
          }
        }
      } catch (e) {
        // pokud by cokoliv selhalo, necháme hodiny 0
      }
    }
    
    // Sečteme noční hodiny
    if (isNocni && hours > 0) {
      nocniHodiny += hours;
    }
    
    // Sečteme odpolední hodiny (směna 2 = odpolední)
    let isOdpoledni = false;
    if (data && data.hoursShift === 'odpoledni') {
      isOdpoledni = true;
    } else if (!data?.hoursShift && shiftArrayForHours && shiftArrayForHours[shiftDayIndex] === 2) {
      isOdpoledni = true;
    }
    if (isOdpoledni && hours > 0) {
      odpoledniHodiny += hours;
    }
    
    // Sečteme přesčasy podle typu směny
    if (overtime > 0) {
      let overtimeShiftType = null;
      if (data && data.overtimeShift) {
        overtimeShiftType = data.overtimeShift;
      } else if (!data?.overtimeShift && shiftArrayForHours) {
        // Fallback: detekuj z rotace
        const shiftValue = shiftArrayForHours[shiftDayIndex];
        const shiftMapSelector = ["volno", "ranni", "odpoledni", "nocni"];
        overtimeShiftType = shiftMapSelector[shiftValue] || null;
      }
      
      if (overtimeShiftType === 'nocni') {
        prescasyNocniHodiny += overtime;
      } else if (overtimeShiftType === 'odpoledni') {
        prescasyOdpoledniHodiny += overtime;
      }
    }
    
    if (hours > 0) {
      if (isHoliday(dateObj)) {
        // Skutečně odpracované hodiny ve svátek (pro příplatek za práci ve svátek)
        praceSvatekHodiny += hours;
      } else {
        odpracHodiny += hours;
      }
    }
    
    // Plac.svátky = hodiny podle kalendáře ve dnech kdy je svátek a je směna (ne volno)
    // Tyto hodiny se použijí i pro náhradu za svátek
    if (isHoliday(dateObj) && defaultHoursForDay > 0) {
      svatkyHodiny += defaultHoursForDay;
    }
    
    prescasyHodiny += overtime;
    
    // Přesčasy v neděli
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 && overtime > 0) {
      prescasyNedeleHodiny += overtime;
    }
    
    // Hodiny v sobotu a neděli (bez přesčasů)
    if ((dayOfWeek === 0 || dayOfWeek === 6) && hours > 0) {
      vikendHodiny += hours;
    }
  }
  
  // Získáme sazbu podle platové třídy
  const salaryClass = localStorage.getItem('salary-class') || '';
  const hourlyRate = getHourlyRate(salaryClass);
  
  // Fond pracovní doby - hodiny podle kalendáře a defaultních hodin (bez přesčasů)
  let fondPracDoby = 0;
  const shiftArray = getShiftArray() || [];
  const fallbackHours = [7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 11]; // Ne/n/Út/St/Čt/Pá/So (Ne=7.5, So=11)
  
  for (let day = 1; day <= lastDay; day++) {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    
    // Zjistíme směnu pro tento den
    // Bezpečně spočítáme index v 28denním cyklu a ošetříme případné chybějící směny
    const dayIdx = ((daysBetween(dateObj) % 28) + 28) % 28;
    const shiftCode = shiftArray[dayIdx];
    if (!shiftCode) continue;
    
    // Pokud není volno (0 nebo 'V'), přičteme defaultní hodiny podle dne v týdnu
    if (shiftCode !== 0 && shiftCode !== 'V') {
      fondPracDoby += getDefaultHours(dayOfWeek);
    }
  }

  // Debug výpis pro kontrolu fondu pracovní doby
  console.log(`[Payslip] Fond pracovní doby: ${fondPracDoby}`);
  
  // Odpracované hodiny k zobrazení = skutečně odpracované (bez svátků) + přesčasy
  // Ale musíme odečíst dovolená od fondu, protože odpracHodiny = hodiny které nejsou dovolená ani svátek
  const odpracHodinyDisplay = odpracHodiny + prescasyHodiny;

  // Výpočty (částky zaokrouhleny nahoru)
  const ppu = parseFloat(localStorage.getItem('salary-ppu')) || 0;
  const zakladniMzda = Math.ceil(odpracHodinyDisplay * hourlyRate);
  const nahradaSvatky = Math.ceil(svatkyHodiny * ppu);
  const nahradaDovolena = Math.ceil(dovolenaHodiny * ppu);
  const nahradaNemoc = Math.ceil(nemocHodiny * ppu * 0.6);
  const prescasy = Math.ceil(prescasyHodiny * hourlyRate * 1.25); // příplatek 25%
  
  const hrubaMzda = zakladniMzda + nahradaSvatky + prescasy;
  
  // Pojištění a daně (zaokrouhleno nahoru)
  const zdravotniPoj = Math.ceil(hrubaMzda * 0.045);
  const socialniPoj = Math.ceil(hrubaMzda * 0.071);
  const danZaloha = Math.ceil(hrubaMzda * 0.15);
  const slevaPoplatnik = 2570;
  const danPoSleve = Math.max(0, danZaloha - slevaPoplatnik);
  
  const cistaMzda = hrubaMzda - zdravotniPoj - socialniPoj - danPoSleve;
  
  // Generujeme HTML
  let html = '';
  
  // Časové náležitosti
  html += sectionHeader('Časové náležitosti');
  html += payslipRow('Plac.nepřítomnosti', formatNum(dovolenaHodiny), '', '');
  html += payslipRow('Plac.svátky', formatNum(svatkyHodiny), '', '');
  html += payslipRow('Fond prac.doby', formatNum(fondPracDoby), '', '');
  html += payslipRow('Odprac.hodiny', formatNum(odpracHodinyDisplay), '', '');
  html += payslipRow('Přesčasové hodiny', formatNum(prescasyHodiny), '', '');
  
  // Základní mzda
  html += sectionHeader('Základní mzda');
  html += payslipRow('Hodinová mzda', '', formatNum(hourlyRate), '');
  html += payslipRow('Hod.m.ukol.přímá-A-PWAS', formatNum(odpracHodinyDisplay), formatNum(hourlyRate), formatNum(zakladniMzda));
  
  // Příplatky ke mzdě (zaokrouhleno nahoru)
  const priplPrescas50 = Math.ceil(prescasyHodiny * ppu * 0.5);
  const priplNocni15 = Math.ceil((nocniHodiny + prescasyNocniHodiny) * ppu * 0.15);
  const priplSoNe10 = Math.ceil(prescasyNedeleHodiny * ppu * 0.1);
  const priplPraceSvatek = Math.ceil(praceSvatekHodiny * ppu);
  const priplOdpoledne = Math.ceil((odpoledniHodiny + prescasyOdpoledniHodiny) * 16.6);
  
  html += sectionHeader('Příplatky ke mzdě');
  html += payslipRow('Připl.přesčas 50% OTR', formatNum(prescasyHodiny), formatNum(ppu * 0.5), formatNum(priplPrescas50));
  html += payslipRow('Přípl.pr.v noci 15%', formatNum(nocniHodiny + prescasyNocniHodiny), formatNum(ppu * 0.15), formatNum(priplNocni15));
  html += payslipRow('Přípl.pr. SO,NE - 10%', formatNum(prescasyNedeleHodiny), formatNum(ppu * 0.1), formatNum(priplSoNe10));
  html += payslipRow('Přípl.práce ve svátek', formatNum(praceSvatekHodiny), formatNum(ppu), formatNum(priplPraceSvatek));
  html += payslipRow('Přípl.práce odpoledne', formatNum(odpoledniHodiny + prescasyOdpoledniHodiny), '16,60', formatNum(priplOdpoledne));
  const priplVikend = Math.ceil(vikendHodiny * 139.9);
  html += payslipRow('Přípl.Nepř.Pr. So, Ne', formatNum(vikendHodiny), '139,90', formatNum(priplVikend));
  
  // Prémie
  const odhadPremii = parseFloat(localStorage.getItem('salary-premie')) || 0;
  html += sectionHeader('Prémie');
  html += payslipRow('Odhad prémií', '', '', formatNum(odhadPremii));
  
  // Náhrady mzdy
  html += sectionHeader('Náhrady mzdy');
  html += payslipRow('Náhrada za svátek', formatNum(svatkyHodiny), formatNum(ppu), formatNum(nahradaSvatky));
  html += payslipRow('Náhrada za dovolenou', formatNum(dovolenaHodiny), formatNum(ppu), formatNum(nahradaDovolena));
  
  // Ostatní příjmy
  const penzijniPripojisteni = parseFloat(localStorage.getItem('salary-penzijni')) || 2300;
  html += sectionHeader('Ostatní příjmy');
  html += payslipRow('Penzijní připojištění', '', '', formatNum(penzijniPripojisteni));

  // Náhrady za nemoc a dávky hrazené OSSZ
  html += sectionHeader('Náhrady za nemoc a dávky hrazené OSSZ');
  html += payslipRow('Náhr.mzdy/platu 60%', formatNum(nemocHodiny), formatNum(ppu * 0.6), formatNum(nahradaNemoc));
  
  // Vyměřovací základy
  html += sectionHeader('Vyměřovací základy, daně a pojistné');
  html += payslipRow('Hrubá mzda', '', '', formatNum(hrubaMzda));
  html += payslipRow('Daň záloha 15%', '', '', formatNum(danZaloha));
  html += payslipRow('Sleva na poplatníka', '', '', formatNum(slevaPoplatnik));
  html += payslipRow('Daň po slevě', '', '', formatNum(danPoSleve));
  html += payslipRow('Zdravotní poj. 4,5%', formatNum(hrubaMzda), '4,50', formatNum(zdravotniPoj), true);
  html += payslipRow('Sociální poj. 7,1%', formatNum(hrubaMzda), '7,10', formatNum(socialniPoj), true);
  
  // Čistá mzda
  html += sectionHeader('K výplatě');
  html += payslipRow('<strong>Čistá mzda</strong>', '', '', '<strong>' + formatNum(cistaMzda) + '</strong>');
  
  payslipBody.innerHTML = html;
}

function sectionHeader(title) {
  return `<tr class="section-header"><td colspan="4">——— ${title} ———</td></tr>`;
}

function payslipRow(name, count, rate, amount, isDeduction = false) {
  const amountClass = isDeduction ? 'negative' : '';
  const amountDisplay = isDeduction && amount ? amount + '-' : amount;
  return `<tr class="item">
    <td>${name}</td>
    <td class="col-count">${count}</td>
    <td class="col-rate">${rate}</td>
    <td class="col-amount ${amountClass}">${amountDisplay}</td>
  </tr>`;
}

function formatNum(num) {
  if (!num && num !== 0) return '';
  return Number(num).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getHourlyRate(salaryClass) {
  // Orientační hodinové sazby podle platové třídy
  const rates = {
    '1.1': 124.9,
    '2.1': 146.3, '2.2': 152.2, '2.3': 161.7,
    '3.1': 166.1, '3.2': 170.9, '3.3': 175.9,
    '4.1': 184.8, '4.2': 193.5, '4.3': 201,
    '5.1': 210.4, '5.2': 219.3, '5.3': 227.5,
    '6.1': 229, '6.2': 238.3, '6.3': 245.5,
    '7.1': 252.3
  };
  return rates[salaryClass] || 200; // výchozí sazba
}

// =============================
// TLAČÍTKA V SALARY PREVIEW
// =============================
const btnSalaryPreviewBack = document.getElementById('btn-salary-preview-back');
if (btnSalaryPreviewBack) {
  btnSalaryPreviewBack.addEventListener('click', () => {
    showScreen(document.getElementById('salary-screen'));
    if (navigator.vibrate) navigator.vibrate(vibr);
  });
}

// =============================
// TLAČÍTKA V PDF PREVIEW
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
    showScreen(document.getElementById('salary-screen'));
    document.body.classList.remove("pdf-preview-open");
  });
}

// =============================
//      INICIALIZACE PRVNÍ SPUŠTĚNÍ
// =============================
function initializeFirstRun() {
  // Zkontroluj zda existuje nastavení směny
  const isFirstRun = !localStorage.getItem('shift');
  
  if (isFirstRun) {
    // Nastav defaultní shift na "D" (Smena D)
    localStorage.setItem('shift', 'D');
    
    console.log('%c🎉 První spuštění! Defaultní směna D nastavena.', 'background: #2196f3; color: white; padding: 8px; border-radius: 4px;');
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
 * Vytvoří zálohu všech záznamů z IndexedDB
 * @returns {Promise<Object>} Záloha se všemi daty z DB
 */
async function createFullBackup() {
  const db = await openDB();
  const tx = db.transaction('days', 'readonly');
  const store = tx.objectStore('days');
  
  const backupData = {
    date: new Date().toISOString(),
    days: {}
  };

  // Načti všechny záznamy z DB
  await new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const allRecords = request.result;
      allRecords.forEach(data => {
        if (data.date) {
          backupData.days[data.date] = {
            hours: data.hours,
            hoursShift: data.hoursShift,
            overtime: data.overtime,
            overtimeShift: data.overtimeShift,
            note: data.note
          };
        }
      });
      resolve();
    };
    request.onerror = () => resolve();
  });

  return backupData;
}

/**
 * Uloží zálohu do localStorage
 */
async function saveBackupToStorage() {
  const backup = await createFullBackup();
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
        const recordCount = Object.keys(data.days || {}).length;
        backups.push({
          key,
          date: new Date(data.date),
          label: `${recordCount} záznamů`,
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

  await new Promise((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });

  return true;
}

/**
 * Kontroluje, zda je dnes první den měsíce, a vytvoří zálohu
 */
async function checkAndCreateMonthlyBackup() {
  const today = new Date();
  const isFirstDay = today.getDate() === 1;
  
  if (isFirstDay) {
    // Vytvoř zálohu celé DB
    const backupKey = await saveBackupToStorage();
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
 * Vytvoří zálohu celé DB
 */
async function createBackupNow() {
  try {
    const backupKey = await saveBackupToStorage();
    showNotification(`✅ Zálohování vytvořeno`, 'success');
    
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
 * Importuje zálohu ze souboru a vrátí klíč zálohy
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
    if (!backup.days) {
      throw new Error('InvalidFormat');
    }

    // Vytvoř unikátní klíč s timestamp
    const backupDate = new Date(backup.date);
    const dateStr = `${backupDate.getFullYear()}-${String(backupDate.getMonth() + 1).padStart(2, '0')}-${String(backupDate.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(backupDate.getHours()).padStart(2, '0')}-${String(backupDate.getMinutes()).padStart(2, '0')}`;
    const backupKey = `backup_${dateStr}_${timeStr}`;
    
    localStorage.setItem(backupKey, JSON.stringify(backup));
    
    updateBackupInfo();
    return backupKey; // Vrátí klíč pro následnou obnovu
  } catch (error) {
    // Pouze v dev módu: console.debug('Chyba importu:', error);
    return null;
  }
}

// Obsluha tlačítka pro manuální zálohu
const btnBackupManual = document.getElementById('btn-backup-manual');
if (btnBackupManual) {
  btnBackupManual.addEventListener('click', createBackupNow);
}

// Obsluha tlačítka pro obnovu ze souboru
const btnRestoreFromFile = document.getElementById('btn-restore-from-file');
if (btnRestoreFromFile) {
  btnRestoreFromFile.addEventListener('click', () => {
    const fileInput = document.getElementById('backup-file-input');
    fileInput.click();
  });
}

// Obsluha file inputu pro obnovu
const backupFileInput = document.getElementById('backup-file-input');
if (backupFileInput) {
  backupFileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Importuj zálohu do localStorage
      const backupKey = await importBackupFromFile(file);
      
      if (backupKey) {
        // Ihned obnov data z importované zálohy
        const backupJSON = localStorage.getItem(backupKey);
        const backup = JSON.parse(backupJSON);
        
        const success = await restoreFromBackup(backupKey);
        
        if (success) {
          showNotification('✅ Záloha byla obnovena', 'success');

          // Přeskoč na měsíc obnovené zálohy (fallback na aktuální datum)
          const backupDate = backup?.date ? new Date(backup.date) : new Date();
          const safeYear = Number.isFinite(backupDate.getFullYear()) ? backupDate.getFullYear() : actualYear;
          const safeMonth = Number.isFinite(backupDate.getMonth()) ? backupDate.getMonth() : actualMonth;
          currentYear = safeYear;
          currentMonth = safeMonth;
          localStorage.setItem('selectedDate', `${safeYear}-${String(safeMonth + 1).padStart(2, '0')}-01`);
          
          // Zavři nastavení a zobraz kalendář
          showScreen(calendarScreen);
          document.body.classList.remove("settings-open");
          renderCalendar(currentYear, currentMonth);
        } else {
          showNotification('❌ Chyba při obnovování zálohy', 'error');
        }
      } else {
        showNotification('❌ Neplatný soubor zálohy', 'error');
      }
      
      e.target.value = ''; // Reset input
    }
  });
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