// Stark Monochrome Industrial Dashboard State & Simulation

const AppState = {
  // 14 Sensors
  sensors: {
    ultrasonic: 245,
    barometer: 1013,
    aqi: 35,
    ir: 30.2,
    ch4: 0.32,
    co: 12,
    temperature: 28.4,
    humidity: 55.0,
    gps: { lat: 12.9716, lng: 78.1689, depth: -320 },
    motion: 'NO',
    proximity: 150,
    vibration: 2.1,
    accel: { pitch: 1.2, roll: -0.8, g: 1.02 },
    beacon: -48
  },

  // Operational controls state
  controls: {
    callback: false,
    callbackTimer: null,
    lights: 'OFF', // OFF, LOW, HIGH
    alarm: 'OFF', // OFF, ON
    mode: 'MANUAL', // MANUAL, AI
    speed: 0.0,
    estop: false,
    activeDirection: 'STP'
  },

  // Active alerts and history log
  alerts: {
    thermalAlert: 'NO',
    obstacle: 'CLEAR',
    humanDetected: 'NO',
    highAlertMessage: 'ALERT: Thermal Alert [NO]'
  },

  history: [
    "10:48 - Console Init ACTIVE",
    "10:45 - GPS Signal Locked",
    "10:42 - System Self-Test PASS"
  ]
};

// --- Helper Functions ---
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function randomWalk(current, step, min, max) {
  const delta = (Math.random() - 0.5) * 2 * step;
  return clamp(current + delta, min, max);
}

function addLog(message) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  AppState.history.unshift(`${timeStr} - ${message}`);
  if (AppState.history.length > 30) {
    AppState.history.pop();
  }
}

