# Expediente socioeconómico

Dashboard estático de 42 requisitos de la pericia. Adjunta múltiples archivos por requisito; se conservan en IndexedDB dentro del navegador. Descarga respaldos JSON y guárdalos en un lugar seguro.

## Despliegue

Vincula el repositorio en Netlify, configuración de compilación vacía y directorio de publicación `.`. El proyecto Netlify `pericia-socioeconomica` ya tiene una contraseña de sitio configurada en Netlify; **no agregar la contraseña al repositorio**.

## Seguridad

Los archivos adjuntos nunca se suben al repositorio ni a Netlify. Se mantienen por navegador/dispositivo, sin sincronización y sin cifrado adicional. La protección de acceso al sitio no cifra ni protege el almacenamiento IndexedDB frente a quienes tengan acceso al perfil local del navegador. Para información muy sensible se recomienda almacenamiento autenticado, cifrado y con copias de seguridad. El código del repositorio es público, no subir documentación privada a GitHub.
