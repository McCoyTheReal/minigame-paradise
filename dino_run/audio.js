class GameAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
    }

    jump() {
        this.playTone(600, 'square', 0.1);
    }

    die() {
        this.playTone(100, 'sawtooth', 0.5);
    }

    score() {
        this.playTone(1000, 'sine', 0.1);
        setTimeout(() => this.playTone(1500, 'sine', 0.1), 100);
    }
}
