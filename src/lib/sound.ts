export const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    if (!w.audioCtx) {
        const AudioContextClass = w.AudioContext || w.webkitAudioContext;
        if (AudioContextClass) {
            w.audioCtx = new AudioContextClass();
        }
    }
    return w.audioCtx;
};

export const isSoundEnabled = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('suneung1_sound') !== 'off';
};

export const toggleSound = () => {
    if (typeof window === 'undefined') return true;
    const current = isSoundEnabled();
    localStorage.setItem('suneung1_sound', current ? 'off' : 'on');
    return !current;
};

export const playSchoolBell = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const seq = [
                { f: 523.25, t: 0, d: 0.8 }, // C5
                { f: 659.25, t: 1.0, d: 0.8 }, // E5
                { f: 587.33, t: 2.0, d: 0.8 }, // D5
                { f: 392.00, t: 3.0, d: 1.5 }, // G4
                { f: 659.25, t: 4.5, d: 0.8 }, // E5
                { f: 587.33, t: 5.5, d: 0.8 }, // D5
                { f: 523.25, t: 6.5, d: 1.5 }, // C5
            ];
            seq.forEach(({ f, t, d }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = f;
                gain.gain.setValueAtTime(0, ctx.currentTime + t);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + d);
                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + d);
            });
        }
    } catch (e) { }
};

export const playLevelUp = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = f;
                const t = ctx.currentTime + i * 0.1;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
            });
        }
    } catch (e) { }
};

export const playCorrect = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) { }
};

export const playWrong = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch (e) { }
};

// Tick sound for countdown (soft metronome click)
export const playTick = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            // Short noise burst for a "tick" effect
            const bufferSize = ctx.sampleRate * 0.03; // 30ms
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            // Bandpass filter to make it sound like a clock
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 3000;
            filter.Q.value = 2;
            const gain = ctx.createGain();
            gain.gain.value = 0.08;
            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            source.start(ctx.currentTime);
        }
    } catch (e) { }
};

// Time gain sound (bright ascending ding)
export const playTimeGain = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            const freqs = [880, 1108.73, 1318.51]; // A5 C#6 E6 — bright major arpeggio
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = f;
                const t = ctx.currentTime + i * 0.06;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
            });
        }
    } catch (e) { }
};

// Time loss sound (alarm buzzer — descending dissonant tone)
export const playTimeLoss = () => {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume();
            // Two detuned oscillators for a harsh buzz
            [200, 207].forEach(f => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(f * 0.6, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            });
        }
    } catch (e) { }
};
