// AUDIO VARIABLES
let triggerNode = null;
let audioCtx, viscousStiffMain, main;
let currentBuffer = null;
let fromAudioProcessValues = {};

// GRANULAR VARIABLES
let head=0, pos=0, freq=15, old_freq = 1, grainSize = 0.01, pitch = 1, soundFile = 17;
let transpose = true;
let granularmain, duration;
let granularBuffers = {};

// VISCOUS VARIABLES
let viscousmain, stiffmain, stutterGain;
let viscousBuffers = {};
let viscousMix = {};
let mixedBufferSource;
const viscousPans = [-1, 1, -0.9, 0.9, 0, -1, 1];

// STIFF VARIABLES
let softGran, softGran2, stiffGran, stiffGran2;
let stiffGains = {};
let mainFilter, mainStiffFilter, mainStiffEcho, mainStiffReverb;
let dryGain, wetGain;
const stiffPans = [-1, 1, 0, -0.2, 0.2];
let stiffPaners = {};

// ELASTIC VARIABLES
let elasticmain;
let elasticBuffers = {};
let elasticChoice = 0;
let elasticGranularGain;
let elasticPans = [0, 0, 0, 0, 0, 0, 0, 0];
let delayNode;

let audio_url = "https://raw.githubusercontent.com/leohuet/MechaCellSounds-v2/main/media";

const rnd2 = () => Math.random() * 2 - 1;
const choose = (array) => array[Math.floor(Math.random()*array.length)]

function drunk(data, min, max, step){
  if (Math.random() > 0.5) value = data + step;
  else value = data - step;

  if (value > max) value = max;
  else if (value < min) value = min;
  return value;
}

async function createReverb() {
  let convolver = audioCtx.createConvolver();

  // load impulse response from file
  let response = await fetch("./media/IR.wav");
  let arraybuffer = await response.arrayBuffer();
  convolver.buffer = await audioCtx.decodeAudioData(arraybuffer);

  return convolver;
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
      rnd2()*0.1,
      0.1,
      grainSize,
      pitch,
    )
  }
}

