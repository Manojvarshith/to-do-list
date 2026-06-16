/**
 * TaskFlow Tasks Module
 * Manages core tasks, category indexing, and recurrence mathematical scheduling.
 */

import { saveTasks } from './storage.js';

export const CATEGORIES = {
    health: { label: 'Health', icon: 'fa-heart-pulse', color: '#10b981' },
    work: { label: 'Work', icon: 'fa-briefcase', color: '#3b82f6' },
    study: { label: 'Study', icon: 'fa-book-open', color: '#a855f7' },
    personal: { label: 'Personal', icon: 'fa-user', color: '#ec4899' },
    finance: { label: 'Finance', icon: 'fa-wallet', color: '#f59e0b' }
};

export class TaskManager {
    constructor(state, onStateUpdate, gamificationManager) {
        this.tasks = state.tasks;
        this.onStateUpdate = onStateUpdate;
        this.gamificationManager = gamificationManager;
    }

    getTasks() {
        return this.tasks;
    }

    addTask(title, category, priority, dueDate, dueTime, isRecurring, recurrence) {
        const newTask = {
            id: Date.now().toString(),
            title: title.trim(),
            category: category || 'personal',
            priority: priority || 'medium',
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            completed: false,
            createdAt: Date.now(),
            isRecurring: !!isRecurring,
            recurrence: isRecurring ? {
                type: recurrence.type || 'daily',
                value: parseInt(recurrence.value) || 1,
                startTime: recurrence.startTime || null,
                endTime: recurrence.endTime || null,
                isPaused: false
            } : null,
            lastReminderTriggered: null
        };

        this.tasks.unshift(newTask);
        this.save();
        
        // Award task XP
        this.gamificationManager.addXp(10, 'Task Created');
        
        return newTask;
    }

    updateTask(id, updatedFields) {
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                // If toggled from non-recurring to recurring, create recurrence object
                return { ...task, ...updatedFields };
            }
            return task;
        });
        this.save();
    }

    deleteTask(id, callback) {
        // Run slide-out animation trigger
        const element = document.querySelector(`.task-item[data-id="${id}"]`);
        if (element) {
            element.classList.add('slide-out');
            element.addEventListener('animationend', () => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.save();
                if (callback) callback();
            }, { once: true });
        } else {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.save();
            if (callback) callback();
        }
    }

    toggleComplete(id) {
        let taskCompleted = false;
        let isTaskRecurring = false;
        let nextDate = null;
        let nextTime = null;

        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                const toggledStatus = !task.completed;
                taskCompleted = toggledStatus;
                
                // If it's a recurring task, schedule the next occurrence instead of simply completing it
                if (toggledStatus && task.isRecurring && task.recurrence && !task.recurrence.isPaused) {
                    isTaskRecurring = true;
                    const nextSchedule = calculateNextOccurrence(task);
                    if (nextSchedule) {
                        nextDate = nextSchedule.dueDate;
                        nextTime = nextSchedule.dueTime;
                        // Return reset task with updated times, keeping completed false
                        return {
                            ...task,
                            dueDate: nextDate,
                            dueTime: nextTime,
                            completed: false, // Reset completion for next trigger
                            lastReminderTriggered: null // Reset reminder alert flag
                        };
                    }
                }
                
                return { ...task, completed: toggledStatus };
            }
            return task;
        });

        this.save();

        // Gamification bonuses
        if (taskCompleted) {
            const task = this.tasks.find(t => t.id === id) || { priority: 'medium' };
            let xpEarned = 15;
            let reason = 'Task Completed';
            
            if (task.priority === 'critical') {
                xpEarned += 10;
                reason += ' (Critical Priority Bonus)';
                this.gamificationManager.checkAndUnlockBadge('critical_task');
            } else if (task.priority === 'high') {
                xpEarned += 5;
                reason += ' (High Priority Bonus)';
            }
            
            // Night Owl badge check (between 10 PM and 4 AM)
            const hour = new Date().getHours();
            if (hour >= 22 || hour < 4) {
                this.gamificationManager.checkAndUnlockBadge('night_owl');
            }

            this.gamificationManager.addXp(xpEarned, reason);
            this.gamificationManager.checkAndUnlockBadge('first_task');
            
            // Check totals badge
            const totalCompleted = this.tasks.filter(t => t.completed).length;
            if (totalCompleted >= 10) {
                this.gamificationManager.checkAndUnlockBadge('tasks_10');
            }
        }
    }

    togglePauseRecurrence(id) {
        this.tasks = this.tasks.map(task => {
            if (task.id === id && task.isRecurring && task.recurrence) {
                const newPausedState = !task.recurrence.isPaused;
                return {
                    ...task,
                    recurrence: {
                        ...task.recurrence,
                        isPaused: newPausedState
                    }
                };
            }
            return task;
        });
        this.save();
    }

    snoozeTask(id, minutes) {
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                const now = new Date();
                now.setMinutes(now.getMinutes() + minutes);
                
                return {
                    ...task,
                    dueDate: getLocalDateStr(now),
                    dueTime: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
                    lastReminderTriggered: null // Allow it to sound again at snoozed time
                };
            }
            return task;
        });
        this.save();
    }

    save() {
        saveTasks(this.tasks);
        this.onStateUpdate();
    }
}

// Smart recurrence calculator math
export function calculateNextOccurrence(task) {
    if (!task.isRecurring || !task.recurrence) return null;
    const rec = task.recurrence;
    
    let baseDate = new Date();
    if (task.dueDate) {
        const timeStr = task.dueTime || '00:00';
        baseDate = new Date(`${task.dueDate}T${timeStr}`);
    }

    let nextDate = new Date(baseDate);

    switch (rec.type) {
        case 'minutes':
            nextDate.setMinutes(nextDate.getMinutes() + rec.value);
            break;
        case 'hours':
            nextDate.setHours(nextDate.getHours() + rec.value);
            break;
        case 'daily':
            nextDate.setDate(nextDate.getDate() + rec.value);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7 * rec.value);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + rec.value);
            break;
    }

    // Bound minutes/hours within active operating hours window
    if ((rec.type === 'minutes' || rec.type === 'hours') && rec.startTime && rec.endTime) {
        const [startH, startM] = rec.startTime.split(':').map(Number);
        const [endH, endM] = rec.endTime.split(':').map(Number);
        
        const nextH = nextDate.getHours();
        const nextM = nextDate.getMinutes();
        
        const nextVal = nextH * 60 + nextM;
        const startVal = startH * 60 + startM;
        const endVal = endH * 60 + endM;

        if (nextVal > endVal) {
            // Advance to next day at start boundary
            nextDate.setDate(nextDate.getDate() + 1);
            nextDate.setHours(startH, startM, 0, 0);
        } else if (nextVal < startVal) {
            // Align to start boundary of today
            nextDate.setHours(startH, startM, 0, 0);
        }
    }

    return {
        dueDate: getLocalDateStr(nextDate),
        dueTime: String(nextDate.getHours()).padStart(2, '0') + ':' + String(nextDate.getMinutes()).padStart(2, '0')
    };
}

// Get timezone-offset-safe date string YYYY-MM-DD
function getLocalDateStr(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}
