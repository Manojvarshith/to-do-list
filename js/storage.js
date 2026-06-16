

const STORAGE_KEYS = {
    TASKS: 'taskflow_tasks',
    HABITS: 'taskflow_habits',
    XP: 'taskflow_xp',
    LEVEL: 'taskflow_level',
    BADGES: 'taskflow_badges',
    THEME: 'taskflow_theme',
    CREATED: 'taskflow_total_created',
    COMPLETED: 'taskflow_total_completed',
    TOTAL_XP: 'taskflow_total_xp_earned'
};

export function loadState() {
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
    const completedCount = tasks.filter(t => t.completed).length;
    return {
        tasks: tasks,
        habits: JSON.parse(localStorage.getItem(STORAGE_KEYS.HABITS)) || [],
        xp: parseInt(localStorage.getItem(STORAGE_KEYS.XP)) || 0,
        level: parseInt(localStorage.getItem(STORAGE_KEYS.LEVEL)) || 1,
        unlockedBadges: JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [],
        theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
        totalTasksCreated: parseInt(localStorage.getItem(STORAGE_KEYS.CREATED)) || tasks.length,
        totalTasksCompleted: parseInt(localStorage.getItem(STORAGE_KEYS.COMPLETED)) || completedCount,
        totalXpEarned: parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_XP)) || 0
    };
}

export function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function saveHabits(habits) {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

export function saveGamification(xp, level, unlockedBadges) {
    localStorage.setItem(STORAGE_KEYS.XP, xp.toString());
    localStorage.setItem(STORAGE_KEYS.LEVEL, level.toString());
    localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(unlockedBadges));
}

export function saveStats(created, completed, totalXp) {
    localStorage.setItem(STORAGE_KEYS.CREATED, created.toString());
    localStorage.setItem(STORAGE_KEYS.COMPLETED, completed.toString());
    localStorage.setItem(STORAGE_KEYS.TOTAL_XP, totalXp.toString());
}

export function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function resetStorage(type) {
    if (type === 'xp') {
        localStorage.setItem(STORAGE_KEYS.XP, '0');
        localStorage.setItem(STORAGE_KEYS.TOTAL_XP, '0');
    } else if (type === 'level') {
        localStorage.setItem(STORAGE_KEYS.LEVEL, '1');
    } else if (type === 'badges') {
        localStorage.setItem(STORAGE_KEYS.BADGES, '[]');
    } else if (type === 'habits') {
        localStorage.setItem(STORAGE_KEYS.HABITS, '[]');
    } else if (type === 'analytics') {
        localStorage.setItem(STORAGE_KEYS.CREATED, '0');
        localStorage.setItem(STORAGE_KEYS.COMPLETED, '0');
        // also clear tasks completed status
        const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
        tasks.forEach(t => t.completed = false);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } else if (type === 'all') {
        localStorage.clear();
    }
}
