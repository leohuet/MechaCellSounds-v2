let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gainNode = audioContext.createGain();
let source;
let buffer;

async function loadAudio() {
    let response = await fetch('media/AMB_MER_TOULON.WAV'); // Remplacez par le chemin de votre fichier audio
    let arrayBuffer = await response.arrayBuffer();
    buffer = await audioContext.decodeAudioData(arrayBuffer);
}

loadAudio();

async function playAudio() {
    if (!audioContext) {
        await loadAudio();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
}

function changeVolume(value) {
    if (gainNode) {
        let volume = parseFloat(value);
        let now = audioContext.currentTime;
        gainNode.gain.setTargetAtTime(volume, now, 0.1); // Applique un lissage progressif
    }
}