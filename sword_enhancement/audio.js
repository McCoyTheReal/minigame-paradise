class GameAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    play(freq, type, duration, vol = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    enhance() {
        this.play(200, 'square', 0.1);
        setTimeout(() => this.play(300, 'square', 0.1), 100);
    }

    success() {
        this.play(400, 'triangle', 0.2);
        setTimeout(() => this.play(800, 'triangle', 0.4, 0.2), 100);
    }

    fail() {
        this.play(200, 'sawtooth', 0.5);
        this.play(100, 'sawtooth', 0.5);
    }

    destroy() {
        this.play(80, 'sawtooth', 0.8, 0.3);
        // White noise like glass breaking
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        whiteNoise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        whiteNoise.start();
    }

    money() {
        this.play(880, 'sine', 0.1);
        setTimeout(() => this.play(1046, 'sine', 0.2), 50);
    }
}
