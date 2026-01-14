// Secure Sensitive Data Handling Utilities
// Prevent sensitive data leakage and ensure proper cleanup

/**
 * Securely clear sensitive form fields
 * Overwrites values to prevent data remanence
 * @param {string} selector - CSS selector for inputs to clear
 */
export function clearSensitiveInputs(selector = 'input[type="password"]') {
    document.querySelectorAll(selector).forEach(input => {
        // Overwrite multiple times for security
        input.value = '0'.repeat(input.value.length);
        input.value = '';
    });
}

/**
 * Clear all form data on logout
 * Ensures no sensitive data remains in DOM
 */
export function secureLogoutCleanup() {
    // Clear password fields
    clearSensitiveInputs('input[type="password"]');

    // Clear email fields (may contain PII)
    clearSensitiveInputs('input[type="email"]');

    // Clear any text inputs in login/register forms
    document.querySelectorAll('#login-form input, #register-form input').forEach(input => {
        input.value = '';
    });

    // Clear session storage (if used)
    sessionStorage.clear();

    // Do not clear localStorage as it may contain theme preferences
}

/**
 * Safely log non-sensitive data only
 * Filters out sensitive fields before logging
 * @param {string} message - Log message
 * @param {Object} data - Data to log
 * @param {Array<string>} sensitiveKeys - Keys to redact
 */
export function safeLog(message, data = {}, sensitiveKeys = ['password', 'token', 'secret', 'key']) {
    if (typeof data !== 'object' || data === null) {
        console.log(message, data);
        return;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        // Check if key contains sensitive keywords
        const isSensitive = sensitiveKeys.some(sensitive =>
            key.toLowerCase().includes(sensitive.toLowerCase())
        );

        sanitized[key] = isSensitive ? '[REDACTED]' : value;
    }

    console.log(message, sanitized);
}

/**
 * Disable autocomplete on sensitive inputs
 * Prevents browser from storing sensitive data
 */
export function disableSensitiveAutocomplete() {
    // Disable password autocomplete
    document.querySelectorAll('input[type="password"]').forEach(input => {
        input.setAttribute('autocomplete', 'new-password');
    });

    // Optionally disable email autocomplete for higher security
    // Uncomment if needed:
    // document.querySelectorAll('input[type="email"]').forEach(input => {
    //     input.setAttribute('autocomplete', 'off');
    // });
}

/**
 * Monitor for password exposure in DevTools
 * Warn if console is open (development only)
 */
export function warnIfDevToolsOpen() {
    if (process.env.NODE_ENV === 'production') {
        const devtools = /./;
        devtools.toString = function () {
            this.opened = true;
        };

        const checkDevTools = () => {
            if (devtools.opened) {
                console.warn('⚠️ DevTools is open. Be careful with sensitive data!');
                devtools.opened = false;
            }
        };

        setInterval(checkDevTools, 1000);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disableSensitiveAutocomplete);
} else {
    disableSensitiveAutocomplete();
}
