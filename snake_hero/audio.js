class GameAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    play(freq, type, duration, vol = 0.1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
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

    eat() {
        this.play(600 + Math.random() * 200, 'sine', 0.1, 0.05);
    }

    boost() {
        // Low hum
        this.play(100, 'triangle', 0.05, 0.02);
    }

    die() {
        this.play(200, 'sawtooth', 0.5, 0.2);
        this.play(100, 'sawtooth', 0.5, 0.2);
    }

    start() {
        this.play(440, 'triangle', 0.2);
        setTimeout(() => this.play(880, 'triangle', 0.4), 100);
    }
}