// --- UI Sync ---
function updateUI() {
  // Sync 14 Sensors
  document.getElementById('val-ultrasonic').textContent = AppState.sensors.ultrasonic.toFixed(0) + ' cm';
  document.getElementById('val-barometer').textContent = AppState.sensors.barometer.toFixed(0) + ' hPa';
  document.getElementById('val-aqi').textContent = AppState.sensors.aqi.toFixed(0);
  document.getElementById('val-ir').textContent = AppState.sensors.ir.toFixed(1) + ' °C';
  document.getElementById('val-ch4').textContent = AppState.sensors.ch4.toFixed(2) + ' %';
  document.getElementById('val-co').textContent = AppState.sensors.co.toFixed(0) + ' ppm';
  document.getElementById('val-temperature').textContent = AppState.sensors.temperature.toFixed(1) + ' °C';
  document.getElementById('val-humidity').textContent = AppState.sensors.humidity.toFixed(0) + ' %';
  document.getElementById('val-gps-lat').textContent = AppState.sensors.gps.lat.toFixed(4);
  document.getElementById('val-gps-lng').textContent = AppState.sensors.gps.lng.toFixed(4);
  document.getElementById('val-gps-depth').textContent = AppState.sensors.gps.depth.toFixed(0) + ' m';
  document.getElementById('val-motion').textContent = AppState.sensors.motion;
  document.getElementById('val-proximity').textContent = AppState.sensors.proximity.toFixed(0) + ' cm';
  document.getElementById('val-vibration').textContent = AppState.sensors.vibration.toFixed(1) + ' mm/s';
  
  const pitchSign = AppState.sensors.accel.pitch >= 0 ? '+' : '';
  const rollSign = AppState.sensors.accel.roll >= 0 ? '+' : '';
  document.getElementById('val-accel-tilt').textContent = `P:${pitchSign}${AppState.sensors.accel.pitch.toFixed(1)}° R:${rollSign}${AppState.sensors.accel.roll.toFixed(1)}°`;
  document.getElementById('val-accel-g').textContent = AppState.sensors.accel.g.toFixed(2);
  document.getElementById('val-beacon').textContent = AppState.sensors.beacon.toFixed(0);

  // Sync Controls labels/states
  const lightsBtn = document.getElementById('btnLights');
  lightsBtn.textContent = `[ LIGHTS: ${AppState.controls.lights} ]`;
  if (AppState.controls.lights !== 'OFF') lightsBtn.classList.add('active');
  else lightsBtn.classList.remove('active');

  const alarmBtn = document.getElementById('btnAlarm');
  alarmBtn.textContent = `[ ALARM: ${AppState.controls.alarm} ]`;
  if (AppState.controls.alarm === 'ON') alarmBtn.classList.add('active');
  else alarmBtn.classList.remove('active');

  const modeBtn = document.getElementById('btnMode');
  modeBtn.textContent = `[ MODE: ${AppState.controls.mode} ]`;
  if (AppState.controls.mode === 'AI') modeBtn.classList.add('active');
  else modeBtn.classList.remove('active');

  const callbackBtn = document.getElementById('btnCallback');
  if (AppState.controls.callback) {
    callbackBtn.textContent = '[ RETURNING ]';
    callbackBtn.classList.add('active');
  } else {
    callbackBtn.textContent = '[ CALLBACK ]';
    callbackBtn.classList.remove('active');
  }

  const estopBtn = document.getElementById('btnEstop');
  if (AppState.controls.estop) {
    estopBtn.textContent = '[ ENGAGED ]';
    estopBtn.classList.add('engaged');
  } else {
    estopBtn.textContent = '[ E-STOP ]';
    estopBtn.classList.remove('engaged');
  }

  // Speed
  const slider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedValue');
  speedVal.textContent = AppState.controls.speed.toFixed(1);
  slider.value = AppState.controls.speed;
  slider.disabled = AppState.controls.estop || AppState.controls.mode === 'AI';

  // Highlight active direction pad button
  const dirButtons = {
    FWD: document.getElementById('btnFwd'),
    STP: document.getElementById('btnStp'),
    REV: document.getElementById('btnRev'),
    LFT: document.getElementById('btnLft'),
    RGT: document.getElementById('btnRgt')
  };
  Object.entries(dirButtons).forEach(([key, btn]) => {
    if (btn) {
      if (AppState.controls.activeDirection === key) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  // Sync Alerts & Warnings List
  document.getElementById('alertHuman').textContent = `ALERT: Human Detected [${AppState.alerts.humanDetected}]`;
  document.getElementById('warnObstacle').textContent = `WARNING: Obstacle ${AppState.alerts.obstacle}`;
  document.getElementById('infoTemp').textContent = `INFO: ${AppState.sensors.temperature > 40 ? 'High Temp' : 'Temp Normal'}`;

  // High alerts bar
  document.getElementById('highAlertsContent').textContent = AppState.alerts.highAlertMessage;

  // Sync Alert History list
  const logEl = document.getElementById('historyLog');
  if (logEl) {
    logEl.innerHTML = '';
    AppState.history.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.textContent = entry;
      logEl.appendChild(div);
    });
  }
}

// --- Data Simulation Loop ---
setInterval(() => {
  // Sensors simulation walk
  AppState.sensors.ultrasonic = randomWalk(AppState.sensors.ultrasonic, 4, 10, 400);
  AppState.sensors.barometer = randomWalk(AppState.sensors.barometer, 1, 980, 1040);
  AppState.sensors.aqi = randomWalk(AppState.sensors.aqi, 2, 10, 250);
  AppState.sensors.ir = randomWalk(AppState.sensors.ir, 1, 20, 90);
  AppState.sensors.ch4 = randomWalk(AppState.sensors.ch4, 0.05, 0.0, 3.5);
  AppState.sensors.co = randomWalk(AppState.sensors.co, 2, 0, 80);
  AppState.sensors.temperature = randomWalk(AppState.sensors.temperature, 0.5, 15, 55);
  AppState.sensors.humidity = randomWalk(AppState.sensors.humidity, 1, 20, 95);
  AppState.sensors.gps.lat = randomWalk(AppState.sensors.gps.lat, 0.0001, 12.96, 12.98);
  AppState.sensors.gps.lng = randomWalk(AppState.sensors.gps.lng, 0.0001, 78.16, 78.18);
  AppState.sensors.gps.depth = randomWalk(AppState.sensors.gps.depth, 2, -600, -50);
  
  if (Math.random() < 0.1) {
    AppState.sensors.motion = AppState.sensors.motion === 'NO' ? 'YES' : 'NO';
  }

  AppState.sensors.proximity = randomWalk(AppState.sensors.proximity, 3, 5, 200);
  AppState.sensors.vibration = randomWalk(AppState.sensors.vibration, 0.2, 0.5, 15.0);
  AppState.sensors.accel.pitch = randomWalk(AppState.sensors.accel.pitch, 0.4, -28.0, 28.0);
  AppState.sensors.accel.roll = randomWalk(AppState.sensors.accel.roll, 0.4, -28.0, 28.0);
  AppState.sensors.accel.g = randomWalk(AppState.sensors.accel.g, 0.05, 0.8, 3.2);
  AppState.sensors.beacon = randomWalk(AppState.sensors.beacon, 2, -95, -40);

  // If AI Mode, slowly drift speed
  if (AppState.controls.mode === 'AI' && !AppState.controls.estop) {
    AppState.controls.speed = randomWalk(AppState.controls.speed, 0.1, 0.5, 3.0);
  }

  // Update Alert triggers
  if (AppState.sensors.proximity < 30 || AppState.sensors.ultrasonic < 30) {
    AppState.alerts.obstacle = 'DETECTED';
  } else {
    AppState.alerts.obstacle = 'CLEAR';
  }

  AppState.alerts.humanDetected = AppState.sensors.motion;

  if (AppState.sensors.temperature > 42 || AppState.sensors.ir > 65) {
    AppState.alerts.thermalAlert = 'YES';
    AppState.alerts.highAlertMessage = 'ALERT: Thermal Alert [YES]';
  } else {
    AppState.alerts.thermalAlert = 'NO';
    AppState.alerts.highAlertMessage = 'ALERT: Thermal Alert [NO]';
  }

  updateUI();
}, 2000);

// --- Camera Canvas Draw Loop ---
let cameraCanvas = null;
let cameraCtx = null;
function initCamera() {
  cameraCanvas = document.getElementById('cameraCanvas');
  if (!cameraCanvas) return;
  cameraCtx = cameraCanvas.getContext('2d');
  
  // Resize to element client area
  cameraCanvas.width = cameraCanvas.parentElement.clientWidth;
  cameraCanvas.height = cameraCanvas.parentElement.clientHeight;

  window.addEventListener('resize', () => {
    if (cameraCanvas) {
      cameraCanvas.width = cameraCanvas.parentElement.clientWidth;
      cameraCanvas.height = cameraCanvas.parentElement.clientHeight;
    }
  });

  // Loop drawing a simple retro monochrome tunnel frame
  function drawFrame() {
    if (!cameraCtx || !cameraCanvas) return;
    const ctx = cameraCtx;
    const w = cameraCanvas.width;
    const h = cameraCanvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Draw retro grid tunnel lines in light grey
    ctx.strokeStyle = '#323232';
    ctx.lineWidth = 1;
    const cx = w / 2;
    const cy = h / 2;

    // Draw tunnel rectangles going into depth
    const time = Date.now() * 0.002;
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const scale = ((i + (time % 1.0)) / layers);
      const rw = w * scale * 0.9;
      const rh = h * scale * 0.8;
      ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);
    }

    // Horizontal crosshairs
    ctx.strokeStyle = '#505050';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
    ctx.stroke();

    // Moving scanline
    const scanY = (Date.now() * 0.05) % h;
    ctx.fillStyle = 'rgba(200, 200, 200, 0.05)';
    ctx.fillRect(0, scanY, w, 2);

    requestAnimationFrame(drawFrame);
  }
  requestAnimationFrame(drawFrame);
}

