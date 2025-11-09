import { DOMUtils } from '../utils/dom.js';

/**
 * Dashboard module for handling the main dashboard view
 */
export class DashboardModule {
  constructor() {
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.dashboardView = DOMUtils.getElementById('dashboard-view');
    this.actionCards = document.querySelectorAll('.action-card');
  }

  bindEvents() {
    // Add click handlers to action cards
    this.actionCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const targetView = card.getAttribute('onclick')?.match(/switchView\\('([^']+)'\\)/)?.[1];
        if (targetView) {
          this.switchView(targetView);
        }
      });
    });
  }

  /**
   * Switch to a different view
   */
  switchView(viewName) {
    // Remove active class from all views
    document.querySelectorAll('.content-view').forEach(view => {
      DOMUtils.removeClass(view, 'active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      DOMUtils.removeClass(link, 'active');
    });

    // Show target view
    const targetView = DOMUtils.getElementById(`${viewName}-view`);
    if (targetView) {
      DOMUtils.addClass(targetView, 'active');
    }

    // Activate corresponding nav link
    const navLink = document.querySelector(`[data-view="${viewName}"]`);
    if (navLink) {
      DOMUtils.addClass(navLink, 'active');
    }

    console.log(`Switched to view: ${viewName}`);
  }

  /**
   * Show the dashboard
   */
  show() {
    if (this.dashboardView) {
      DOMUtils.addClass(this.dashboardView, 'active');
    }
  }

  /**
   * Hide the dashboard
   */
  hide() {
    if (this.dashboardView) {
      DOMUtils.removeClass(this.dashboardView, 'active');
    }
  }
}
