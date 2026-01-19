class GameAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        // Triad frequencies for nice sounds
        this.cMajor = [523.25, 659.25, 783.99]; 
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    playTone(freq, type = 'sine', duration = 0.1, vol = 0.5) {
        if (this.isMuted || !this.ctx) return;
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

    playSelect() {
        // High pitched short blip
        this.playTone(880, 'sine', 0.1, 0.3);
    }

    playMatch() {
        // Nice chord
        this.cMajor.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq * 2, 'sine', 0.3, 0.4); // Higher octave
            }, i * 50);
        });
    }

    playError() {
        // Low buzzing sound
        this.playTone(150, 'sawtooth', 0.2, 0.3);
    }

    playClear() {
        // Run up scale
        [261, 329, 392, 523, 659, 783, 1046].forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 'square', 0.1, 0.2);
            }, i * 60);
        });
    }
}
