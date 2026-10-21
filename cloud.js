/* Cloud sync for pericia. Local data remains intact and is never removed by this module. */
(() => {
  'use strict';
  const cfg = window.PERICIA_SUPABASE || {};
  const url = (cfg.url || '').trim();
  const key = (cfg.publishableKey || '').trim();
  const BUCKET = 'pericia-documents';
  const MAX_BYTES = 25 * 1024 * 1024;
  const $ = id => document.getElementById(id);
  let supabase = null;
  let user = null;
  let busy = false;

  function announce(message, error = false) {
    $('cloudStatus').textContent = message;
    $('cloudStatus').style.color = error ? '#ffc88e' : '#d6dedb';
  }
  function updateUI() {
    $('cloudLogin').hidden = !!user || !supabase;
    $('cloudLogout').hidden = !user;
    $('cloudSync').hidden = !user;
    $('cloudUser').textContent = user ? user.email : '';
  }
  function changed() {
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderFiles === 'function') window.renderFiles();
  }
  const cloud = window.periciaCloud = {
    online: false,
    meta: {},
    files: [],
    listDoc(docId) { return this.online ? this.files.filter(f => f.doc_id === docId) : []; },
    async download(file) {
      if (!this.online) throw Error('Inicia sesión para abrir este archivo.');
      const { data, error } = await supabase.storage.from(BUCKET).download(file.storage_path);
      if (error) throw error;
      const link = document.createElement('a');
      const blobUrl = URL.createObjectURL(data);
      link.href = blobUrl;
      link.download = file.file_name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    },
    async saveMeta(item) {
      if (!this.online) return;
      const old = this.meta[item.id];
      this.meta[item.id] = { ...item };
      changed();
      const { error } = await supabase.from('pericia_document_states').upsert({
        user_id: user.id, doc_id: item.id, status: item.status, notes: item.notes || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,doc_id' });
      if (error) {
        this.meta[item.id] = old || { ...item };
        announce('Cambios locales guardados; no se pudo sincronizar. Usa «Subir datos locales» para reintentar.', true);
        throw error;
      }
      announce('Cambios guardados en la nube ✓');
    },
    async upload(item) {
      if (!this.online) return;
      if (this.files.some(f => f.client_file_id === String(item.id))) return;
      if (!(item.blob instanceof Blob)) throw Error('El archivo local no tiene un formato válido.');
      if (item.blob.size > MAX_BYTES) throw Error('Máximo 25 MB por archivo. Se ha guardado solo en este navegador.');
      const filename = (item.name || 'archivo').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 160);
      const storagePath = [user.id, item.doc, crypto.randomUUID() + '-' + filename].join('/');
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, item.blob, {
        contentType: item.blob.type || 'application/octet-stream',
        cacheControl: '0',
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { data, error: recordError } = await supabase.from('pericia_document_files').insert({
        user_id: user.id, doc_id: item.doc, client_file_id: String(item.id),
        storage_path: storagePath, file_name: item.name,
        size_bytes: item.blob.size, content_type: item.blob.type || 'application/octet-stream'
      }).select('id,user_id,doc_id,client_file_id,storage_path,file_name,size_bytes,content_type,created_at').single();
      if (recordError) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw recordError;
      }
      this.files.push(data);
      changed();
      announce('Archivo guardado en la nube ✓');
    }
  };

  async function load() {
    if (!user) return;
    const [statuses, files] = await Promise.all([
      supabase.from('pericia_document_states').select('doc_id,status,notes,updated_at'),
      supabase.from('pericia_document_files').select('id,doc_id,client_file_id,storage_path,file_name,size_bytes,content_type,created_at')
    ]);
    if (statuses.error) throw statuses.error;
    if (files.error) throw files.error;
    cloud.meta = Object.fromEntries(statuses.data.map(x => [x.doc_id, { id:x.doc_id,status:x.status,notes:x.notes }]));
    cloud.files = files.data;
    cloud.online = true;
    announce('Nube conectada · ' + files.data.length + ' archivo(s)');
    changed();
  }
  async function sessionChange(session) {
    user = session?.user || null;
    if (!user) {
      cloud.online = false;
      cloud.meta = {};
      cloud.files = [];
      announce('Sin sesión · solo almacenamiento local');
      updateUI();
      changed();
      return;
    }
    updateUI();
    announce('Cargando archivos privados...');
    try { await load(); } catch (e) { cloud.online = false; announce('No se pudo consultar la nube: ' + e.message, true); }
  }
  $('cloudLogin').addEventListener('click', async () => {
    const email = $('cloudEmail').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { announce('Introduce un correo válido.', true); return; }
    try {
      $('cloudLogin').disabled = true;
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { emailRedirectTo: location.origin + location.pathname }
      });
      if (error) throw error;
      announce('Te enviamos un enlace de acceso a ' + email + '. Ábrelo en el dispositivo donde quieras trabajar.');
    } catch (e) { announce('Error al enviar acceso: ' + e.message, true); }
    finally { $('cloudLogin').disabled = false; }
  });
  $('cloudLogout').addEventListener('click', async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) announce('No se pudo cerrar sesión: ' + error.message, true);
    }
  });
  $('cloudSync').addEventListener('click', async () => {
    if (!cloud.online || busy) return;
    if (!confirm('Se copiarán a la nube tus documentos locales y estados que aún no estén allí. Los originales NO se eliminarán. ¿Continuar?')) return;
    busy = true; $('cloudSync').disabled = true;
    let copied = 0, failed = [];
    try {
      for (const [id, m] of Object.entries(window.periciaLocal.metadata)) {
        if (cloud.meta[id]) continue; // Never overwrite newer cloud data during migration
        try { await cloud.saveMeta(m); copied++; } catch(e) { failed.push('Estado ' + id + ': ' + e.message); }
      }
      for (const d of window.periciaLocal.docs) {
        const files = await window.periciaLocal.byDoc(d.id);
        for (const file of files) {
          if (cloud.files.some(f => f.client_file_id === String(file.id))) continue;
          try { await cloud.upload({ ...file, doc: d.id }); copied++; }
          catch(e) { failed.push(file.name + ': ' + e.message); }
        }
      }
      announce('Sincronización: ' + copied + ' elemento(s) copiados' + (failed.length ? ' · ' + failed.length + ' fallidos' : ' ✓'), failed.length > 0);
      if (failed.length) alert('Algunos archivos siguen solo en este dispositivo:\n' + failed.slice(0,12).join('\n') + (failed.length>12 ? '\n...' : ''));
    } finally { busy = false; $('cloudSync').disabled = false; changed(); }
  });

  async function init() {
    if (!url || !key) {
      announce('Nube pendiente de configurar · tus archivos locales están disponibles');
      $('cloudEmail').hidden = true;
      $('cloudLogin').hidden = true;
      $('cloudSync').hidden = true;
      $('cloudLogout').hidden = true;
      return;
    }
    announce('Iniciando conexión segura...');
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
      supabase = mod.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      updateUI();
      const {data,error} = await supabase.auth.getSession();
      if(error) throw error;
      await sessionChange(data.session);
      supabase.auth.onAuthStateChange((_event, session) => {
        // defer database reads so they do not block Supabase's internal auth lock
        setTimeout(() => sessionChange(session), 0);
      });
    } catch (e) {
      announce('Nube no disponible; tus datos locales siguen accesibles. ' + e.message, true);
    }
  }
  init();
})();