class GameAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, type, duration, vol = 0.5) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
    }

    playInput() {
        this.playTone(800, 'sine', 0.05, 0.2);
    }

    playStrike() {
        // Sharp high pitch
        this.playTone(1200, 'square', 0.1, 0.3);
    }

    playBall() {
        // Mellow mid pitch
        this.playTone(600, 'triangle', 0.1, 0.3);
    }

    playOut() {
        // Low buzz
        this.playTone(150, 'sawtooth', 0.3, 0.4);
    }

    playWin() {
        // Fanfare
        const now = this.ctx.currentTime;
        [523, 659, 783, 1046].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.2, 0.3), i * 100);
        });
    }

    playLose() {
        // Sad trombone-ish
        [300, 250, 200, 150].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.3), i * 300);
        });
    }
}
