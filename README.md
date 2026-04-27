# IPROYEC - Página secundaria para gestión de eventos

Esta versión ya viene preparada para trabajar con Supabase.

## Qué trae

- `index.html`: login real con Supabase Auth.
- `panel.html`: gestor interno de eventos.
- `preview.html`: vista previa interna, protegida por login.
- `js/supabase-config.js`: único archivo donde debes pegar los datos públicos del proyecto Supabase.
- `js/panel.js`: crea, edita, elimina, guarda borradores y publica eventos.
- `sql/supabase-esquema-referencia.sql`: respaldo del esquema y políticas recomendadas.
- `robots.txt`: evita indexación básica del panel. No es seguridad, solo privacidad frente a buscadores.
- `CNAME`: preparado para `publicar.iproyeccopiapo.cl`. Cámbialo si usarás otro subdominio.

## Datos que debes colocar

Abre:

```text
js/supabase-config.js
```

Y reemplaza:

```js
window.IPROYEC_SUPABASE_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseAnonKey: "TU_ANON_PUBLIC_KEY",
  eventosTable: "eventos",
  adminTable: "admin_users",
  storageBucket: "eventos"
};
```

Necesitas SOLO:

1. Project URL.
2. anon/public key.
3. Confirmar que tu tabla se llama `eventos`.
4. Confirmar que tu tabla de administradores se llama `admin_users`.
5. Confirmar que tu bucket se llama `eventos`.

No uses ni compartas:

- `service_role key`.
- Password de base de datos.
- JWT secret.
- Claves privadas.

## Flujo del panel

- `borrador`: queda guardado en Supabase, pero no debe mostrarse en la página principal.
- `publicado`: queda listo para que la web principal lo consulte después.

La página principal todavía no se toca. Después se conectará con una consulta filtrada:

```text
estado = publicado
```

## Publicación con GitHub Pages

Según tu DNS actual, ya tienes:

```text
publicar.iproyeccopiapo.cl -> leonardochm.github.io
```

Entonces puedes usar GitHub Pages sin problema:

1. Crea un repositorio nuevo.
2. Sube todos estos archivos.
3. En GitHub: Settings > Pages.
4. Publica desde la rama principal.
5. En Custom domain coloca:

```text
publicar.iproyeccopiapo.cl
```

6. Revisa que el archivo `CNAME` tenga exactamente ese dominio.

## Prueba rápida

1. Configura `js/supabase-config.js`.
2. Sube a GitHub Pages o prueba con un servidor local.
3. Entra a `index.html`.
4. Inicia sesión con el usuario creado en Supabase Auth.
5. Ese usuario debe existir también en `admin_users`.
6. Crea un evento.
7. Revisa `preview.html`.

## Importante

La anon/public key puede quedar visible en el navegador. Eso es normal en un frontend estático. La seguridad real debe estar en Row Level Security y en que la `service_role key` jamás esté en el frontend.
