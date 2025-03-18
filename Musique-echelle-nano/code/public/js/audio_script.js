let head=0, pos=0, freq=15, old_freq = 1, grainSize = 0.01, pitch = 1;
let transpose = true;
let c,w,h;
const rnd2 = () => Math.random() * 2 - 1;
const choose = (array) => array[Math.floor(Math.random()*array.length)]
let triggerNode = null;
let audioCtx, main, snd, duration;

let buffers = {};
let currentBuffer = null;


function drunk(data, min, max, step){
  if (Math.random() > 0.5) value = data + step;
  else value = data - step;

  if (value > max) value = max;
  else if (value < min) value = min;
  return value;
}

class TriggerNode extends AudioWorkletNode {
  constructor(audioCtx) {
    super(audioCtx, 'trigger');
    this.counter_ = 0;
    this.port.onmessage = this.handleMessage_.bind(this);
    console.log('[TriggerNode:constructor] created.');
  }

  handleMessage_(event) {
    if(transpose) pitch = drunk(pitch, 0.5, 1.5, 0.05);
    else pitch = 1;
    pos = drunk(pos, 0, duration, 0.05);
    if (pos > duration) pos = 0;
    if (pos < 0) pos = duration;
    particle(
      Math.abs(pos),
      rnd2()*1,
      0.1,
      grainSize,
      pitch,
    )
  }
}

async function changeGranularValues(values) {
    freq = values.frequency;
    grainSize = values.grainSize;
    transpose = values.transpose;
    if (freq != old_freq) {
        old_freq = freq;
        triggerNode.port.postMessage(freq);
    }
}

async function loadMultipleBuffers(fileList) {
  for (const fileName of fileList) {
      buffers[fileName] = await loadBuffer('./media/' + fileName);
  }
  console.log("✅ Buffers chargés :", Object.keys(buffers));
}

// Fonction pour charger un buffer
async function loadBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

function changeBuffer(fileName) {
  if (buffers[fileName]) {
      currentBuffer = buffers[fileName];
      console.log(`🔄 Changement de buffer : ${fileName}`);
  } else {
      console.warn(`❌ Buffer ${fileName} non trouvé`);
  }
}

async function setupGranular(){
    init_audio();
    await loadMultipleBuffers(["MetalTin57.wav", "strings.wav", "foret_percs.wav"]);
    currentBuffer = buffers["MetalTin57.wav"];
    duration = parseInt(currentBuffer.duration);
    await audioCtx.audioWorklet.addModule('./code/public/js/trigger.js');
    triggerNode = new TriggerNode(audioCtx);
}

const loadbuf = url => new Promise(async (resolve, reject) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    audioCtx.decodeAudioData(buf, resolve, reject)
});

const particle = (pos=0, pan=0, amp=1, dur=0.01, rate=1) => {
    const now = audioCtx.currentTime;
    const smp = audioCtx.createBufferSource();
    const vca = audioCtx.createGain();
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = pan;
    let duration = Math.max(0.001, dur);
    // ar envelope
    vca.gain.value = 0;
    vca.gain.linearRampToValueAtTime(1, now + duration*0.5);
    vca.gain.linearRampToValueAtTime(0, now + duration);
    smp.playbackRate.value = rate;
    smp.buffer = currentBuffer;
    smp.loop = false;
    smp.connect(vca);
    vca.connect(panner);
    panner.connect(main);
    smp.start(now, pos);
    smp.stop(now + 5);
};

const init_audio = () => {
    AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext({ latencyHint: 'balanced' });

    main = audioCtx.createGain();
    main.gain.value = 0;
    main.connect(audioCtx.destination);
};

function startGranular(){
  main.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
  console.log("🎵 Granular démarré");
}

function stopGranular(){
  main.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
}

// document.getElementById("bufferSelector").addEventListener("change", (e) => {
//   changeBuffer(e.target.value);
//   duration = parseInt(currentBuffer.duration);
// });