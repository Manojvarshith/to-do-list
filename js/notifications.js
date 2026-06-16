/**
 * TaskFlow Notifications & Reminders Module
 * Manages browser push alerts, synthesized notification alarms, and snooze intervals.
 */

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

    // Synthesizes a pleasant repetitive reminder alarm using Web Audio API
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
        
        // Gentle double-tone
        const notes = [587.33, 880.00]; // D5, A5
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

    // Starts a clock ticking checker loop to detect matching task dates and times
    startReminderCheckLoop(getTasksCallback, triggerReminderUIPopupCallback) {
        // Set loop running every 20 seconds
        setInterval(() => {
            const tasks = getTasksCallback();
            const now = new Date();
            
            // Format today's local date string YYYY-MM-DD (timezone-safe)
            const offset = now.getTimezoneOffset();
            const localDate = new Date(now.getTime() - (offset * 60 * 1000));
            const currentDateStr = localDate.toISOString().split('T')[0];
            
            // Format current hours/minutes (HH:MM)
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMins = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMins}`;

            tasks.forEach(task => {
                if (task.completed || !task.dueDate || !task.dueTime) return;
                
                // Compare date and time (ignoring seconds)
                if (task.dueDate === currentDateStr && task.dueTime === currentTimeStr) {
                    // Check if it hasn't been triggered in the last 60 seconds (prevent multiple alerts in same minute)
                    if (!task.lastReminderTriggered || (Date.now() - task.lastReminderTriggered > 60000)) {
                        task.lastReminderTriggered = Date.now();
                        
                        // Execute Notification triggers
                        this.sendNotification(`Task Reminder: ${task.title}`, `Priority: ${task.priority.toUpperCase()}`);
                        this.playAlarmSound();
                        
                        // Callback to display Snooze/Dismiss UI popup in main page
                        triggerReminderUIPopupCallback(task);
                    }
                }
            });
        }, 20000);
    }
}
