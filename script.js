const smenaA = [0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0]; //28x, 1-11-2025
const smenaB = [1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3,3,3,0,0,0,0,1];
const smenaC = [3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2,0,0,1,1,1,1,3];
const smenaD = [0,0,1,1,1,1,3,3,3,0,0,0,0,1,1,1,3,3,3,3,0,0,0,2,2,2,2,2];
// Seznam svátků (den-měsíc)
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

function showScreen(screen) {
  // schovat obě
  calendarScreen.classList.remove('active');
  settingsScreen.classList.remove('active');

  // zobrazit vybranou
  screen.classList.add('active');
}

// tlačítko ⚙️ Nastavení
document.getElementById('btn-settings').addEventListener('click', () => {
  showScreen(settingsScreen);
  document.body.classList.add("settings-open");
  if (navigator.vibrate) navigator.vibrate(vibr);
});

// tlačítko Dnes v akční liště
document.getElementById("btn-today").addEventListener("click", () => {
  if (currentMonth != actualMonth) {
    currentMonth = actualMonth;
    currentYear = actualYear;
    if (navigator.vibrate) navigator.vibrate(vibr);
    animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
  } else {
    if (navigator.vibrate) navigator.vibrate(vibr);
  }
});

// tlačítko přechození měsíce v akční liště
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

// tlačítko dalšího měsíce v akční liště
document.getElementById("btn-next").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  if (navigator.vibrate) navigator.vibrate(vibr);
  animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));
});

// tlačítko OK v nastavení
document.getElementById("btn-settings-ok").addEventListener("click", () => {
  showScreen(calendarScreen);
  document.body.classList.remove("settings-open");
  if (navigator.vibrate) navigator.vibrate(10);
});

function getShiftArray() {
  const shift = localStorage.getItem("shift") || "A";

  switch (shift) {
    case "A": return smenaA;
    case "B": return smenaB;
    case "C": return smenaC;
    case "D": return smenaD;
  }
}

function renderCalendar(year, month) {
  const calendar = document.getElementById('calendar');
  const monthYear = document.getElementById('month-year');
  const prevButton = document.getElementById('btn-prev'); 

  const smena = getShiftArray();
 
  calendar.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

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
    
    //Dnes
    if (day === actualDay && month === actualMonth && year === actualYear) classes += ' dnes';
    
    // směny
    shiftDayStart = daysBetween(new Date(year, month, 1));
    shiftDayIndex = (shiftDayStart + day - 1) % 28;
    //console.log("index směny: ", shiftDayIndex);
    if (smena[shiftDayIndex] === 0) classes += ' volno';
    if (smena[shiftDayIndex] === 1) classes += ' ranni';
    if (smena[shiftDayIndex] === 2) classes += ' odpoledni';
    if (smena[shiftDayIndex] === 3) classes += ' nocni';

     // svátky
    const key = `${day}-${month+1}`; // měsíc +1 protože Date.getMonth() je 0-based
    if (svatky[key]) {
      classes += ' svatek';
      tooltip = svatky[key];
    }  else if (velikonoce[year] && velikonoce[year][key]) {
              classes += ' svatek';
              tooltip = velikonoce[year][key];
      }
   
    calendar.innerHTML += `<div class="${classes.trim()}" title="${tooltip}">${day}</div>`;
  }

  // Zvýraznění dne po kliknutí
  const dayCells = calendar.querySelectorAll('div');
  let selectedDay = null;
  dayCells.forEach(cell => {
    if (cell.textContent.trim() !== '') {
      cell.addEventListener('click', () => {
        // Zruš předchozí výběr
        dayCells.forEach(c => c.classList.remove('selected'));
        // Přidej zvýraznění na kliknutý den
        cell.classList.add('selected');
        selectedDay = parseInt(cell.textContent);
        if (navigator.vibrate) navigator.vibrate(vibr);
        //console.log("den ", selectedDay);
      });
    }
  });
}

// Animace kalendáře
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

// Posun přejetím
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

// Zrušení předchozího výběru dne
document.addEventListener('click', (e) => {
  const calendar = document.getElementById('calendar');
  const clickedInsideCalendarCell = e.target.closest('#calendar div');

  if (!clickedInsideCalendarCell) {
    const selected = calendar.querySelector('.selected');
    if (selected) selected.classList.remove('selected');
  }
});

// Funkce pro výpočet dnů mezi dvěma daty
function daysBetween(day1) {
  const day2 = new Date(Date.UTC(2025, 10, 1)); // listopad 2025 jako základ
  const d1 = new Date(Date.UTC(day1.getFullYear(), day1.getMonth(), day1.getDate()));
  const diff = (d1 - day2) / (1000 * 60 * 60 * 24);
  return Math.round(diff);
}

// Segmented control aktivace
function activateSegment(container, value) {
  const buttons = container.querySelectorAll("button");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

/* ============================
      MOTIV ZOBRAZENÍ
============================ */
const themeControl = document.getElementById("theme-control");

// Načíst uložený motiv
let savedTheme = localStorage.getItem("theme") || "light";
document.body.dataset.theme = savedTheme;
activateSegment(themeControl, savedTheme);

// Kliknutí na segment motivu
themeControl.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

   if (navigator.vibrate) navigator.vibrate(10);

  savedTheme = e.target.dataset.value;
  localStorage.setItem("theme", savedTheme);

  document.body.dataset.theme = savedTheme;
  activateSegment(themeControl, savedTheme);
});

/* ============================
           SMĚNA
============================ */
const shiftControl = document.getElementById("shift-control");

// Načíst uloženou směnu nebo použít D jako výchozí
let savedShift = localStorage.getItem("shift") || "D";
activeShift = savedShift;
activateSegment(shiftControl, savedShift);

// Kliknutí na segment směny
shiftControl.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  if (navigator.vibrate) navigator.vibrate(10);

  activeShift = e.target.dataset.value;
  localStorage.setItem("shift", activeShift);

  activateSegment(shiftControl, activeShift);
  renderCalendar(currentYear, currentMonth);
});


// === Inicializace aplikace ===
animateCalendarUpdate(() => renderCalendar(currentYear, currentMonth));