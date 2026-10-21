# Expediente socioeconómico

Aplicación estática de 42 requisitos, publicada en Netlify y vinculada a un proyecto Supabase independiente.

## Modalidad vigente: solo nube

El archivo `index.html` exige inicio de sesión por correo. Una vez autenticado, lee y guarda estados, notas y archivos exclusivamente en Supabase. Los archivos adjuntos no se guardan en IndexedDB ni en el almacenamiento local del navegador. Supabase puede almacenar la sesión de acceso en el navegador.

Cada usuario ve únicamente sus datos mediante las políticas RLS. El depósito `pericia-documents` es privado. El límite de cada archivo es 25 MB.

Al iniciar sesión por primera vez se muestran 42 requisitos sin completar, sin importar lo que aparezca en el navegador de versiones anteriores. Los datos antiguos que hayan quedado en IndexedDB no se borran, pero esta interfaz ya no los lee. Si se desean recuperar, hay que usar una versión anterior o un respaldo; esta versión está diseñada para empezar de cero.

## Configuración de acceso

La versión vigente usa **correo y contraseña**, no enlaces mágicos de correo. Para habilitar la primera cuenta, ve a Authentication > Users dentro del proyecto Supabase. Hay un usuario antiguo sin confirmar; como los datos del expediente están vacíos, puedes eliminar esa cuenta desde la consola y crearla nuevamente con Add user > Create new user, estableciendo una contraseña larga y marcando **Auto Confirm User**. No guardes contraseñas en el código ni las compartas por chat.

Por seguridad se recomienda desactivar nuevas altas públicas en Authentication > Sign In / Providers una vez que la cuenta esté creada. La autenticación sigue siendo obligatoria para acceder a los 42 requisitos y guardar documentos.



En Supabase Authentication > URL Configuration, poner la URL principal y la redirección permitida como:
https://pericia-socioeconomica.netlify.app

No es necesario enviar enlaces por correo cuando ya existe una cuenta confirmada con contraseña.

## Comprobación entre computadores

Iniciar sesión en PC 1, cargar un documento y esperar la confirmación de Supabase. Iniciar sesión con el mismo correo en PC 2 y comprobar que el documento aparece y se descarga. El cambio de estado y las observaciones se guardan del mismo modo.

## Seguridad

No guardar documentos reales en GitHub. La clave publicable de Supabase no es secreta; las claves secretas nunca deben estar en el código del navegador. La contraseña compartida de Netlify debe reemplazarse por una más segura. Conservar copias independientes de los archivos originales.

Nota técnica: `cloud.js` pertenece a una versión anterior con sincronización local; la página vigente no lo carga.
