/**
 * TaskFlow - Premium To-Do List Application
 * Features: Light/Dark theme, Priority levels, Due dates with alerts, sorting, filtering, and local storage.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // STATE & INITIALIZATION
    // ==========================================================================
    let todos = JSON.parse(localStorage.getItem('taskflow_todos')) || [];

    // DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDate = document.getElementById('task-date');
    const taskPriority = document.getElementById('task-priority');
    const formError = document.getElementById('form-error');
    const errorText = document.getElementById('error-text');

    const searchInput = document.getElementById('search-input');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const sortSelect = document.getElementById('sort-select');
    const taskList = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');

    // Statistics Elements
    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statCompleted = document.getElementById('stat-completed');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressFill = document.getElementById('progress-fill');

    // Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editTaskId = document.getElementById('edit-task-id');
    const editTaskInput = document.getElementById('edit-task-input');
    const editTaskDate = document.getElementById('edit-task-date');
    const editTaskPriority = document.getElementById('edit-task-priority');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Active Filter State
    let currentFilter = 'all';
    let searchQuery = '';
    let currentSort = 'created-desc';

    // Set minimum date picker to today's date for quality usability
    const todayStr = new Date().toISOString().split('T')[0];
    taskDate.min = todayStr;
    editTaskDate.min = todayStr;

    // Theme Management
    initTheme();

    // Render Initial List
    render();

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================
    
    // Add Todo
    taskForm.addEventListener('submit', handleAddTask);
    
    // Search Input Event
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        render();
    });

    // Filter Buttons Events
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentFilter = tab.getAttribute('data-filter');
            render();
        });
    });

    // Sort Dropdown Event
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
    });

    // Toggle Theme Click
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Edit Modal Closing Events
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });
    
    // Edit Modal Submit Event
    editForm.addEventListener('submit', handleSaveEdit);

    // ==========================================================================
    // THEME SYSTEM FUNCTIONS
    // ==========================================================================
    function initTheme() {
        const savedTheme = localStorage.getItem('taskflow_theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.body.classList.add('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.remove('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('taskflow_theme', isDark ? 'dark' : 'light');
        themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }

    // ==========================================================================
    // CORE CRUD ACTIONS
    // ==========================================================================
    
    // Create Task
    function handleAddTask(e) {
        e.preventDefault();
        
        const title = taskInput.value.trim();
        const dueDate = taskDate.value;
        const priority = taskPriority.value;
        
        // Input Validation
        if (!title) {
            showFormError('Task title cannot be empty.');
            return;
        }

        const newTodo = {
            id: Date.now().toString(),
            title,
            dueDate: dueDate || null,
            priority,
            completed: false,
            createdAt: Date.now()
        };

        todos.unshift(newTodo);
        saveToLocalStorage();
        
        // Reset Inputs
        taskForm.reset();
        hideFormError();

        // Render tasks and stats
        render();
    }

    // Save state helper
    function saveToLocalStorage() {
        localStorage.setItem('taskflow_todos', JSON.stringify(todos));
    }

    // Delete Task with Smooth Exit animation
    window.deleteTask = function(id) {
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (taskElement) {
            // Apply CSS trigger class for animation
            taskElement.classList.add('slide-out');
            // Wait for anim to end before removing from memory
            taskElement.addEventListener('animationend', () => {
                todos = todos.filter(todo => todo.id !== id);
                saveToLocalStorage();
                render();
            }, { once: true });
        } else {
            todos = todos.filter(todo => todo.id !== id);
            saveToLocalStorage();
            render();
        }
    };

    // Toggle Task Completed State
    window.toggleComplete = function(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                return { ...todo, completed: !todo.completed };
            }
            return todo;
        });
        saveToLocalStorage();
        render();
    };

    // Open Edit Modal Form
    window.openEditModal = function(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        editTaskId.value = todo.id;
        editTaskInput.value = todo.title;
        editTaskDate.value = todo.dueDate || '';
        editTaskPriority.value = todo.priority;

        editModal.classList.add('active');
        editTaskInput.focus();
    };

    // Close Edit Modal Form
    function closeEditModal() {
        editModal.classList.remove('active');
        editForm.reset();
    }

    // Save Edited Task Details
    function handleSaveEdit(e) {
        e.preventDefault();

        const id = editTaskId.value;
        const updatedTitle = editTaskInput.value.trim();
        const updatedDate = editTaskDate.value;
        const updatedPriority = editTaskPriority.value;

        if (!updatedTitle) {
            alert('Task title is required.');
            return;
        }

        todos = todos.map(todo => {
            if (todo.id === id) {
                return {
                    ...todo,
                    title: updatedTitle,
                    dueDate: updatedDate || null,
                    priority: updatedPriority
                };
            }
            return todo;
        });

        saveToLocalStorage();
        closeEditModal();
        render();
    }

    // ==========================================================================
    // UTILITY / DISPLAY FUNCTIONS
    // ==========================================================================
    
    // Input Error Styling helpers
    function showFormError(message) {
        errorText.textContent = message;
        formError.style.display = 'flex';
        taskInput.style.borderColor = 'var(--high-priority-text)';
        taskInput.focus();
    }

    function hideFormError() {
        formError.style.display = 'none';
        taskInput.style.borderColor = '';
    }

    // Formats Date nicely (e.g. "Tomorrow", "Today", or "Jun 16")
    function formatDueDate(dateString, isCompleted) {
        if (!dateString) return '';

        const today = new Date();
        today.setHours(0,0,0,0);
        
        const dueDate = new Date(dateString);
        dueDate.setHours(0,0,0,0);
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Format dates into Month Day (e.g. Jun 16)
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const formattedDate = dueDate.toLocaleDateString('en-US', options);

        if (diffDays === 0) {
            return { text: 'Today', statusClass: 'today' };
        } else if (diffDays === 1) {
            return { text: 'Tomorrow', statusClass: 'tomorrow' };
        } else if (diffDays === -1) {
            return { text: 'Yesterday', statusClass: isCompleted ? '' : 'overdue' };
        } else if (diffDays < 0) {
            return { text: `Overdue: ${formattedDate}`, statusClass: isCompleted ? '' : 'overdue' };
        } else {
            return { text: `Due: ${formattedDate}`, statusClass: '' };
        }
    }

    // Mapping priorities to sorting ranks
    const priorityWeight = {
        'high': 3,
        'medium': 2,
        'low': 1
    };

    // Calculate dynamic dashboard stats
    function updateStats() {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const pending = total - completed;
        const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

        statTotal.textContent = total;
        statPending.textContent = pending;
        statCompleted.textContent = completed;
        progressPercentage.textContent = `${pct}%`;
        progressFill.style.width = `${pct}%`;
    }

    // ==========================================================================
    // RENDER & FILTER PROCESSOR
    // ==========================================================================
    function render() {
        // 1. Refresh stats metrics
        updateStats();

        // 2. Filter list based on tabs & search query
        let filteredTodos = todos.filter(todo => {
            // Apply category filter tabs
            if (currentFilter === 'pending' && todo.completed) return false;
            if (currentFilter === 'completed' && !todo.completed) return false;

            // Apply search match
            if (searchQuery && !todo.title.toLowerCase().includes(searchQuery)) return false;

            return true;
        });

        // 3. Sort tasks
        filteredTodos.sort((a, b) => {
            switch (currentSort) {
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
                    return priorityWeight[b.priority] - priorityWeight[a.priority];
                case 'priority-asc':
                    return priorityWeight[a.priority] - priorityWeight[b.priority];
                default:
                    return b.createdAt - a.createdAt;
            }
        });

        // 4. Update Empty State visibility
        if (filteredTodos.length === 0) {
            emptyState.classList.remove('hidden');
            taskList.innerHTML = '';
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        // 5. Populate list items
        taskList.innerHTML = filteredTodos.map((todo) => {
            const priorityBadge = todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1);
            const dateDetails = formatDueDate(todo.dueDate, todo.completed);
            
            let dateBadgeHTML = '';
            if (todo.dueDate) {
                const overdueClass = dateDetails.statusClass === 'overdue' ? 'overdue' : '';
                dateBadgeHTML = `
                    <span class="badge date-badge ${overdueClass}">
                        <i class="fa-regular fa-clock"></i> ${dateDetails.text}
                    </span>
                `;
            }

            return `
                <li class="task-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                    <div class="task-item-left">
                        <label class="checkbox-wrapper" aria-label="Mark task as complete">
                            <input type="checkbox" ${todo.completed ? 'checked' : ''} onclick="toggleComplete('${todo.id}')">
                            <span class="checkmark"></span>
                        </label>
                        <div class="task-content">
                            <span class="task-title">${escapeHTML(todo.title)}</span>
                            <div class="task-meta">
                                <span class="badge badge-${todo.priority}">
                                    <i class="fa-solid fa-circle" style="font-size: 0.5rem; margin-right: 2px;"></i> ${priorityBadge}
                                </span>
                                ${dateBadgeHTML}
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="action-btn edit-btn" onclick="openEditModal('${todo.id}')" aria-label="Edit Task">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask('${todo.id}')" aria-label="Delete Task">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    // Escape raw HTML strings to guard against DOM injections (XSS)
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
