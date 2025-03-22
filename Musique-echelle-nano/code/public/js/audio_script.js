let head=0, pos=0, freq=15, old_freq = 1, grainSize = 0.01, pitch = 1, soundFile = 17;
let transpose = true;
let c,w,h;
const rnd2 = () => Math.random() * 2 - 1;
const choose = (array) => array[Math.floor(Math.random()*array.length)]
let triggerNode = null;
let audioCtx, main, granularmain, viscousmain, stiffmain, snd, duration, stutterGain;

let granularBuffers = {};
let viscousBuffers = {};
let stiffBuffers = {};
let elasticBuffers = {};
let viscousMix = {};
let currentBuffer = null;
let mixedBufferSource;

let fromAudioProcessValues = {};

const viscousPans = [-1, 1, -0.9, 0.9, 0, -1, 1];


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
  fromAudioProcessValues = values;
  if(values.touch == 1){
    soundFile = values.soundFile;
    changeBuffer(granularBuffers, soundFile);
    freq = values.frequency;
    grainSize = values.grainSize;
    transpose = values.transpose;
    if (freq != old_freq) {
        old_freq = freq;
        triggerNode.port.postMessage(freq);
    }
    handleViscousLevels(values);
    if(values.stiffnessOnOff) stiffmain.gain.linearRampToValueAtTime(values.stiffness, audioCtx.currentTime + 0.1);
    else stiffmain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
  }
  else if(values.touch == 0){
    const startFrequency = toAudioProcessValues.frequency;
    const duration = values.viscosity*1000;
    const steps = 100;
    const increment = (0 - startFrequency) / steps;
    const interval = duration / steps;

    let currentStep = 0;

    const intervalId = setInterval(() => {
        if (currentStep < steps) {
            freq = startFrequency + increment * currentStep;
            triggerNode.port.postMessage(freq);
            currentStep++;
        } else {
            clearInterval(intervalId);
        }
    }, interval);
  }
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

function mixAudioBuffers(buffers) {
  if (buffers.length === 0) return null;

  let sampleRate = audioCtx.sampleRate;
  let duration = 32; // Durée en secondes du stutter mixé
  let numChannels = 1;

  // Création du buffer final
  let mixedBuffer = audioCtx.createBuffer(numChannels, sampleRate * duration, sampleRate);
  
  for (let channel = 0; channel < numChannels; channel++) {
      let mixedData = mixedBuffer.getChannelData(channel);
      buffers.forEach(buffer => {
          let bufferData = buffer[1].getChannelData(channel);
          for (let i = 0; i < duration*48000; i++) {
              if (i < mixedData.length && i < bufferData.length) {
                  mixedData[i] += bufferData[i] * 0.5; // Mix avec un gain réduit
              }
          }
      });
  }
  
  return mixedBuffer;
}

async function setupAudio(){
    init_audio();
    granularBuffers = await loadMultipleBuffers(["MetalTin57.mp3", "MetalTin104.mp3", "MetalTin105.mp3", "MetalTin110-2.mp3", "MetalTin106.mp3", "SpringMic3.mp3", "SpringMic4.mp3", 
      "SpringMic1.mp3", "foret_percs.mp3", "crepitement.02.mp3", "Bubbles5.mp3", "strings.mp3", "bells.mp3", "AMB_MER_TOULON.mp3", "BakedBeans4.mp3", "DeepNoisySlime.mp3",
      "granulatormix_visqueux1.mp3", "amb.mp3", "granulatormix_visqueux3.mp3", "granulatormix_visqueux2.mp3"
    ]);
    changeBuffer(granularBuffers, 17);
    viscousBuffers = await loadMultipleBuffers(["viscous_comp_1.wav", "viscous_comp_2.wav", "viscous_comp_3_1.wav", "viscous_comp_3_2.wav", "viscous_comp_4.wav", "viscous_GMU_1.wav", 
      "viscous_GMU_2.wav"
    ]);
    viscousMix = mixAudioBuffers(viscousBuffers);
    addViscousGains();
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
    panner.connect(granularmain);
    smp.start(now, pos);
    smp.stop(now + 5);
};

const init_audio = () => {
    AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext({ latencyHint: 'balanced' });
    main = audioCtx.createGain();
    main.gain.value = 1;
    granularmain = audioCtx.createGain();
    granularmain.gain.value = 0;
    viscousmain = audioCtx.createGain();
    viscousmain.gain.value = 0;
    stiffmain = audioCtx.createGain();
    stiffmain.gain.value = 0;

    granularmain.connect(main);
    viscousmain.connect(main);
    stiffmain.connect(main);
    main.connect(audioCtx.destination);
};

function addViscousGains(){
  for(let i=0; i<viscousBuffers.length; i++){
    let gain = audioCtx.createGain();
    let panner = audioCtx.createStereoPanner();
    panner.pan.value = viscousPans[i];
    gain.gain.value = 0;
    viscousBuffers[i].push(gain);
    viscousBuffers[i].push(panner);
    viscousBuffers[i][2].connect(viscousBuffers[i][3]);
    viscousBuffers[i][3].connect(viscousmain);
  }
  console.log(viscousBuffers);
}

function playViscous(buffers){
  mixedBufferSource = audioCtx.createBufferSource();
  mixedBufferSource.buffer = viscousMix;
  mixedBufferSource.loop = true;
  mixedBufferSource.loopStart = 0;
  mixedBufferSource.loopEnd = 32;
  stutterGain = audioCtx.createGain();
  stutterGain.gain.value = 0;
  mixedBufferSource.connect(stutterGain);
  stutterGain.connect(viscousmain);
  mixedBufferSource.start();
  for(let i=0; i<buffers.length; i++){
    let smp = audioCtx.createBufferSource();
    smp.buffer = buffers[i][1];
    smp.loop = true;
    smp.connect(buffers[i][2]);
    smp.start();
  }
}

function handleViscousLevels(values){
  if(values.stiffnessOnOff){
    for(let i=0; i<viscousBuffers.length; i++){
      viscousBuffers[i][2].gain.linearRampToValueAtTime(values.viscosity, audioCtx.currentTime + 0.1);
    }
    stutterGain.gain.value = 0;
  }
  else{
    mixedBufferSource.playbackRate.value = values.viscosity*3+0.2;
    const stutterGainValue = values.viscosity*-1+1;
    stutterGain.gain.linearRampToValueAtTime(stutterGainValue, audioCtx.currentTime + 0.1);
    for(let i=0; i<viscousBuffers.length; i++){
      viscousBuffers[i][2].gain.linearRampToValueAtTime(values.viscosity, audioCtx.currentTime + 0.1);
    }
  }

  for(let i=0; i<viscousBuffers.length; i++){
    viscousBuffers[i][3].pan.linearRampToValueAtTime(viscousBuffers[i][3].pan.value + values.viscosity*rnd2(), audioCtx.currentTime + 0.1);
  }
}

function startGranular(){
  if(fromAudioProcessValues.viscosityOnOff) viscousmain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
  else if(!fromAudioProcessValues.viscosityOnOff) viscousmain.gain.value = 0;
  // granularmain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
}

function stopGranular(){
  if(fromAudioProcessValues.viscosityOnOff) viscousmain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
  else if(!fromAudioProcessValues.viscosityOnOff) viscousmain.gain.value = 0;
  // granularmain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
}

// document.getElementById("bufferSelector").addEventListener("change", (e) => {
//   changeBuffer(e.target.value);
//   duration = parseInt(currentBuffer.duration);
// });