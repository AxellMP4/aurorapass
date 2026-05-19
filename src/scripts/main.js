// Main application entry point
import { initAuth } from './auth.js';
import { initEventManagement } from './event-management.js';
import { initGuestManagement } from './guest-management.js';
import { initQRScanner } from './qr-scanner.js';
import { initDashboard } from './dashboard.js';
import { initUI } from './ui.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI components (theme, responsive behavior, etc.)
    initUI();

    // Initialize authentication
    initAuth();

    // Initialize core features
    initEventManagement();
    initGuestManagement();
    initQRScanner();
    initDashboard();

    // Show welcome message or redirect based on auth state
    const authStatus = checkAuthStatus();
    if (authStatus.isAuthenticated) {
        loadUserDashboard();
    } else {
        showWelcomeScreen();
    }
});

// Check authentication status from localStorage or session
function checkAuthStatus() {
    const token = localStorage.getItem('aurorapass_token') || sessionStorage.getItem('aurorapass_token');
    return {
        isAuthenticated: !!token,
        token: token || null
    };
}

// Load user dashboard if authenticated
function loadUserDashboard() {
    // This would load the user's events and show the main interface
    document.getElementById('app').innerHTML = `
        <div class="container">
            <header class="app-header">
                <h1>AuroraPASS</h1>
                <nav class="user-nav">
                    <button id="new-event-btn" class="btn btn-primary">Nouvel événement</button>
                    <button id="profile-btn" class="btn btn-outline">Profil</button>
                    <button id="logout-btn" class="btn btn-outline">Déconnexion</button>
                </nav>
            </header>
            <main>
                <section class="events-overview">
                    <h2>Mes événements</h2>
                    <div id="events-list" class="grid grid-2">
                        <!-- Events will be loaded here -->
                    </div>
                </section>
            </main>
        </div>
    `;

    // Initialize event listeners
    document.getElementById('new-event-btn').addEventListener('click', showNewEventForm);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('profile-btn').addEventListener('click', showProfile);
}

// Show welcome screen for unauthenticated users
function showWelcomeScreen() {
    document.getElementById('app').innerHTML = `
        <div class="container">
            <header>
                <h1>AuroraPASS</h1>
                <p>Plateforme professionnelle de gestion d'accès événementiel avec QR codes sécurisés</p>
            </header>
            <main>
                <section class="welcome">
                    <h2>Commencez dès maintenant - Totalement gratuit</h2>
                    <p>Créez votre compte et organisez votre premier événement en quelques minutes.</p>
                    <div>
                        <button id="signup-btn" class="btn btn-primary btn-lg">S'inscrire gratuitement</button>
                        <button id="login-btn" class="btn btn-outline btn-lg">Se connecter</button>
                    </div>
                    <div class="features">
                        <div class="feature">
                            <h3>✨ Interface Apple-grade</h3>
                            <p>Design élégant, animations satisfaisantes, expérience premium</p>
                        </div>
                        <div class="feature">
                            <h3>🔐 Sécurité maximale</h3>
                            <p>Authentification robuste, QR codes cryptographiquement signés</p>
                        </div>
                        <div class="feature">
                            <h3>📊 Dashboard personnalisable</h3>
                            <p>Onglets configurables, visualisations en temps réel</p>
                        </div>
                        <div class="feature">
                            <h3>📱 Totalement responsive</h3>
                            <p>Parfait sur mobile, tablette et desktop</p>
                        </div>
                    </div>
                </section>
            </main>
            <footer>
                <p>&copy; 2026 AuroraPASS. Hébergé gratuitement sur Netlify & Supabase.</p>
            </footer>
        </div>
    `;

    // Initialize buttons
    document.getElementById('signup-btn').addEventListener('click', () => showAuthForm('signup'));
    document.getElementById('login-btn').addEventListener('click', () => showAuthForm('login'));
}

// Show authentication form (signup or login)
function showAuthForm(mode) {
    document.getElementById('app').innerHTML = `
        <div class="container">
            <header>
                <h1>${mode === 'signup' ? 'S\'inscrire' : 'Se connecter'}</h1>
                <p>${mode === 'signup' ? 'Créez votre compte gratuitement' : 'Connectez-vous à votre compte'}</p>
            </header>
            <main>
                <section class="auth-form">
                    <form id="auth-form">
                        <div class="form-group">
                            <label class="form-label" for="email">Email</label>
                            <input type="email" id="email" class="form-input" required placeholder="votre@email.com">
                        </div>
                        ${mode === 'signup' ? `
                        <div class="form-group">
                            <label class="form-label" for="password">Mot de passe</label>
                            <input type="password" id="password" class="form-input" required minlength="6" placeholder="Choisissez un mot de passe">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="confirm-password">Confirmer le mot de passe</label>
                            <input type="password" id="confirm-password" class="form-input" required minlength="6" placeholder="Confirmez votre mot de passe">
                        </div>
                        ` : `
                        <div class="form-group">
                            <label class="form-label" for="password">Mot de passe</label>
                            <input type="password" id="password" class="form-input" required placeholder="Votre mot de passe">
                        </div>
                        `}
                        <div class="form-group">
                            <label class="form-checkbox">
                                <input type="checkbox" id="remember-me">
                                <span>Se souvenir de moi</span>
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg w-100">
                            ${mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
                        </button>
                    </form>
                    <p class="text-center mt-3">
                        ${mode === 'signup' ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                        <a href="#" id="switch-auth-link">${mode === 'signup' ? 'Connectez-vous' : 'Inscrivez-vous'}</a>
                    </p>
                </section>
            </main>
        </div>
    `;

    const form = document.getElementById('auth-form');
    const switchLink = document.getElementById('switch-auth-link');

    switchLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm(mode === 'signup' ? 'login' : 'signup');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (mode === 'signup') {
            const confirmPassword = document.getElementById('confirm-password').value;
            if (password !== confirmPassword) {
                showToast('Les mots de passe ne correspondent pas', 'error');
                return;
            }

            // Call signup function from auth module
            try {
                await signupUser(email, password);
                showToast('Compte créé avec succès ! Vérifiez votre email.', 'success');
                setTimeout(() => showAuthForm('login'), 2000);
            } catch (error) {
                showToast(`Erreur : ${error.message}`, 'error');
            }
        } else {
            // Call login function from auth module
            try {
                await loginUser(email, password);
                showToast('Connexion réussie !', 'success');
                loadUserDashboard();
            } catch (error) {
                showToast(`Erreur : ${error.message}`, 'error');
            }
        }
    });
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('aurorapass_token');
    sessionStorage.removeItem('aurorapass_token');
    showWelcomeScreen();
    showToast('Vous avez été déconnecté', 'info');
}

// Show profile page
function showProfile() {
    // Implementation would show user profile and settings
    alert('Page de profil à implémenter');
}

// Show new event form
function showNewEventForm() {
    // Implementation would show form to create a new event
    alert('Formulaire de nouvel événement à implémenter');
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : type === 'warning' ? 'Attention' : 'Information'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    document.body.appendChild(toast);

    // Trigger reflow to enable animation
    void toast.offsetWidth;
    toast.classList.add('show');

    // Remove toast after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);

    // Handle close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
}

// Export functions for use in other modules
export { showToast };