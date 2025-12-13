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
const shifts = ["volno", "ranní směna", "odpolední směna", "noční směna"];

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
let shiftText = "aa";
const actualDate = new Date(); //reálné datum
const actualDay = actualDate.getDate();
const actualMonth = actualDate.getMonth();
const actualYear = actualDate.getFullYear();
const vibr = 7;

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
  // schovat obě
  calendarScreen.classList.remove('active');
  settingsScreen.classList.remove('active');
  editScreen.classList.remove('active');

  // zobrazit vybranou
  screen.classList.add('active');
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

const hoursForm = document.getElementById("hours-form");
const btnCancel = document.getElementById("btn-cancel");

hoursForm.addEventListener("submit", async(e) => {
  e.preventDefault();

  const data = {
      weekday: parseFloat(document.getElementById("weekday-hours").value) || 0,
      saturday: parseFloat(document.getElementById("saturday-hours").value) || 0,
      sunday: parseFloat(document.getElementById("sunday-hours").value) || 0,
      overtime: parseFloat(document.getElementById("overtime-hours").value) || 0,
    };
  const today = new Date().toISOString().split("T")[0];
  await saveHours(today, data);
 
  console.log("Uloženo:", today, data);

  // návrat na kalendář
  showScreen(calendarScreen);
  document.body.classList.remove("edit-open");
});

btnCancel.addEventListener("click", () => {
  // návrat bez uložení
  showScreen(calendarScreen);
  document.body.classList.remove("edit-open");
});

// ======================================
//      EDITAČNÍ OBRAZOVKA VYBRANEHO DNE
// ======================================
// Zobrazení vybraného dne v edit-screen
function showSelectedDay(dateString) {
  const dateObj = new Date(dateString);

  const dayName = days[dateObj.getDay()];
  const formatted = `${dayName} ${dateObj.getDate()}.${dateObj.getMonth()+1}.${dateObj.getFullYear()}`;

  document.getElementById('selected-date').textContent = formatted;
  document.getElementById('selected-shift').textContent = shiftText;
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

// Pomocná funkce pro defaultní hodnoty podle dne v týdnu
function getDefaultValuesForDay(dateObj) {
  const day = dateObj.getDay(); // 0 = neděle, 1 = pondělí, ..., 6 = sobota
  let hours = 7.5;

  if (day === 6) {        // sobota
    hours = 11;
  } else if (day === 0) { // neděle
    hours = 7.5;
  }

  return {
    hours: hours,
    overtime: 0,
    note: '',
    shift: 'ranni'
  };
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
      document.getElementById('day-overtime').value = data.overtime;
      document.getElementById('day-note').value = data.note || '';
      document.getElementById('day-shift').value = data.shift || 'ranni';
    } else {
      // fallback na localStorage
      const lsHours = localStorage.getItem('weekday-hours');
      const lsOvertime = localStorage.getItem('overtime-hours');

      if (lsHours !== null || lsOvertime !== null) {
        document.getElementById('day-hours').value = lsHours || '7.5';
        document.getElementById('day-overtime').value = lsOvertime || '0';
        document.getElementById('day-note').value = '';
        document.getElementById('day-shift').value = 'ranni';
      } else {
        // fallback na defaultní hodnoty podle dne v týdnu
        const dateObj = new Date(selectedDate);
        const defaults = getDefaultValuesForDay(dateObj);

        document.getElementById('day-hours').value = defaults.hours;
        document.getElementById('day-overtime').value = defaults.overtime;
        document.getElementById('day-note').value = defaults.note;
        document.getElementById('day-shift').value = defaults.shift;
      }
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
    overtime: document.getElementById('day-overtime').value,
    note: document.getElementById('day-note').value,
    shift: document.getElementById('day-shift').value
  };

  store.put(data);
}

// Obsluha tlačítek
document.getElementById('btn-ok').addEventListener('click', async (e) => {
  e.preventDefault();
  const selectedDate = window.currentSelectedDate; // definováno při kliknutí na kalendář
  await saveDayData(selectedDate);
  //alert('Data uložena ✅');
  // návrat na kalendář
  showScreen(calendarScreen);
  document.body.classList.remove("edit-open");
});

