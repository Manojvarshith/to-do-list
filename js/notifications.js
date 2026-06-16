

export class NotificationManager {
    constructor() {
        this.permissionGranted = false;
        this.audioContext = null;
        this.alarmInterval = null;
        
        this.initNotificationPermission();
    }

    initNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.permissionGranted = true;
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    this.permissionGranted = (permission === 'granted');
                });
            }
        }
    }

    requestPermissionExplicit() {
        if ('Notification' in window) {
            return Notification.requestPermission().then(permission => {
                this.permissionGranted = (permission === 'granted');
                return this.permissionGranted;
            });
        }
        return Promise.resolve(false);
    }

    sendNotification(title, body) {
        if (this.permissionGranted) {
            try {
                new Notification(title, {
                    body: body,
                    icon: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/square-check.svg'
                });
            } catch (e) {
                console.warn('Browser Notification construction failed:', e);
            }
        }
    }

    
    playAlarmSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.audioContext = new AudioContext();

            let beepCount = 0;
            this.alarmInterval = setInterval(() => {
                if (beepCount >= 6) {
                    this.stopAlarmSound();
                    return;
                }
                this.triggerSynthBeep();
                beepCount++;
            }, 1000);

        } catch (e) {
            console.error('Alarm audio synthesis failed:', e);
        }
    }

    triggerSynthBeep() {
        if (!this.audioContext) return;
        const now = this.audioContext.currentTime;
        
        
        const notes = [587.33, 880.00]; 
        notes.forEach((freq, idx) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.25);
        });
    }

    stopAlarmSound() {
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    
    startReminderCheckLoop(getTasksCallback, triggerReminderUIPopupCallback) {
        
        setInterval(() => {
            const tasks = getTasksCallback();
            const now = new Date();
            
            
            const offset = now.getTimezoneOffset();
            const localDate = new Date(now.getTime() - (offset * 60 * 1000));
            const currentDateStr = localDate.toISOString().split('T')[0];
            
            
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMins = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMins}`;

            tasks.forEach(task => {
                if (task.completed || !task.dueDate || !task.dueTime) return;
                
                
                if (task.dueDate === currentDateStr && task.dueTime === currentTimeStr) {
                    
                    if (!task.lastReminderTriggered || (Date.now() - task.lastReminderTriggered > 60000)) {
                        task.lastReminderTriggered = Date.now();
                        
                        
                        this.sendNotification(`Task Reminder: ${task.title}`, `Priority: ${task.priority.toUpperCase()}`);
                        this.playAlarmSound();
                        
                        
                        triggerReminderUIPopupCallback(task);
                    }
                }
            });
        }, 20000);
    }
}
