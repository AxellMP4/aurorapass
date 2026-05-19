// Dashboard module - Handles customizable dashboards, widgets, and layouts
import { supabase } from './supabase-client.js';
import { showToast } from './main.js';

/**
 * Get available widget types for the dashboard
 * @returns {Promise<Array>} - Array of widget definitions
 */
export async function getAvailableWidgets() {
    try {
        const { data, error } = await supabase
            .from('dashboard_widgets')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error(`Échec de récupération des widgets disponibles: ${error.message}`);
    }
}

/**
 * Save a dashboard layout configuration
 * @param {Object} layoutData - Layout configuration to save
 * @returns {Promise<Object>} - Saved layout data
 */
export async function saveDashboardLayout(layoutData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('dashboard_layouts')
            .upsert({
                user_id: user.id,
                event_id: layoutData.eventId || null,
                name: layoutData.name,
                layout_config: layoutData.config,
                is_default: layoutData.isDefault || false
            }, {
                onConflict: ['user_id', 'event_id', 'name']
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        throw new Error(`Échec de sauvegarde de la disposition du tableau de bord: ${error.message}`);
    }
}

/**
 * Get dashboard layouts for a user
 * @param {string} eventId - Optional event ID to filter layouts (null for global layouts)
 * @returns {Promise<Array>} - Array of layouts
 */
export async function getDashboardLayouts(eventId = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        let query = supabase
            .from('dashboard_layouts')
            .select('*')
            .eq('user_id', user.id);

        if (eventId !== null) {
            query = query.eq('event_id', eventId);
        } else {
            query = query.is('event_id', null); // Global layouts
        }

        const { data, error } = await query.order('is_default', { ascending: false })
                                          .then('name', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error(`Échec de récupération des dispositions du tableau de bord: ${error.message}`);
    }
}

/**
 * Delete a dashboard layout
 * @param {string} layoutId - Layout ID to delete
 * @returns {Promise<void>}
 */
export async function deleteDashboardLayout(layoutId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const { error } = await supabase
            .from('dashboard_layouts')
            .delete()
            .eq('id', layoutId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de suppression de la disposition du tableau de bord: ${error.message}`);
    }
}

/**
 * Render a dashboard layout into a container element
 * @param {HTMLElement} container - DOM element to render the dashboard into
 * @param {Object} layout - Layout configuration to render
 * @param {Object} context - Additional context (event data, user permissions, etc.)
 * @returns {Promise<void>}
 */
export async function renderDashboardLayout(container, layout, context = {}) {
    try {
        // Clear container
        container.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.className = 'dashboard-header';
        header.innerHTML = `
            <h2>${layout.name || 'Tableau de bord'}</h2>
            <div class="dashboard-actions">
                <button id="edit-layout-btn" class="btn btn-sm btn-outline">Modifier</button>
                <button id="refresh-btn" class="btn btn-sm btn-outline">Actualiser</button>
            </div>
        `;
        container.appendChild(header);

        // Create main content area
        const main = document.createElement('div');
        main.className = 'dashboard-main';
        container.appendChild(main);

        // Parse layout config
        const config = layout.layout_config || { tabs: [], widgets: [] };

        // If tabs are defined, create tab navigation
        if (config.tabs && config.tabs.length > 0) {
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'dashboard-tabs';

            const tabList = document.createElement('div');
            tabList.className = 'tab-list';

            const tabPanels = document.createElement('div');
            tabPanels.className = 'tab-panels';

            config.tabs.forEach((tab, index) => {
                const tabBtn = document.createElement('button');
                tabBtn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
                tabBtn.textContent = tab.label || `Onglet ${index + 1}`;
                tabBtn.dataset.tabIndex = index;
                tabList.appendChild(tabBtn);

                const tabPanel = document.createElement('div');
                tabPanel.className = `tab-panel ${index === 0 ? 'active' : ''}`;
                tabPanel.dataset.tabIndex = index;
                tabPanels.appendChild(tabPanel);
            });

            tabsContainer.appendChild(tabList);
            tabsContainer.appendChild(tabPanels);
            main.appendChild(tabsContainer);

            // Add tab switching logic
            tabList.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-btn')) {
                    const index = parseInt(e.target.dataset.tabIndex);
                    // Deactivate all tabs
                    tabList.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    tabPanels.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                    // Activate selected tab
                    e.target.classList.add('active');
                    tabPanels.querySelector(`[data-tab-index="${index}"]`).classList.add('active');
                }
            });

            // Render widgets for each tab
            config.widgets.forEach(widgetConfig => {
                const tabIndex = widgetConfig.tabIndex || 0;
                const tabPanel = tabPanels.querySelector(`[data-tab-index="${tabIndex}"]`);
                if (tabPanel) {
                    renderWidget(tabPanel, widgetConfig, context);
                }
            });
        } else {
            // No tabs, render widgets directly in main
            config.widgets.forEach(widgetConfig => {
                renderWidget(main, widgetConfig, context);
            });
        }

        // Add refresh button listener
        const refreshBtn = container.querySelector('#refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Re-render the dashboard (could be optimized to only refresh widgets)
                renderDashboardLayout(container, layout, context);
                showToast('Tableau de bord actualisé', 'success');
            });
        }

        // Add edit button listener (placeholder)
        const editBtn = container.querySelector('#edit-layout-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                showToast('Éditeur de disposition à implémenter', 'info');
            });
        }
    } catch (error) {
        throw new Error(`Échec de rendu de la disposition du tableau de bord: ${error.message}`);
    }
}

/**
 * Render a single widget into a container
 * @param {HTMLElement} container - DOM element to render the widget into
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context (event data, user permissions, etc.)
 */
function renderWidget(container, widgetConfig, context) {
    // Create widget container
    const widget = document.createElement('div');
    widget.className = `widget widget-${widgetConfig.type || 'metric'}`;

    // Apply sizing classes if provided
    if (widgetConfig.size) {
        widget.classList.add(`widget-size-${widgetConfig.size}`);
    }

    // Create widget header
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.innerHTML = `
        <h3 class="widget-title">${widgetConfig.title || 'Widget'}</h3>
        <div class="widget-controls">
            ${widgetConfig.refreshable ? '<button class="widget-refresh-btn btn btn-sm btn-outline">🔄</button>' : ''}
        </div>
    `;
    widget.appendChild(header);

    // Create widget body
    const body = document.createElement('div');
    body.className = 'widget-body';
    widget.appendChild(body);

    // Add to container
    container.appendChild(widget);

    // Render widget content based on type
    renderWidgetContent(body, widgetConfig, context);

    // Add refresh listener if applicable
    if (widgetConfig.refreshable) {
        const refreshBtn = widget.querySelector('.widget-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                // Show loading state
                body.innerHTML = '<div class="loading-spinner"></div>';
                // Re-render after a short delay (in real app, would fetch fresh data)
                setTimeout(() => {
                    renderWidgetContent(body, widgetConfig, context);
                    showToast('Widget actualisé', 'success');
                }, 500);
            });
        }
    }
}

/**
 * Render the content of a widget based on its type
 * @param {HTMLElement} container - DOM element to render content into
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context
 */
function renderWidgetContent(container, widgetConfig, context) {
    // Show loading state initially
    container.innerHTML = '<div class="loading-spinner"></div>';

    // In a real implementation, we would fetch data based on widget type and config
    // For now, we'll show placeholder content

    setTimeout(() => {
        switch (widgetConfig.type) {
            case 'metric':
                renderMetricWidget(container, widgetConfig, context);
                break;
            case 'chart':
                renderChartWidget(container, widgetConfig, context);
                break;
            case 'list':
                renderListWidget(container, widgetConfig, context);
                break;
            case 'timeline':
                renderTimelineWidget(container, widgetConfig, context);
                break;
            case 'donut':
                renderDonutWidget(container, widgetConfig, context);
                break;
            default:
                container.innerHTML = '<p>Type de widget non supporté</p>';
        }
    }, 300); // Simulate network delay
}

/**
 * Render a metric widget (simple counter or value)
 * @param {HTMLElement} container - DOM element
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context
 */
function renderMetricWidget(container, widgetConfig, context) {
    const { label, value, prefix = '', suffix = '', trend = null } = widgetConfig.data || {};

    container.innerHTML = `
        <div class="metric-content">
            ${label ? `<div class="metric-label">${label}</div>` : ''}
            <div class="metric-value">
                <span class="metric-prefix">${prefix}</span>
                <span class="metric-number">${value !== null && value !== undefined ? value : '--'}</span>
                <span class="metric-suffix">${suffix}</span>
            </div>
            ${trend !== null ?
                `<div class="metric-trend ${trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral'}">
                    ${trend > 0 ? '▲' : trend < 0 ? '▼' : '―'} ${Math.abs(trend)}%
                </div>` : ''
            }
        </div>
    `;
}

/**
 * Render a chart widget (placeholder for actual charting library)
 * @param {HTMLElement} container - DOM element
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context
 */
function renderChartWidget(container, widgetConfig, context) {
    container.innerHTML = `
        <div class="chart-placeholder">
            <div class="chart-icon">📊</div>
            <div class="chart-label">${widgetConfig.data?.label || 'Graphique'}</div>
            <div class="chart-note">Graphique à implémenter avec une bibliothèque comme Chart.js ou ApexCharts</div>
        </div>
    `;
}

/**
 * Render a list widget
 * @param {HTMLElement} container - DOM element
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context
 */
function renderListWidget(container, widgetConfig, context) {
    const items = widgetConfig.data?.items || [];

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun élément à afficher</p>';
        return;
    }

    container.innerHTML = `
        <div class="list-content">
            ${items.map((item, index) => `
                <div class="list-item">
                    <div class="list-item-content">
                        ${item.icon ? `<div class="list-item-icon">${item.icon}</div>` : ''}
                        <div class="list-item-text">
                            <div class="list-item-title">${item.title || `Élément ${index + 1}`}</div>
                            ${item.subtitle ? `<div class="list-item-subtitle">${item.subtitle}</div>` : ''}
                        </div>
                    </div>
                    ${item.value ? `<div class="list-item-value">${item.value}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render a timeline widget
 * @param {HTMLElement} container - DOM element
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context
 */
function renderTimelineWidget(container, widgetConfig, context) {
    const events = widgetConfig.data?.events || [];

    if (events.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucun événement à afficher</p>';
        return;
    }

    container.innerHTML = `
        <div class="timeline">
            ${events.map((event, index) => `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-title">${event.title || `Événement ${index + 1}`}</span>
                            <span class="timeline-time">${event.time || ''}</span>
                        </div>
                        ${event.description ? `<div class="timeline-description">${event.description}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render a donut/widget chart widget
 * @param {HTMLElement} container - DOM element
 * @param {Object} widgetConfig - Widget configuration
 * @param {Object} context - Additional context
 */
function renderDonutWidget(container, widgetConfig, context) {
    const labels = widgetConfig.data?.labels || [];
    const values = widgetConfig.data?.values || [];

    if (labels.length === 0 || values.length === 0) {
        container.innerHTML = '<p class="empty-state">Données insuffisantes pour le graphique</p>';
        return;
    }

    // Simple donut using CSS - in real app would use charting library
    const total = values.reduce((sum, val) => sum + val, 0);
    const percentages = values.map(val => total > 0 ? (val / total) * 100 : 0);

    container.innerHTML = `
        <div class="donut-chart">
            <div class="donut-center">
                <div class="donut-value">
                    ${widgetConfig.data?.centerLabel || ''}<br>
                    <span class="donut-number">${widgetConfig.data?.centerValue || ''}</span>
                </div>
            </div>
            <div class="donut-ring">
                ${labels.map((label, index) => {
                    const percentage = percentages[index];
                    const color = widgetConfig.data?.colors?.[index] ||
                                 ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#8e8e93'][index % 5] ||
                                 '#007aff';
                    return `
                        <div class="donut-slice" style="
                            background: conic-gradient(
                                ${color} 0% ${percentage}%,
                                transparent ${percentage}% 100%
                            );
                        ">
                            <div class="donut-label">
                                <span>${label}</span>
                                <span>${percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Subscribe to real-time updates for dashboard data
 * @param {string} eventId - Event ID to subscribe to
 * @param {Function} callback - Callback function when data changes
 * @param {Object} options - Subscription options
 * @returns {Object} - Subscription object with unsubscribe method
 */
export async function subscribeToRealtimeUpdates(eventId, callback, options = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user has access to this event
        const { checkEventAccess } = await import('./event-management.js');
        const hasAccess = await checkEventAccess(eventId, user.id);
        if (!hasAccess) {
            throw new Error('Access denied to this event');
        }

        // Subscribe to relevant tables based on options
        const channels = [];

        // Guest status changes
        if (options.includeGuestStatus !== false) {
            const guestChannel = supabase
                .channel(`guest-status-${eventId}`)
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'guests', filter: `event_id=eq.${eventId}` },
                    payload => {
                        callback({ type: 'guest_status_update', payload: payload.new });
                    }
                )
                .subscribe();
            channels.push(guestChannel);
        }

        // New guests
        if (options.includeNewGuests !== false) {
            const newGuestChannel = supabase
                .channel(`new-guests-${eventId}`)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'guests', filter: `event_id=eq.${eventId}` },
                    payload => {
                        callback({ type: 'new_guest', payload: payload.new });
                    }
                )
                .subscribe();
            channels.push(newGuestChannel);
        }

        // QR scan events
        if (options.includeQrScans !== false) {
            const qrChannel = supabase
                .channel(`qr-scans-${eventId}`)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'qr_scan_logs', filter: `event_id=eq.${eventId}` },
                    payload => {
                        callback({ type: 'qr_scan', payload: payload.new });
                    }
                )
                .subscribe();
            channels.push(qrChannel);
        }

        // Return unsubscribe function
        return {
            unsubscribe: () => {
                channels.forEach(channel => {
                    supabase.removeChannel(channel);
                });
            }
        };
    } catch (error) {
        throw new Error(`Échec d'abonnement aux mises à jour en temps réel: ${error.message}`);
    }
}

// Export all functions
export {
    getAvailableWidgets,
    saveDashboardLayout,
    getDashboardLayouts,
    deleteDashboardLayout,
    renderDashboardLayout,
    subscribeToRealtimeUpdates
};