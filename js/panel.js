document.addEventListener('DOMContentLoaded', async () => {
  const app = window.IPROYEC_APP;
  const form = document.querySelector('#eventForm');
  const grid = document.querySelector('#eventsGrid');
  const emptyState = document.querySelector('#emptyState');
  const message = document.querySelector('#panelMessage');
  const imageFile = document.querySelector('#imageFile');
  const imageUrl = document.querySelector('#imageUrl');
  const imagePreview = document.querySelector('#imagePreview');
  const previewBox = document.querySelector('#previewBox');
  const resetButton = document.querySelector('#resetButton');
  const searchInput = document.querySelector('#searchInput');
  const filterStatus = document.querySelector('#filterStatus');
  const formTitle = document.querySelector('#formTitle');
  const saveButton = document.querySelector('#saveButton');

  let auth = null;
  let eventsCache = [];
  let currentImageUrl = '';
  let selectedFile = null;

  function updateStats() {
    const total = eventsCache.length;
    const publicados = eventsCache.filter((event) => event.estado === 'publicado').length;
    const borradores = eventsCache.filter((event) => event.estado === 'borrador').length;

    const totalTarget = document.querySelector('#totalEventos');
    const publishedTarget = document.querySelector('#totalPublicados');
    const draftTarget = document.querySelector('#totalBorradores');

    if (totalTarget) totalTarget.textContent = String(total);
    if (publishedTarget) publishedTarget.textContent = String(publicados);
    if (draftTarget) draftTarget.textContent = String(borradores);
  }

  function getFilteredEvents() {
    const search = normalizeText(searchInput?.value || '');
    const status = filterStatus?.value || 'todos';

    return eventsCache.filter((event) => {
      const matchesStatus = status === 'todos' || event.estado === status;
      const searchable = normalizeText(`${event.titulo} ${event.descripcion} ${event.fecha_evento}`);
      const matchesSearch = !search || searchable.includes(search);
      return matchesStatus && matchesSearch;
    });
  }

  function renderEvents() {
    const events = getFilteredEvents();
    updateStats();

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
          <div class="card-actions">
            <button class="btn btn-secondary compact" type="button" data-edit="${event.id}">Editar</button>
            <button class="btn btn-card compact" type="button" data-toggle="${event.id}">${event.estado === 'publicado' ? 'Pasar a borrador' : 'Publicar'}</button>
            <button class="btn btn-danger compact" type="button" data-delete="${event.id}">Eliminar</button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  async function loadEvents() {
    const { data, error } = await app.supabase
      .from(app.config.eventosTable)
      .select('id,titulo,descripcion,imagen_url,fecha_evento,estado,creado_por,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setMessage(message, 'No se pudieron cargar los eventos. Revisa RLS, tabla eventos y permisos del usuario.', 'error');
      return;
    }

    eventsCache = data || [];
    renderEvents();
  }

  function resetForm() {
    form.reset();
    document.querySelector('#eventId').value = '';
    currentImageUrl = '';
    selectedFile = null;
    imageFile.value = '';
    imageUrl.value = '';
    previewBox.hidden = true;
    imagePreview.removeAttribute('src');
    formTitle.textContent = 'Crear evento';
    saveButton.textContent = 'Guardar evento';
    setMessage(message, '', '');
  }

  function setPreview(src) {
    if (!src) {
      previewBox.hidden = true;
      imagePreview.removeAttribute('src');
      return;
    }
    imagePreview.src = src;
    previewBox.hidden = false;
  }

  async function uploadImageIfNeeded() {
    if (!selectedFile) {
      return imageUrl.value.trim() || currentImageUrl || null;
    }

    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = slugify(selectedFile.name.replace(/\.[^/.]+$/, ''));
    const path = `${auth.session.user.id}/${Date.now()}-${baseName}.${extension}`;

    const { error: uploadError } = await app.supabase.storage
      .from(app.config.storageBucket)
      .upload(path, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: selectedFile.type || 'image/jpeg'
      });

    if (uploadError) {
      console.error(uploadError);
      throw new Error('No se pudo subir la imagen a Supabase Storage. Revisa el bucket y sus políticas.');
    }

    const { data } = app.supabase.storage
      .from(app.config.storageBucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function saveEvent(event) {
    event.preventDefault();

    const id = document.querySelector('#eventId').value;
    const titulo = document.querySelector('#titulo').value.trim();
    const fechaEvento = document.querySelector('#fechaEvento').value;
    const estado = document.querySelector('#estado').value;
    const descripcion = document.querySelector('#descripcion').value.trim();

    if (!titulo || !fechaEvento || !estado || !descripcion) {
      setMessage(message, 'Completa título, fecha del evento, estado y descripción.', 'error');
      return;
    }

    try {
      saveButton.disabled = true;
      setMessage(message, 'Guardando evento...', 'warn');
      setLoading(true, 'Guardando evento...');

      const imagenUrl = await uploadImageIfNeeded();
      const payload = {
        titulo,
        descripcion,
        fecha_evento: fechaEvento,
        estado,
        imagen_url: imagenUrl,
        actualizado_por: undefined,
        updated_at: new Date().toISOString()
      };

      // Si tu tabla no tiene actualizado_por, esta propiedad undefined no se envía.
      delete payload.actualizado_por;

      let response;
      if (id) {
        response = await app.supabase
          .from(app.config.eventosTable)
          .update(payload)
          .eq('id', id);
      } else {
        response = await app.supabase
          .from(app.config.eventosTable)
          .insert({
            ...payload,
            creado_por: auth.session.user.id
          });
      }

      if (response.error) {
        console.error(response.error);
        throw new Error('No se pudo guardar. Revisa las políticas RLS de la tabla eventos.');
      }

      setMessage(message, estado === 'publicado' ? 'Evento publicado correctamente.' : 'Evento guardado como borrador.', 'success');
      resetForm();
      await loadEvents();
    } catch (error) {
      console.error(error);
      setMessage(message, error.message || 'Ocurrió un error al guardar el evento.', 'error');
    } finally {
      saveButton.disabled = false;
      setLoading(false);
    }
  }

  function editEvent(id) {
    const event = eventsCache.find((item) => item.id === id);
    if (!event) return;

    document.querySelector('#eventId').value = event.id;
    document.querySelector('#titulo').value = event.titulo || '';
    document.querySelector('#fechaEvento').value = event.fecha_evento || '';
    document.querySelector('#estado').value = event.estado || 'borrador';
    document.querySelector('#descripcion').value = event.descripcion || '';
    imageUrl.value = event.imagen_url || '';
    currentImageUrl = event.imagen_url || '';
    selectedFile = null;
    imageFile.value = '';
    setPreview(currentImageUrl);
    formTitle.textContent = 'Editar evento';
    saveButton.textContent = 'Actualizar evento';
    window.scrollTo({ top: document.querySelector('#crear').offsetTop - 90, behavior: 'smooth' });
  }

  async function toggleEventStatus(id) {
    const event = eventsCache.find((item) => item.id === id);
    if (!event) return;

    const nuevoEstado = event.estado === 'publicado' ? 'borrador' : 'publicado';
    setLoading(true, 'Actualizando estado...');

    const { error } = await app.supabase
      .from(app.config.eventosTable)
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq('id', id);

    setLoading(false);

    if (error) {
      console.error(error);
      setMessage(message, 'No se pudo cambiar el estado del evento.', 'error');
      return;
    }

    setMessage(message, nuevoEstado === 'publicado' ? 'Evento publicado.' : 'Evento enviado a borrador.', 'success');
    await loadEvents();
  }

  async function deleteEvent(id) {
    const event = eventsCache.find((item) => item.id === id);
    const confirmed = window.confirm(`¿Eliminar el evento "${event?.titulo || 'seleccionado'}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setLoading(true, 'Eliminando evento...');
    const { error } = await app.supabase
      .from(app.config.eventosTable)
      .delete()
      .eq('id', id);
    setLoading(false);

    if (error) {
      console.error(error);
      setMessage(message, 'No se pudo eliminar el evento.', 'error');
      return;
    }

    setMessage(message, 'Evento eliminado correctamente.', 'success');
    await loadEvents();
  }

  grid?.addEventListener('click', async (event) => {
    const editId = event.target.closest('[data-edit]')?.dataset.edit;
    const toggleId = event.target.closest('[data-toggle]')?.dataset.toggle;
    const deleteId = event.target.closest('[data-delete]')?.dataset.delete;

    if (editId) editEvent(editId);
    if (toggleId) await toggleEventStatus(toggleId);
    if (deleteId) await deleteEvent(deleteId);
  });

  imageFile?.addEventListener('change', () => {
    const file = imageFile.files?.[0];
    selectedFile = file || null;

    if (!file) {
      setPreview(imageUrl.value.trim() || currentImageUrl);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  });

  imageUrl?.addEventListener('input', () => {
    if (!selectedFile) setPreview(imageUrl.value.trim() || currentImageUrl);
  });

  searchInput?.addEventListener('input', renderEvents);
  filterStatus?.addEventListener('change', renderEvents);
  resetButton?.addEventListener('click', resetForm);
  form?.addEventListener('submit', saveEvent);

  setLoading(true, 'Preparando panel...');
  auth = await requireAdmin();
  setLoading(false);
  if (!auth) return;

  await loadEvents();
});
