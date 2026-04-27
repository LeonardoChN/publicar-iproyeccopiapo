document.addEventListener('DOMContentLoaded', async () => {
  const app = window.IPROYEC_APP;
  const form = document.querySelector('#loginForm');
  const message = document.querySelector('#formMessage');
  const togglePassword = document.querySelector('#togglePassword');
  const passwordInput = document.querySelector('#password');
  const submitButton = document.querySelector('#submitButton');

  showConfigWarning();

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'no-admin') {
    setMessage(message, 'Tu usuario existe, pero no está autorizado como administrador del panel.', 'error');
  }

  if (!app?.isConfigReady || !app?.supabase) {
    if (submitButton) submitButton.disabled = true;
    return;
  }

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePassword.textContent = isPassword ? 'Ocultar' : 'Ver';
    });
  }

  const existingSession = await getSession();
  if (existingSession) {
    const admin = await getAdminRow(existingSession.user.id);
    if (admin) {
      window.location.href = 'panel.html';
      return;
    }
    await app.supabase.auth.signOut();
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      setMessage(message, 'Ingresa correo y contraseña.', 'error');
      return;
    }

    submitButton.disabled = true;
    setMessage(message, 'Validando acceso...', 'warn');

    const { data, error } = await app.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      submitButton.disabled = false;
      setMessage(message, 'Correo o contraseña incorrectos.', 'error');
      return;
    }

    const admin = await getAdminRow(data.user.id);
    if (!admin) {
      await app.supabase.auth.signOut();
      submitButton.disabled = false;
      setMessage(message, 'Acceso denegado. Este usuario no está autorizado como administrador.', 'error');
      return;
    }

    setMessage(message, 'Acceso correcto. Entrando al panel...', 'success');
    window.setTimeout(() => {
      window.location.href = 'panel.html';
    }, 350);
  });
});
