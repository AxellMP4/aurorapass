// Authentication module - Supabase integration
import { supabase } from './supabase-client.js';

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {Object} options - Additional options (username, etc.)
 * @returns {Promise<Object>} - User data from Supabase
 */
export async function signupUser(email, password, options = {}) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: `${window.location.origin}/callback.html`,
                data: options
            }
        });

        if (error) throw error;

        // Email verification is handled automatically by Supabase
        return data;
    } catch (error) {
        throw new Error(`Inscription échouée: ${error.message}`);
    }
}

/**
 * Log in a user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} - User session data from Supabase
 */
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Store tokens
        const { access_token, refresh_token } = data.session;
        localStorage.setItem('aurorapass_token', access_token);
        sessionStorage.setItem('aurorapass_token', access_token);

        return data;
    } catch (error) {
        throw new Error(`Connexion échouée: ${error.message}`);
    }
}

/**
 * Log in a user with OAuth provider (Google, Apple, etc.)
 * @param {string} provider - OAuth provider name ('google', 'apple', 'discord', etc.)
 * @returns {Promise<Object>} - User session data from Supabase
 */
export async function loginWithOAuth(provider) {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/callback.html`
            }
        });

        if (error) throw error;

        // The user will be redirected to the callback URL
        // After successful auth, they'll be redirected back to the app
        return { url: data.url };
    } catch (error) {
        throw new Error(`Connexion avec ${provider} échouée: ${error.message}`);
    }
}

/**
 * Log out the current user
 * @returns {Promise<void>}
 */
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Clear tokens
        localStorage.removeItem('aurorapass_token');
        sessionStorage.removeItem('aurorapass_token');
    } catch (error) {
        throw new Error(`Déconnexion échouée: ${error.message}`);
    }
}

/**
 * Send a password reset email
 * @param {string} email - User's email address
 * @returns {Promise<boolean>} - True if email sent successfully
 */
export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) throw error;
        return true;
    } catch (error) {
        throw new Error(`Échec de réinitialisation du mot de passe: ${error.message}`);
    }
}

/**
 * Update the current user's profile
 * @param {Object} userData - User data to update (name, etc.)
 * @returns {Promise<Object>} - Updated user data
 */
export async function updateUser(userData) {
    try {
        const { data, error } = await supabase.auth.update(userData);
        if (error) throw error;
        return data;
    } catch (error) {
        throw new Error(`Échec de mise à jour du profil: ${error.message}`);
    }
}

/**
 * Get the current user's session
 * @returns {Promise<Object>} - Session data or null if not authenticated
 */
export async function getCurrentSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    } catch (error) {
        throw new Error(`Échec de récupération de la session: ${error.message}`);
    }
}

/**
 * Refresh the current user's session
 * @returns {Promise<Object>} - New session data
 */
export async function refreshSession() {
    try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw error;

        // Update stored tokens
        const { access_token, refresh_token } = data.session;
        localStorage.setItem('aurorapass_token', access_token);
        sessionStorage.setItem('aurorapass_token', access_token);

        return data;
    } catch (error) {
        throw new Error(`Échec de rafraîchissement de la session: ${error.message}`);
    }
}

/**
 * Resend email verification
 * @returns {Promise<void>}
 */
export async function resendEmailVerification() {
    try {
        const { error } = await supabase.auth.resend({
            type: 'email',
            options: {
                emailRedirectTo: `${window.location.origin}/callback.html`
            }
        });
        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de renvoi de l'email de vérification: ${error.message}`);
    }
}

/**
 * Update user's password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export async function updatePassword(newPassword) {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
    } catch (error) {
        throw new Error(`Échec de mise à jour du mot de passe: ${error.message}`);
    }
}

/**
 * Enable two-factor authentication (TOTP)
 * @returns {Promise<Object>} - TOTP secret and QR code data
 */
export async function enableTOTP() {
    try {
        // Note: Supabase doesn't have built-in TOTP in the client yet
        // This would typically be implemented via Edge Functions
        // For now, we'll return a placeholder
        return {
            secret: 'YOUR_TOTP_SECRET_HERE',
            qrCode: 'data:image/png;base64,YOUR_QR_CODE_DATA_HERE'
        };
    } catch (error) {
        throw new Error(`Échec d'activation de l'authentification à deux facteurs: ${error.message}`);
    }
}

/**
 * Verify and enable two-factor authentication (TOTP)
 * @param {string} token - TOTP token from authenticator app
 * @returns {Promise<boolean>} - True if TOTP enabled successfully
 */
export async function verifyTOTP(token) {
    try {
        // Note: This would be implemented via Edge Functions
        // For now, we'll return a placeholder
        return true;
    } catch (error) {
        throw new Error(`Échec de vérification de l'authentification à deux facteurs: ${error.message}`);
    }
}

/**
 * Disable two-factor authentication (TOTP)
 * @returns {Promise<void>}
 */
export async function disableTOTP() {
    try {
        // Note: This would be implemented via Edge Functions
        // For now, we'll just return
        return;
    } catch (error) {
        throw new Error(`Échec de désactivation de l'authentification à deux facteurs: ${error.message}`);
    }
}

/**
 * Initialize authentication listeners and token management
 */
export function initAuth() {
    // Check for existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // User is already authenticated
            const { access_token } = session;
            localStorage.setItem('aurorapass_token', access_token);
            sessionStorage.setItem('aurorapass_token', access_token);
        }
    }).catch(error => {
        console.warn('Failed to check existing session:', error);
    });

    // Listen for auth changes to keep tokens updated
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
                const { access_token } = session;
                localStorage.setItem('aurorapass_token', access_token);
                sessionStorage.setItem('aurorapass_token', access_token);
            }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            // Clear tokens on sign out or account deletion
            localStorage.removeItem('aurorapass_token');
            sessionStorage.removeItem('aurorapass_token');
        }
    });

    // Return subscription so it can be unsubscribed if needed
    return subscription;
}

/**
 * Check if the user has a valid session
 * @returns {boolean} - True if user is authenticated
 */
export function isAuthenticated() {
    const token = localStorage.getItem('aurorapass_token') || sessionStorage.getItem('aurorapass_token');
    return !!token;
}

/**
 * Get the current user's ID
 * @returns {string|null} - User ID or null if not authenticated
 */
export function getCurrentUserId() {
    // This is a simplified approach - in reality, you'd get this from the session
    // For now, we'll return null and rely on Supabase auth.uid() in queries
    return null;
}

/**
 * Get the current user's email
 * @returns {Promise<string|null>} - User email or null if not authenticated
 */
export async function getCurrentUserEmail() {
    try {
        const session = await getCurrentSession();
        return session ? session.user.email : null;
    } catch (error) {
        return null;
    }
}

// Export all functions
export {
    signupUser,
    loginUser,
    loginWithOAuth,
    logoutUser,
    resetPassword,
    updateUser,
    getCurrentSession,
    refreshSession,
    resendEmailVerification,
    updatePassword,
    enableTOTP,
    verifyTOTP,
    disableTOTP,
    initAuth,
    isAuthenticated,
    getCurrentUserId,
    getCurrentUserEmail
};