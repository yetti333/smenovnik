// ===============================
//      REGISTRACE SERVICE WORKERU
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js") // cesta musí odpovídat umístění souboru
      .then(reg => {
        console.log("Service Worker registrován:", reg.scope);
      })
      .catch(err => {
        console.error("Chyba při registraci Service Workeru:", err);
      });
  });
}

const smenaA = [0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0]; //28x, 1-11-2025
const smenaB = [1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1];
const smenaC = [3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3];
const smenaD = [0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2];
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
    // ujistíme se, že řádky 'Směna' a 'Poznámka' jsou viditelné pro detail dne
    const shiftRow = document.getElementById('info-shift') ? document.getElementById('info-shift').parentElement : null;
    const noteRow = document.getElementById('info-note') ? document.getElementById('info-note').parentElement : null;
    if (shiftRow) shiftRow.style.display = '';
    if (noteRow) noteRow.style.display = '';
    // skryjeme řádek s celkovými hodinami při zobrazení detailu dne
    const totalRow = document.getElementById('info-total') ? document.getElementById('info-total').parentElement : null;
    if (totalRow) totalRow.style.display = 'none';
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
    
    // Zobrazit směnu podle rotačního plánu pro daný den (ignorovat případné uložené přepsání)
    // prefer DB-stored shift when present, otherwise show rotation-derived shift
    let displayedShift = '';
    try {
      const dateObjShift = new Date(dateKey);
      const smenaArr = getShiftArray();
      const shiftDayStart = daysBetween(new Date(dateObjShift.getFullYear(), dateObjShift.getMonth(), 1));
      const shiftDayIndex = (shiftDayStart + dateObjShift.getDate() - 1) % 28;
      const shiftTextFromRotation = shifts[smenaArr[shiftDayIndex]] || '';
      if (data.fromDB && data.shift) {
        displayedShift = formatShiftLabel(data.shift);
      } else {
        // prefer rotation-derived label but fall back to stored value
        displayedShift = formatShiftLabel(shiftTextFromRotation || data.shift);
      }
    } catch (e) {
      displayedShift = formatShiftLabel(data.shift);
    }
    document.getElementById('info-shift').textContent = displayedShift;

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
        ${isHolidayDay ? '<span class="day-holiday-marker">S</span>' : ''}
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
//      INICIALIZACE KALENDÁŘE
// ============================
animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));