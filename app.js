/**
 * MINE SAFETY & RESCUE COMMAND CONSOLE
 * Comprehensive Real-time Telemetry, Teleoperation, & Emergency Control System
 */

// --- Global Application State ---
const State = {
  // Telemetry Sensors (14 Sensors)
  sensors: {
    ch4: 0.32,          // % LEL (Safe < 1.00%)
    co: 12,             // ppm (Safe < 50 ppm)
    aqi: 38,            // AQI (Good < 50)
    barometer: 1013,    // hPa
    temperature: 26.8,  // °C
    ir: 29.4,           // °C
    humidity: 58,       // %
    vibration: 1.8,     // mm/s (Safe < 8.0)
    depth: -340,        // meters below surface
    lat: 12.9716,
    lng: 78.1689,
    zone: 'Tunnel B3 (West)',
    proximity: 165,     // cm (Obstacle < 40)
    ultrasonic: 248,    // cm
    motion: 'NO MOTION',
    pitch: 1.2,         // degrees
    roll: -0.8,         // degrees
    gForce: 1.02,       // g
    beaconRssi: -48     // dBm
  },

  // Rover Teleoperation State
  rover: {
    activeDir: 'STP',   // 'FWD', 'REV', 'LFT', 'RGT', 'STP'
    speed: 0.0,         // km/h (0.0 to 4.0)
    mode: 'MANUAL',     // 'MANUAL', 'AI', 'BEACON'
    lights: 'OFF',      // 'OFF', 'LOW', 'HIGH', 'STROBE'
    alarm: 'OFF',       // 'OFF', 'ON'
    estop: false,       // Emergency Stop Flag
    callback: false,    // Return to base in progress
    callbackTimer: null,
    battery: 88,        // %
    motorTemp: 34       // °C
  },

  // Camera Reconnaissance Mode
  camera: {
    mode: 'OPTICAL',    // 'OPTICAL', 'THERMAL', 'NIGHT', 'LIDAR'
    bearing: 42,
    targetDist: 2.4
  },

  // Safety & Actuators
  safety: {
    overall: 'SAFE',    // 'SAFE', 'WARNING', 'HAZARD'
    scrubber: 'AUTO',   // 'AUTO', 'BOOST', 'PURGE'
    fan: 'RUNNING',     // 'RUNNING', 'HIGH'
    siren: 'STANDBY',   // 'STANDBY', 'BROADCASTING'
    personnel: {
      total: 18,
      accounted: 18,
      status: 'ALL SAFE'
    },
    activePreset: 'NORMAL' // 'NORMAL', 'GAS', 'OBSTACLE', 'SOS'
  },

  // System & Audio
  system: {
    missionSeconds: 1482,
    audioEnabled: true,
    telemetryQuality: 99.4
  }
};

// --- Web Audio Synthesizer (Realistic Industrial Feedback) ---
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initContext();
  }

  initContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playTone(freq, type, duration, gainVal = 0.05) {
    if (!State.system.audioEnabled) return;
    try {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback silent
    }
  }

  click() {
    this.playTone(800, 'sine', 0.04, 0.03);
  }

  beepWarn() {
    this.playTone(620, 'square', 0.15, 0.06);
  }

  beepAlert() {
    this.playTone(880, 'sawtooth', 0.25, 0.08);
  }

  motorHum() {
    if (State.rover.speed > 0 && !State.rover.estop) {
      this.playTone(90 + State.rover.speed * 20, 'triangle', 0.08, 0.02);
    }
  }
}

const Audio = new AudioEngine();

