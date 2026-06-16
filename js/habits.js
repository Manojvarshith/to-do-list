/**
 * TaskFlow Habits Module
 * Tracks streaks, daily checkouts, completion metrics, and renders a habit heatmap calendar.
 */

import { saveHabits } from './storage.js';

export class HabitManager {
    constructor(state, onStateUpdate, gamificationManager) {
        this.habits = state.habits;
        this.onStateUpdate = onStateUpdate;
        this.gamificationManager = gamificationManager;
    }

    getHabits() {
        return this.habits;
    }

    addHabit(title, category) {
        const newHabit = {
            id: Date.now().toString(),
            title: title.trim(),
            category: category || 'health',
            createdAt: Date.now(),
            history: {}, // Format: { "YYYY-MM-DD": true }
            streak: 0,
            longestStreak: 0
        };

        this.habits.push(newHabit);
        this.save();
        
        this.gamificationManager.addXp(15, 'New Habit Formed');
        return newHabit;
    }

    deleteHabit(id) {
        this.habits = this.habits.filter(h => h.id !== id);
        this.save();
    }

    toggleHabitDate(id, dateStr) {
        let habitChecked = false;
        this.habits = this.habits.map(habit => {
            if (habit.id === id) {
                const checked = !habit.history[dateStr];
                habitChecked = checked;
                
                const updatedHistory = { ...habit.history };
                if (checked) {
                    updatedHistory[dateStr] = true;
                } else {
                    delete updatedHistory[dateStr];
                }

                const updatedHabit = { ...habit, history: updatedHistory };
                
                // Recalculate streaks
                this.calculateStreaks(updatedHabit);
                return updatedHabit;
            }
            return habit;
        });

        this.save();

        if (habitChecked) {
            this.gamificationManager.addXp(20, 'Habit Completed');
            
            // Check streak badges
            const currentHabit = this.habits.find(h => h.id === id);
            if (currentHabit) {
                if (currentHabit.streak >= 7) {
                    this.gamificationManager.checkAndUnlockBadge('streak_7');
                } else if (currentHabit.streak >= 3) {
                    this.gamificationManager.checkAndUnlockBadge('streak_3');
                }
            }
        }
    }

    calculateStreaks(habit) {
        const history = habit.history || {};
        const todayStr = getLocalDateStr(new Date());
        const yesterdayStr = getLocalDateStr(new Date(Date.now() - 86400000));
        
        let currentStreak = 0;
        let tempDate = new Date();
        
        // If not checked today and not checked yesterday, streak is broken
        if (!history[todayStr] && !history[yesterdayStr]) {
            currentStreak = 0;
        } else {
            // Start calculation from yesterday if today is not yet checked
            if (!history[todayStr]) {
                tempDate.setDate(tempDate.getDate() - 1);
            }
            
            while (true) {
                const dateStr = getLocalDateStr(tempDate);
                if (history[dateStr]) {
                    currentStreak++;
                    tempDate.setDate(tempDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        habit.streak = currentStreak;
        if (currentStreak > (habit.longestStreak || 0)) {
            habit.longestStreak = currentStreak;
        }
    }

    getHabitStats(habit) {
        const history = habit.history || {};
        const datesChecked = Object.keys(history).filter(d => history[d]);
        const totalChecked = datesChecked.length;
        
        // Count days since creation
        const msDiff = Date.now() - habit.createdAt;
        const daysSinceCreation = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
        const completionRate = Math.min(100, Math.round((totalChecked / daysSinceCreation) * 100));

        return {
            totalChecked,
            completionRate
        };
    }

    save() {
        saveHabits(this.habits);
        this.onStateUpdate();
    }

    // Renders the contribution heatmap onto a canvas element
    drawHeatmap(canvasId, isDarkTheme) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration
        const cols = 22; // 22 weeks (~150 days)
        const rows = 7; // 7 days of the week
        const cellSize = 12;
        const gap = 3;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Styling colors based on theme
        const emptyColor = isDarkTheme ? '#1e293b' : '#e2e8f0';
        const strokeColor = isDarkTheme ? '#334155' : '#cbd5e1';
        
        // Colors mapping completion counts (Low to high density)
        const activeColors = isDarkTheme 
            ? ['#312e81', '#4338ca', '#4f46e5', '#6366f1', '#818cf8'] // Indigo gradient
            : ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1']; // Light Indigo gradient

        // Calculate starting date: 22 weeks ago Sunday
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (cols * 7) + 1);
        // Snap to preceding Sunday
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        const tempDate = new Date(startDate);

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const dateStr = getLocalDateStr(tempDate);
                
                // Count how many habits were completed on this date
                let completions = 0;
                this.habits.forEach(h => {
                    if (h.history[dateStr]) completions++;
                });

                // Pick color index based on total completions
                let color = emptyColor;
                if (completions > 0) {
                    const colorIndex = Math.min(completions - 1, activeColors.length - 1);
                    color = activeColors[colorIndex];
                }

                // Render cell
                const x = c * (cellSize + gap) + 20;
                const y = r * (cellSize + gap) + 10;
                
                ctx.fillStyle = color;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 0.5;
                
                // Draw rounded rect helper
                drawRoundedRect(ctx, x, y, cellSize, cellSize, 2);
                ctx.fill();
                ctx.stroke();

                tempDate.setDate(tempDate.getDate() + 1);
            }
        }
        
        // Add Day labels (Mon, Wed, Fri)
        ctx.fillStyle = isDarkTheme ? '#94a3b8' : '#64748b';
        ctx.font = '9px Outfit';
        ctx.fillText('M', 5, 29);
        ctx.fillText('W', 5, 59);
        ctx.fillText('F', 5, 89);
    }
}

// Draw rounded rectangles on Canvas API
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Get timezone-offset-safe date string YYYY-MM-DD
export function getLocalDateStr(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}
