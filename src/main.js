import { initSharedAuth } from './shared/auth.js';

// ── Floating Hearts Background Animation ──
const container = document.getElementById('hearts-container');
const heartSymbols = ['🎈', '🌸', '✨', '💕', '🥰', '☁️', '🌸'];

function createHeart() {
  if (!container) return;
  const heart = document.createElement('div');
  heart.className = 'floating-heart';
  
  // Pick random symbol
  heart.innerText = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
  
  // Random horizontal position
  heart.style.left = Math.random() * 100 + 'vw';
  
  // Random size
  const size = 14 + Math.random() * 20;
  heart.style.fontSize = size + 'px';
  
  // Random float duration (8 - 18s)
  const duration = 8 + Math.random() * 10;
  heart.style.animationDuration = duration + 's';
  
  // Random opacity
  heart.style.opacity = 0.25 + Math.random() * 0.45;
  
  container.appendChild(heart);
  
  // Auto-cleanup
  setTimeout(() => {
    heart.remove();
  }, duration * 1000);
}

// Initial hearts
for (let i = 0; i < 12; i++) {
  setTimeout(createHeart, Math.random() * 5000);
}

// Spawning interval
setInterval(createHeart, 1000);


// ── Light/Dark Mode Theme Toggle ──
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

function updateToggleIcon(isDark) {
  if (!themeToggleIcon) return;
  if (isDark) {
    themeToggleIcon.innerText = 'dark_mode';
  } else {
    themeToggleIcon.innerText = 'light_mode';
  }
}

// Initialize icon state
if (themeToggleBtn && themeToggleIcon) {
  updateToggleIcon(document.documentElement.classList.contains('dark'));

  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateToggleIcon(isDark);
  });
}


// ── PWA Service Worker & Authentication ──
function updateHubUserUI(user) {
  const avatarIcon = document.getElementById('user-avatar-icon');
  const avatarImg = document.getElementById('user-avatar-img');
  const loginBtn = document.getElementById('google-login-btn');
  if (!loginBtn) return;

  if (user.isAnonymous) {
    if (avatarImg) avatarImg.style.display = 'none';
    if (avatarIcon) {
      avatarIcon.style.display = 'inline-block';
      avatarIcon.textContent = 'account_circle';
    }
    loginBtn.title = "Tài khoản (Ẩn danh)";
  } else {
    if (user.photoURL) {
      if (avatarImg) {
        avatarImg.src = user.photoURL;
        avatarImg.style.display = 'inline-block';
      }
      if (avatarIcon) avatarIcon.style.display = 'none';
    } else {
      if (avatarImg) avatarImg.style.display = 'none';
      if (avatarIcon) {
        avatarIcon.style.display = 'inline-block';
        avatarIcon.textContent = 'face';
      }
    }
    loginBtn.title = `Tài khoản: ${user.displayName || user.email}`;
  }
}

// Initialize Shared Auth Module
initSharedAuth({
  onUserChanged: (user) => {
    updateHubUserUI(user);
  },
  profileBtnSelector: '#google-login-btn'
});
// Unregister any active root-level Service Worker to resolve old caching traps
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      const scope = reg.scope;
      if (scope.endsWith('/for-u/') || scope.endsWith('/for-u/index.html')) {
        reg.unregister().then(() => {
          console.log('Root Service Worker active registration cleared:', scope);
          window.location.reload();
        });
      }
    }
  });
}
