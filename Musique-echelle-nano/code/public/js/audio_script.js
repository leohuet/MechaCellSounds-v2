let head=0, pos=0, freq=15, old_freq = 1, grainSize = 0.01, pitch = 1, soundFile = 17;
let transpose = true;
let c,w,h;
const rnd2 = () => Math.random() * 2 - 1;
const choose = (array) => array[Math.floor(Math.random()*array.length)]
let triggerNode = null;
let audioCtx, main, viscousmain, stiffmain, snd, duration;

let granularBuffers = {};
let viscousBuffers = {};
let stiffBuffers = {};
let elasticBuffers = {};
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
  soundFile = values.soundFile;
  changeBuffer(granularBuffers, soundFile);
  freq = values.frequency;
  grainSize = values.grainSize;
  transpose = values.transpose;
  if (freq != old_freq) {
      old_freq = freq;
      triggerNode.port.postMessage(freq);
  }
  viscousmain.gain.linearRampToValueAtTime(values.viscosity, audioCtx.currentTime + 0.1);
}

async function loadMultipleBuffers(fileList) {
  let buffers = {};
  for (const fileName of fileList) {
      buffers[fileName] = await loadBuffer('./media/' + fileName);
  }
  buffers = Object.entries(buffers);
  console.log("✅ Buffers chargés :", buffers);
  return buffers;
}

// Fonction pour charger un buffer
async function loadBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

function changeBuffer(buffers, index) {
  if (buffers[index]) {
      currentBuffer = buffers[index][1];
      duration = currentBuffer.duration;
  } else {
      console.warn(`❌ Buffer ${index} non trouvé`);
  }
}

async function setupAudio(){
    init_audio();
    granularBuffers = await loadMultipleBuffers(["MetalTin57.mp3", "MetalTin104.mp3", "MetalTin105.mp3", "MetalTin110-2.mp3", "MetalTin106.mp3", "SpringMic3.mp3", "SpringMic4.mp3", 
      "SpringMic1.mp3", "foret_percs.mp3", "crepitement.02.mp3", "Bubbles5.mp3", "strings.mp3", "bells.mp3", "AMB_MER_TOULON.mp3", "BakedBeans4.mp3", "DeepNoisySlime.mp3",
      "granulatormix_visqueux1.mp3", "amb.mp3", "granulatormix_visqueux3.mp3", "granulatormix_visqueux2.mp3"
    ]);
    changeBuffer(granularBuffers, 17);
    viscousBuffers = await loadMultipleBuffers(["viscous_comp_1.wav", "viscous_comp_2.wav", "viscous_comp_3_1.aiff", "viscous_comp_3_2.aiff", "viscous_comp_4.wav", "viscous_GMU_1.aiff", 
      "viscous_GMU_2.aiff"
    ]);
    playViscous(viscousBuffers);
    await audioCtx.audioWorklet.addModule('./code/public/js/trigger.js');
    triggerNode = new TriggerNode(audioCtx);
}

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
    viscousmain = audioCtx.createGain();
    viscousmain.gain.value = 0;
    stiffmain = audioCtx.createGain();
    stiffmain.gain.value = 0;

    viscousmain.connect(main);
    stiffmain.connect(main);
    main.connect(audioCtx.destination);
};

function playViscous(buffers){
  for(let i=0; i<buffers.length; i++){
    let smp = audioCtx.createBufferSource();
    smp.buffer = buffers[i][1];
    smp.loop = true;
    smp.connect(viscousmain);
    smp.start();
  }
}

function startGranular(){
  main.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
}

function stopGranular(){
  main.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
}

// document.getElementById("bufferSelector").addEventListener("change", (e) => {
//   changeBuffer(e.target.value);
//   duration = parseInt(currentBuffer.duration);
// });