// --- Wire up Controls ---
function initControls() {
  // Direction Pad
  const directions = ['Fwd', 'Stp', 'Rev', 'Lft', 'Rgt'];
  directions.forEach(dir => {
    const btn = document.getElementById('btn' + dir);
    if (btn) {
      btn.addEventListener('click', () => {
        if (AppState.controls.estop && dir !== 'Stp') return;
        AppState.controls.activeDirection = dir.toUpperCase();
        addLog(`Cmd: Rover ${dir.toUpperCase()}`);
        
        if (dir === 'Stp') {
          AppState.controls.speed = 0.0;
        } else if (AppState.controls.speed === 0.0 && !AppState.controls.estop) {
          AppState.controls.speed = 1.0; // auto speed
        }
        updateUI();
      });
    }
  });

  // Lights toggle
  const lightsBtn = document.getElementById('btnLights');
  lightsBtn.addEventListener('click', () => {
    const modes = ['OFF', 'LOW', 'HIGH'];
    const currentIdx = modes.indexOf(AppState.controls.lights);
    AppState.controls.lights = modes[(currentIdx + 1) % modes.length];
    addLog(`Lights set to ${AppState.controls.lights}`);
    updateUI();
  });

  // Alarm toggle
  const alarmBtn = document.getElementById('btnAlarm');
  alarmBtn.addEventListener('click', () => {
    AppState.controls.alarm = AppState.controls.alarm === 'OFF' ? 'ON' : 'OFF';
    addLog(`Alarm toggled ${AppState.controls.alarm}`);
    updateUI();
  });

  // AI Mode toggle
  const modeBtn = document.getElementById('btnMode');
  modeBtn.addEventListener('click', () => {
    AppState.controls.mode = AppState.controls.mode === 'MANUAL' ? 'AI' : 'MANUAL';
    addLog(`Operational mode set to ${AppState.controls.mode}`);
    updateUI();
  });

  // Callback button
  const callbackBtn = document.getElementById('btnCallback');
  callbackBtn.addEventListener('click', () => {
    if (AppState.controls.callback) {
      AppState.controls.callback = false;
      if (AppState.controls.callbackTimer) clearInterval(AppState.controls.callbackTimer);
      addLog("Callback canceled");
    } else {
      AppState.controls.callback = true;
      addLog("Initiating Callback recall routine");
      let count = 10;
      AppState.controls.callbackTimer = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(AppState.controls.callbackTimer);
          AppState.controls.callback = false;
          addLog("Rover Recall SUCCESS - Docked at Base");
          AppState.controls.activeDirection = 'STP';
          AppState.controls.speed = 0;
          updateUI();
        }
      }, 1000);
    }
    updateUI();
  });

  // Speed slider adjustment
  const speedSlider = document.getElementById('speedSlider');
  speedSlider.addEventListener('input', (e) => {
    if (AppState.controls.estop || AppState.controls.mode === 'AI') return;
    AppState.controls.speed = parseFloat(e.target.value);
    updateUI();
  });

  // E-STOP Toggle
  const estopBtn = document.getElementById('btnEstop');
  estopBtn.addEventListener('click', () => {
    if (AppState.controls.estop) {
      AppState.controls.estop = false;
      addLog("E-STOP reset. Control manual engagement enabled.");
    } else {
      AppState.controls.estop = true;
      AppState.controls.speed = 0.0;
      AppState.controls.activeDirection = 'STP';
      addLog("EMERGENCY STOP ENGAGED. Propulsion disabled.");
    }
    updateUI();
  });
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  const legacyConsole = document.getElementById('val-ultrasonic');
  if (legacyConsole) {
    initCamera();
    initControls();
    updateUI();
  }
});
