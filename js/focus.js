

export class FocusManager {
    constructor(gamificationManager) {
        this.gamificationManager = gamificationManager;
        
        
        this.durations = {
            work: 25,
            short: 5,
            long: 15
        };
        
        this.currentMode = 'work'; 
        this.timeLeft = this.durations.work * 60; 
        this.timerInterval = null;
        this.isRunning = false;
        
        
        this.onTickCallback = null;
        this.onCompleteCallback = null;

        
        this.audioContext = null;
        this.noiseSource = null;
        this.noiseGain = null;
        this.lfoNode = null;
        this.activeNoiseType = 'none'; 
    }

    setMode(mode) {
        this.stop();
        this.currentMode = mode;
        this.timeLeft = this.durations[mode] * 60;
        this.triggerTick();
    }

    setCustomDuration(workMin, shortMin, longMin) {
        this.durations.work = parseInt(workMin) || 25;
        this.durations.short = parseInt(shortMin) || 5;
        this.durations.long = parseInt(longMin) || 15;
        
        this.timeLeft = this.durations[this.currentMode] * 60;
        this.triggerTick();
    }

    start(onTick, onComplete) {
        if (this.isRunning) return;
        
        this.onTickCallback = onTick;
        this.onCompleteCallback = onComplete;
        this.isRunning = true;
        
        this.endTime = Date.now() + this.timeLeft * 1000;
        
        this.timerInterval = setInterval(() => {
            const now = Date.now();
            this.timeLeft = Math.max(0, Math.ceil((this.endTime - now) / 1000));
            this.triggerTick();
            
            if (this.timeLeft <= 0) {
                this.handleTimeUp();
            }
        }, 1000);
    }

    stop() {
        if (!this.isRunning) return;
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isRunning = false;
    }

    reset() {
        this.stop();
        this.timeLeft = this.durations[this.currentMode] * 60;
        this.triggerTick();
    }

    triggerTick() {
        const totalSec = this.durations[this.currentMode] * 60;
        const percent = Math.max(0, Math.min(100, ((totalSec - this.timeLeft) / totalSec) * 100));
        
        if (this.onTickCallback) {
            this.onTickCallback({
                minutes: Math.floor(this.timeLeft / 60),
                seconds: this.timeLeft % 60,
                percentage: percent,
                mode: this.currentMode
            });
        }
    }

    handleTimeUp() {
        this.stop();
        this.playCompletionAlarm();

        if (this.currentMode === 'work') {
            
            this.gamificationManager.addXp(50, 'Completed Pomodoro Work Session!');
            this.gamificationManager.checkAndUnlockBadge('pomodoro_1');
        }

        if (this.onCompleteCallback) {
            this.onCompleteCallback(this.currentMode);
        }
    }

    playCompletionAlarm() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            
            
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, now + idx * 0.15);
                gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(now + idx * 0.15);
                osc.stop(now + idx * 0.15 + 0.5);
            });
        } catch (e) {
            console.error('Focus completion sound failed:', e);
        }
    }

    
    
    
    startAmbientNoise(type) {
        this.stopAmbientNoise();
        if (type === 'none') return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.noiseGain = this.audioContext.createGain();
            this.noiseGain.gain.value = 0.08; 

            const sampleRate = this.audioContext.sampleRate;
            const bufferSize = 2 * sampleRate;
            const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            this.noiseSource = this.audioContext.createBufferSource();
            this.noiseSource.buffer = noiseBuffer;
            this.noiseSource.loop = true;

            const filter = this.audioContext.createBiquadFilter();

            if (type === 'white') {
                
                filter.type = 'lowpass';
                filter.frequency.value = 1500;
                
                this.noiseSource.connect(filter);
                filter.connect(this.noiseGain);
            } 
            else if (type === 'waves') {
                
                filter.type = 'lowpass';
                filter.frequency.value = 400;
                filter.Q.value = 1.0;

                this.lfoNode = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                
                this.lfoNode.frequency.value = 0.08; 
                lfoGain.gain.value = 250; 

                this.lfoNode.connect(lfoGain);
                lfoGain.connect(filter.frequency);
                
                this.noiseSource.connect(filter);
                filter.connect(this.noiseGain);
                this.lfoNode.start();
            } 
            else if (type === 'rain') {
                
                filter.type = 'bandpass';
                filter.frequency.value = 800;
                filter.Q.value = 0.6;

                
                this.lfoNode = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                this.lfoNode.frequency.value = 0.15;
                lfoGain.gain.value = 150;
                this.lfoNode.connect(lfoGain);
                lfoGain.connect(filter.frequency);

                this.noiseSource.connect(filter);
                filter.connect(this.noiseGain);
                this.lfoNode.start();
            }

            this.noiseGain.connect(this.audioContext.destination);
            this.noiseSource.start();
            this.activeNoiseType = type;

        } catch (e) {
            console.error('Ambient synthesis error:', e);
        }
    }

    setAmbientVolume(volume) {
        if (this.noiseGain && this.audioContext) {
            this.noiseGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    stopAmbientNoise() {
        if (this.noiseSource) {
            try { this.noiseSource.stop(); } catch(e){}
            this.noiseSource.disconnect();
            this.noiseSource = null;
        }
        if (this.lfoNode) {
            try { this.lfoNode.stop(); } catch(e){}
            this.lfoNode.disconnect();
            this.lfoNode = null;
        }
        if (this.noiseGain) {
            this.noiseGain.disconnect();
            this.noiseGain = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.activeNoiseType = 'none';
    }
}
