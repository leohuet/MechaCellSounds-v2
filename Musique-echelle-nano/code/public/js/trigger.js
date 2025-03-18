const rndforfreq = () => (Math.random() * 2 - 1) * 0.5;

class TriggerProcess extends AudioWorkletProcessor {

    static get parameterDescriptors() {
        return [
            { name: "grainSize", defaultValue: 0.1, minValue: 0.01, maxValue: 0.5 },
            { name: "pitch", defaultValue: 1.0, minValue: 0.5, maxValue: 2.0 },
            { name: "density", defaultValue: 100, minValue: 10, maxValue: 500 }
        ];
    }

    constructor() {
        super();
        this._lastUpdate = currentTime;
        this._frequency = 15;

        this.port.onmessage = (event) => {
            this._frequency = event.data;
            console.log(`[TriggerProcess:onmessage] frequency: ${this._frequency}`);
        };
    }

    process(){
        let interval = (1 / (this._frequency)) * (1+rndforfreq());
        if (interval <= 0.01) interval = 0.01;
        // Post a message to the node for every 1/100 second.
        if (currentTime - this._lastUpdate > interval) {
            this.port.postMessage(true); // something has to be sent
            this._lastUpdate = currentTime;
        }
        return true;
    }

}

registerProcessor('trigger', TriggerProcess);