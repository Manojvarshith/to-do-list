

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
            history: {}, 
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
                
                
                this.calculateStreaks(updatedHabit);
                return updatedHabit;
            }
            return habit;
        });

        this.save();

        if (habitChecked) {
            this.gamificationManager.addXp(20, 'Habit Completed');
            
            
        }
    }

    calculateStreaks(habit) {
        const history = habit.history || {};
        const todayStr = getLocalDateStr(new Date());
        const yesterdayStr = getLocalDateStr(new Date(Date.now() - 86400000));
        
        let currentStreak = 0;
        let tempDate = new Date();
        
        
        if (!history[todayStr] && !history[yesterdayStr]) {
            currentStreak = 0;
        } else {
            
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

    
    drawHeatmap(canvasId, isDarkTheme, animate = true) {
        if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            if (this.heatmapAnimationId) {
                cancelAnimationFrame(this.heatmapAnimationId);
            }
            let startTime = null;
            const duration = 1200; 
            
            const animateFunc = (time) => {
                if (!startTime) startTime = time;
                const progress = Math.min((time - startTime) / duration, 1);
                this.renderHeatmapState(canvasId, isDarkTheme, progress);
                
                if (progress < 1) {
                    this.heatmapAnimationId = requestAnimationFrame(animateFunc);
                } else {
                    this.heatmapAnimationId = null;
                    this.setupHeatmapHover(canvasId);
                }
            };
            this.heatmapAnimationId = requestAnimationFrame(animateFunc);
        } else {
            this.renderHeatmapState(canvasId, isDarkTheme, 1.0);
            this.setupHeatmapHover(canvasId);
        }
    }

    renderHeatmapState(canvasId, isDarkTheme, progress) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        
        const cols = 22; 
        const rows = 7; 
        const cellSize = 12;
        const gap = 3;
        
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        
        const emptyColor = isDarkTheme ? '#1e293b' : '#e2e8f0';
        const strokeColor = isDarkTheme ? '#334155' : '#cbd5e1';
        
        
        const activeColors = isDarkTheme 
            ? ['#312e81', '#4338ca', '#4f46e5', '#6366f1', '#818cf8'] 
            : ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1']; 

        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (cols * 7) + 1);
        
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        const tempDate = new Date(startDate);

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const dateStr = getLocalDateStr(tempDate);
                
                
                const cellProgress = Math.min(Math.max((progress * 1.3) - (c / cols) * 0.3, 0), 1);

                if (cellProgress > 0) {
                    
                    let completions = 0;
                    this.habits.forEach(h => {
                        if (h.history[dateStr]) completions++;
                    });

                    
                    let color = emptyColor;
                    if (completions > 0) {
                        const colorIndex = Math.min(completions - 1, activeColors.length - 1);
                        color = activeColors[colorIndex];
                    }

                    
                    const currentCellSize = cellSize * cellProgress;
                    const offset = (cellSize - currentCellSize) / 2;

                    const x = c * (cellSize + gap) + 20 + offset;
                    const y = r * (cellSize + gap) + 10 + offset;
                    
                    ctx.fillStyle = color;
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = 0.5;
                    
                    drawRoundedRect(ctx, x, y, currentCellSize, currentCellSize, 2 * cellProgress);
                    ctx.fill();
                    ctx.stroke();
                }

                tempDate.setDate(tempDate.getDate() + 1);
            }
        }
        
        
        ctx.fillStyle = isDarkTheme ? `rgba(148, 163, 184, ${progress})` : `rgba(100, 116, 139, ${progress})`;
        ctx.font = '9px Outfit';
        ctx.fillText('M', 5, 29);
        ctx.fillText('W', 5, 59);
        ctx.fillText('F', 5, 89);
    }

    setupHeatmapHover(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        if (canvas.getAttribute('data-hover-bound')) return;
        canvas.setAttribute('data-hover-bound', 'true');

        let tooltip = document.getElementById('heatmap-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'heatmap-tooltip';
            tooltip.className = 'heatmap-tooltip';
            document.body.appendChild(tooltip);
        }

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const cols = 22;
            const rows = 7;
            const cellSize = 12;
            const gap = 3;

            let hoveredCell = null;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (cols * 7) + 1);
            const dayOfWeek = startDate.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek);

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const x = c * (cellSize + gap) + 20;
                    const y = r * (cellSize + gap) + 10;

                    if (mouseX >= x && mouseX <= x + cellSize && mouseY >= y && mouseY <= y + cellSize) {
                        const tempDate = new Date(startDate);
                        tempDate.setDate(tempDate.getDate() + (c * 7) + r);
                        
                        const dateStr = getLocalDateStr(tempDate);
                        let completions = 0;
                        this.habits.forEach(h => {
                            if (h.history[dateStr]) completions++;
                        });

                        hoveredCell = {
                            date: tempDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            count: completions
                        };
                        break;
                    }
                }
                if (hoveredCell) break;
            }

            if (hoveredCell) {
                tooltip.innerHTML = `<strong>${hoveredCell.count} ${hoveredCell.count === 1 ? 'habit' : 'habits'}</strong> completed on ${hoveredCell.date}`;
                tooltip.style.left = `${e.clientX + 12}px`;
                tooltip.style.top = `${e.clientY - 35}px`;
                tooltip.classList.add('visible');
            } else {
                tooltip.classList.remove('visible');
            }
        });

        canvas.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('heatmap-tooltip');
            if (tooltip) tooltip.classList.remove('visible');
        });
    }
}


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


export function getLocalDateStr(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}
