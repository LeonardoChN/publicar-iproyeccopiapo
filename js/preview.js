document.addEventListener('DOMContentLoaded', async () => {
  const app = window.IPROYEC_APP;
  const grid = document.querySelector('#previewGrid');
  const emptyState = document.querySelector('#previewEmptyState');
  const filterStatus = document.querySelector('#previewStatus');
  const message = document.querySelector('#previewMessage');

  let eventsCache = [];

  function renderPreview() {
    const status = filterStatus?.value || 'publicado';
    const events = eventsCache
      .filter((event) => status === 'todos' || event.estado === status)
      .sort((a, b) => String(a.fecha_evento || '').localeCompare(String(b.fecha_evento || '')));

    grid.innerHTML = '';
    emptyState.hidden = events.length > 0;

    events.forEach((event) => {
      const card = document.createElement('article');
      card.className = 'event-card';
      const statusLabel = event.estado === 'publicado' ? 'Publicado' : 'Borrador';
      const statusClass = event.estado === 'publicado' ? 'status-published' : 'status-draft';
      const imageHtml = event.imagen_url
        ? `<img src="${escapeHtml(event.imagen_url)}" alt="Imagen de ${escapeHtml(event.titulo)}">`
        : '<span>Sin imagen</span>';

      card.innerHTML = `
        <div class="event-media">${imageHtml}</div>
        <div class="event-body">
          <div class="event-tags">
            <span class="tag">Evento</span>
            <span class="tag ${statusClass}">${statusLabel}</span>
          </div>
          <h3>${escapeHtml(event.titulo)}</h3>
          <span class="event-date">Fecha del evento: ${escapeHtml(formatDate(event.fecha_evento))}</span>
          <p>${escapeHtml(event.descripcion || '')}</p>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  async function loadEvents() {
    const { data, error } = await app.supabase
      .from(app.config.eventosTable)
      .select('id,titulo,descripcion,imagen_url,fecha_evento,estado,created_at')
      .order('fecha_evento', { ascending: true });

    if (error) {
      console.error(error);
      setMessage(message, 'No se pudo cargar la vista previa. Revisa permisos RLS.', 'error');
      return;
    }

    eventsCache = data || [];
    renderPreview();
  }

  filterStatus?.addEventListener('change', renderPreview);

  setLoading(true, 'Preparando vista previa...');
  const auth = await requireAdmin();
  setLoading(false);
  if (!auth) return;

  await loadEvents();
});
