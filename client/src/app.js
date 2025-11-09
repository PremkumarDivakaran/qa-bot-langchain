import { ClipboardUtils } from './utils/clipboard.js';
import { DOMUtils } from './utils/dom.js';
import { apiService } from './services/api.js';
import { DashboardModule } from './modules/dashboard/dashboard.js';

/**
 * Main QA Bot Client Application
 */
class QABotApplication {
  constructor() {
    this.modules = {};
    this.currentView = 'dashboard';
    
    this.initializeApplication();
  }

  async initializeApplication() {
    console.log('🚀 Initializing QA Bot Client Application...');
    
    // Initialize modules
    this.initializeModules();
    
    // Setup navigation
    this.setupNavigation();
    
    // Setup global event listeners
    this.setupGlobalEvents();
    
    // Check server health
    await this.checkServerHealth();
    
    console.log('✅ QA Bot Client Application ready!');
  }

  initializeModules() {
    // Initialize dashboard module
    this.modules.dashboard = new DashboardModule();
    
    console.log('📦 Modules initialized');
  }

  setupNavigation() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = link.getAttribute('data-view');
        if (viewName) {
          this.switchView(viewName);
        }
      });
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  setupGlobalEvents() {
    // Global clipboard function for support page
    window.copyEmailAddress = () => ClipboardUtils.copyEmailAddress();
    
    // Global view switcher
    window.switchView = (viewName) => this.switchView(viewName);
  }

  async checkServerHealth() {
    try {
      const health = await apiService.checkHealth();
      console.log('🔗 Server connection established:', health);
      DOMUtils.createNotification('Connected to server', 'success');
    } catch (error) {
      console.error('❌ Server health check failed:', error);
      DOMUtils.createNotification('Server connection failed', 'error');
    }
  }

  switchView(viewName) {
    // Update current view
    this.currentView = viewName;
    
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

    // Notify modules about view change
    if (this.modules[viewName] && this.modules[viewName].onViewActivated) {
      this.modules[viewName].onViewActivated();
    }

    console.log(`📍 Switched to view: ${viewName}`);
  }

  switchTab(tabName) {
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      DOMUtils.removeClass(btn, 'active');
    });

    // Remove active class from all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      DOMUtils.removeClass(panel, 'active');
    });

    // Activate clicked tab button
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      DOMUtils.addClass(activeButton, 'active');
    }

    // Show corresponding tab panel
    const activePanel = DOMUtils.getElementById(`${tabName}-panel`);
    if (activePanel) {
      DOMUtils.addClass(activePanel, 'active');
    }

    console.log(`📑 Switched to tab: ${tabName}`);
  }

  /**
   * Get current view name
   */
  getCurrentView() {
    return this.currentView;
  }

  /**
   * Get module instance
   */
  getModule(name) {
    return this.modules[name];
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.qaBot = new QABotApplication();
});

export default QABotApplication;