// --- Utility Helpers ---
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomWalk(current, step, min, max) {
  const delta = (Math.random() - 0.5) * 2 * step;
  return clamp(current + delta, min, max);
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

// --- Audit Event Logging ---
function addAuditLog(message, type = 'info') {
  const logContainer = document.getElementById('auditLogContainer');
  if (!logContainer) return;

  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-t';
  timeSpan.textContent = getTimestamp();

  entry.appendChild(timeSpan);
  entry.appendChild(document.createTextNode(' ' + message));

  logContainer.insertBefore(entry, logContainer.firstChild);

  // Keep max 50 log items
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// --- UI Telemetry Synchronization ---
function updateTelemetryUI() {
  const s = State.sensors;

  // 1. CH4 Methane
  const valCh4 = document.getElementById('val-ch4');
  const statusCh4 = document.getElementById('status-ch4');
  const meterCh4 = document.getElementById('meter-ch4');
  const cardCh4 = document.getElementById('card-ch4');

  valCh4.textContent = s.ch4.toFixed(2);
  const ch4Percent = Math.min(100, (s.ch4 / 2.5) * 100);
  meterCh4.style.width = `${ch4Percent}%`;

  if (s.ch4 >= 1.0) {
    statusCh4.textContent = 'HAZARD';
    statusCh4.className = 'sensor-state state-hazard';
    meterCh4.style.backgroundColor = 'var(--danger-red)';
    cardCh4.className = 'sensor-card hazard-active';
  } else if (s.ch4 >= 0.6) {
    statusCh4.textContent = 'ELEVATED';
    statusCh4.className = 'sensor-state state-warn';
    meterCh4.style.backgroundColor = 'var(--warn-amber)';
    cardCh4.className = 'sensor-card warning-active';
  } else {
    statusCh4.textContent = 'NORMAL';
    statusCh4.className = 'sensor-state state-ok';
    meterCh4.style.backgroundColor = 'var(--safe-green)';
    cardCh4.className = 'sensor-card';
  }

  // 2. CO Carbon Monoxide
  const valCo = document.getElementById('val-co');
  const statusCo = document.getElementById('status-co');
  const meterCo = document.getElementById('meter-co');
  const cardCo = document.getElementById('card-co');

  valCo.textContent = s.co.toFixed(0);
  const coPercent = Math.min(100, (s.co / 100) * 100);
  meterCo.style.width = `${coPercent}%`;

  if (s.co >= 50) {
    statusCo.textContent = 'TOXIC';
    statusCo.className = 'sensor-state state-hazard';
    meterCo.style.backgroundColor = 'var(--danger-red)';
    cardCo.className = 'sensor-card hazard-active';
  } else if (s.co >= 25) {
    statusCo.textContent = 'CAUTION';
    statusCo.className = 'sensor-state state-warn';
    meterCo.style.backgroundColor = 'var(--warn-amber)';
    cardCo.className = 'sensor-card warning-active';
  } else {
    statusCo.textContent = 'NORMAL';
    statusCo.className = 'sensor-state state-ok';
    meterCo.style.backgroundColor = 'var(--safe-green)';
    cardCo.className = 'sensor-card';
  }

  // 3. AQI
  const valAqi = document.getElementById('val-aqi');
  const statusAqi = document.getElementById('status-aqi');
  const meterAqi = document.getElementById('meter-aqi');
  valAqi.textContent = s.aqi.toFixed(0);
  meterAqi.style.width = `${Math.min(100, (s.aqi / 200) * 100)}%`;
  if (s.aqi > 100) {
    statusAqi.textContent = 'POOR';
    statusAqi.className = 'sensor-state state-hazard';
  } else if (s.aqi > 50) {
    statusAqi.textContent = 'MODERATE';
    statusAqi.className = 'sensor-state state-warn';
  } else {
    statusAqi.textContent = 'GOOD';
    statusAqi.className = 'sensor-state state-ok';
  }

  // 4. Barometer
  document.getElementById('val-barometer').textContent = s.barometer.toFixed(0);
  document.getElementById('meter-barometer').style.width = `${((s.barometer - 950) / 100) * 100}%`;

  // 5. Temperature & IR
  document.getElementById('val-temperature').textContent = s.temperature.toFixed(1);
  document.getElementById('meter-temp').style.width = `${Math.min(100, (s.temperature / 60) * 100)}%`;

  const valIr = document.getElementById('val-ir');
  const statusIr = document.getElementById('status-ir');
  const cardIr = document.getElementById('card-ir');
  valIr.textContent = s.ir.toFixed(1);
  document.getElementById('meter-ir').style.width = `${Math.min(100, (s.ir / 80) * 100)}%`;
  if (s.ir > 55) {
    statusIr.textContent = 'HOTSPOT';
    statusIr.className = 'sensor-state state-hazard';
    cardIr.className = 'sensor-card hazard-active';
  } else {
    statusIr.textContent = 'NORMAL';
    statusIr.className = 'sensor-state state-ok';
    cardIr.className = 'sensor-card';
  }

  // 6. Humidity & Seismic Vibration
  document.getElementById('val-humidity').textContent = s.humidity.toFixed(0);
  document.getElementById('meter-humidity').style.width = `${s.humidity}%`;

  const valVib = document.getElementById('val-vibration');
  const statusVib = document.getElementById('status-vibration');
  const cardVib = document.getElementById('card-vibration');
  valVib.textContent = s.vibration.toFixed(1);
  document.getElementById('meter-vibration').style.width = `${Math.min(100, (s.vibration / 12) * 100)}%`;
  if (s.vibration > 8.0) {
    statusVib.textContent = 'SEISMIC EVENT';
    statusVib.className = 'sensor-state state-hazard';
    cardVib.className = 'sensor-card hazard-active';
  } else {
    statusVib.textContent = 'QUIET';
    statusVib.className = 'sensor-state state-ok';
    cardVib.className = 'sensor-card';
  }

  // 7. Depth & Location
  document.getElementById('val-gps-depth').textContent = `${s.depth.toFixed(0)} m`;
  document.getElementById('val-gps-coords').textContent = `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`;
  document.getElementById('val-location-zone').textContent = s.zone;

  // 8. Proximity & Ultrasonic Range
  const valProx = document.getElementById('val-proximity');
  const statusProx = document.getElementById('status-proximity');
  const cardProx = document.getElementById('card-proximity');
  valProx.textContent = s.proximity.toFixed(0);
  document.getElementById('meter-proximity').style.width = `${Math.min(100, (s.proximity / 250) * 100)}%`;
  if (s.proximity < 40) {
    statusProx.textContent = 'OBSTACLE';
    statusProx.className = 'sensor-state state-hazard';
    cardProx.className = 'sensor-card hazard-active';
  } else {
    statusProx.textContent = 'CLEAR';
    statusProx.className = 'sensor-state state-ok';
    cardProx.className = 'sensor-card';
  }

  const valUltra = document.getElementById('val-ultrasonic');
  valUltra.textContent = s.ultrasonic.toFixed(0);
  document.getElementById('meter-ultrasonic').style.width = `${Math.min(100, (s.ultrasonic / 350) * 100)}%`;

  // 9. Motion
  const valMot = document.getElementById('val-motion');
  const statusMot = document.getElementById('status-motion');
  valMot.textContent = s.motion;
  if (s.motion === 'MOTION DETECTED') {
    statusMot.textContent = 'ACTIVITY';
    statusMot.className = 'sensor-state state-warn';
  } else {
    statusMot.textContent = 'NONE';
    statusMot.className = 'sensor-state state-ok';
  }

  // 10. Tilt & G-Force
  const pSign = s.pitch >= 0 ? '+' : '';
  const rSign = s.roll >= 0 ? '+' : '';
  document.getElementById('val-accel-tilt').textContent = `P: ${pSign}${s.pitch.toFixed(1)}° R: ${rSign}${s.roll.toFixed(1)}°`;
  document.getElementById('val-accel-g').textContent = `${s.gForce.toFixed(2)} g`;

  // 11. Beacon RSSI
  const valBeacon = document.getElementById('val-beacon');
  const statusBeacon = document.getElementById('status-beacon');
  const cardBeacon = document.getElementById('card-beacon');
  valBeacon.textContent = s.beaconRssi.toFixed(0);
  document.getElementById('meter-beacon').style.width = `${Math.max(0, 100 + s.beaconRssi)}%`;
  if (s.beaconRssi > -35) {
    statusBeacon.textContent = 'PROXIMATE (SOS)';
    statusBeacon.className = 'sensor-state state-hazard';
    cardBeacon.className = 'sensor-card hazard-active';
  } else {
    statusBeacon.textContent = 'LOCKED';
    statusBeacon.className = 'sensor-state state-ok';
    cardBeacon.className = 'sensor-card';
  }

  // Header Overall Status Ribbon Update
  updateOverallStatus();
}

function updateOverallStatus() {
  const pill = document.getElementById('overallStatusPill');
  const icon = document.getElementById('overallStatusIcon');
  const text = document.getElementById('overallStatusText');
  const tagTunnel = document.getElementById('tagTunnelStatus');

  if (State.sensors.ch4 >= 1.0 || State.sensors.co >= 50 || State.sensors.beaconRssi > -35) {
    pill.className = 'status-pill status-hazard';
    icon.textContent = '⚠';
    text.textContent = 'HAZARD DETECTED';
    tagTunnel.className = 'status-tag tag-hazard';
    tagTunnel.textContent = 'ALERT';
  } else if (State.sensors.ch4 >= 0.6 || State.sensors.co >= 25 || State.sensors.proximity < 40) {
    pill.className = 'status-pill status-warning';
    icon.textContent = '▲';
    text.textContent = 'ELEVATED CAUTION';
    tagTunnel.className = 'status-tag tag-hazard';
    tagTunnel.textContent = 'CAUTION';
  } else {
    pill.className = 'status-pill status-normal';
    icon.textContent = '✔';
    text.textContent = 'ALL ZONES SAFE';
    tagTunnel.className = 'status-tag tag-safe';
    tagTunnel.textContent = 'SAFE';
  }
}

// --- Rover Teleoperation & Controls ---
function updateRoverUI() {
  // Speed
  const slider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedValue');
  speedVal.textContent = State.rover.speed.toFixed(1);
  slider.value = State.rover.speed;

  // Direction Pad active button
  const dirBtns = {
    FWD: document.getElementById('btnFwd'),
    REV: document.getElementById('btnRev'),
    LFT: document.getElementById('btnLft'),
    RGT: document.getElementById('btnRgt'),
    STP: document.getElementById('btnStp')
  };

  Object.entries(dirBtns).forEach(([dir, btn]) => {
    if (btn) {
      if (State.rover.activeDir === dir) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  // Lights button
  const lblLights = document.getElementById('lblLights');
  lblLights.textContent = State.rover.lights;
  const btnLights = document.getElementById('btnLights');
  if (State.rover.lights !== 'OFF') btnLights.classList.add('active');
  else btnLights.classList.remove('active');

  // Alarm button
  const lblAlarm = document.getElementById('lblAlarm');
  lblAlarm.textContent = State.rover.alarm;
  const btnAlarm = document.getElementById('btnAlarm');
  if (State.rover.alarm === 'ON') btnAlarm.classList.add('active');
  else btnAlarm.classList.remove('active');

  // Mode button
  const btnMode = document.getElementById('btnMode');
  const badgeMode = document.getElementById('badgeMode');
  btnMode.querySelector('strong').textContent = State.rover.mode;
  badgeMode.textContent = `MODE: ${State.rover.mode}`;
  if (State.rover.mode !== 'MANUAL') btnMode.classList.add('active');
  else btnMode.classList.remove('active');

  // Callback button
  const btnCallback = document.getElementById('btnCallback');
  const lblCallback = document.getElementById('lblCallback');
  if (State.rover.callback) {
    lblCallback.textContent = 'RECALLING...';
    btnCallback.classList.add('active');
  } else {
    lblCallback.textContent = 'BASE';
    btnCallback.classList.remove('active');
  }

  // Emergency Stop button
  const btnEstop = document.getElementById('btnEstop');
  if (State.rover.estop) {
    btnEstop.classList.add('engaged');
    btnEstop.querySelector('strong').textContent = 'E-STOP ENGAGED';
    slider.disabled = true;
  } else {
    btnEstop.classList.remove('engaged');
    btnEstop.querySelector('strong').textContent = 'EMERGENCY STOP';
    slider.disabled = State.rover.mode === 'AI';
  }

  // Battery & Motor Temp
  document.getElementById('valBattery').textContent = `${State.rover.battery.toFixed(0)}% (4.2 hrs)`;
  document.getElementById('valMotorTemp').textContent = `${State.rover.motorTemp.toFixed(0)}°C (NOMINAL)`;
}

function setRoverDirection(dir) {
  Audio.click();
  if (State.rover.estop && dir !== 'STP') {
    addAuditLog('Command rejected: Emergency Stop is currently engaged.', 'warn');
    Audio.beepWarn();
    return;
  }

  State.rover.activeDir = dir;
  if (dir === 'STP') {
    State.rover.speed = 0.0;
    addAuditLog('Rover propulsion BRAKED / STOPPED.', 'info');
  } else {
    if (State.rover.speed === 0.0) {
      State.rover.speed = 1.0;
    }
    addAuditLog(`Rover commanded: ${dir} at ${State.rover.speed.toFixed(1)} km/h.`, 'info');
    Audio.motorHum();
  }
  updateRoverUI();
}

function toggleEmergencyStop() {
  State.rover.estop = !State.rover.estop;
  if (State.rover.estop) {
    State.rover.speed = 0.0;
    State.rover.activeDir = 'STP';
    if (State.rover.callbackTimer) clearInterval(State.rover.callbackTimer);
    State.rover.callback = false;
    Audio.beepAlert();
    addAuditLog('EMERGENCY STOP ACTIVATED: Immediate propulsion lockout.', 'alert');
  } else {
    Audio.click();
    addAuditLog('Emergency Stop released. Manual drive control restored.', 'ok');
  }
  updateRoverUI();
}

// --- Reconnaissance Canvas Visualizer ---
function initReconCanvas() {
  const canvas = document.getElementById('cameraCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 280;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let tick = 0;

  function renderFeed() {
    tick++;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Background based on camera mode
    if (State.camera.mode === 'THERMAL') {
      ctx.fillStyle = '#0a0d24'; // Deep thermal blue
    } else if (State.camera.mode === 'NIGHT') {
      ctx.fillStyle = '#061609'; // Night vision phosphor
    } else if (State.camera.mode === 'LIDAR') {
      ctx.fillStyle = '#05070a'; // LIDAR dark space
    } else {
      ctx.fillStyle = '#0b0f14'; // Optical mine tunnel
    }
    ctx.fillRect(0, 0, w, h);

    // Dynamic perspective tunnel rendering
    const tunnelLayers = 6;
    const speedOffset = (tick * (State.rover.speed > 0 ? State.rover.speed * 0.04 : 0.01)) % 1;

    for (let i = 0; i < tunnelLayers; i++) {
      const depth = (i + speedOffset) / tunnelLayers;
      const rw = w * depth * 0.95;
      const rh = h * depth * 0.85;

      // Color scheme according to mode
      if (State.camera.mode === 'THERMAL') {
        const r = Math.floor(180 * depth);
        const g = Math.floor(80 * depth);
        const b = Math.floor(220 * (1 - depth));
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
      } else if (State.camera.mode === 'NIGHT') {
        ctx.strokeStyle = `rgba(80, 220, 100, ${0.2 + depth * 0.5})`;
      } else if (State.camera.mode === 'LIDAR') {
        ctx.strokeStyle = `rgba(88, 166, 255, ${0.2 + depth * 0.6})`;
        ctx.setLineDash([4, 4]);
      } else {
        ctx.strokeStyle = `rgba(100, 120, 145, ${0.15 + depth * 0.45})`;
        ctx.setLineDash([]);
      }

      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh);

      // Perspective corner guide lines
      if (i === tunnelLayers - 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(cx - rw / 2, cy - rh / 2);
        ctx.moveTo(w, 0); ctx.lineTo(cx + rw / 2, cy - rh / 2);
        ctx.moveTo(0, h); ctx.lineTo(cx - rw / 2, cy + rh / 2);
        ctx.moveTo(w, h); ctx.lineTo(cx + rw / 2, cy + rh / 2);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Artificial horizon & roll indicator
    const rollRad = (State.sensors.roll * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rollRad);

    // Crosshair Reticle
    ctx.strokeStyle = State.camera.mode === 'THERMAL' ? '#e3b341' : (State.camera.mode === 'NIGHT' ? '#3fb950' : '#58a6ff');
    ctx.lineWidth = 1.5;

    // Pitch ladder bars
    ctx.beginPath();
    ctx.moveTo(-35, 0); ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0); ctx.lineTo(35, 0);
    ctx.moveTo(0, -25); ctx.lineTo(0, -10);
    ctx.moveTo(0, 10); ctx.lineTo(0, 25);
    ctx.stroke();

    // Center Aim Circle
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // If Obstacle is close, render danger target box
    if (State.sensors.proximity < 50 || State.sensors.ultrasonic < 50) {
      const boxW = 120;
      const boxH = 70;
      const boxX = cx - boxW / 2 + Math.sin(tick * 0.1) * 10;
      const boxY = cy - boxH / 2;

      ctx.strokeStyle = '#f85149';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = 'rgba(248, 81, 73, 0.2)';
      ctx.fillRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#f85149';
      ctx.font = '10px monospace';
      ctx.fillText(`[ OBSTACLE: ${State.sensors.proximity.toFixed(0)}cm ]`, boxX + 6, boxY - 6);
    }

    // If Miner Beacon SOS is proximate, render rescue target marker
    if (State.sensors.beaconRssi > -35) {
      const sosX = cx + 80;
      const sosY = cy - 20;

      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sosX, sosY, 22 + Math.sin(tick * 0.2) * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#3fb950';
      ctx.font = '10px monospace';
      ctx.fillText('MINER BEACON LOCKED', sosX - 55, sosY - 32);
    }

    // Scanline & noise grain effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const scanY = (tick * 2) % h;
    ctx.fillRect(0, scanY, w, 2);

    // Update HUD elements
    document.getElementById('hudBearing').textContent = `HDG: ${(42 + State.sensors.roll * 2).toFixed(0).padStart(3, '0')}° NE`;
    document.getElementById('hudDistance').textContent = `TARGET DIST: ${(State.sensors.ultrasonic / 100).toFixed(1)}m`;
    document.getElementById('hudThermalMax').textContent = `PEAK TEMP: ${State.sensors.ir.toFixed(1)}°C`;

    requestAnimationFrame(renderFeed);
  }

  requestAnimationFrame(renderFeed);
}

// --- Simulation Presets for Fast Testing ---
function applyPreset(name) {
  Audio.click();
  State.safety.activePreset = name;

  // Update preset button active states
  ['presetNormal', 'presetGas', 'presetObstacle', 'presetSos'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });

  if (name === 'NORMAL') {
    document.getElementById('presetNormal').classList.add('active');
    State.sensors.ch4 = 0.32;
    State.sensors.co = 12;
    State.sensors.proximity = 165;
    State.sensors.ultrasonic = 248;
    State.sensors.beaconRssi = -48;
    State.sensors.motion = 'NO MOTION';
    State.sensors.ir = 29.4;
    State.sensors.vibration = 1.8;
    addAuditLog('System restored to NORMAL standard operations baseline.', 'ok');
  } else if (name === 'GAS') {
    document.getElementById('presetGas').classList.add('active');
    State.sensors.ch4 = 1.45;
    State.sensors.co = 78;
    State.sensors.aqi = 145;
    Audio.beepAlert();
    addAuditLog('SIMULATION: Critical Methane (1.45% LEL) and CO (78 ppm) Gas Leak detected!', 'alert');
  } else if (name === 'OBSTACLE') {
    document.getElementById('presetObstacle').classList.add('active');
    State.sensors.proximity = 24;
    State.sensors.ultrasonic = 28;
    State.sensors.vibration = 9.4;
    Audio.beepWarn();
    addAuditLog('SIMULATION: Tunnel structural obstacle / cave-in hazard at 24 cm.', 'warn');
  } else if (name === 'SOS') {
    document.getElementById('presetSos').classList.add('active');
    State.sensors.beaconRssi = -24;
    State.sensors.motion = 'MOTION DETECTED';
    State.sensors.ir = 37.2;
    Audio.beepAlert();
    addAuditLog('SIMULATION: Miner Personal Distress SOS Beacon received in Tunnel B3!', 'alert');
  }

  updateTelemetryUI();
}

// --- Wire Up All Interactive Controls ---
function setupEventListeners() {
  // 1. Driving Direction Pad Clicks
  document.getElementById('btnFwd').addEventListener('click', () => setRoverDirection('FWD'));
  document.getElementById('btnRev').addEventListener('click', () => setRoverDirection('REV'));
  document.getElementById('btnLft').addEventListener('click', () => setRoverDirection('LFT'));
  document.getElementById('btnRgt').addEventListener('click', () => setRoverDirection('RGT'));
  document.getElementById('btnStp').addEventListener('click', () => setRoverDirection('STP'));

  // 2. Throttle Slider & Gear Presets
  const slider = document.getElementById('speedSlider');
  slider.addEventListener('input', (e) => {
    if (State.rover.estop || State.rover.mode === 'AI') return;
    State.rover.speed = parseFloat(e.target.value);
    if (State.rover.speed > 0 && State.rover.activeDir === 'STP') {
      State.rover.activeDir = 'FWD';
    } else if (State.rover.speed === 0.0) {
      State.rover.activeDir = 'STP';
    }
    updateRoverUI();
  });

  document.querySelectorAll('.btn-gear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      Audio.click();
      if (State.rover.estop || State.rover.mode === 'AI') return;
      const spd = parseFloat(e.target.dataset.speed);
      State.rover.speed = spd;
      if (spd === 0) State.rover.activeDir = 'STP';
      else if (State.rover.activeDir === 'STP') State.rover.activeDir = 'FWD';
      addAuditLog(`Speed gear selected: ${spd.toFixed(1)} km/h.`, 'info');
      updateRoverUI();
    });
  });

  // 3. Operational Toggles (Lights, Mode, Alarm, Callback, E-Stop)
  document.getElementById('btnLights').addEventListener('click', () => {
    Audio.click();
    const cycle = ['OFF', 'LOW', 'HIGH', 'STROBE'];
    const idx = cycle.indexOf(State.rover.lights);
    State.rover.lights = cycle[(idx + 1) % cycle.length];
    addAuditLog(`Rover headlamps set to ${State.rover.lights}.`, 'info');
    updateRoverUI();
  });

  document.getElementById('btnAlarm').addEventListener('click', () => {
    Audio.click();
    State.rover.alarm = State.rover.alarm === 'OFF' ? 'ON' : 'OFF';
    if (State.rover.alarm === 'ON') Audio.beepAlert();
    addAuditLog(`Rover acoustic siren toggled ${State.rover.alarm}.`, State.rover.alarm === 'ON' ? 'warn' : 'info');
    updateRoverUI();
  });

  document.getElementById('btnMode').addEventListener('click', () => {
    Audio.click();
    const modes = ['MANUAL', 'AI', 'BEACON'];
    const idx = modes.indexOf(State.rover.mode);
    State.rover.mode = modes[(idx + 1) % modes.length];
    addAuditLog(`Operational control mode switched to: ${State.rover.mode}.`, 'info');
    updateRoverUI();
  });

  document.getElementById('btnCallback').addEventListener('click', () => {
    Audio.click();
    if (State.rover.callback) {
      clearInterval(State.rover.callbackTimer);
      State.rover.callback = false;
      addAuditLog('Autonomous base recall sequence aborted by operator.', 'info');
    } else {
      State.rover.callback = true;
      State.rover.activeDir = 'REV';
      State.rover.speed = 1.8;
      addAuditLog('Initiated Return-to-Base callback homing sequence...', 'info');

      let countdown = 8;
      State.rover.callbackTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(State.rover.callbackTimer);
          State.rover.callback = false;
          State.rover.activeDir = 'STP';
          State.rover.speed = 0.0;
          Audio.beepWarn();
          addAuditLog('SUCCESS: Rover safely docked at Shaft Base Charging Bay.', 'ok');
          updateRoverUI();
        }
      }, 1000);
    }
    updateRoverUI();
  });

  document.getElementById('btnEstop').addEventListener('click', toggleEmergencyStop);

  // 4. Camera Modes Tabs
  const camTabs = [
    { id: 'tabOptical', mode: 'OPTICAL' },
    { id: 'tabThermal', mode: 'THERMAL' },
    { id: 'tabNight', mode: 'NIGHT' },
    { id: 'tabLidar', mode: 'LIDAR' }
  ];

  camTabs.forEach(({ id, mode }) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        Audio.click();
        camTabs.forEach(t => document.getElementById(t.id).classList.remove('active'));
        btn.classList.add('active');
        State.camera.mode = mode;
        addAuditLog(`Recon visual mode: ${mode}.`, 'info');
      });
    }
  });

  // 5. Presets
  document.getElementById('presetNormal').addEventListener('click', () => applyPreset('NORMAL'));
  document.getElementById('presetGas').addEventListener('click', () => applyPreset('GAS'));
  document.getElementById('presetObstacle').addEventListener('click', () => applyPreset('OBSTACLE'));
  document.getElementById('presetSos').addEventListener('click', () => applyPreset('SOS'));

  // 6. Actuator Buttons
  document.getElementById('btnScrubberToggle').addEventListener('click', () => {
    Audio.click();
    const modes = ['AUTO (100%)', 'BOOST (150%)', 'PURGE (200%)'];
    const current = document.getElementById('valScrubber').textContent;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    document.getElementById('valScrubber').textContent = next;
    addAuditLog(`Main Air Scrubbers power set to ${next}.`, 'info');
  });

  document.getElementById('btnFanToggle').addEventListener('click', () => {
    Audio.click();
    const current = document.getElementById('valFan').textContent;
    const next = current === 'RUNNING' ? 'HIGH FLOW' : 'RUNNING';
    document.getElementById('valFan').textContent = next;
    addAuditLog(`Exhaust ventilation fans shifted to ${next}.`, 'info');
  });

  document.getElementById('btnBroadcastEvac').addEventListener('click', () => {
    Audio.beepAlert();
    const sirenVal = document.getElementById('valSirenStatus');
    if (sirenVal.textContent === 'STANDBY') {
      sirenVal.textContent = 'BROADCASTING EVAC';
      sirenVal.style.color = 'var(--danger-red)';
      addAuditLog('CRITICAL: Sector evacuation siren and strobe beacons broadcast underground!', 'alert');
    } else {
      sirenVal.textContent = 'STANDBY';
      sirenVal.style.color = 'var(--safe-green)';
      addAuditLog('Evacuation siren broadcast stood down to standby.', 'ok');
    }
  });

  // 7. Audit Log actions (Clear & Export)
  document.getElementById('btnClearLog').addEventListener('click', () => {
    Audio.click();
    const container = document.getElementById('auditLogContainer');
    container.innerHTML = '';
    addAuditLog('Audit log cleared by operator.', 'info');
  });

  document.getElementById('btnExportLog').addEventListener('click', () => {
    Audio.click();
    const lines = [];
    document.querySelectorAll('.log-entry').forEach(entry => {
      lines.push(entry.textContent.trim());
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mine_Safety_Audit_Log_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditLog('Audit log exported to text report.', 'ok');
  });

  // 8. Audio Toggle
  document.getElementById('btnAudioToggle').addEventListener('click', () => {
    State.system.audioEnabled = !State.system.audioEnabled;
    const icon = document.getElementById('audioIcon');
    icon.textContent = State.system.audioEnabled ? '🔊' : '🔇';
    addAuditLog(`Audio feedback ${State.system.audioEnabled ? 'enabled' : 'muted'}.`, 'info');
  });

  // 9. Keyboard Shortcuts for Operator Teleoperation
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toUpperCase();
    if (key === 'W' || e.key === 'ArrowUp') {
      e.preventDefault();
      setRoverDirection('FWD');
    } else if (key === 'S' || e.key === 'ArrowDown') {
      e.preventDefault();
      setRoverDirection('REV');
    } else if (key === 'A' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setRoverDirection('LFT');
    } else if (key === 'D' || e.key === 'ArrowRight') {
      e.preventDefault();
      setRoverDirection('RGT');
    } else if (e.code === 'Space') {
      e.preventDefault();
      setRoverDirection('STP');
    } else if (key === 'E') {
      e.preventDefault();
      toggleEmergencyStop();
    } else if (key === 'L') {
      document.getElementById('btnLights').click();
    } else if (key === 'M') {
      document.getElementById('btnMode').click();
    }
  });
}

