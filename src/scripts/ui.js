// UI module - Handles theme, responsive behavior, and UI utilities
import { supabase } from './supabase-client.js';
import { showToast } from './main.js';

/**
 * Initialize UI components (theme, responsive behavior, etc.)
 */
export function initUI() {
    // Initialize theme from localStorage or system preference
    initTheme();

    // Initialize responsive behavior
    initResponsiveBehavior();

    // Add smooth scrolling for anchor links
    initSmoothScrolling();

    // Initialize touch gestures for mobile
    initTouchGestures();
}

/**
 * Initialize theme (light/dark) based on system preference or user choice
 */
function initTheme() {
    const storedTheme = localStorage.getItem('aurorapass-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('aurorapass-theme')) {
            if (e.matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        }
    });
}

/**
 * Initialize responsive behavior
 */
function initResponsiveBehavior() {
    // Handle viewport meta tag for mobile
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';

    // Add CSS class for touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.documentElement.classList.add('touch-device');
    }
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Initialize touch gestures for mobile
 */
function initTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const gestureZone = document.getElementById('app');
    if (!gestureZone) return;

    gestureZone.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);

    gestureZone.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleGesture();
    }, false);

    function handleGesture() {
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        // Swipe left/right detection (horizontal swipe)
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            if (dx > 0) {
                // Swipe right - could go back or show menu
                // For now, just prevent default to avoid accidental navigation
                // In a real app, you might implement navigation here
            } else {
                // Swipe left
            }
        }
        // Swipe up/down detection (vertical swipe)
        else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
            if (dy > 0) {
                // Swipe down - could refresh or show quick actions
            } else {
                // Swipe up - could show menu or quick actions
            }
        }
    }
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
    const htmlElement = document.documentElement;
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('aurorapass-theme', newTheme);

    // Dispatch event for other modules to react to theme change
    window.dispatchEvent(new Event('theme-change'));
}

/**
 * Show loading indicator
 * @param {boolean} show - Whether to show or hide loading indicator
 * @param {string} message - Optional loading message
 */
