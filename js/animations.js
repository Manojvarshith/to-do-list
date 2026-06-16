

export class AnimationController {
    constructor(options = {}) {
        this.options = options; 
        this.observer = null;
        this.observedContainers = new Set();
        this.setupScrollObserver();
    }

    
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
                
                el.textContent = '0';
            }
        });
    }

    
    resetScoreRing() {
        const ring = document.getElementById('score-ring');
        if (ring) {
            ring.style.transition = 'none';
            ring.style.strokeDashoffset = '263.8';
            void ring.offsetWidth; 
            ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
    }

    
    replayStaggerAnimations(activePane) {
        if (!activePane || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const cards = activePane.querySelectorAll(
            '.metric-card, .dashboard-welcome, .dashboard-card, .analytics-card, .task-item, .habit-item, .calendar-grid-container-card, .calendar-sidebar-panel, .focus-arena-card, .badge-card, .achievement-card, .mini-stat, .reminder-item, .badge-showcase-tile'
        );

        cards.forEach((card, index) => {
            card.classList.remove('stagger-in');
            void card.offsetWidth; 
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('stagger-in');
        });
    }

    
    setupScrollObserver() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    if (!card.classList.contains('stagger-in')) {
                        
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
                    
                    entry.target.classList.remove('stagger-in');
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '0px 0px -20px 0px'
        });
    }

    
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

    
    refreshScrollAnimations(container) {
        if (!this.observer) return;
        
        
        this.unobserveElements(container);
        
        
        setTimeout(() => {
            this.observeElements(container);
        }, 50);
    }

    
    animateModal(modal) {
        if (!modal || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-animate-in');
            void modalContent.offsetWidth; 
            modalContent.classList.add('modal-animate-in');
        }
    }

    
    onNavigation(targetTab, activePane) {
        
        if (targetTab === 'dashboard') {
            this.resetCounters();
            this.resetScoreRing();
        }

        
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

        
        this.replayStaggerAnimations(activePane);

        
        this.refreshScrollAnimations(activePane);
    }
}
