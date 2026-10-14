(() => {
  if (document.getElementById('singulance-bug-reporter')) return;
  const host = document.createElement('div'); host.id = 'singulance-bug-reporter';
  document.body.append(host);
  const root = host.attachShadow({ mode:'open' });
  root.innerHTML = `<style>
    :host { color-scheme:light; font:14px/1.5 system-ui,sans-serif; color:#252c38; }
    * { box-sizing:border-box; } button,input,textarea { font:inherit; }
    button { cursor:pointer; border:1px solid #d8dde6; background:#fff; color:#252c38; border-radius:8px; padding:8px 12px; }
    button:disabled { opacity:.5; cursor:default; } button:focus-visible,textarea:focus-visible,input:focus-visible { outline:3px solid #2276dd; outline-offset:3px; }
    #trigger { position:fixed; right:16px; bottom:16px; z-index:2147483000; box-shadow:0 3px 14px #10223d20; display:flex; align-items:center; gap:6px; }
    dialog { border:1px solid #d8dde6; border-radius:16px; padding:0; width:min(460px,calc(100vw - 24px)); max-height:calc(100dvh - 40px); color:#252c38; background:#fff; box-shadow:0 20px 70px #12264033; z-index:2147483001; }
    dialog::backdrop { background:#10223d50; } .content { padding:22px; } header { display:flex; justify-content:space-between; align-items:start; gap:12px; }
    h2 { font-size:20px; margin:0 0 4px; font-weight:600; } p { margin:0 0 16px; color:#647085; } #close { padding:2px 8px; font-size:24px; line-height:1.2; }
    label { display:block; margin-bottom:6px; } textarea { display:block; width:100%; min-height:100px; resize:vertical; padding:10px; border:1px solid #d8dde6; border-radius:8px; }
    .row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:14px 0; } #upload { display:none; } .hint { font-size:12px; margin:8px 0; }
    canvas { max-width:100%; height:auto; display:block; border:1px solid #d8dde6; touch-action:none; } [hidden] { display:none!important; }
    #consent-label { display:flex; align-items:start; gap:8px; margin:18px 0 14px; font-size:13px; } input[type=checkbox] { margin-top:4px; }
    #send { background:#117dff; color:white; border-color:#117dff; } #message { margin-top:12px; color:#4d5c74; } audio { width:100%; } #page { font-size:12px; overflow-wrap:anywhere; }
    @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto; } }
  </style>
  <button id="trigger" type="button" aria-label="Report a bug"><span aria-hidden="true">&#9873;</span> Report a bug</button>
  <dialog aria-labelledby="title"><div class="content">
    <header><div><h2 id="title">Report a bug</h2><p>Show us what went wrong.</p></div><button id="close" type="button" aria-label="Close bug report">&times;</button></header>
    <label for="remark">What happened?</label><textarea id="remark" maxlength="4000" placeholder="What were you trying to do, and what happened instead?"></textarea>
    <div class="row"><button id="capture" type="button">Take screenshot</button><button id="choose" type="button">Upload screenshot</button><input id="upload" type="file" accept="image/png,image/jpeg,image/webp"></div>
    <p class="hint">Screen capture asks your browser for permission. Choose only the relevant tab. Hide private information before sending.</p>
    <section id="shot" hidden aria-label="Screenshot preview"><canvas id="preview"></canvas><p class="hint">Drag across the preview to cover private information with a black rectangle.</p><div class="row"><button id="remove-shot" type="button">Remove screenshot</button></div></section>
    <div class="row"><button id="record" type="button">Record voice remark</button><button id="stop" type="button" hidden>Stop recording</button><span id="recording" role="status"></span></div>
    <p class="hint">Microphone access is requested only when you start. Recording stops after 30 seconds. Listen before sending.</p>
    <section id="sound" hidden><audio id="audio-preview" controls></audio><button id="remove-audio" type="button">Remove recording</button></section>
    <p id="page" class="hint"></p>
    <label id="consent-label"><input id="consent" type="checkbox">I reviewed this report and its attachments. Send them to SINGULANCE support.</label>
    <button id="send" type="button">Send bug report</button><div id="message" role="status" aria-live="polite"></div>
  </div></dialog>`;
  const $ = id => root.getElementById(id);
  const dialog = root.querySelector('dialog');
  let screenshot = false, audio = null, audioUrl = null, recorder = null, media = null, captureStream = null, timer = null, submitting = false, uncertain = false, alive = true, generation = 0;
  const message = text => { $('message').textContent = text; };
  const stopTracks = () => { media?.getTracks().forEach(track => track.stop()); media = null; };
  const stopRecording = () => { clearTimeout(timer); timer = null; if (recorder?.state === 'recording') recorder.stop(); stopTracks(); };
  const clearAudio = () => { if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl=null; audio=null; $('audio-preview').removeAttribute('src'); $('sound').hidden=true; };
  const clearShot = () => { screenshot=false; $('shot').hidden=true; $('preview').width=0; $('preview').height=0; };
  const close = () => { if (submitting) return; generation++; stopRecording(); dialog.close(); $('trigger').focus(); };
  $('trigger').onclick = () => { $('page').textContent = `Page included: ${location.origin}${location.pathname}`; dialog.showModal(); };
  $('close').onclick = close;
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  function drawImage(image) {
    const canvas=$('preview'); const width=image.videoWidth || image.width, height=image.videoHeight || image.height;
    const ratio=Math.min(1,1400/width,1800/height);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height); screenshot=true; $('shot').hidden=false;
  }
  $('choose').onclick=() => $('upload').click();
  $('upload').onchange=async event => {
    const file=event.target.files?.[0]; event.target.value=''; if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>2_000_000) { message('Choose a PNG, JPEG or WebP image under 2 MB.'); return; }
    try { const image=await createImageBitmap(file); drawImage(image); image.close(); message('Screenshot ready. Cover private information if needed.'); }
    catch { message('This image could not be opened. Choose another screenshot.'); }
  };
  $('capture').onclick=async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) { message('Screen capture is unavailable here. Upload a screenshot instead.'); return; }
    let stream;
    dialog.close(); host.style.visibility='hidden';
    try {
      stream=await navigator.mediaDevices.getDisplayMedia({ video:{ displaySurface:'browser' }, audio:false });
      captureStream=stream;
      const video=document.createElement('video'); video.srcObject=stream; video.muted=true;
      await video.play(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      drawImage(video);
      video.srcObject=null; message('Screenshot ready. Cover private information if needed.');
    } catch { message('No screenshot captured. Try again or upload one.'); }
    finally { stream?.getTracks().forEach(track=>track.stop()); captureStream=null; host.style.visibility=''; if (alive) dialog.showModal(); }
  };
  // Redaction happens locally on the actual image that will be attached.
  let start=null;
  const point=event=>{ const rect=$('preview').getBoundingClientRect(); return { x:(event.clientX-rect.left)*$('preview').width/rect.width, y:(event.clientY-rect.top)*$('preview').height/rect.height }; };
  $('preview').onpointerdown=event=>{ start=point(event); $('preview').setPointerCapture(event.pointerId); };
  $('preview').onpointerup=event=>{ if (!start) return; const end=point(event), context=$('preview').getContext('2d'); context.fillStyle='#000'; context.fillRect(Math.min(start.x,end.x),Math.min(start.y,end.y),Math.abs(end.x-start.x),Math.abs(end.y-start.y)); start=null; };
  $('preview').onpointercancel=()=>{ start=null; };
  $('remove-shot').onclick=clearShot;
  $('record').onclick=async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { message('Voice recording is unavailable here. Add a text remark instead.'); return; }
    $('record').disabled=true;
    const permissionGeneration = generation;
    try {
      media=await navigator.mediaDevices.getUserMedia({ audio:true });
      if (!alive || permissionGeneration !== generation || !dialog.open) { stopTracks(); $('record').disabled=false; return; }
      clearAudio();
      const mime=['audio/webm','audio/ogg','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('unsupported');
      recorder=new MediaRecorder(media,{ mimeType:mime }); const chunks=[]; let size=0;
      recorder.ondataavailable=event=>{ if (event.data.size) { size+=event.data.size; chunks.push(event.data); if (size>1_000_000) stopRecording(); } };
      recorder.onstop=()=>{ if (alive) { audio=new Blob(chunks,{ type:mime }); audioUrl=URL.createObjectURL(audio); $('audio-preview').src=audioUrl; $('sound').hidden=false; } $('stop').hidden=true; $('recording').textContent=''; $('record').disabled=false; stopTracks(); };
      recorder.start(1000); $('stop').hidden=false; $('recording').textContent='Recording...'; timer=setTimeout(stopRecording,30_000);
    } catch { stopTracks(); $('record').disabled=false; message('Microphone recording could not start. Add a text remark instead.'); }
  };
  $('stop').onclick=stopRecording; $('remove-audio').onclick=clearAudio;
  $('send').onclick=async () => {
    if (submitting || uncertain) return;
    if (recorder?.state==='recording') { message('Stop and review your recording before sending.'); return; }
    if (!$('consent').checked) { message('Review the report and check the consent box first.'); return; }
    if (!$('remark').value.trim() && !audio) { message('Describe the bug or record a voice remark.'); return; }
    submitting=true; $('send').disabled=true; $('close').disabled=true; message('Sending report...');
    try {
      const form=new FormData(); form.set('remark',$('remark').value); form.set('path',location.pathname); form.set('consent','yes');
      if (screenshot) { const blob=await new Promise(resolve=>$('preview').toBlob(resolve,'image/jpeg',.85)); if (!blob || blob.size>2_000_000) throw new Error('Screenshot too large. Remove it or upload a smaller one.'); form.set('screenshot',blob,'screenshot.jpg'); }
      if (audio) form.set('audio',audio,'voice-remark');
      const response=await fetch('/api/hivemind/bug-reports',{ method:'POST',credentials:'same-origin',body:form });
      const result=await response.json();
      if (response.ok && result.status==='sent') { clearShot(); clearAudio(); $('remark').value=''; $('consent').checked=false; message(`Report sent. Reference: ${result.reportId}`); }
      else if (result.error==='delivery_unconfirmed_do_not_repeat') { uncertain=true; message('Delivery could not be confirmed. It may have been sent. Do not repeat this report.'); }
      else { const errors={ authentication_required:'Sign in again before sending.', report_rate_limited:'Too many reports. Please try again in a minute.', bug_reporting_unavailable:'Bug reporting is not configured yet.', report_too_large:'Attachments are too large. Remove one and try again.', invalid_attachment:'An attachment could not be accepted. Remove it and try again.' }; message(errors[result.error] || 'The report was not accepted. Please review its contents.'); }
    } catch (error) { uncertain=!error.message?.startsWith('Screenshot'); message(uncertain ? 'Delivery could not be confirmed. Do not repeat the report yet.' : error.message); }
    finally { submitting=false; $('send').disabled=uncertain; $('close').disabled=false; }
  };
  addEventListener('pagehide',()=>{ alive=false; generation++; stopRecording(); stopTracks(); captureStream?.getTracks().forEach(track=>track.stop()); if (audioUrl) URL.revokeObjectURL(audioUrl); });
})();