export function showLoading(show, message = 'Chargement...') {
    let loadingOverlay = document.getElementById('loading-overlay');

    if (show) {
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            `;
            document.body.appendChild(loadingOverlay);
        }
    } else {
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

/**
 * Create a modal dialog
 * @param {Object} options - Modal options
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content (HTML string)
 * @param {Array} options.buttons - Array of button objects {text, callback, isPrimary}
 * @returns {Object} - Modal object with close method
 */
export function createModal(options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            ${options.title ? `<h2 class="modal-title">${options.title}</h2>` : ''}
            <div class="modal-body">
                ${options.content || ''}
            </div>
            ${options.buttons && options.buttons.length > 0 ? `
                <div class="modal-footer">
                    ${options.buttons.map((btn, index) => `
                        <button class="btn ${btn.isPrimary ? 'btn-primary' : 'btn-outline'} ${index === options.buttons.length - 1 ? 'btn-lg' : ''}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(modal);

    // Trigger reflow for animation
    void modal.offsetWidth;
    modal.classList.add('show');

    // Handle backdrop click to close
    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
        closeModal(modal);
    });

    // Handle escape key to close
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(modal);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Return modal object with close method
    return {
        close: () => {
            closeModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        },
        element: modal
    };

    function closeModal(modalEl) {
        modalEl.classList.remove('show');
        setTimeout(() => {
            modalEl.remove();
        }, 300); // Match CSS transition duration
    }
}

/**
 * Show a confirmation dialog
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled
 * @param {Object} options - Additional options
 * @returns {Object} - Confirmation dialog object
 */
export function confirm(message, onConfirm, onCancel, options = {}) {
    return createModal({
        title: options.title || 'Confirmation',
        content: `<p class="modal-message">${message}</p>`,
        buttons: [
            {
                text: options.cancelText || 'Annuler',
                callback: () => {
                    if (onCancel) onCancel();
                }
            },
            {
                text: options.confirmText || 'Confirmer',
                callback: () => {
                    if (onConfirm) onConfirm();
                },
                isPrimary: true
            }
        ]
    });
}

/**
 * Show a prompt dialog
 * @param {string} message - Prompt message
 * @param {Function} onSubmit - Callback when submitted with value
 * @param {Function} onCancel - Callback when cancelled
 * @param {Object} options - Additional options
 * @returns {Object} - Prompt dialog object
 */
export function prompt(message, onSubmit, onCancel, options = {}) {
    const modal = createModal({
        title: options.title || 'Saisie',
        content: `
            <p class="modal-message">${message}</p>
            <div class="form-group">
                <input type="text" id="prompt-input" class="form-input" placeholder="${options.placeholder || ''}" />
            </div>
        `,
        buttons: [
            {
                text: options.cancelText || 'Annuler',
                callback: () => {
                    if (onCancel) onCancel();
                }
            },
            {
                text: options.submitText || 'OK',
                callback: () => {
                    const input = document.getElementById('prompt-input');
                    if (onSubmit) onSubmit(input.value.trim());
                },
                isPrimary: true
            }
        ]
    });

    // Focus input when modal opens
    setTimeout(() => {
        const input = document.getElementById('prompt-input');
        if (input) input.focus();
    }, 350);

    return {
        close: () => modal.close(),
        element: modal.element
    };
}

/**
 * Format date/time for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export function formatDate(date, options = {}) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';

    const locale = options.locale || 'fr-FR';
    const type = options.type || 'datetime'; // date, time, datetime

    if (type === 'date') {
        return dateObj.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (type === 'time') {
        return dateObj.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        return dateObj.toLocaleString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * Format number for display
 * @param {number} number - Number to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted number string
 */
export function formatNumber(number, options = {}) {
    if (number === null || number === undefined) return '--';

    const locale = options.locale || 'fr-FR';
    const type = options.type || 'decimal'; // decimal, percent, currency

    if (type === 'percent') {
        return new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits: options.minimumFractionDigits || 1,
            maximumFractionDigits: options.maximumFractionDigits || 1
        }).format(number / 100); // Assuming input is already percentage (e.g., 75 for 75%)
    } else if (type === 'currency') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: options.currency || 'EUR'
        }).format(number);
    } else {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: options.minimumFractionDigits || 0,
            maximumFractionDigits: options.maximumFractionDigits || 0
        }).format(number);
    }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} position - Where to truncate ('start', 'middle', 'end')
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = 100, position = 'end') {
    if (!text || text.length <= maxLength) return text;

    if (position === 'start') {
        return '…' + text.slice(text.length - maxLength + 1);
    } else if (position === 'middle') {
        const start = Math.floor((maxLength - 1) / 2);
        const end = Math.ceil((maxLength - 1) / 2);
        return text.slice(0, start) + '…' + text.slice(text.length - end);
    } else {
        // end (default)
        return text.slice(0, maxLength - 1) + '…';
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - True if successful
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copié dans le presse-papiers', 'success');
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Prevent scrolling to bottom
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            showToast(successful ? 'Copié dans le presse-papiers' : 'Échec de la copie',
                    successful ? 'success' : 'error');
            return successful;
        } catch (err) {
            showToast('Échec de la copie', 'error');
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

/**
 * Debounce function - returns a function that will only be executed after delay milliseconds
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle function - returns a function that will only be executed once per delay milliseconds
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, delay) {
    let lastExecuted = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastExecuted >= delay) {
            func.apply(this, args);
            lastExecuted = now;
        }
    };
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if element is in viewport
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Add CSS class when element enters viewport (for animations)
 * @param {string} selector - CSS selector for elements to observe
 * @param {string} className - Class to add when in viewport
 * @param {Object} options - Observer options
 */
export function animateOnScroll(selector, className, options = {}) {
    const threshold = options.threshold || 0.1;
    const rootMargin = options.rootMargin || '0px';

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add(className);
                if (options.once !== false) { // Default to true for once-only animation
                    observer.unobserve(entry.target);
                }
            } else if (options.reset !== false) { // Default to false - don't remove when out of view
                entry.target.classList.remove(className);
            }
        });
    }, { threshold, rootMargin });

    document.querySelectorAll(selector).forEach(element => {
        observer.observe(element);
    });

    return observer;
}