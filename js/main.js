/**
 * TaskFlow Main Orchestration Script
 * Boots modules, runs viewport tab routing, coordinates metrics calculations and Chart.js analytics.
 */

import { loadState, saveTheme } from './storage.js';
import { GamificationManager, BADGES } from './gamification.js';
import { NotificationManager } from './notifications.js';
import { FocusManager } from './focus.js';
import { CalendarManager } from './calendar.js';
import { HabitManager, getLocalDateStr } from './habits.js';
import { TaskManager, CATEGORIES } from './tasks.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State
    let appState = loadState();

    // 2. Instantiate Modular Controllers
    const gamificationManager = new GamificationManager(appState, updateGamificationUI);
    
    const taskManager = new TaskManager(
        appState,
        () => { // State update callback
            appState.tasks = taskManager.getTasks();
            calendarManager.setTasks(appState.tasks);
            renderAll();
        },
        gamificationManager
    );

    const habitManager = new HabitManager(
        appState,
        () => { // State update callback
            appState.habits = habitManager.getHabits();
            renderAll();
        },
        gamificationManager
    );

    const focusManager = new FocusManager(gamificationManager);
    const notificationManager = new NotificationManager();

    // 3. Setup Interactive Calendar with drop handler
    const calendarManager = new CalendarManager(
        appState,
        (dateStr, timeStr) => {
            // Callback when a day cell is clicked - opens task modal with date pre-filled
            openAddTaskModalWithDate(dateStr, timeStr);
        },
        (taskId, dateStr, timeStr) => {
            // Callback when a task is dropped onto a day/time slot
            const updateData = { dueDate: dateStr };
            if (timeStr !== undefined) {
                updateData.dueTime = timeStr || null;
            }
            taskManager.updateTask(taskId, updateData);
        }
    );

    // 4. Global DOM Queries
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const viewportTitle = document.getElementById('viewport-title');
    const headerDate = document.getElementById('header-date');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const appSidebar = document.getElementById('app-sidebar');
    const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Apply saved theme on boot
    const isDark = appState.theme === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    themeToggleBtn.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun"></i> <span>Toggle Theme</span>' 
        : '<i class="fa-solid fa-moon"></i> <span>Toggle Theme</span>';


    // Modals DOM
    const addTaskModal = document.getElementById('add-task-modal');
    const addTaskForm = document.getElementById('add-task-form');
    const editTaskModal = document.getElementById('edit-task-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    
    // Quick Add triggers
    const fabTriggerHeader = document.getElementById('fab-trigger-header');
    const openAddModalBtn = document.getElementById('open-add-modal-btn');

    // Chart.js handle
    let performanceChart = null;

    // Set Date in Header
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    headerDate.textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // ==========================================================================
    // ROUTING / TAB PANES ROUTER
    // ==========================================================================
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            // Toggle active classes on nav
            navItems.forEach(i => {
                i.classList.remove('active');
                i.setAttribute('aria-selected', 'false');
            });
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');

            // Switch sub-pages
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                    triggerTabAnimations(pane);
                }
            });

            // Set Title header
            const pageNames = {
                dashboard: 'Productivity Dashboard',
                tasks: 'Task Manager',
                habits: 'Habit Tracker',
                calendar: 'Calendar Planner',
                focus: 'Focus Arena',
                gamification: 'Achievements & Badges'
            };
            viewportTitle.textContent = pageNames[targetTab] || 'TaskFlow';
            
            // Close mobile sidebar drawer on navigate
            appSidebar.classList.remove('active');

            // Refresh specific components
            if (targetTab === 'calendar') {
                calendarManager.render();
            } else if (targetTab === 'dashboard') {
                window.shouldAnimateHeatmapOnce = true;
                renderAll();
                setTimeout(renderPerformanceChart, 100);
            } else if (targetTab === 'habits') {
                window.shouldAnimateHeatmapOnce = true;
                renderAll();
            }
        });
    });

    // Mobile Sidebar Drawer toggling
    sidebarToggleBtn.addEventListener('click', () => appSidebar.classList.add('active'));
    mobileSidebarClose.addEventListener('click', () => appSidebar.classList.remove('active'));

    // Theme Switch toggling
    themeToggleBtn.addEventListener('click', () => {
        const isDarkToggled = document.body.classList.toggle('dark-theme');
        saveTheme(isDarkToggled ? 'dark' : 'light');
        themeToggleBtn.innerHTML = isDarkToggled 
            ? '<i class="fa-solid fa-sun"></i> <span>Toggle Theme</span>' 
            : '<i class="fa-solid fa-moon"></i> <span>Toggle Theme</span>';
        
        // Re-draw canvas graphs with appropriate colors
        renderAll();
    });

    // Chart View toggles
    let activeChartView = 'weekly';
    const chartToggleWeekly = document.getElementById('chart-toggle-weekly');
    const chartToggleMonthly = document.getElementById('chart-toggle-monthly');
    const chartTitleText = document.getElementById('chart-title-text');
    
    if (chartToggleWeekly && chartToggleMonthly) {
        chartToggleWeekly.addEventListener('click', () => {
            chartToggleWeekly.classList.add('active');
            chartToggleMonthly.classList.remove('active');
            if (chartTitleText) chartTitleText.textContent = 'Weekly Performance';
            activeChartView = 'weekly';
            renderPerformanceChart();
        });
        chartToggleMonthly.addEventListener('click', () => {
            chartToggleMonthly.classList.add('active');
            chartToggleWeekly.classList.remove('active');
            if (chartTitleText) chartTitleText.textContent = 'Monthly Performance';
            activeChartView = 'monthly';
            renderPerformanceChart();
        });
    }

    // ==========================================================================
    // TASK MODALS TRIGGERS & LISTENERS
    // ==========================================================================
    
    // Add Modals
    const addRecurringToggle = document.getElementById('add-recurring-toggle');
    const addRecurrenceOptions = document.getElementById('add-recurrence-options');
    
    addRecurringToggle.addEventListener('change', () => {
        addRecurrenceOptions.classList.toggle('hidden', !addRecurringToggle.checked);
    });

    // Edit Modals
    const editRecurringToggle = document.getElementById('edit-recurring-toggle');
    const editRecurrenceOptions = document.getElementById('edit-recurrence-options');
    
    editRecurringToggle.addEventListener('change', () => {
        editRecurrenceOptions.classList.toggle('hidden', !editRecurringToggle.checked);
    });

    // Open/Close dialog triggers
    fabTriggerHeader.addEventListener('click', () => openModal(addTaskModal));
    openAddModalBtn.addEventListener('click', () => openModal(addTaskModal));
    
    document.getElementById('close-add-modal-btn').addEventListener('click', () => closeModal(addTaskModal));
    document.getElementById('close-add-modal-btn2').addEventListener('click', () => closeModal(addTaskModal));
    document.getElementById('close-edit-modal-btn').addEventListener('click', () => closeModal(editTaskModal));
    document.getElementById('close-edit-modal-btn2').addEventListener('click', () => closeModal(editTaskModal));

    function openModal(modal) {
        modal.classList.add('active');
        // Set date minimums to today
        const todayStr = getLocalDateStr(new Date());
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput) dateInput.min = todayStr;
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
        const recurSub = modal.querySelector('.recurrence-subform');
        if (recurSub) recurSub.classList.add('hidden');
    }

    // Pre-fill date modal trigger helper
    function openAddTaskModalWithDate(dateString, timeString = '') {
        openModal(addTaskModal);
        document.getElementById('add-date').value = dateString;
        if (timeString) {
            document.getElementById('add-time').value = timeString;
        }
    }

    // Add Task submit action
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('add-title').value.trim();
        const category = document.getElementById('add-category').value;
        const priority = document.getElementById('add-priority').value;
        const dueDate = document.getElementById('add-date').value;
        const dueTime = document.getElementById('add-time').value;
        const isRecurring = addRecurringToggle.checked;
        
        const errorText = document.getElementById('add-title-error');
        if (!title) {
            errorText.style.display = 'block';
            return;
        }
        errorText.style.display = 'none';

        const recurrence = {
            type: document.getElementById('add-recur-type').value,
            value: document.getElementById('add-recur-value').value,
            startTime: document.getElementById('add-recur-start').value,
            endTime: document.getElementById('add-recur-end').value
        };

        taskManager.addTask(title, category, priority, dueDate, dueTime, isRecurring, recurrence);
        closeModal(addTaskModal);
    });

    // Open Edit Modal action
    window.openEditModal = function(id) {
        const todo = appState.tasks.find(t => t.id === id);
        if (!todo) return;

        document.getElementById('edit-task-id').value = todo.id;
        document.getElementById('edit-title').value = todo.title;
        document.getElementById('edit-category').value = todo.category;
        document.getElementById('edit-priority').value = todo.priority;
        document.getElementById('edit-date').value = todo.dueDate || '';
        document.getElementById('edit-time').value = todo.dueTime || '';
        
        const isRecur = !!todo.isRecurring;
        editRecurringToggle.checked = isRecur;
        editRecurrenceOptions.classList.toggle('hidden', !isRecur);
        
        if (isRecur && todo.recurrence) {
            document.getElementById('edit-recur-type').value = todo.recurrence.type;
            document.getElementById('edit-recur-value').value = todo.recurrence.value;
            document.getElementById('edit-recur-start').value = todo.recurrence.startTime || '07:00';
            document.getElementById('edit-recur-end').value = todo.recurrence.endTime || '23:00';
        }

        openModal(editTaskModal);
    };

    // Save Edit submit action
    editTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-task-id').value;
        const title = document.getElementById('edit-title').value.trim();
        const category = document.getElementById('edit-category').value;
        const priority = document.getElementById('edit-priority').value;
        const dueDate = document.getElementById('edit-date').value;
        const dueTime = document.getElementById('edit-time').value;
        const isRecurring = editRecurringToggle.checked;

        if (!title) return;

        const recurrence = isRecurring ? {
            type: document.getElementById('edit-recur-type').value,
            value: parseInt(document.getElementById('edit-recur-value').value) || 1,
            startTime: document.getElementById('edit-recur-start').value,
            endTime: document.getElementById('edit-recur-end').value,
            isPaused: false
        } : null;

        taskManager.updateTask(id, {
            title,
            category,
            priority,
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            isRecurring,
            recurrence
        });

        closeModal(editTaskModal);
    });

    // Delete tasks click actions with deletion animation
    window.deleteTask = function(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        if (taskItem && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            taskItem.classList.remove('task-item-new');
            taskItem.classList.add('task-item-delete');
            taskItem.addEventListener('animationend', () => {
                taskManager.deleteTask(id, () => {
                    renderAll();
                });
            });
        } else {
            taskManager.deleteTask(id, () => {
                renderAll();
            });
        }
    };

    // Toggle complete click actions with completion bounce delay
    window.toggleComplete = function(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        if (taskItem && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const isChecking = !taskItem.classList.contains('completed');
            if (isChecking) {
                taskItem.classList.remove('task-item-new');
                taskItem.classList.add('completed');
                setTimeout(() => {
                    taskManager.toggleComplete(id);
                }, 450);
            } else {
                taskItem.classList.remove('completed');
                taskManager.toggleComplete(id);
            }
        } else {
            taskManager.toggleComplete(id);
        }
    };

    // Pause/Resume Recurrence click actions
    window.togglePauseRecurrence = function(id) {
        taskManager.togglePauseRecurrence(id);
        renderAll();
    };

    // ==========================================================================
    // HABITS CREATE SUBMIT
    // ==========================================================================
    const habitForm = document.getElementById('habit-form');
    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('habit-title-input').value.trim();
        const category = document.getElementById('habit-category-select').value;
        
        if (title) {
            habitManager.addHabit(title, category);
            habitForm.reset();
        }
    });

    window.toggleHabitDate = function(id, dateStr) {
        habitManager.toggleHabitDate(id, dateStr);
    };

    window.deleteHabit = function(id) {
        if (confirm('Delete this habit permanently?')) {
            habitManager.deleteHabit(id);
        }
    };

    // ==========================================================================
    // POMODORO TIMER PANEL LISTENERS
    // ==========================================================================
    const timerTimeDisplay = document.getElementById('timer-time-display');
    const timerModeLabel = document.getElementById('timer-mode-label');
    const timerPlayBtn = document.getElementById('timer-play-btn');
    const timerPauseBtn = document.getElementById('timer-pause-btn');
    const timerResetBtn = document.getElementById('timer-reset-btn');
    const timerFullscreenBtn = document.getElementById('timer-fullscreen-btn');
    const timerProgressRing = document.getElementById('timer-progress-ring');
    const timerModeBtns = document.querySelectorAll('.timer-mode-btn');

    // Fullscreen Overlay controls
    const fullscreenOverlay = document.getElementById('fullscreen-focus-overlay');
    const fsTimerTime = document.getElementById('fs-timer-time');
    const fsTimerLabel = document.getElementById('fs-timer-label');
    const fsPlayBtn = document.getElementById('fs-play-btn');
    const fsPauseBtn = document.getElementById('fs-pause-btn');
    const fsResetBtn = document.getElementById('fs-reset-btn');
    const exitFullscreenBtn = document.getElementById('exit-fullscreen-focus');

    // Timer Mode Selectors
    timerModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timerModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-focus-mode');
            focusManager.setMode(mode);
        });
    });

    // Play Timer
    function playTimer() {
        focusManager.start(
            (tickState) => { // Tick Callback
                const minStr = String(tickState.minutes).padStart(2, '0');
                const secStr = String(tickState.seconds).padStart(2, '0');
                const timeText = `${minStr}:${secStr}`;
                
                // Update text
                timerTimeDisplay.textContent = timeText;
                fsTimerTime.textContent = timeText;
                
                // SVG circular dial offset (552.9 circumference)
                const offset = 552.9 - (552.9 * tickState.percentage / 100);
                timerProgressRing.style.strokeDashoffset = offset;

                // Sync Labels
                const labels = {
                    work: 'FOCUS ON WORK',
                    short: 'SHORT BREAK',
                    long: 'LONG BREAK'
                };
                timerModeLabel.textContent = labels[tickState.mode];
                fsTimerLabel.textContent = labels[tickState.mode];
            },
            (completedMode) => { // Completed Callback
                // Reset buttons
                timerPlayBtn.classList.remove('hidden');
                timerPauseBtn.classList.add('hidden');
                fsPlayBtn.classList.remove('hidden');
                fsPauseBtn.classList.add('hidden');
            }
        );
        
        timerPlayBtn.classList.add('hidden');
        timerPauseBtn.classList.remove('hidden');
        fsPlayBtn.classList.add('hidden');
        fsPauseBtn.classList.remove('hidden');
    }

    // Pause Timer
    function pauseTimer() {
        focusManager.stop();
        timerPlayBtn.classList.remove('hidden');
        timerPauseBtn.classList.add('hidden');
        fsPlayBtn.classList.remove('hidden');
        fsPauseBtn.classList.add('hidden');
    }

    // Reset Timer
    function resetTimer() {
        focusManager.reset();
        timerPlayBtn.classList.remove('hidden');
        timerPauseBtn.classList.add('hidden');
        fsPlayBtn.classList.remove('hidden');
        fsPauseBtn.classList.add('hidden');
        timerProgressRing.style.strokeDashoffset = 0;
    }

    timerPlayBtn.addEventListener('click', playTimer);
    fsPlayBtn.addEventListener('click', playTimer);
    timerPauseBtn.addEventListener('click', pauseTimer);
    fsPauseBtn.addEventListener('click', pauseTimer);
    timerResetBtn.addEventListener('click', resetTimer);
    fsResetBtn.addEventListener('click', resetTimer);

    // Fullscreen Overlay triggers
    timerFullscreenBtn.addEventListener('click', () => {
        fullscreenOverlay.classList.add('active');
    });
    exitFullscreenBtn.addEventListener('click', () => {
        fullscreenOverlay.classList.remove('active');
    });

    // Sound Machine Controls
    const soundSelectBtns = document.querySelectorAll('.sound-select-btn');
    const volumeSlider = document.getElementById('ambient-volume-slider');

    soundSelectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            soundSelectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-sound');
            focusManager.startAmbientNoise(type);
        });
    });

    volumeSlider.addEventListener('input', (e) => {
        focusManager.setAmbientVolume(parseFloat(e.target.value));
    });

    // Duration Form Applies
    document.getElementById('apply-durations-btn').addEventListener('click', () => {
        const w = document.getElementById('dur-work').value;
        const s = document.getElementById('dur-short').value;
        const l = document.getElementById('dur-long').value;
        focusManager.setCustomDuration(w, s, l);
        resetTimer();
        alert('Timer lengths customized!');
    });

    // ==========================================================================
    // ALARM WINDOW POPUPS
    // ==========================================================================
    const alarmModal = document.getElementById('alarm-trigger-modal');
    const alarmTaskTitle = document.getElementById('alarm-task-title');
    const alarmTaskTime = document.getElementById('alarm-task-time');
    const alarmDismissBtn = document.getElementById('alarm-dismiss-btn');
    const alarmSnoozeBtn = document.getElementById('alarm-snooze-btn');
    const alarmSnoozeSelect = document.getElementById('alarm-snooze-select');
    let currentAlarmTaskId = null;

    function triggerReminderPopup(task) {
        currentAlarmTaskId = task.id;
        alarmTaskTitle.textContent = task.title;
        alarmTaskTime.textContent = task.dueTime;
        alarmModal.classList.add('active');
    }

    alarmDismissBtn.addEventListener('click', () => {
        notificationManager.stopAlarmSound();
        alarmModal.classList.remove('active');
        currentAlarmTaskId = null;
    });

    alarmSnoozeBtn.addEventListener('click', () => {
        if (!currentAlarmTaskId) return;
        const minutes = parseInt(alarmSnoozeSelect.value) || 5;
        
        notificationManager.stopAlarmSound();
        taskManager.snoozeTask(currentAlarmTaskId, minutes);
        
        alarmModal.classList.remove('active');
        currentAlarmTaskId = null;
        alert(`Task reminder snoozed for ${minutes} minutes!`);
    });

    // Start Alarm tick loop
    notificationManager.startReminderCheckLoop(
        () => taskManager.getTasks(),
        (triggeredTask) => triggerReminderPopup(triggeredTask)
    );

    // ==========================================================================
    // CALENDAR TOOLBAR NAVIGATION BINDINGS
    // ==========================================================================
    document.getElementById('cal-btn-prev').addEventListener('click', () => calendarManager.prev());
    document.getElementById('cal-btn-next').addEventListener('click', () => calendarManager.next());
    document.getElementById('cal-btn-today').addEventListener('click', () => calendarManager.today());
    
    document.querySelectorAll('.cal-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calendarManager.setView(btn.getAttribute('data-view'));
        });
    });

    // ==========================================================================
    // TASK SEARCH, CATEGORY FILTER, PRIORITY FILTER & SORT LISTENERS
    // ==========================================================================
    const taskSearch = document.getElementById('task-search');
    const filterCategory = document.getElementById('filter-category');
    const filterPriority = document.getElementById('filter-priority');
    const taskSort = document.getElementById('task-sort');
    const statusTabs = document.querySelectorAll('.status-tab');
    
    let activeStatusTab = 'all';

    taskSearch.addEventListener('input', renderAll);
    filterCategory.addEventListener('change', renderAll);
    filterPriority.addEventListener('change', renderAll);
    taskSort.addEventListener('change', renderAll);
    
    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            activeStatusTab = tab.getAttribute('data-status');
            renderAll();
        });
    });

    // ==========================================================================
    // SCORE & STATS GENERATORS
    // ==========================================================================
    function calculateProductivityScore() {
        const total = appState.tasks.length;
        const completed = appState.tasks.filter(t => t.completed).length;
        const overdue = countOverdueTasks();
        
        let score = 50; // Base baseline

        if (total > 0) {
            score += (completed / total) * 35; // Completing ratio is worth 35 points
        }
        
        // Streak bonuses (+2 points per streak day)
        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        score += maxStreak * 2;
        
        // Completed habits checked today
        const todayStr = getLocalDateStr(new Date());
        let completedHabitsToday = 0;
        appState.habits.forEach(h => {
            if (h.history && h.history[todayStr]) completedHabitsToday++;
        });
        score += completedHabitsToday * 3;

        // Deductions for overdue tasks
        score -= overdue * 8;

        // Bound between 0 and 100
        const roundedScore = Math.max(0, Math.min(100, Math.round(score)));
        
        const scoreValText = document.getElementById('score-value');
        const prevScore = scoreValText ? (parseInt(scoreValText.getAttribute('data-score')) || 0) : 0;

        // Update circular ring offset (263.8 circumference)
        const scoreRing = document.getElementById('score-ring');
        if (scoreRing) {
            const offset = 263.8 - (263.8 * roundedScore / 100);
            scoreRing.style.strokeDashoffset = offset;
        }

        // Pulse effect if score increases
        const ringWrap = document.querySelector('.progress-ring-wrap');
        if (ringWrap && roundedScore > prevScore) {
            ringWrap.classList.remove('pulse-effect');
            void ringWrap.offsetWidth; // Force layout recalculation
            ringWrap.classList.add('pulse-effect');
        }

        if (scoreValText) {
            animateCounter('score-value', prevScore, roundedScore);
            scoreValText.setAttribute('data-score', roundedScore);
        }
        
        // Check perfectionist badge
        if (roundedScore >= 95) {
            gamificationManager.checkAndUnlockBadge('score_95');
        }

        return roundedScore;
    }

    function countOverdueTasks() {
        const todayStr = getLocalDateStr(new Date());
        return appState.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
    }

    // ==========================================================================
    // CORE DRAW RENDERS
    // ==========================================================================
    function renderAll() {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        
        // 1. Process tasks categories
        renderTasksList();
        
        // 2. Render habits table
        renderHabitsBoard();

        // 3. Render Canvas heatmap activity calendar
        const shouldAnimateHeatmap = window.shouldAnimateHeatmapOnce || false;
        habitManager.drawHeatmap('habit-heatmap', isDarkTheme, shouldAnimateHeatmap);
        window.shouldAnimateHeatmapOnce = false;

        // 4. Update Dashboard metrics
        calculateProductivityScore();
        updateDashboardCards();
        updateProductivityReports();

        // 5. Update Profile Panel (sidebar)
        updateProfileXPPanel();

        // 6. Draw Dashboard charts
        renderPerformanceChart();

        // 7. Render Calendar Inbox Sidebar (unscheduled tasks)
        renderCalendarInbox();
    }

    // Update Profile box on sidebar
    function updateGamificationUI() {
        updateProfileXPPanel();
        updateDashboardCards();
        renderAchievementsTab();
    }

    function updateProfileXPPanel() {
        document.getElementById('user-level').textContent = gamificationManager.level;
        document.getElementById('ach-level-title').textContent = getRankTitle(gamificationManager.level);
        
        const xpNeeded = gamificationManager.getXpForNextLevel();
        const percent = Math.min(100, (gamificationManager.xp / xpNeeded) * 100);
        
        document.getElementById('user-xp-fill').style.width = `${percent}%`;
        document.getElementById('user-xp-text').textContent = `${gamificationManager.xp} / ${xpNeeded} XP`;
        
        const nextXpText = document.getElementById('ach-xp-to-go');
        if (nextXpText) {
            nextXpText.textContent = `${xpNeeded - gamificationManager.xp} XP`;
        }
    }

    function getRankTitle(level) {
        if (level < 3) return 'Novice Astronaut';
        if (level < 6) return 'Focus Voyager';
        if (level < 10) return 'Streak Explorer';
        return 'Productivity Titan';
    }

    // Animated numeric counter helper
    function animateCounter(elementId, startValue, endValue, duration = 1000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        let start = parseInt(el.getAttribute('data-value')) || startValue;
        let end = parseInt(endValue) || 0;
        
        if (start === end) {
            el.textContent = end;
            el.setAttribute('data-value', end);
            return;
        }
        
        let startTime = null;
        
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const value = Math.floor(start + easeProgress * (end - start));
            el.textContent = value;
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                el.textContent = end;
                el.setAttribute('data-value', end);
            }
        }
        
        requestAnimationFrame(animation);
    }

    // Animated streak days counter helper
    function animateStreakCounter(elementId, startValue, endValue, duration = 1000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        let start = parseInt(el.getAttribute('data-value')) || startValue;
        let end = parseInt(endValue) || 0;
        
        if (start === end) {
            el.textContent = `${end} ${end === 1 ? 'Day' : 'Days'}`;
            el.setAttribute('data-value', end);
            return;
        }
        
        let startTime = null;
        
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const value = Math.floor(start + easeProgress * (end - start));
            el.textContent = `${value} ${value === 1 ? 'Day' : 'Days'}`;
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                el.textContent = `${end} ${end === 1 ? 'Day' : 'Days'}`;
                el.setAttribute('data-value', end);
            }
        }
        
        requestAnimationFrame(animation);
    }

    // Update stats counters on dashboard page
    function updateDashboardCards() {
        const total = appState.tasks.length;
        const completed = appState.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const overdue = countOverdueTasks();

        animateCounter('dash-total', 0, total);
        animateCounter('dash-pending', 0, pending);
        animateCounter('dash-completed', 0, completed);
        animateCounter('dash-overdue', 0, overdue);

        // Active Streak Count
        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        animateStreakCounter('dash-streak-count', 0, maxStreak);

        // Dynamic reminders panel
        const remindersList = document.getElementById('dash-reminders-list');
        if (remindersList) {
            const upcomingTasks = appState.tasks
                .filter(t => !t.completed && t.dueDate && t.dueTime)
                .sort((a,b) => new Date(`${a.dueDate}T${a.dueTime}`) - new Date(`${b.dueDate}T${b.dueTime}`))
                .slice(0, 3);
            
            const currentIds = upcomingTasks.map(t => t.id);
            
            if (upcomingTasks.length === 0) {
                remindersList.innerHTML = '<li class="reminder-item slide-in-notification"><span class="rem-title">No upcoming alerts scheduled</span></li>';
            } else {
                // Remove deleted/obsolete reminders with animation
                const childrenArray = Array.from(remindersList.children);
                childrenArray.forEach(child => {
                    const id = child.getAttribute('data-id');
                    if (id && !currentIds.includes(id)) {
                        child.classList.remove('slide-in-notification');
                        child.classList.add('slide-out-notification');
                        setTimeout(() => {
                            try { child.remove(); } catch(e) {}
                        }, 500);
                    }
                });

                // Add or update elements
                upcomingTasks.forEach((t, index) => {
                    let existingItem = remindersList.querySelector(`li[data-id="${t.id}"]`);
                    if (!existingItem) {
                        const li = document.createElement('li');
                        li.className = 'reminder-item slide-in-notification';
                        li.setAttribute('data-id', t.id);
                        li.innerHTML = `
                            <div>
                                <span class="rem-title">${escapeHTML(t.title)}</span>
                                <span class="rem-time"><i class="fa-solid fa-clock"></i> ${t.dueDate} at ${t.dueTime}</span>
                            </div>
                            <span class="badge badge-${t.priority}">${t.priority}</span>
                        `;
                        if (index < remindersList.children.length) {
                            remindersList.insertBefore(li, remindersList.children[index]);
                        } else {
                            remindersList.appendChild(li);
                        }
                    } else {
                        // Update contents if item already exists
                        existingItem.innerHTML = `
                            <div>
                                <span class="rem-title">${escapeHTML(t.title)}</span>
                                <span class="rem-time"><i class="fa-solid fa-clock"></i> ${t.dueDate} at ${t.dueTime}</span>
                            </div>
                            <span class="badge badge-${t.priority}">${t.priority}</span>
                        `;
                    }
                });
            }
        }

        // Showcase Badges Dashboard Panel
        const showcaseFlex = document.getElementById('dash-badges-flex');
        if (showcaseFlex) {
            showcaseFlex.innerHTML = BADGES.map(badge => {
                const isUnlocked = gamificationManager.unlockedBadges.includes(badge.id);
                return `
                    <div class="badge-showcase-tile ${isUnlocked ? 'unlocked' : ''}" title="${badge.name}: ${badge.desc}">
                        <i class="fa-solid ${badge.icon}"></i>
                    </div>
                `;
            }).join('');
        }
    }

    // ==========================================================================
    // RENDER TASK VIEWS (TAB 2)
    // ==========================================================================
    function renderTasksList() {
        const query = taskSearch.value.toLowerCase().trim();
        const catFilter = filterCategory.value;
        const priorityFilter = filterPriority.value;
        const sortBy = taskSort.value;
        
        const todayStr = getLocalDateStr(new Date());

        // 1. Filter Tasks
        let filtered = appState.tasks.filter(task => {
            // Search Query
            const matchesQuery = !query || 
                task.title.toLowerCase().includes(query) ||
                task.priority.toLowerCase().includes(query) ||
                task.category.toLowerCase().includes(query);
            
            if (!matchesQuery) return false;

            // Category Filter
            if (catFilter !== 'all' && task.category !== catFilter) return false;

            // Priority Filter
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

            // Status Tabs
            if (activeStatusTab === 'pending' && task.completed) return false;
            if (activeStatusTab === 'completed' && !task.completed) return false;

            return true;
        });

        // 2. Sort Tasks
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'created-asc':
                    return a.createdAt - b.createdAt;
                case 'created-desc':
                    return b.createdAt - a.createdAt;
                case 'due-asc':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'due-desc':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(b.dueDate) - new Date(a.dueDate);
                case 'priority-desc':
                    return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
                case 'priority-asc':
                    return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                default:
                    return b.createdAt - a.createdAt;
            }
        });

        // 3. Render Empty state
        const emptyState = document.getElementById('tasks-empty-state');
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            document.querySelectorAll('.task-group-container').forEach(c => c.style.display = 'none');
            return;
        }
        emptyState.classList.add('hidden');

        // 4. Split and render into group segments
        const overdueGroup = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr);
        const todayGroup = filtered.filter(t => !t.completed && t.dueDate === todayStr);
        const upcomingGroup = filtered.filter(t => !t.completed && t.dueDate && t.dueDate > todayStr);
        const nodateGroup = filtered.filter(t => t.completed || !t.dueDate);

        renderGroup('list-overdue', overdueGroup, 'tasks-group-overdue');
        renderGroup('list-today', todayGroup, 'tasks-group-today');
        renderGroup('list-upcoming', upcomingGroup, 'tasks-group-upcoming');
        renderGroup('list-nodate', nodateGroup, 'tasks-group-nodate');
    }

    function renderGroup(listId, groupTasks, containerId) {
        const list = document.getElementById(listId);
        const container = document.getElementById(containerId);
        
        if (groupTasks.length === 0) {
            container.style.display = 'none';
            list.innerHTML = '';
            return;
        }
        
        container.style.display = 'block';
        const todayStr = getLocalDateStr(new Date());

        list.innerHTML = groupTasks.map(task => {
            const catInfo = CATEGORIES[task.category] || { label: 'Personal', icon: 'fa-user' };
            const priorityBadge = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            
            // Recurrence status indicators
            let recurHTML = '';
            if (task.isRecurring && task.recurrence) {
                const pausedClass = task.recurrence.isPaused ? 'paused' : '';
                const titleStr = task.recurrence.isPaused ? 'Recurring task is paused' : 'Recurring: ' + task.recurrence.type;
                recurHTML = `
                    <span class="badge recur-badge ${pausedClass}" title="${titleStr}">
                        <i class="fa-solid fa-rotate"></i> ${task.recurrence.type}
                    </span>
                `;
            }

            // Date limits
            let dateHTML = '';
            if (task.dueDate) {
                const isOverdue = !task.completed && task.dueDate < todayStr;
                dateHTML = `
                    <span class="badge date-badge ${isOverdue ? 'overdue' : ''}">
                        <i class="fa-regular fa-calendar"></i> ${task.dueDate} ${task.dueTime ? `at ${task.dueTime}` : ''}
                    </span>
                `;
            }

            // Pause action button
            let pauseBtnHTML = '';
            if (task.isRecurring) {
                const isPaused = task.recurrence?.isPaused;
                pauseBtnHTML = `
                    <button class="action-btn pause-btn" onclick="togglePauseRecurrence('${task.id}')" title="${isPaused ? 'Resume recurring schedule' : 'Pause recurring schedule'}">
                        <i class="fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}"></i>
                    </button>
                `;
            }

            const isNew = (Date.now() - task.createdAt) < 1500;
            const newClass = isNew ? 'task-item-new' : '';

            return `
                <li class="task-item ${task.completed ? 'completed' : ''} ${newClass}" data-id="${task.id}">
                    <div class="task-item-left">
                        <label class="checkbox-wrapper" aria-label="Mark task complete">
                            <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleComplete('${task.id}')">
                            <span class="checkmark"></span>
                        </label>
                        <div class="task-content">
                            <span class="task-title">${escapeHTML(task.title)}</span>
                            <div class="task-meta">
                                <span class="badge category-badge">
                                    <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}
                                </span>
                                <span class="badge badge-${task.priority}">
                                    <i class="fa-solid fa-circle" style="font-size: 0.5rem; margin-right: 2px;"></i> ${priorityBadge}
                                </span>
                                ${dateHTML}
                                ${recurHTML}
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        ${pauseBtnHTML}
                        <button class="action-btn edit-btn" onclick="openEditModal('${task.id}')" aria-label="Modify Task Details">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" aria-label="Remove Task">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    function getPriorityWeight(priority) {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 };
        return weights[priority] || 2;
    }

    // ==========================================================================
    // RENDER HABIT BOARD (TAB 3)
    // ==========================================================================
    function renderHabitsBoard() {
        const habitsEmptyState = document.getElementById('habits-empty-state');
        const habitsTableWrap = document.getElementById('habits-table-wrap');
        
        if (appState.habits.length === 0) {
            habitsEmptyState.classList.remove('hidden');
            habitsTableWrap.classList.add('hidden');
            return;
        }

        habitsEmptyState.classList.add('hidden');
        habitsTableWrap.classList.remove('hidden');

        // 1. Draw Headers (Titles, then last 7 days from yesterday backwards)
        const headersTr = document.getElementById('habits-table-headers');
        
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const datesArray = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            datesArray.push(d);
        }

        let headersHTML = '<th>Habit details</th>';
        datesArray.forEach(d => {
            headersHTML += `
                <th class="habit-chk-cell">
                    ${weekdayNames[d.getDay()]}<br>
                    <span style="font-size: 0.7rem; color: var(--text-light);">${d.getDate()}</span>
                </th>
            `;
        });
        headersHTML += '<th style="text-align: center;">Streak</th>';
        headersHTML += '<th style="text-align: center;">Rate</th>';
        headersHTML += '<th></th>';
        headersTr.innerHTML = headersHTML;

        // 2. Render habit rows
        const tbody = document.getElementById('habits-table-body');
        tbody.innerHTML = appState.habits.map(habit => {
            const catInfo = CATEGORIES[habit.category] || { label: 'Health', icon: 'fa-heart-pulse' };
            const stats = habitManager.getHabitStats(habit);

            let checkboxesHTML = '';
            datesArray.forEach(d => {
                const dateStr = getLocalDateStr(d);
                const isChecked = !!habit.history[dateStr];
                
                checkboxesHTML += `
                    <td class="habit-chk-cell">
                        <button class="habit-checkbox ${isChecked ? 'checked' : ''}" onclick="toggleHabitDate('${habit.id}', '${dateStr}')">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </td>
                `;
            });

            return `
                <tr>
                    <td class="habit-name-cell">
                        <div class="habit-title">${escapeHTML(habit.title)}</div>
                        <div class="habit-cell-cat">
                            <i class="fa-solid ${catInfo.icon}" style="color: ${catInfo.color}"></i> ${catInfo.label}
                        </div>
                    </td>
                    ${checkboxesHTML}
                    <td style="text-align: center;">
                        <span class="habit-streak-badge ${habit.streak > 0 ? 'active-streak-glow' : ''}">
                            <i class="fa-solid fa-fire"></i> ${habit.streak}d
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span class="habit-completion-percent">${stats.completionRate}%</span>
                    </td>
                    <td>
                        <button class="habit-delete-btn" onclick="deleteHabit('${habit.id}')" aria-label="Delete Habit">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================================================
    // RENDER ACHIEVEMENTS SHOWROOM (TAB 6)
    // ==========================================================================
    function renderAchievementsTab() {
        const gallery = document.getElementById('achievements-gallery-container');
        if (!gallery) return;

        gallery.innerHTML = BADGES.map(badge => {
            const isUnlocked = gamificationManager.unlockedBadges.includes(badge.id);
            return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                    <div class="badge-status-stamp">
                        ${isUnlocked ? '<span class="stamp-unlocked"><i class="fa-solid fa-circle-check"></i> Unlocked</span>' : '<span class="stamp-locked"><i class="fa-solid fa-lock"></i> Locked</span>'}
                    </div>
                    <div class="ach-icon-circle">
                        <i class="fa-solid ${badge.icon}"></i>
                    </div>
                    <h4>${badge.name}</h4>
                    <p>${badge.desc}</p>
                    <span class="ach-xp-reward">+${badge.xp} XP Reward</span>
                </div>
            `;
        }).join('');
    }

    // ==========================================================================
    // RENDERS CHART.JS ANALTICS GRAPHS (WEEKLY & MONTHLY PERFORMANCE REPORTS)
    // ==========================================================================
    function renderPerformanceChart() {
        const canvas = document.getElementById('analytics-chart');
        if (!canvas) return;

        const labels = [];
        const data = [];
        const daysToRender = activeChartView === 'weekly' ? 7 : 30;
        
        for (let i = daysToRender - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getLocalDateStr(d);
            
            // Format labels like "Jun 16"
            if (activeChartView === 'weekly') {
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            } else {
                // For monthly, label every 5 days or boundaries to keep chart clean
                if (i % 5 === 0 || i === daysToRender - 1 || i === 0) {
                    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                } else {
                    labels.push('');
                }
            }
            
            // Count completed tasks with due dates matching dateStr
            const completedCount = appState.tasks.filter(t => t.completed && t.dueDate === dateStr).length;
            data.push(completedCount);
        }

        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
        const labelColor = isDark ? '#94a3b8' : '#64748b';

        const ctx = canvas.getContext('2d');
        
        // Gradient fill below curve line
        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

        // Reuse existing chart instance for beautiful smooth transition morphing
        if (performanceChart) {
            performanceChart.data.labels = labels;
            performanceChart.data.datasets[0].data = data;
            performanceChart.data.datasets[0].pointRadius = activeChartView === 'weekly' ? 4 : 2;
            performanceChart.data.datasets[0].backgroundColor = gradient;
            performanceChart.options.scales.y.grid.color = gridColor;
            performanceChart.options.scales.y.ticks.color = labelColor;
            performanceChart.options.scales.x.ticks.color = labelColor;
            performanceChart.update();
            return;
        }

        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: data,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: activeChartView === 'weekly' ? 4 : 2,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                // Progressive line drawing animation settings
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                animations: {
                    y: {
                        duration: 1000,
                        easing: 'easeOutQuart',
                        from: 150
                    }
                },
                scales: {
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: labelColor,
                            font: { family: 'Outfit', size: 10 },
                            stepSize: 1,
                            precision: 0
                        },
                        border: { dash: [4, 4] }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: labelColor,
                            font: { family: 'Outfit', size: 10 }
                        }
                    }
                }
            }
        });
    }

    // Renders the Calendar's Inbox sidebar for unscheduled tasks
    function renderCalendarInbox() {
        const inboxList = document.getElementById('calendar-unscheduled-list');
        if (!inboxList) return;

        const unscheduledTasks = appState.tasks.filter(t => !t.dueDate);
        
        if (unscheduledTasks.length === 0) {
            inboxList.innerHTML = '<li class="sidebar-p-hint">No unscheduled tasks</li>';
            return;
        }

        inboxList.innerHTML = unscheduledTasks.map(task => {
            const catInfo = CATEGORIES[task.category] || { label: 'Personal', icon: 'fa-user', color: '#ec4899' };
            return `
                <li class="calendar-drag-item" draggable="true" data-task-id="${task.id}">
                    <span class="drag-item-title">${escapeHTML(task.title)}</span>
                    <span class="badge badge-${task.priority}" style="font-size: 0.65rem; padding: 1px 6px;">${task.priority}</span>
                </li>
            `;
        }).join('');

        // Add dragstart event listeners
        inboxList.querySelectorAll('.calendar-drag-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const taskId = item.getAttribute('data-task-id');
                e.dataTransfer.setData('text/plain', taskId);
                e.dataTransfer.effectAllowed = 'move';
            });
        });
    }

    // Dynamic reports compiler for Weekly & Monthly summaries
    function updateProductivityReports() {
        const reportsSummary = document.getElementById('dash-reports-summary');
        if (!reportsSummary) return;

        let completedLast7Days = 0;
        let completedLast30Days = 0;
        
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(now - i * oneDayMs);
            const dateStr = getLocalDateStr(d);
            completedLast7Days += appState.tasks.filter(t => t.completed && t.dueDate === dateStr).length;
        }

        for (let i = 0; i < 30; i++) {
            const d = new Date(now - i * oneDayMs);
            const dateStr = getLocalDateStr(d);
            completedLast30Days += appState.tasks.filter(t => t.completed && t.dueDate === dateStr).length;
        }

        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        const totalHabits = appState.habits.length;

        reportsSummary.innerHTML = `
            <div class="report-section">
                <h4 class="report-subheader"><i class="fa-solid fa-calendar-week"></i> Weekly Report</h4>
                <p>Completed <strong>${completedLast7Days}</strong> tasks in the last 7 days.</p>
            </div>
            <div class="report-section" style="margin-top: 15px;">
                <h4 class="report-subheader"><i class="fa-solid fa-calendar-month"></i> Monthly Report</h4>
                <p>Completed <strong>${completedLast30Days}</strong> tasks in the last 30 days.</p>
                <p>Peak habit streak: <strong>${maxStreak}</strong> days across <strong>${totalHabits}</strong> active habits.</p>
            </div>
        `;
    }

    // Helper: Escapes HTML tags to prevent injections (XSS security)
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Trigger staggered entrance animation for cards/elements in a given pane
    function triggerTabAnimations(activePane) {
        if (!activePane || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        
        const cards = activePane.querySelectorAll('.metric-card, .dashboard-welcome, .dashboard-card, .analytics-card, .task-item, .habit-item, .calendar-grid-container-card, .calendar-sidebar-panel, .focus-arena-card, .badge-card, .achievement-card');
        
        cards.forEach((card, index) => {
            card.classList.remove('stagger-in');
            void card.offsetWidth; // Force layout recalculation
            card.style.animationDelay = `${index * 0.06}s`;
            card.classList.add('stagger-in');
        });
    }

    // Global Mouse spotlight glow radial position update
    const mouseGlow = document.getElementById('mouse-glow');
    if (mouseGlow) {
        document.addEventListener('mousemove', (e) => {
            mouseGlow.style.left = `${e.clientX}px`;
            mouseGlow.style.top = `${e.clientY}px`;
        });
    }

    // Event Delegation for 3D card tilt & Magnetic cursor effect on buttons
    document.addEventListener('mousemove', (e) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // 1. 3D Card Tilt on Hover
        const card = e.target.closest('.metric-card, .dashboard-card, .analytics-card, .achievement-card');
        if (card) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * 10; // Max 10 degrees tilt
            const rotateY = -((x - centerX) / centerX) * 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.008)`;
            card.style.transition = 'transform 0.08s ease-out';
        }
        
        // 2. Magnetic cursor effect for actions buttons
        const btn = e.target.closest('.primary-btn, .secondary-btn, .sidebar-theme-btn, .timer-mode-btn, .cal-view-btn, .timer-control-btn');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;
            
            const strength = 0.3; // Magnet strength
            const mx = deltaX * strength;
            const my = deltaY * strength;
            
            btn.style.transform = `translate(${mx}px, ${my}px) scale(1.02)`;
            btn.style.transition = 'transform 0.08s ease-out';
        }
    });

    // Reset transformations when mouse leaves
    document.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.metric-card, .dashboard-card, .analytics-card, .achievement-card');
        if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
            card.style.transform = '';
            card.style.transition = 'transform 0.4s ease';
        }
        
        const btn = e.target.closest('.primary-btn, .secondary-btn, .sidebar-theme-btn, .timer-mode-btn, .cal-view-btn, .timer-control-btn');
        if (btn && (!e.relatedTarget || !btn.contains(e.relatedTarget))) {
            btn.style.transform = '';
            btn.style.transition = 'transform 0.4s ease';
        }
    });

    // Page Entrance splash screen fade out and trigger animations
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            
            // Trigger animation for heatmap
            window.shouldAnimateHeatmapOnce = true;
            
            // Execute renders so that charts draw and counters count up visually
            renderAll();
            renderAchievementsTab();
            
            // Stagger-in elements on load
            triggerTabAnimations(document.querySelector('.tab-pane.active'));
        }
    }, 1000);
});
