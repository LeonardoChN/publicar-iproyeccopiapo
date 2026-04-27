(function initIproyecSupabase() {
  const config = window.IPROYEC_SUPABASE_CONFIG || {};
  const missingConfig =
    !config.supabaseUrl ||
    !config.supabaseAnonKey ||
    config.supabaseUrl.includes('TU-PROYECTO') ||
    config.supabaseAnonKey.includes('TU_ANON_PUBLIC_KEY');

  window.IPROYEC_APP = {
    config,
    isConfigReady: !missingConfig,
    supabase: null,
    currentSession: null,
    currentAdmin: null
  };

  if (missingConfig) {
    console.warn('Falta configurar Supabase en js/supabase-config.js');
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('No se cargó supabase-js. Revisa conexión a internet o el CDN.');
    window.IPROYEC_APP.isConfigReady = false;
    return;
  }

  window.IPROYEC_APP.supabase = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
})();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatDate(dateValue) {
  if (!dateValue) return 'Sin fecha definida';
  const [year, month, day] = String(dateValue).split('-');
  if (!year || !month || !day) return dateValue;
  return `${day}-${month}-${year}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'evento';
}

function setMessage(element, text, type = '') {
  if (!element) return;
  element.textContent = text || '';
  element.className = `form-message ${type}`.trim();
}

function setLoading(visible, text = 'Cargando...') {
  const overlay = document.querySelector('#loadingOverlay');
  const label = document.querySelector('#loadingText');
  if (!overlay) return;
  if (label) label.textContent = text;
  overlay.hidden = !visible;
}

function showConfigWarning(targetSelector = '#configWarning') {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  const app = window.IPROYEC_APP;
  if (!app?.isConfigReady) {
    target.hidden = false;
    target.textContent = 'Falta configurar Supabase. Abre js/supabase-config.js y pega la Project URL y la anon/public key.';
  } else {
    target.hidden = true;
  }
}

async function getSession() {
  const app = window.IPROYEC_APP;
  if (!app?.supabase) return null;
  const { data, error } = await app.supabase.auth.getSession();
  if (error) {
    console.error(error);
    return null;
  }
  app.currentSession = data.session;
  return data.session;
}

async function getAdminRow(userId) {
  const app = window.IPROYEC_APP;
  if (!app?.supabase || !userId) return null;

  const { data, error } = await app.supabase
    .from(app.config.adminTable)
    .select('user_id,nombre,role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error consultando admin_users:', error);
    return null;
  }

  app.currentAdmin = data;
  return data;
}

async function requireAdmin() {
  const app = window.IPROYEC_APP;
  if (!app?.isConfigReady || !app?.supabase) {
    showConfigWarning();
    return null;
  }

  const session = await getSession();
  if (!session) {
    window.location.replace('index.html');
    return null;
  }

  const admin = await getAdminRow(session.user.id);
  if (!admin) {
    await app.supabase.auth.signOut();
    window.location.replace('index.html?error=no-admin');
    return null;
  }

  return { session, admin };
}

async function signOutAndGoHome() {
  const app = window.IPROYEC_APP;
  if (app?.supabase) await app.supabase.auth.signOut();
  window.location.href = 'index.html';
}

function setupAdminHeader() {
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('menu-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  document.querySelectorAll('.admin-nav a').forEach((link) => {
    link.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', signOutAndGoHome);
  });
}
