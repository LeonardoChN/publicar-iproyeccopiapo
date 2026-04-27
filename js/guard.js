document.addEventListener('DOMContentLoaded', async () => {
  setupAdminHeader();
  showConfigWarning();

  setLoading(true, 'Verificando acceso...');
  const auth = await requireAdmin();
  setLoading(false);

  if (!auth) return;

  const emailTarget = document.querySelector('#adminEmail');
  if (emailTarget) {
    emailTarget.textContent = auth.session.user.email || 'Administrador';
    emailTarget.title = auth.session.user.email || '';
  }
});
