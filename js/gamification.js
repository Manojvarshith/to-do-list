

import { saveGamification } from './storage.js';

export const BADGES = [
    { id: 'task_created_1', name: 'Architect', desc: 'Create your first task', icon: 'fa-pencil', xp: 50 },
    { id: 'task_created_10', name: 'Planner', desc: 'Create 10 tasks', icon: 'fa-bars-staggered', xp: 100 },
    { id: 'task_created_50', name: 'Organizer', desc: 'Create 50 tasks', icon: 'fa-folder-tree', xp: 250 },
    { id: 'task_created_100', name: 'Mastermind', desc: 'Create 100 tasks', icon: 'fa-sitemap', xp: 500 },

    { id: 'first_completion', name: 'First Steps', desc: 'Complete your first task', icon: 'fa-check-double', xp: 100 },
    { id: 'tasks_completed_10', name: 'Task Master', desc: 'Complete 10 tasks', icon: 'fa-award', xp: 200 },
    { id: 'tasks_completed_50', name: 'Elite Executer', desc: 'Complete 50 tasks', icon: 'fa-circle-check', xp: 400 },
    { id: 'tasks_completed_100', name: 'Productivity Titan', desc: 'Complete 100 tasks', icon: 'fa-crown', xp: 800 },

    { id: 'streak_3', name: 'Habitual', desc: 'Achieve a 3-day habit streak', icon: 'fa-fire', xp: 150 },
    { id: 'streak_7', name: 'Unstoppable', desc: 'Achieve a 7-day habit streak', icon: 'fa-bolt', xp: 300 },
    { id: 'streak_30', name: 'Routine King', desc: 'Achieve a 30-day habit streak', icon: 'fa-calendar-check', xp: 600 },
    { id: 'streak_100', name: 'Invincible', desc: 'Achieve a 100-day habit streak', icon: 'fa-shield-halved', xp: 1200 },

    { id: 'first_habit', name: 'Spark', desc: 'Form your first habit', icon: 'fa-seedling', xp: 50 },
    { id: 'habits_completed_10', name: 'Consistent', desc: 'Complete habits 10 times', icon: 'fa-arrow-trend-up', xp: 150 },
    { id: 'habits_completed_100', name: 'Ritualist', desc: 'Complete habits 100 times', icon: 'fa-gem', xp: 500 },

    { id: 'score_70', name: 'Focused', desc: 'Productivity score 70+', icon: 'fa-compass', xp: 100 },
    { id: 'score_90', name: 'High Achiever', desc: 'Productivity score 90+', icon: 'fa-ranking-star', xp: 250 },
    { id: 'score_100', name: 'Perfect Day', desc: 'Productivity score of 100', icon: 'fa-trophy', xp: 500 },

    { id: 'level_5', name: 'Rising Star', desc: 'Reach Level 5', icon: 'fa-star-half-stroke', xp: 200 },
    { id: 'level_10', name: 'Veteran', desc: 'Reach Level 10', icon: 'fa-star', xp: 450 },
    { id: 'level_25', name: 'Legend', desc: 'Reach Level 25', icon: 'fa-rocket', xp: 1000 },

    { id: 'pomodoro_1', name: 'Deep Focus', desc: 'Complete your first Pomodoro session', icon: 'fa-brain', xp: 100 },
    { id: 'critical_task', name: 'Firefighter', desc: 'Complete a Critical priority task', icon: 'fa-fire-extinguisher', xp: 150 },
    { id: 'night_owl', name: 'Night Owl', desc: 'Complete a task between 10 PM and 4 AM', icon: 'fa-owl', xp: 100 }
];

export class GamificationManager {
    constructor(state, onStateUpdate) {
        this.xp = state.xp;
        this.level = state.level;
        this.unlockedBadges = state.unlockedBadges;
        this.totalXpEarned = state.totalXpEarned || 0;
        this.onStateUpdate = onStateUpdate; 
    }

    getXpForNextLevel() {
        return this.level * 150;
    }

    addXp(amount, reason = '') {
        this.xp += amount;
        this.totalXpEarned += amount;
        localStorage.setItem('taskflow_total_xp_earned', this.totalXpEarned.toString());
        let leveledUp = false;

        while (this.xp >= this.getXpForNextLevel()) {
            this.xp -= this.getXpForNextLevel();
            this.level += 1;
            leveledUp = true;
        }

        saveGamification(this.xp, this.level, this.unlockedBadges);
        this.onStateUpdate({ xp: this.xp, level: this.level, unlockedBadges: this.unlockedBadges, totalXpEarned: this.totalXpEarned });

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
        this.onStateUpdate({ xp: this.xp, level: this.level, unlockedBadges: this.unlockedBadges, totalXpEarned: this.totalXpEarned });

        this.showBadgeUnlockToast(badge);
        
        setTimeout(() => this.addXp(badge.xp, `Badge Unlock: ${badge.name}`), 1000);
    }

    recalculateBadges(state) {
        const createdCount = state.totalTasksCreated || 0;
        if (createdCount >= 1) this.checkAndUnlockBadge('task_created_1');
        if (createdCount >= 10) this.checkAndUnlockBadge('task_created_10');
        if (createdCount >= 50) this.checkAndUnlockBadge('task_created_50');
        if (createdCount >= 100) this.checkAndUnlockBadge('task_created_100');

        const completedCount = state.totalTasksCompleted || 0;
        if (completedCount >= 1) this.checkAndUnlockBadge('first_completion');
        if (completedCount >= 10) this.checkAndUnlockBadge('tasks_completed_10');
        if (completedCount >= 50) this.checkAndUnlockBadge('tasks_completed_50');
        if (completedCount >= 100) this.checkAndUnlockBadge('tasks_completed_100');

        const maxStreak = Math.max(0, ...state.habits.map(h => h.streak));
        if (maxStreak >= 3) this.checkAndUnlockBadge('streak_3');
        if (maxStreak >= 7) this.checkAndUnlockBadge('streak_7');
        if (maxStreak >= 30) this.checkAndUnlockBadge('streak_30');
        if (maxStreak >= 100) this.checkAndUnlockBadge('streak_100');

        let totalHabitsCompleted = 0;
        state.habits.forEach(h => {
            totalHabitsCompleted += Object.values(h.history || {}).filter(Boolean).length;
        });
        if (state.habits.length >= 1) this.checkAndUnlockBadge('first_habit');
        if (totalHabitsCompleted >= 10) this.checkAndUnlockBadge('habits_completed_10');
        if (totalHabitsCompleted >= 100) this.checkAndUnlockBadge('habits_completed_100');

        const score = state.productivityScore || 0;
        if (score >= 70) this.checkAndUnlockBadge('score_70');
        if (score >= 90) this.checkAndUnlockBadge('score_90');
        if (score === 100) this.checkAndUnlockBadge('score_100');

        if (this.level >= 5) this.checkAndUnlockBadge('level_5');
        if (this.level >= 10) this.checkAndUnlockBadge('level_10');
        if (this.level >= 25) this.checkAndUnlockBadge('level_25');
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
