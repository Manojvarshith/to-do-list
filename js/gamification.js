

import { saveGamification } from './storage.js';

export const BADGES = [
    { id: 'first_task', name: 'First Steps', desc: 'Complete your first task', icon: 'fa-shoe-prints', xp: 100 },
    { id: 'tasks_10', name: 'Task Master', desc: 'Complete 10 tasks in total', icon: 'fa-award', xp: 200 },
    { id: 'streak_3', name: 'Habitual', desc: 'Achieve a 3-day habit streak', icon: 'fa-fire', xp: 150 },
    { id: 'streak_7', name: 'Unstoppable', desc: 'Achieve a 7-day habit streak', icon: 'fa-bolt', xp: 300 },
    { id: 'pomodoro_1', name: 'Deep Focus', desc: 'Complete your first Pomodoro session', icon: 'fa-brain', xp: 100 },
    { id: 'score_95', name: 'Overachiever', desc: 'Achieve a productivity score of 95+', icon: 'fa-star', xp: 250 },
    { id: 'critical_task', name: 'Firefighter', desc: 'Complete a Critical priority task', icon: 'fa-fire-extinguisher', xp: 150 },
    { id: 'night_owl', name: 'Night Owl', desc: 'Complete a task between 10 PM and 4 AM', icon: 'fa-owl', xp: 100 }
];

export class GamificationManager {
    constructor(state, onStateUpdate) {
        this.xp = state.xp;
        this.level = state.level;
        this.unlockedBadges = state.unlockedBadges;
        this.onStateUpdate = onStateUpdate; 
    }

    getXpForNextLevel() {
        return this.level * 150;
    }

    addXp(amount, reason = '') {
        this.xp += amount;
        let leveledUp = false;

        while (this.xp >= this.getXpForNextLevel()) {
            this.xp -= this.getXpForNextLevel();
            this.level += 1;
            leveledUp = true;
        }

        saveGamification(this.xp, this.level, this.unlockedBadges);
        this.onStateUpdate({ xp: this.xp, level: this.level, unlockedBadges: this.unlockedBadges });

        if (leveledUp) {
            this.showLevelUpToast();
        }
        
        if (reason) {
            this.showXpToast(amount, reason);
        }
    }

    checkAndUnlockBadge(badgeId) {
        if (this.unlockedBadges.includes(badgeId)) return;
        
        const badge = BADGES.find(b => b.id === badgeId);
        if (!badge) return;

        this.unlockedBadges.push(badgeId);
        saveGamification(this.xp, this.level, this.unlockedBadges);
        this.onStateUpdate({ xp: this.xp, level: this.level, unlockedBadges: this.unlockedBadges });

        this.showBadgeUnlockToast(badge);
        
        setTimeout(() => this.addXp(badge.xp, `Badge Unlock: ${badge.name}`), 1000);
    }

    showXpToast(amount, reason) {
        const toast = document.createElement('div');
        toast.className = 'xp-toast';
        toast.innerHTML = `
            <span class="xp-val">+${amount} XP</span>
            <span class="xp-reason">${reason}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('slide-out-fade');
            toast.addEventListener('animationend', () => toast.remove());
        }, 2500);
    }

    showLevelUpToast() {
        const toast = document.createElement('div');
        toast.className = 'level-up-toast';
        toast.innerHTML = `
            <div class="lvl-icon"><i class="fa-solid fa-up-long"></i></div>
            <div class="lvl-info">
                <h3>LEVEL UP!</h3>
                <p>You reached Level ${this.level}</p>
            </div>
        `;
        document.body.appendChild(toast);
        this.playSynthesizedJingle('levelup');
        createCelebrationParticles();
        setTimeout(() => {
            toast.classList.add('slide-out-fade');
            toast.addEventListener('animationend', () => toast.remove());
        }, 4000);
    }

    showBadgeUnlockToast(badge) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `
            <div class="badge-icon-wrap"><i class="fa-solid ${badge.icon}"></i></div>
            <div class="badge-info">
                <h3>ACHIEVEMENT UNLOCKED!</h3>
                <h4>${badge.name}</h4>
                <p>${badge.desc}</p>
            </div>
        `;
        document.body.appendChild(toast);
        this.playSynthesizedJingle('badge');
        createCelebrationParticles();
        setTimeout(() => {
            toast.classList.add('slide-out-fade');
            toast.addEventListener('animationend', () => toast.remove());
        }, 5000);
    }

    
    playSynthesizedJingle(type) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const now = ctx.currentTime;
            
            if (type === 'levelup') {
                
                const notes = [261.63, 329.63, 392.00, 523.25]; 
                notes.forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    
                    gain.gain.setValueAtTime(0, now + index * 0.12);
                    gain.gain.linearRampToValueAtTime(0.15, now + index * 0.12 + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.4);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.start(now + index * 0.12);
                    osc.stop(now + index * 0.12 + 0.4);
                });
            } else if (type === 'badge') {
                
                const notes = [523.25, 659.25, 783.99, 987.77, 1046.50]; 
                notes.forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    
                    gain.gain.setValueAtTime(0, now + index * 0.08);
                    gain.gain.linearRampToValueAtTime(0.1, now + index * 0.08 + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.start(now + index * 0.08);
                    osc.stop(now + index * 0.08 + 0.3);
                });
            }
        } catch (e) {
            console.error('Audio synthesis failed:', e);
        }
    }
}


function createCelebrationParticles() {
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }
    const particleCount = 60;
    const colors = ['#6366f1', '#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#a855f7'];
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'celebration-particle';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        
        if (Math.random() > 0.5) {
            particle.style.borderRadius = '0';
        }
        
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 80 + Math.random() * 200;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        const size = 6 + Math.random() * 8;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        document.body.appendChild(particle);
        
        particle.addEventListener('animationend', () => {
            particle.remove();
        });
    }
}
