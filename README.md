# Expediente socioeconómico

Dashboard con los 42 requisitos del listado pericial, diseño gris oscuro y etiquetas por estado.

## Acceso vigente

Una sola pantalla de clave numérica de cuatro dígitos. Ya no se usa inicio de sesión con correo. La clave se verifica en una función de Netlify contra un valor cifrado mediante scrypt almacenado en variables de entorno. Tras ingresar, la sesión se almacena en una cookie Secure, HttpOnly, SameSite=Strict por hasta 12 horas. Hay límites de intentos, aunque una clave de cuatro dígitos **no se recomienda para archivos sensibles**.

## Almacenamiento vigente

Archivos y estados se guardan en **Netlify Blobs**, en almacenes privados de ámbito de sitio a través de funciones protegidas por la sesión. No se usa Supabase en esta versión. Las tablas anteriores de Supabase permanecen sin transferir archivos. No se guardan documentos en IndexedDB.

- Los requisitos comienzan pendientes; solo cambia su estado al recibir confirmación del servidor.
- Se pueden adjuntar varios archivos de hasta 25 MB por archivo. Las cargas se realizan en partes.
- Los archivos se almacenan en Netlify Blobs y pueden recuperarse desde otro computador con la misma clave.
- Las operaciones de guardar, consultar, descargar y eliminar deben verificar la cookie firmada del servidor.
- Haz copias independientes de los documentos; este sistema no implementa versionado de archivos ni backups exportables.

## Seguridad operativa

El repositorio GitHub es público, pero las variables `PERICIA_PIN_HASH` y `PERICIA_SESSION_SECRET` solo existen en el entorno privado de Netlify Functions. No incorporar secretos ni documentos al repositorio.

Cambiar cuanto antes la clave de cuatro dígitos por una contraseña larga, especialmente por tratarse de antecedentes financieros y judiciales. Compartir la clave equivale a compartir acceso de lectura y escritura a todo el expediente.

## Publicación

Netlify conectado a la rama `main`. La página estática `index.html` invoca las funciones privadas `/api/pericia/auth` y `/api/pericia/data` basadas en `@netlify/blobs`. Los depósitos de datos son específicos del sitio y persisten entre despliegues.
