/**
 * Utility functions for clipboard operations
 */
export class ClipboardUtils {
  /**
   * Copy email address to clipboard with fallback support
   */
  static async copyEmailAddress() {
    const email = 'premkumardivakaran10@gmail.com';
    const button = document.querySelector('button[onclick="copyEmailAddress()"]');
    
    try {
      await this.copyToClipboard(email, button);
    } catch (error) {
      console.error('Failed to copy email:', error);
    }
  }

  /**
   * Copy text to clipboard with visual feedback
   */
  static async copyToClipboard(text, button = null) {
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        this.showCopySuccess(button);
      } catch (err) {
        console.error('Clipboard API failed:', err);
        this.fallbackCopy(text, button);
      }
    } else {
      console.log('Clipboard API not available, using fallback method');
      this.fallbackCopy(text, button);
    }
  }

  /**
   * Show success feedback
   */
  static showCopySuccess(button) {
    if (!button) return;

    const originalHtml = button.innerHTML;
    const originalStyle = button.style.background;
    
    button.innerHTML = '<i class="fas fa-check"></i> Copied!';
    button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    button.style.color = 'white';
    
    setTimeout(() => {
      button.innerHTML = originalHtml;
      button.style.background = originalStyle;
      button.style.color = '#3b82f6';
    }, 2000);
  }

  /**
   * Show error feedback
   */
  static showCopyError(button, text) {
    if (button) {
      const originalHtml = button.innerHTML;
      const originalStyle = button.style.background;
      
      button.innerHTML = '<i class="fas fa-times"></i> Failed';
      button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      button.style.color = 'white';
      
      setTimeout(() => {
        button.innerHTML = originalHtml;
        button.style.background = originalStyle;
        button.style.color = '#3b82f6';
      }, 3000);
    }
    
    // Show user-friendly message
    setTimeout(() => {
      alert('Copy failed. Please manually copy this text:\\n\\n' + text);
    }, 100);
  }

  /**
   * Fallback copy method for older browsers
   */
  static fallbackCopy(text, button) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Style to be invisible
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('Fallback copy successful');
        this.showCopySuccess(button);
      } else {
        throw new Error('execCommand failed');
      }
      
    } catch (fallbackErr) {
      console.error('All copy methods failed:', fallbackErr);
      this.showCopyError(button, text);
    }
  }
}
