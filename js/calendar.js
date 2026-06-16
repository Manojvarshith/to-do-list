

import { getLocalDateStr } from './habits.js';
import { CATEGORIES } from './tasks.js';

export class CalendarManager {
    constructor(state, onAddClickCallback) {
        this.tasks = state.tasks;
        this.onAddClickCallback = onAddClickCallback;
        
        this.currentDate = new Date();
        this.currentView = 'month'; 
    }

    setTasks(tasks) {
        this.tasks = tasks;
    }

    setView(view) {
        this.currentView = view;
        this.render();
    }

    next() {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
        }
        this.render();
    }

    prev() {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
        }
        this.render();
    }

    today() {
        this.currentDate = new Date();
        this.render();
    }

    render() {
        const container = document.getElementById('calendar-grid-container');
        const headerTitle = document.getElementById('calendar-date-title');
        if (!container || !headerTitle) return;

        container.className = `calendar-grid ${this.currentView}-view`;

        if (this.currentView === 'month') {
            this.renderMonthView(container, headerTitle);
        } else if (this.currentView === 'week') {
            this.renderWeekView(container, headerTitle);
        } else if (this.currentView === 'day') {
            this.renderDayView(container, headerTitle);
        }
    }

    
    
    
    renderMonthView(container, headerTitle) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        headerTitle.textContent = `${monthNames[month]} ${year}`;

        
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        let gridHTML = `
            <div class="calendar-weekday-header">Sun</div>
            <div class="calendar-weekday-header">Mon</div>
            <div class="calendar-weekday-header">Tue</div>
            <div class="calendar-weekday-header">Wed</div>
            <div class="calendar-weekday-header">Thu</div>
            <div class="calendar-weekday-header">Fri</div>
            <div class="calendar-weekday-header">Sat</div>
        `;

        const totalSlots = 42; 
        const todayStr = getLocalDateStr(new Date());

        for (let i = 0; i < totalSlots; i++) {
            let dayNum;
            let currentCellDate;
            let isCurrentMonth = true;

            if (i < firstDayIndex) {
                
                dayNum = prevMonthTotalDays - firstDayIndex + i + 1;
                currentCellDate = new Date(year, month - 1, dayNum);
                isCurrentMonth = false;
            } else if (i >= firstDayIndex + totalDays) {
                
                dayNum = i - firstDayIndex - totalDays + 1;
                currentCellDate = new Date(year, month + 1, dayNum);
                isCurrentMonth = false;
            } else {
                
                dayNum = i - firstDayIndex + 1;
                currentCellDate = new Date(year, month, dayNum);
            }

            const cellDateStr = getLocalDateStr(currentCellDate);
            const isToday = (cellDateStr === todayStr);

            
            const cellTasks = this.tasks.filter(t => t.dueDate === cellDateStr);

            let tasksHTML = '';
            cellTasks.slice(0, 3).forEach(task => {
                const categoryColor = CATEGORIES[task.category]?.color || '#6366f1';
                tasksHTML += `
                    <div class="calendar-task-tag ${task.completed ? 'completed' : ''}" style="border-left-color: ${categoryColor}" draggable="true" data-task-id="${task.id}">
                        <span class="cal-task-dot" style="background-color: ${categoryColor}"></span>
                        <span class="cal-task-name">${task.title}</span>
                    </div>
                `;
            });

            if (cellTasks.length > 3) {
                tasksHTML += `<div class="calendar-more-tasks">+${cellTasks.length - 3} more</div>`;
            }

            gridHTML += `
                <div class="calendar-day-cell ${isCurrentMonth ? '' : 'inactive'} ${isToday ? 'today' : ''}" data-date="${cellDateStr}">
                    <div class="cell-day-num">${dayNum}</div>
                    <div class="cell-tasks-wrap">${tasksHTML}</div>
                </div>
            `;
        }

        container.innerHTML = gridHTML;

        
        container.querySelectorAll('.calendar-day-cell').forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drag-over');
            });
            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drag-over');
            });
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                const selectedDate = cell.getAttribute('data-date');
                if (taskId && selectedDate && this.onTaskDropCallback) {
                    this.onTaskDropCallback(taskId, selectedDate);
                }
            });

            cell.addEventListener('click', (e) => {
                
                if (!e.target.closest('.calendar-task-tag')) {
                    const selectedDate = cell.getAttribute('data-date');
                    this.onAddClickCallback(selectedDate);
                }
            });
        });

        
        container.querySelectorAll('.calendar-task-tag').forEach(tag => {
            tag.addEventListener('dragstart', (e) => {
                const taskId = tag.getAttribute('data-task-id');
                e.dataTransfer.setData('text/plain', taskId);
                e.dataTransfer.effectAllowed = 'move';
            });
        });
    }

    
    
    
    renderWeekView(container, headerTitle) {
        
        const startOfWeek = new Date(this.currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        headerTitle.textContent = `${startOfWeek.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${endOfWeek.toLocaleDateString('en-US', options)}`;

        let gridHTML = '';
        const todayStr = getLocalDateStr(new Date());

        for (let i = 0; i < 7; i++) {
            const currentCellDate = new Date(startOfWeek);
            currentCellDate.setDate(currentCellDate.getDate() + i);
            const cellDateStr = getLocalDateStr(currentCellDate);
            const isToday = (cellDateStr === todayStr);

            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const cellTasks = this.tasks.filter(t => t.dueDate === cellDateStr);

            let tasksListHTML = '';
            if (cellTasks.length === 0) {
                tasksListHTML = '<div class="cal-week-empty">No tasks</div>';
            } else {
                cellTasks.forEach(task => {
                    const categoryColor = CATEGORIES[task.category]?.color || '#6366f1';
                    const timeHTML = task.dueTime ? `<span class="cal-task-time"><i class="fa-regular fa-clock"></i> ${task.dueTime}</span>` : '';
                    tasksListHTML += `
                        <div class="calendar-week-task-card ${task.completed ? 'completed' : ''}" style="border-left-color: ${categoryColor}" draggable="true" data-task-id="${task.id}">
                            <div class="week-task-info">
                                <span class="week-task-title">${task.title}</span>
                                ${timeHTML}
                            </div>
                            <span class="badge badge-${task.priority} cal-pri-badge">${task.priority}</span>
                        </div>
                    `;
                });
            }

            gridHTML += `
                <div class="calendar-week-col ${isToday ? 'today' : ''}">
                    <div class="week-col-header" data-date="${cellDateStr}">
                        <span class="week-day-name">${dayNames[i].substring(0, 3)}</span>
                        <span class="week-day-date">${currentCellDate.getDate()}</span>
                        <button class="week-add-btn" aria-label="Add task to ${dayNames[i]}"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <div class="week-col-body">${tasksListHTML}</div>
                </div>
            `;
        }

        container.innerHTML = gridHTML;

        
        container.querySelectorAll('.calendar-week-col').forEach(col => {
            const header = col.querySelector('.week-col-header');
            const dateStr = header.getAttribute('data-date');
            
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                col.classList.add('drag-over');
            });
            col.addEventListener('dragleave', () => {
                col.classList.remove('drag-over');
            });
            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId && dateStr && this.onTaskDropCallback) {
                    this.onTaskDropCallback(taskId, dateStr);
                }
            });
        });

        
        container.querySelectorAll('.calendar-week-task-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const taskId = card.getAttribute('data-task-id');
                e.dataTransfer.setData('text/plain', taskId);
                e.dataTransfer.effectAllowed = 'move';
            });
        });

        
        container.querySelectorAll('.week-col-header').forEach(header => {
            header.querySelector('.week-add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedDate = header.getAttribute('data-date');
                this.onAddClickCallback(selectedDate);
            });
        });
    }

    
    
    
    renderDayView(container, headerTitle) {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        headerTitle.textContent = this.currentDate.toLocaleDateString('en-US', options);

        const cellDateStr = getLocalDateStr(this.currentDate);
        const dayTasks = this.tasks.filter(t => t.dueDate === cellDateStr);

        let timelineHTML = '';
        
        
        for (let h = 0; h < 24; h++) {
            const timeStr = `${String(h).padStart(2, '0')}:00`;
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h % 12 === 0 ? 12 : h % 12;
            const hourLabel = `${displayHour} ${ampm}`;

            
            const hourTasks = dayTasks.filter(t => {
                if (!t.dueTime) return false;
                const taskHour = parseInt(t.dueTime.split(':')[0]);
                return taskHour === h;
            });

            let hourlyTasksHTML = '';
            hourTasks.forEach(task => {
                const categoryColor = CATEGORIES[task.category]?.color || '#6366f1';
                hourlyTasksHTML += `
                    <div class="calendar-day-task-card ${task.completed ? 'completed' : ''}" style="border-left-color: ${categoryColor}" draggable="true" data-task-id="${task.id}">
                        <div class="day-task-details">
                            <span class="day-task-name">${task.title}</span>
                            <span class="day-task-meta-txt">${task.dueTime} • Category: ${task.category.toUpperCase()}</span>
                        </div>
                    </div>
                `;
            });

            timelineHTML += `
                <div class="day-timeline-row">
                    <div class="timeline-time-col">${hourLabel}</div>
                    <div class="timeline-task-col" data-time="${String(h).padStart(2, '0')}:00">
                        ${hourlyTasksHTML}
                    </div>
                </div>
            `;
        }

        
        const untimedTasks = dayTasks.filter(t => !t.dueTime);
        let untimedHTML = '';
        if (untimedTasks.length > 0) {
            untimedTasks.forEach(task => {
                const categoryColor = CATEGORIES[task.category]?.color || '#6366f1';
                untimedHTML += `
                    <div class="calendar-day-task-card ${task.completed ? 'completed' : ''}" style="border-left-color: ${categoryColor}; display: inline-block; margin-right: 10px; margin-bottom: 10px;" draggable="true" data-task-id="${task.id}">
                        <span class="day-task-name">${task.title}</span>
                    </div>
                `;
            });
            
            untimedHTML = `
                <div class="untimed-row">
                    <div class="untimed-label">Anytime Tasks</div>
                    <div class="untimed-tasks-wrap">${untimedHTML}</div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="day-view-scroll-wrapper">
                ${untimedHTML}
                <div class="timeline-wrapper">${timelineHTML}</div>
            </div>
        `;

        
        container.querySelectorAll('.timeline-task-col').forEach(col => {
            const timeStr = col.getAttribute('data-time');
            
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                col.classList.add('drag-over');
            });
            col.addEventListener('dragleave', () => {
                col.classList.remove('drag-over');
            });
            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId && this.onTaskDropCallback) {
                    this.onTaskDropCallback(taskId, cellDateStr, timeStr);
                }
            });

            col.addEventListener('click', (e) => {
                if (!e.target.closest('.calendar-day-task-card')) {
                    const clickedTime = col.getAttribute('data-time');
                    this.onAddClickCallback(cellDateStr, clickedTime);
                }
            });
        });

        
        container.querySelectorAll('.calendar-day-task-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const taskId = card.getAttribute('data-task-id');
                e.dataTransfer.setData('text/plain', taskId);
                e.dataTransfer.effectAllowed = 'move';
            });
        });
    }
}
