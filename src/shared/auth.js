// ── Shared Authentication & UI Module — Magic Playground ──
import { auth } from './firebase.js';
import { 
  GoogleAuthProvider, 
  signInAnonymously, 
  linkWithPopup, 
  linkWithCredential, 
  EmailAuthProvider, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// Helper selectors
const $ = (selector) => document.querySelector(selector);

// Inject HTML Modals & Toast dynamically
function injectDOM() {
  if ($('#shared-auth-modal')) return; // Already injected

  const container = document.createElement('div');
  container.innerHTML = `
    <!-- Toast Notification -->
    <div id="shared-auth-toast" class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/90 dark:bg-slate-950/90 text-white font-display text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md z-[1000] pointer-events-none opacity-0 translate-y-4 transition-all duration-300"></div>

    <!-- Modal Backdrop -->
    <div id="shared-auth-modal" class="fixed inset-0 bg-slate-900/45 dark:bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center pointer-events-none opacity-0 invisible transition-all duration-300">
      <div class="w-[90%] max-w-[420px] bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-glass-light dark:shadow-glass-dark rounded-3xl p-6 sm:p-8 transform scale-95 transition-all duration-300 relative pointer-events-auto">
        
        <!-- Close button -->
        <button id="shared-auth-close-btn" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
          <span class="material-icons-round">close</span>
        </button>

        <!-- Header -->
        <div class="text-center mb-6 select-none">
          <div class="w-14 h-14 bg-gradient-to-tr from-brand-pink to-brand-purple rounded-full flex justify-center items-center mx-auto mb-3 shadow-brand">
            <span class="material-icons-round text-white text-2xl">vpn_key</span>
          </div>
          <h3 class="font-display font-bold text-xl text-slate-800 dark:text-slate-100">Tài khoản Ma Thuật</h3>
        </div>

        <!-- View 1: Login/Register Form (shown when anonymous) -->
        <div id="shared-auth-login-view" style="display: none;">
          <p class="text-xs text-brand-muted dark:text-brand-purple/70 font-medium text-center mb-5">Liên kết tài khoản Google hoặc Email để lưu trữ tiến trình vĩnh viễn và đồng bộ đa thiết bị.</p>
          
          <!-- Current Anonymous Nickname -->
          <div class="bg-brand-pink/10 dark:bg-brand-purple/10 border border-brand-pink/20 dark:border-brand-purple/20 rounded-2xl p-3.5 mb-5 text-center text-sm font-semibold text-brand-pink dark:text-brand-purple">
            👤 Chào khách: <span id="shared-auth-anon-name">Khách ẩn danh</span>
          </div>

          <!-- Google Sign-in Button -->
          <button id="shared-auth-google-btn" class="w-full flex items-center justify-center gap-3 bg-white text-slate-700 border border-slate-200/80 rounded-2xl py-3 px-4 hover:bg-slate-50 shadow-sm active:bg-slate-100 font-sans font-semibold transition-all cursor-pointer">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="text-sm font-bold">Liên kết Google</span>
          </button>

          <div class="relative flex py-4 items-center">
            <div class="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span class="flex-shrink mx-4 text-slate-400 text-xs font-semibold select-none">HOẶC DÙNG EMAIL</span>
            <div class="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <!-- Email / Password Form -->
          <form id="shared-auth-email-form" class="space-y-3.5">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5 select-none">EMAIL</label>
              <input type="email" id="shared-auth-email" required placeholder="example@email.com" autocomplete="username" class="w-full font-sans text-sm px-4 py-2.5 rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 outline-none focus:border-brand-pink focus:bg-white focus:dark:bg-slate-900 focus:ring-4 focus:ring-brand-pink/15 transition-all">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5 select-none">MẬT KHẨU</label>
              <input type="password" id="shared-auth-password" required placeholder="••••••" minlength="6" class="w-full font-sans text-sm px-4 py-2.5 rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 outline-none focus:border-brand-pink focus:bg-white focus:dark:bg-slate-900 focus:ring-4 focus:ring-brand-pink/15 transition-all" autocomplete="current-password">
            </div>
            <div class="grid grid-cols-2 gap-3 pt-2">
              <button type="submit" class="font-sans font-bold text-sm text-slate-700 dark:text-slate-200 bg-white/30 dark:bg-slate-800/30 border border-white/40 dark:border-slate-700/40 rounded-2xl py-2.5 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer">Đăng Nhập</button>
              <button type="button" id="shared-auth-signup-btn" class="font-display font-bold text-sm text-white bg-gradient-to-r from-brand-pink to-brand-purple rounded-2xl py-2.5 shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">Đăng Ký</button>
            </div>
          </form>
        </div>

        <!-- View 2: User Profile Info (shown when logged in) -->
        <div id="shared-auth-profile-view" style="display: none;" class="text-center">
          <!-- Avatar -->
          <div class="relative w-20 h-20 mx-auto mb-4 select-none">
            <img id="shared-auth-user-avatar" src="" alt="Avatar" class="w-full h-full rounded-full border-2 border-brand-pink dark:border-brand-purple shadow-md object-cover" style="display: none;">
            <div id="shared-auth-user-icon" class="w-full h-full rounded-full border-2 border-brand-pink dark:border-brand-purple shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-300">
              <span class="material-icons-round text-4xl">face</span>
            </div>
            <span id="shared-auth-user-badge" class="absolute -bottom-1 -right-1 text-[9px] font-bold text-white px-2 py-0.5 rounded-full shadow">Google</span>
          </div>

          <!-- Display Name & Email -->
          <h4 id="shared-auth-user-name" class="font-display font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">Người chơi</h4>
          <p id="shared-auth-user-email" class="text-xs text-slate-400 mb-6">example@gmail.com</p>

          <div class="border-t border-slate-200/50 dark:border-slate-800/50 pt-5">
            <button id="shared-auth-signout-btn" class="w-full font-sans font-bold text-sm text-white bg-brand-pink hover:bg-brand-pink/90 rounded-2xl py-3 shadow-brand hover:shadow-brand-hover transition-all cursor-pointer">
              Đăng Xuất Tài Khoản
            </button>
          </div>
        </div>

        <!-- View 3: Sync/Switch Account Conflict (shown when Google is already linked) -->
        <div id="shared-auth-conflict-view" style="display: none;" class="text-center">
          <div class="w-14 h-14 bg-amber-100 dark:bg-amber-950/30 rounded-full flex justify-center items-center mx-auto mb-3 text-amber-500">
            <span class="material-icons-round text-3xl">warning</span>
          </div>
          <h4 class="font-display font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">Tài khoản đã liên kết</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 px-2 leading-relaxed font-sans">Tài khoản Google này đã được liên kết với một tiến trình khác. Bạn có muốn chuyển sang tài khoản này không? (Tiến trình chưa lưu trên máy này sẽ bị thay thế)</p>
          <div class="space-y-2.5">
            <button id="shared-auth-switch-btn" class="w-full font-sans font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl py-3 shadow-md hover:shadow-lg transition-all cursor-pointer">
              Xác Nhận Chuyển Tài Khoản
            </button>
            <button id="shared-auth-conflict-cancel-btn" class="w-full font-sans font-bold text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl py-3 transition-all cursor-pointer">
              Hủy
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(container);
}

// Toast Helper
let toastTimeout;
export function showToast(msg) {
  injectDOM();
  const toast = $('#shared-auth-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-4');
  }, 3000);
}

// Show/Hide Modal Helpers
export function showAuthModal() {
  injectDOM();
  const modal = $('#shared-auth-modal');
  if (!modal) return;
  modal.classList.remove('opacity-0', 'invisible', 'pointer-events-none');
  modal.classList.add('opacity-100');
  const modalBox = modal.firstElementChild;
  if (modalBox) {
    modalBox.classList.remove('scale-95');
    modalBox.classList.add('scale-100');
  }
  updateAccountModalUI(auth.currentUser);
}

export function hideAuthModal() {
  const modal = $('#shared-auth-modal');
  if (!modal) return;
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0', 'invisible', 'pointer-events-none');
  const modalBox = modal.firstElementChild;
  if (modalBox) {
    modalBox.classList.remove('scale-100');
    modalBox.classList.add('scale-95');
  }
}

// Helper: Translate Firebase errors
function getFriendlyAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return "⚠️ Email không đúng định dạng!";
    case 'auth/weak-password':
      return "⚠️ Mật khẩu quá yếu (tối thiểu 6 ký tự)!";
    case 'auth/email-already-in-use':
      return "⚠️ Email này đã đăng ký tài khoản khác!";
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return "❌ Sai Email hoặc Mật khẩu!";
    case 'auth/operation-not-allowed':
      return "❌ Đăng nhập Email chưa được bật!";
    case 'auth/too-many-requests':
      return "⚠️ Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau!";
    case 'auth/network-request-failed':
      return "🌐 Lỗi kết nối mạng. Vui lòng kiểm tra lại!";
    case 'auth/credential-already-in-use':
      return "⚠️ Tài khoản đã liên kết với một tiến trình khác!";
    default:
      return "❌ Thao tác thất bại. Vui lòng thử lại!";
  }
}

// Generate random fantasy nicknames for anonymous players
function generateRandomNickname() {
  const adjs = ["Thần Bí", "Lấp Lánh", "Kỳ Diệu", "Huyền Thoại", "Ma Thuật", "Siêu Cấp", "Vô Địch", "Thần Tốc", "Nhiệm Màu", "Vui Vẻ"];
  const nouns = ["Phù Thủy", "Chiến Binh", "Tinh Linh", "Hiệp Sĩ", "Thần Thú", "Ninja", "Ảo Thuật Gia", "Nhà Thám Hiểm", "Phi Hành Gia", "Học Giả"];
  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${noun} ${adj} #${num}`;
}

// Show specific view in the modal
function showView(viewId) {
  const loginView = $('#shared-auth-login-view');
  const profileView = $('#shared-auth-profile-view');
  const conflictView = $('#shared-auth-conflict-view');
  if (loginView) loginView.style.display = viewId === 'login' ? 'block' : 'none';
  if (profileView) profileView.style.display = viewId === 'profile' ? 'block' : 'none';
  if (conflictView) conflictView.style.display = viewId === 'conflict' ? 'block' : 'none';
}

// Update modal contents based on current user
function updateAccountModalUI(user) {
  injectDOM();
  const profileView = $('#shared-auth-profile-view');
  const loginView = $('#shared-auth-login-view');
  if (!profileView || !loginView) return;

  if (!user) {
    showView('none');
    return;
  }

  if (user.isAnonymous) {
    showView('login');
    $('#shared-auth-anon-name').textContent = user.displayName || "Khách ẩn danh";
  } else {
    showView('profile');
    
    const avatarImg = $('#shared-auth-user-avatar');
    const avatarIcon = $('#shared-auth-user-icon');
    
    if (user.photoURL) {
      avatarImg.src = user.photoURL;
      avatarImg.style.display = 'inline-block';
      avatarIcon.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarIcon.style.display = 'inline-block';
      avatarIcon.firstElementChild.textContent = 'face';
    }
    
    $('#shared-auth-user-name').textContent = user.displayName || "Người chơi";
    $('#shared-auth-user-email').textContent = user.email || "";
    
    const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
    const badge = $('#shared-auth-user-badge');
    badge.textContent = isGoogle ? "Google" : "Email";
    badge.style.backgroundColor = isGoogle ? "#4285F4" : "#FF7597";
  }
}

// Initialize Auth listeners and inject popup events
export function initSharedAuth({ onUserChanged, syncProgress, profileBtnSelector = '#google-login-btn' }) {
  injectDOM();

  // Close modal events
  $('#shared-auth-close-btn').addEventListener('click', hideAuthModal);
  $('#shared-auth-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideAuthModal();
  });

  // Google Sign-in button listener
  $('#shared-auth-google-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    showToast("🔑 Đang mở đăng nhập Google...");
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(user, provider);
      sessionStorage.setItem('just_logged_in', 'true');
      showToast("🎉 Liên kết tài khoản Google thành công!");
      hideAuthModal();
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        showView('conflict');
      } else {
        console.error("Google linking error:", error);
        showToast(getFriendlyAuthErrorMessage(error.code));
      }
    }
  });

  // Conflict View: Switch button listener
  $('#shared-auth-switch-btn').addEventListener('click', async () => {
    showToast("🔑 Đang chuyển tài khoản...");
    const provider = new GoogleAuthProvider();
    try {
      sessionStorage.setItem('just_logged_in', 'true');
      await signInWithPopup(auth, provider);
      showToast("🎉 Đăng nhập Google thành công!");
      hideAuthModal();
    } catch (err) {
      console.error("Direct Google Sign-in error:", err);
      showToast(getFriendlyAuthErrorMessage(err.code));
      showView('login');
    }
  });

  // Conflict View: Cancel button listener
  $('#shared-auth-conflict-cancel-btn').addEventListener('click', () => {
    showView('login');
  });

  // Email Sign In form submission
  $('#shared-auth-email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#shared-auth-email').value;
    const password = $('#shared-auth-password').value;
    showToast("🔐 Đang đăng nhập...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      sessionStorage.setItem('just_logged_in', 'true');
      showToast("👋 Đăng nhập thành công!");
      hideAuthModal();
      $('#shared-auth-email').value = '';
      $('#shared-auth-password').value = '';
    } catch (err) {
      console.error("Email sign-in error:", err);
      showToast(getFriendlyAuthErrorMessage(err.code));
    }
  });

  // Email Sign Up button action
  $('#shared-auth-signup-btn').addEventListener('click', async () => {
    const email = $('#shared-auth-email').value;
    const password = $('#shared-auth-password').value;
    if (!email || !password) {
      showToast("⚠️ Vui lòng điền đầy đủ Email và Mật khẩu!");
      return;
    }
    if (password.length < 6) {
      showToast("⚠️ Mật khẩu phải có tối thiểu 6 ký tự!");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    showToast("📝 Đang đăng ký...");
    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);
      sessionStorage.setItem('just_logged_in', 'true');
      showToast("🎉 Đã tạo và liên kết tài khoản Email!");
      hideAuthModal();
      $('#shared-auth-email').value = '';
      $('#shared-auth-password').value = '';
    } catch (err) {
      console.error("Email sign-up error:", err);
      showToast(getFriendlyAuthErrorMessage(err.code));
    }
  });

  // Sign out button
  $('#shared-auth-signout-btn').addEventListener('click', async () => {
    if (confirm("Bạn có muốn đăng xuất khỏi tài khoản hiện tại không?")) {
      showToast("🚪 Đang đăng xuất...");
      try {
        await signOut(auth);
        hideAuthModal();
        showToast("🚪 Đã đăng xuất!");
      } catch (err) {
        console.error("Sign out error:", err);
        showToast("❌ Lỗi đăng xuất!");
      }
    }
  });

  // Profile icon button hookup (if it exists on current page)
  const bindProfileBtn = () => {
    const profileBtn = $(profileBtnSelector);
    if (profileBtn) {
      profileBtn.addEventListener('click', showAuthModal);
    }
  };
  bindProfileBtn();
  // Retry binding in case DOM is still loading
  document.addEventListener('DOMContentLoaded', bindProfileBtn);

  // Firebase Auth Observer
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("Shared Auth State: Logged in as", user.uid, user.isAnonymous ? "Anonymous" : user.displayName);
      
      // If it's an anonymous user without a nickname, set a random one
      if (user.isAnonymous && !user.displayName) {
        const nickname = generateRandomNickname();
        try {
          await updateProfile(user, { displayName: nickname });
          console.log("Profile updated with nickname:", nickname);
        } catch (err) {
          console.error("Profile update error:", err);
        }
      }

      // Update modal if open
      const modal = $('#shared-auth-modal');
      if (modal && !modal.classList.contains('invisible')) {
        updateAccountModalUI(user);
      }

      // Call page handlers
      if (onUserChanged) onUserChanged(user);
      if (syncProgress) syncProgress(user);
    } else {
      console.log("Shared Auth State: No user. Signing in anonymously...");
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Anonymous login error:", err);
        showToast("❌ Lỗi đăng nhập Firebase!");
      }
    }
  });
}
