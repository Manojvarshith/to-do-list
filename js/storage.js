/**
 * TaskFlow Storage Module
 * Manages all local storage persistence for tasks, habits, XP, levels, and settings.
 */

const STORAGE_KEYS = {
    TASKS: 'taskflow_tasks',
    HABITS: 'taskflow_habits',
    XP: 'taskflow_xp',
    LEVEL: 'taskflow_level',
    BADGES: 'taskflow_badges',
    THEME: 'taskflow_theme'
};

export function loadState() {
    return {
        tasks: JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [],
        habits: JSON.parse(localStorage.getItem(STORAGE_KEYS.HABITS)) || [],
        xp: parseInt(localStorage.getItem(STORAGE_KEYS.XP)) || 0,
        level: parseInt(localStorage.getItem(STORAGE_KEYS.LEVEL)) || 1,
        unlockedBadges: JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [],
        theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light'
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

export function saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
}
