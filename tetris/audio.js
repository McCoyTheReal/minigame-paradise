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

    move() {
        this.play(150, 'square', 0.05, 0.05);
    }

    rotate() {
        this.play(300, 'sine', 0.1);
    }

    drop() {
        this.play(100, 'sawtooth', 0.2);
    }

    clear(lines) {
        const baseFreq = 400 + (lines * 100);
        this.play(baseFreq, 'triangle', 0.3, 0.2);
        if (lines >= 4) { // Tetris!
            setTimeout(() => this.play(baseFreq * 1.5, 'triangle', 0.4, 0.2), 100);
        }
    }

    gameOver() {
        this.play(300, 'sawtooth', 0.5);
        this.play(200, 'sawtooth', 0.5);
        this.play(100, 'sawtooth', 1.0);
    }
}