// --- Real-time Simulation Engine & Background Loop ---
function startSimulationLoop() {
  // Periodic mission clock
  setInterval(() => {
    State.system.missionSeconds++;
    document.getElementById('missionClock').textContent = formatTime(State.system.missionSeconds);
  }, 1000);

  // Periodic Telemetry Walk (Realistic gentle drift when in normal mode)
  setInterval(() => {
    const s = State.sensors;

    if (State.safety.activePreset === 'NORMAL') {
      s.ch4 = randomWalk(s.ch4, 0.02, 0.15, 0.45);
      s.co = randomWalk(s.co, 1, 5, 20);
      s.aqi = randomWalk(s.aqi, 1, 25, 45);
      s.barometer = randomWalk(s.barometer, 1, 1008, 1018);
      s.temperature = randomWalk(s.temperature, 0.2, 25.0, 28.5);
      s.ir = randomWalk(s.ir, 0.3, 27.0, 32.0);
      s.humidity = randomWalk(s.humidity, 0.5, 52, 64);
      s.vibration = randomWalk(s.vibration, 0.1, 0.8, 2.5);
      s.proximity = randomWalk(s.proximity, 2, 140, 200);
      s.ultrasonic = randomWalk(s.ultrasonic, 3, 220, 300);
      s.beaconRssi = randomWalk(s.beaconRssi, 1, -55, -42);
    }

    // Dynamic tilt based on rover movement
    if (State.rover.activeDir === 'FWD') {
      s.pitch = randomWalk(s.pitch, 0.3, 1.0, 4.5);
      s.roll = randomWalk(s.roll, 0.2, -1.5, 1.5);
      s.gForce = 1.05;
    } else if (State.rover.activeDir === 'REV') {
      s.pitch = randomWalk(s.pitch, 0.3, -3.5, -0.5);
      s.roll = randomWalk(s.roll, 0.2, -1.5, 1.5);
      s.gForce = 0.98;
    } else {
      s.pitch = randomWalk(s.pitch, 0.1, -0.5, 0.8);
      s.roll = randomWalk(s.roll, 0.1, -0.5, 0.5);
      s.gForce = 1.00;
    }

    // Autonomous AI mode rover wandering
    if (State.rover.mode === 'AI' && !State.rover.estop) {
      if (Math.random() < 0.2) {
        const dirs = ['FWD', 'FWD', 'LFT', 'RGT'];
        const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
        State.rover.activeDir = randomDir;
        State.rover.speed = randomFloat(1.2, 2.5);
        updateRoverUI();
      }
    }

    // Gentle battery depletion
    if (State.rover.speed > 0) {
      State.rover.battery = Math.max(5, State.rover.battery - 0.01);
      State.rover.motorTemp = Math.min(65, State.rover.motorTemp + 0.05);
    } else {
      State.rover.motorTemp = Math.max(30, State.rover.motorTemp - 0.05);
    }

    updateTelemetryUI();
    updateRoverUI();
  }, 1500);
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initReconCanvas();
  updateTelemetryUI();
  updateRoverUI();
  startSimulationLoop();
  addAuditLog('Operator authentication confirmed. Telemetry live stream verified.', 'ok');
});
