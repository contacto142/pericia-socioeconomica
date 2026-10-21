# Expediente socioeconómico

Dashboard de 42 requisitos: documentos, estados y notas. Los archivos locales siguen en IndexedDB. El código adicional de sincronización con Supabase ya está preparado, pero la nube aún no está activa.

## Habilitar sincronización entre computadores

1. Elegir un proyecto en https://supabase.com/dashboard.
2. Ejecutar `supabase/schema.sql` desde Supabase SQL Editor para crear las tablas con RLS y el depósito privado.
3. Configurar Supabase Auth con correo electrónico y permitir la redirección a https://pericia-socioeconomica.netlify.app.
4. Completar en `cloud-config.js` la URL del proyecto y su clave **publishable**. No utilizar claves secretas ni subir documentos a GitHub.
5. Desde el PC donde están los archivos, iniciar sesión por correo y pulsar «Subir mis datos locales». Luego usar el mismo correo desde otro PC.

El traslado no elimina archivos locales. La carga en la nube requiere conexión y puede fallar; verifica el resultado. El respaldo JSON del navegador no incluye archivos existentes exclusivamente en la nube.

## Seguridad

La base de datos y el bucket usan permisos por usuario autenticado; el bucket no es público. La contraseña general de Netlify no sustituye la autenticación personal. Reemplaza la clave de cuatro dígitos por otra más segura antes de subir documentos sensibles.

El sistema no ofrece cifrado de extremo a extremo ni una política automática de conservación y recuperación. Conserva respaldos independientes.