async function changeGranularValues(values) {
  fromAudioProcessValues = values;
  // console.log(fromAudioProcessValues);
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
    handleStiffLevels(values);
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
      buffers[fileName] = await loadBuffer(`${audio_url}/${fileName}`);
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
    elasticBuffers = await loadMultipleBuffers(["Bubbles5.mp3", "impact_visqueux.mp3", "tree_rim.wav", "SpringMic1.mp3", "SpringMic2.mp3", "SpringMic3.mp3", "SpringMic4.mp3"]);
    viscousMix = mixAudioBuffers(viscousBuffers);
    addViscousGains();
    playViscous(viscousBuffers);
    playElastic(elasticBuffers);
    playStiff();
    await audioCtx.audioWorklet.addModule('js/trigger.js');
    console.log("✅ AudioWorklet chargé");
    notLoading();
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
    granularmain.gain.value = 1;
    viscousmain = audioCtx.createGain();
    viscousmain.gain.value = 1;
    stiffmain = audioCtx.createGain();
    stiffmain.gain.value = 1;
    elasticmain = audioCtx.createGain();
    elasticmain.gain.value = 0;
    viscousStiffMain = audioCtx.createGain();
    viscousStiffMain.gain.value = 0;

    mainFilter = audioCtx.createBiquadFilter();
    mainFilter.type = "lowpass";
    mainFilter.frequency.value = 20000;
    mainFilter.Q.value = 1;
    mainFilter.gain.value = 0;

    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.1;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.3;
    delayNode.connect(feedback);
    feedback.connect(delayNode);

    // granularmain.connect(main);
    viscousmain.connect(viscousStiffMain);
    stiffmain.connect(viscousStiffMain);
    viscousStiffMain.connect(mainFilter);
    mainFilter.connect(main);
    elasticmain.connect(delayNode);
    delayNode.connect(main);
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

async function playElastic(buffers){
  for(let i=0; i<elasticBuffers.length; i++){
    let gain = audioCtx.createGain();
    let panner = audioCtx.createStereoPanner();
    panner.pan.value = elasticPans[i];
    gain.gain.value = 1;
    elasticBuffers[i].push(gain);
    elasticBuffers[i].push(panner);
    elasticBuffers[i][2].connect(elasticBuffers[i][3]);
    elasticBuffers[i][3].connect(elasticmain);
  }
  console.log(elasticBuffers);
  elasticGranularGain = audioCtx.createGain();
  elasticGranularGain.gain.value = 0;
  granularmain.connect(elasticGranularGain);
  elasticGranularGain.connect(elasticmain);
}

async function playStiff(){
  mainStiffFilter = audioCtx.createBiquadFilter();
  mainStiffFilter.type = "lowpass";
  mainStiffFilter.frequency.value = 20000;

  mainStiffEcho = audioCtx.createDelay();
  mainStiffEcho.delayTime.value = 0.1;
  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.8;
  mainStiffEcho.connect(feedback);
  feedback.connect(mainStiffEcho);

  mainStiffReverb = await createReverb();

  dryGain = audioCtx.createGain();
  wetGain = audioCtx.createGain();
  dryGain.gain.value = 1;
  wetGain.gain.value = 0;

  for(let i=0; i<5; i++){
    stiffGains[i] = audioCtx.createGain();
    stiffGains[i].gain.value = 0;
    stiffPaners[i] = audioCtx.createStereoPanner();
    stiffPaners[i].pan.value = stiffPans[i];
    stiffGains[i].connect(stiffPaners[i]);
    stiffPaners[i].connect(mainStiffEcho);
    stiffPaners[i].connect(dryGain);
  }

  mainStiffEcho.connect(mainStiffReverb);
  mainStiffReverb.connect(wetGain);
  wetGain.connect(mainStiffFilter);
  dryGain.connect(mainStiffFilter);
  mainStiffFilter.connect(stiffmain);

  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // Valeurs entre -1 et 1 (bruit blanc)
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseSource.start();

  softGran = audioCtx.createBiquadFilter();
  softGran.type = "bandpass";
  softGran.frequency.value = 800;
  softGran.Q.value = 30;
  softGran.gain.value = 5;
  granularmain.connect(softGran);
  softGran.connect(stiffGains[0]);

  const gainNode1 = audioCtx.createGain();
  gainNode1.gain.value = 0.5;
  noiseSource.connect(gainNode1.gain);
  softGran2 = audioCtx.createBiquadFilter();
  softGran2.type = "bandpass";
  softGran2.frequency.value = 800;
  softGran2.Q.value = 30;
  softGran2.gain.value = 5;
  granularmain.connect(softGran2);
  softGran2.connect(gainNode1);
  gainNode1.connect(stiffGains[1]);

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5;
  noiseSource.connect(gainNode.gain);
  granularmain.connect(gainNode);
  gainNode.connect(stiffGains[2]);

  granularmain.connect(stiffGains[4]);
}

function handleViscousLevels(values){
  if(values.viscosityOnOff) viscousmain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
  else viscousmain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
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

function handleElasticLevels(values){
  elasticGranularGain.gain.value = 0;
  let randomLaunch = Math.floor(values.stiffness*5+rnd2()*2);
  if(randomLaunch < 0) randomLaunch = 0;
  if(randomLaunch > 6) randomLaunch = 6;
  let smp2 = audioCtx.createBufferSource();
  smp2.buffer = elasticBuffers[randomLaunch][1];
  smp2.loop = false;
  smp2.connect(elasticBuffers[randomLaunch][2]);
  if(randomLaunch >= 3 && Math.random() > 0.5){
    smp2.start();
  }
  else if(randomLaunch < 3){
    smp2.start();
  }
  elasticmain.gain.linearRampToValueAtTime(values.elasticity*0.1, audioCtx.currentTime + 0.1);
}

function handleStiffLevels(values){
  if(values.stiffnessOnOff) stiffmain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);
  else stiffmain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
  softGran.frequency.value = drunk(softGran.frequency.value, 600, 900, 50);
  stiffGains[0].gain.linearRampToValueAtTime((1-values.stiffness)*10, audioCtx.currentTime + 0.1);
  stiffGains[1].gain.linearRampToValueAtTime((1-values.stiffness)*10, audioCtx.currentTime + 0.1);
  let stiffLevel = (values.stiffness-0.3 < 0 ? 0 : values.stiffness-0.3).toFixed(3);
  stiffGains[2].gain.linearRampToValueAtTime(stiffLevel*1.5, audioCtx.currentTime + 0.1);
  stiffGains[4].gain.linearRampToValueAtTime(values.stiffness, audioCtx.currentTime + 0.1);
  mainStiffFilter.frequency.linearRampToValueAtTime((values.stiffness-0.25)*20000, audioCtx.currentTime + 0.1);
  wetGain.gain.linearRampToValueAtTime(values.viscosity, audioCtx.currentTime + 0.01);
  dryGain.gain.linearRampToValueAtTime(1-values.viscosity, audioCtx.currentTime + 0.01);
}

async function startGranular(){
  viscousStiffMain.gain.cancelScheduledValues(audioCtx.currentTime);
  const sampleRate = 100;
  const curve = new Float32Array(sampleRate);
  mainFilter.frequency.value = 20000;
  fromAudioProcessValues = await getAudioProcessValues();
  for (let i = 0; i < sampleRate; i++) {
    let x = (i / (sampleRate - 1.0)).toFixed(3);
    curve[i] = Math.pow(x, fromAudioProcessValues.viscosity);
  }
  viscousStiffMain.gain.setValueCurveAtTime(curve, audioCtx.currentTime, 1);
}

async function stopGranular(){
  handleElasticLevels(fromAudioProcessValues);
  viscousStiffMain.gain.cancelScheduledValues(audioCtx.currentTime);
  const sampleRate = 100;
  const curve = new Float32Array(sampleRate);
  for (let i = 0; i < sampleRate; i++) {
    let x = i / (sampleRate*0.1 - 1);
    curve[i] = Math.pow(Math.E, -x * (1-(fromAudioProcessValues.viscosity*1.7-1)));
    curve[i] = curve[i] > 1.0 ? 1.0 : curve[i];
    curve[i] = curve[i] < 0.05 ? 0.0 : curve[i];
  }
  viscousStiffMain.gain.setValueCurveAtTime(curve, audioCtx.currentTime, 2);

  mainFilter.frequency.linearRampToValueAtTime(fromAudioProcessValues.viscosity*-18000+20000, audioCtx.currentTime + 0.1);

}

// document.getElementById("bufferSelector").addEventListener("change", (e) => {
//   changeBuffer(e.target.value);
//   duration = parseInt(currentBuffer.duration);
// });