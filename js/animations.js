/**
 * TaskFlow Animation Controller Module
 * Handles resetting and replaying staggered transitions, numeric counters, SVG rings, and canvas animations.
 */

export class AnimationController {
    constructor(options = {}) {
        this.options = options; // Callbacks: onResetChart, onResetHeatmap
        this.observer = null;
        this.observedContainers = new Set();
        this.setupScrollObserver();
    }

    /**
     * Resets counters to 0 and deletes their tracking attributes,
     * so they count up from 0 during renderAll.
     */
    resetCounters() {
        const counters = [
            { id: 'score-value', attr: 'data-score' },
            { id: 'dash-total', attr: 'data-value' },
            { id: 'dash-pending', attr: 'data-value' },
            { id: 'dash-completed', attr: 'data-value' },
            { id: 'dash-overdue', attr: 'data-value' },
            { id: 'dash-streak-count', attr: 'data-value' }
        ];

        counters.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) {
                el.removeAttribute(c.attr);
                el.removeAttribute('data-value');
                // Temporarily set to '0' so the start value is 0
                el.textContent = '0';
            }
        });
    }

    /**
     * Resets the stroke-dashoffset of the SVG Productivity Score ring
     * so it transitions smoothly from empty to full.
     */
    resetScoreRing() {
        const ring = document.getElementById('score-ring');
        if (ring) {
            ring.style.transition = 'none';
            ring.style.strokeDashoffset = '263.8';
            void ring.offsetWidth; // Force layout recalculation / reflow
            ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
    }

    /**
     * Manually triggers stagger animation on all animateable children in the active pane.
     */
    replayStaggerAnimations(activePane) {
        if (!activePane || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const cards = activePane.querySelectorAll(
            '.metric-card, .dashboard-welcome, .dashboard-card, .analytics-card, .task-item, .habit-item, .calendar-grid-container-card, .calendar-sidebar-panel, .focus-arena-card, .badge-card, .achievement-card, .mini-stat, .reminder-item, .badge-showcase-tile'
        );

        cards.forEach((card, index) => {
            card.classList.remove('stagger-in');
            void card.offsetWidth; // Force reflow
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('stagger-in');
        });
    }

    /**
     * Sets up IntersectionObserver to trigger stagger entrance animations when elements enter viewport.
     */
    setupScrollObserver() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    if (!card.classList.contains('stagger-in')) {
                        // Determine position in viewport relative to siblings to calculate dynamic delay
                        const parent = card.parentElement;
                        let index = 0;
                        if (parent) {
                            const siblings = Array.from(parent.children);
                            index = siblings.indexOf(card);
                        }
                        card.style.animationDelay = `${(index % 6) * 0.05}s`;
                        card.classList.add('stagger-in');
                    }
                } else {
                    // Reset stagger-in class when it scrolls out, so it can re-animate when scrolled back in
                    entry.target.classList.remove('stagger-in');
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px -20px 0px'
        });
    }

    /**
     * Starts observing elements inside a container for scroll-triggered animations.
     */
    observeElements(container) {
        if (!this.observer || !container) return;
        
        const cards = container.querySelectorAll(
            '.metric-card, .dashboard-welcome, .dashboard-card, .analytics-card, .task-item, .habit-item, .calendar-grid-container-card, .calendar-sidebar-panel, .focus-arena-card, .badge-card, .achievement-card, .mini-stat, .reminder-item, .badge-showcase-tile'
        );

        cards.forEach(card => {
            this.observer.observe(card);
        });
        this.observedContainers.add(container);
    }

    /**
     * Stop observing elements in a container.
     */
    unobserveElements(container) {
        if (!this.observer || !container) return;
        
        const cards = container.querySelectorAll(
            '.metric-card, .dashboard-welcome, .dashboard-card, .analytics-card, .task-item, .habit-item, .calendar-grid-container-card, .calendar-sidebar-panel, .focus-arena-card, .badge-card, .achievement-card, .mini-stat, .reminder-item, .badge-showcase-tile'
        );

        cards.forEach(card => {
            this.observer.unobserve(card);
        });
        this.observedContainers.delete(container);
    }

    /**
     * Resets observations and sets them up fresh for all cards in the current viewport.
     */
    refreshScrollAnimations(container) {
        if (!this.observer) return;
        
        // Remove previous observations in this container
        this.unobserveElements(container);
        
        // Let layout settle, then observe again
        setTimeout(() => {
            this.observeElements(container);
        }, 50);
    }

    /**
     * Adds entrance classes to a modal popup wrapper to play premium pop effect.
     */
    animateModal(modal) {
        if (!modal || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-animate-in');
            void modalContent.offsetWidth; // Force reflow
            modalContent.classList.add('modal-animate-in');
        }
    }

    /**
     * Triggers when tab or dashboard view switches.
     */
    onNavigation(targetTab, activePane) {
        // 1. Reset metrics/counters
        if (targetTab === 'dashboard') {
            this.resetCounters();
            this.resetScoreRing();
        }

        // 2. Trigger chart / heatmap resets if callbacks provided
        if (targetTab === 'dashboard') {
            if (this.options.onResetChart) {
                this.options.onResetChart();
            }
            if (this.options.onResetHeatmap) {
                this.options.onResetHeatmap();
            }
        } else if (targetTab === 'habits') {
            if (this.options.onResetHeatmap) {
                this.options.onResetHeatmap();
            }
        }

        // 3. Replay entrance transition animations
        this.replayStaggerAnimations(activePane);

        // 4. Refresh Scroll observer for viewport elements
        this.refreshScrollAnimations(activePane);
    }
}