document.getElementById('btn-cancel').addEventListener('click', () => {
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
        if ((data && data.hours) || (data && data.overtime)) {
          // zobrazíme uložené hodiny
          const totalHours = parseFloat(data.hours) + parseFloat(data.overtime || "0");
          cell.textContent = totalHours + " h";
        } else {
            // kdyz v WorkHoursDB nic není, tak načteme defaultní hodnotu z localStorage
            const dateObj = new Date(dateKey);
            const weekday = dateObj.getDay(); // 0 = neděle, 1 = pondělí, ...
            const defaultHours = localStorage.getItem(weekdayMapHours[weekday]);
            const defaultOvertime = localStorage.getItem(weekdayMapOvertime[weekday]);
            const totalHours = parseFloat(defaultHours || "0") + parseFloat(defaultOvertime || "0");
            cell.textContent = totalHours + " h";
          }
        };
    });
  } else {
    // při skrytí vyčistíme buňky
    hoursCells.forEach(cell => cell.textContent = "");
  }
});

// =============================
//      ZÍSKÁNÍ POLE SMĚNY
// ============================
function getShiftArray() {
  const shift = localStorage.getItem("shift") || "A";

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
function renderCalendar(year, month) {
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

  // Zobrazit název měsíce a rok
  monthYear.textContent = firstDay.toLocaleString('cs-CZ', {
    month: 'long',
    year: 'numeric'
  });
  
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
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    let shiftDayIndex = 0;
    let shiftDayStart = 0;
    let classes = '';
    let tooltip = '';
    
    // Dnes
    if (day === actualDay && month === actualMonth && year === actualYear) classes += ' dnes';
    
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
    if (svatky[key]) {
      classes += ' svatek';
      tooltip = svatky[key];
    }  else if (velikonoce[year] && velikonoce[year][key]) {
              classes += ' svatek';
              tooltip = velikonoce[year][key];
      }
    
    const dateKey = formatDateISO(year, month, day);
   
    calendar.innerHTML += `
      <div class="day ${classes.trim()}" title="${tooltip}">
        <span class="day-number">${day}</span>
        <span class="day-hours" data-date="${dateKey}"></span>
      </div>
    `;
  }

  // Zvýraznění dne po kliknutí
  const dayCells = calendar.querySelectorAll('div');
  let selectedDay = null;
  const btnEdit = document.getElementById('btn-edit');
  
  btnEdit.disabled = true;
  btnEdit.style.pointerEvents = 'none';

  
  dayCells.forEach(cell => {
    if (cell.textContent.trim() !== '') {
      cell.addEventListener('click', () => {
        // Zruš předchozí výběr
        dayCells.forEach(c => c.classList.remove('selected'));
        //console.log("Kliknutý den:", selectedDay);

        // Číslo dne
        const dayNum = parseInt(cell.textContent, 10);

        // Sestav plné datum (bez posunu časové zóny)
        const selectedDateISO = formatDateISO(year, month, dayNum);
        window.currentSelectedDate = selectedDateISO;

        // Zobraz vybraný den a načti data
        showSelectedDay(selectedDateISO, shiftText);
        //console.log("Zobrazený den2:", selectedDateISO, shiftText);
        loadDayData(selectedDateISO);
        
        // Přidej zvýraznění na kliknutý den
        cell.classList.add('selected');
        selectedDay = parseInt(cell.textContent);
        // Aktivuj tlačítko Editovat
        btnEdit.disabled = false;
        btnEdit.style.pointerEvents = 'auto';
        if (navigator.vibrate) navigator.vibrate(vibr);
      });
    }
  });
/*
  // Kliknutí mimo kalendář = zrušení výběru
  document.addEventListener('click', e => {
    if (!calendar.contains(e.target) && !btnEdit.contains(e.target)) {
      dayCells.forEach(c => c.classList.remove('selected'));
      selectedDay = null;
      btnEdit.disabled = true;
      btnEdit.style.pointerEvents = 'none';
    }
  });
*/
}

// ===================================
//      ANIMACE AKTUALIZACE KALENDÁŘE
// ===================================
function animateCalendarUpdate(callback) {
  const calendar = document.getElementById('calendar');

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

// =============================
//      ZRUŠENÍ VÝBĚRU DNŮ
// ============================
document.addEventListener('click', (e) => {
  const calendar = document.getElementById('calendar');
  const clickedInsideCalendarCell = e.target.closest('#calendar div');

  if (!clickedInsideCalendarCell) {
    const selected = calendar.querySelector('.selected');
    if (selected) selected.classList.remove('selected');
  }
});

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

// =============================
//      INICIALIZACE KALENDÁŘE
// ============================
animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));