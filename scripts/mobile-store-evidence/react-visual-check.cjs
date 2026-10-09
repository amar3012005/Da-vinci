const { chromium } = require('playwright');
const fs = require('fs'); const assert = require('assert/strict');
(async () => {
 const browser = await chromium.launch({args:['--no-sandbox']});
 const page = await browser.newPage(); const errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 await page.route('http://fixture/**', async route=> {
  const path=new URL(route.request().url()).pathname; const file=path==='/'||!path.split('/').pop().includes('.')?'index.html':path.slice(1);
  const local=(process.env.VISUAL_OUTPUT||'/visual')+'/'+file; const asset=(process.env.FIXTURE_ROOT||'/fixture')+'/public/'+file;
  if(!fs.existsSync(local)&&!fs.existsSync(asset)) return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(fs.existsSync(local)?local:asset),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html'});
 });
 for (const width of [320,390,768]) {
  await page.setViewportSize({width,height:844}); await page.goto('http://fixture/');
  await page.getByRole('heading',{name:'Stay in the loop.'}).waitFor(); await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,shell:document.querySelector('[data-mobile-shell]').getBoundingClientRect().height,selectSize:parseFloat(getComputedStyle(document.querySelector('select')).fontSize),switchHeight:document.querySelector('[role=switch]').getBoundingClientRect().height}));
  const toggle=await page.getByRole('switch').evaluate(e=>{const t=e.children[0].getBoundingClientRect(),b=e.children[1].getBoundingClientRect();return {track:t.width,thumb:b.width,inTrack:b.x>=t.x&&b.right<=t.right};});assert.equal(toggle.track,36);assert.equal(toggle.thumb,16);assert.ok(toggle.inTrack);
  assert.equal(geometry.width,width); assert.equal(geometry.shell,844);assert.equal(geometry.selectSize,16);assert.ok(geometry.switchHeight>=44);
  await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/settings-'+width+'.png'});
  await page.setViewportSize({width,height:400}); await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-mobile-shell]').evaluate(e=>Math.round(e.getBoundingClientRect().height)),400);
  await page.goto('http://fixture/?view=profile');
  await page.getByText('Delete my account',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Delete',exact:true}).last().click();
  await page.getByRole('dialog',{name:'Profile action'}).waitFor(); await page.waitForTimeout(500);
  const box=await page.getByRole('dialog',{name:'Profile action'}).boundingBox();assert.ok(box.y>=0);assert.ok(box.y+box.height<=401);
  assert.ok((await page.getByRole('dialog').innerText()).includes('Shared company records'));
  await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/delete-keyboard-'+width+'.png'});
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://fixture/?view=billing&native=1');await page.locator('[data-native-plan-summary]').waitFor(); await page.waitForTimeout(500);
 assert.equal(await page.getByRole('button',{name:/Upgrade|Manage subscription/}).count(),0);
 assert.equal(await page.getByText('€79',{exact:true}).count(),0);
 await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/native-plan-390.png'});
 await page.goto('http://fixture/?view=billing');await page.getByRole('heading',{name:'Billing and plans'}).waitFor();
 assert.ok(await page.getByRole('button',{name:/Upgrade/}).count()>0);
 await page.goto('http://fixture/?native=1&view=gate');
 assert.equal(await page.locator('[data-sensitive-chat]').count(),0);
 await page.getByRole('button',{name:'Allow AI processing'}).waitFor();
 assert.equal(await page.locator('[data-sensitive-chat]').count(),0);
 await page.getByRole('button',{name:'Allow AI processing'}).click();
 await page.locator('[data-sensitive-chat]').waitFor();
 assert.ok((await page.evaluate(()=>window.__safetyCalls)).some(c=>c.method==='POST'&&c.body.granted===true));
 await page.evaluate(()=>window.__switchUser());
 await page.getByRole('button',{name:'Allow AI processing'}).waitFor();
 assert.equal(await page.locator('[data-sensitive-chat]').count(),0);
 assert.deepEqual(await page.evaluate(()=>window.__privateMounts),['fixture-user']);
 await page.goto('http://fixture/?native=1&view=gate&privacyFail=1');
 await page.getByRole('alert').waitFor(); assert.equal(await page.locator('[data-sensitive-chat]').count(),0);
 assert.equal(await page.getByRole('button',{name:'Sign out',exact:true}).count(),1);
 assert.equal(await page.getByRole('link',{name:'Settings',exact:true}).count(),1);
 for (const path of ['settings','profile']) {
  await page.goto('http://fixture/hivemind/m/'+path+'?native=1&view=gate&privacyFail=1');
  await page.locator('[data-sensitive-chat]').waitFor();
 }
 await page.goto('http://fixture/?native=1&view=gate&saveFail=1');
 await page.getByRole('button',{name:'Allow AI processing'}).click();await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('[data-sensitive-chat]').count(),0);
 await page.goto('http://fixture/?native=1');
 await page.getByRole('button',{name:'Allow AI processing'}).click();
 await page.getByRole('button',{name:'Withdraw permission'}).click();
 await page.getByRole('button',{name:'Allow AI processing'}).waitFor();
 const consentWrites=await page.evaluate(()=>window.__safetyCalls.filter(c=>c.method==='POST'&&c.path.includes('ai-consent')).map(c=>c.body.granted));
 assert.deepEqual(consentWrites,[true,false]);
 await page.getByLabel('What happened?').fill('The response contained an inappropriate claim. Please review.');
 await page.getByRole('button',{name:'Send report'}).click();
 await page.getByText('Report received. Reference: fixture-report-001').waitFor();
 const report=await page.evaluate(()=>window.__safetyCalls.find(c=>c.path.includes('safety-reports')));
 assert.deepEqual(Object.keys(report.body).sort(),['category','description']);
 await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/safety-report-390.png'});
 await page.goto('http://fixture/?native=1&saveFail=1');
 await page.getByLabel('What happened?').fill('A harmful response needs review.');
 await page.getByRole('button',{name:'Send report'}).click();await page.getByText('Your report was not saved. Please retry.').waitFor();
 assert.equal(await page.getByText(/Report received/).count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 for (const viewport of [{width:844,height:390},{width:320,height:568}]) {
  await page.setViewportSize(viewport);await page.goto('http://fixture/?view=profile');
  await page.getByText('Delete my account',{exact:true}).waitFor();
  await page.addStyleTag({content:'[data-mobile-shell] {text-size-adjust:200%; -webkit-text-size-adjust:200%;} [data-mobile-shell] p,[data-mobile-shell] button {font-size:1.5em !important;}'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  const transform=await page.locator('[data-mobile-shell] main > div').evaluate(e=>getComputedStyle(e).transform);
  assert.ok(transform==='none'||transform==='matrix(1, 0, 0, 1, 0, 0)');
 }
 for (const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:280}]) {
  await page.setViewportSize(viewport);await page.goto('http://fixture/?view=header');
  const language=page.getByRole('button',{name:'Reply language'});await language.waitFor();
  for(const name of ['Reply language','Recent conversations']){const rect=await page.getByRole('button',{name}).boundingBox();assert.ok(rect.width>=44&&rect.height>=44);}
  await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/header-'+viewport.width+'x'+viewport.height+'.png'});
  await language.click();await page.getByRole('button',{name:'English en'}).waitFor();
  const menu=page.getByRole('button',{name:'English en'}).locator('..');const rect=await menu.boundingBox();assert.ok(rect.y+rect.height<=viewport.height);
  assert.ok((await page.getByRole('button',{name:'English en'}).boundingBox()).height>=44);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 }
 for (const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:280}]) {
  await page.setViewportSize(viewport);await page.goto('http://fixture/?view=projects');
  await page.getByRole('button',{name:/Open project Long project 0/}).click();await page.getByRole('dialog',{name:'Project details'}).waitFor();
  await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/dense-project-'+viewport.width+'x'+viewport.height+'.png'});
  let rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=viewport.height);
  await page.getByRole('button',{name:'Close project details'}).click();
  await page.getByRole('button',{name:'New project',exact:true}).click();await page.getByRole('dialog',{name:'New project'}).waitFor();
  rect=await page.getByRole('dialog').boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=viewport.height);
  assert.equal(await page.locator('button button').count(),0);
  await page.goto('http://fixture/?view=connectors');await page.getByRole('button',{name:/Details for Long application 0/}).waitFor();await page.waitForTimeout(400);
  await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/dense-connectors-'+viewport.width+'x'+viewport.height+'.png'});
  assert.equal(await page.locator('button button').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 for(const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:280},{width:768,height:1024}]) {
  await page.setViewportSize(viewport);await page.goto('http://fixture/?view=artifact');await page.getByRole('button',{name:'Open artifact'}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();await page.evaluate(()=>document.documentElement.setAttribute('data-native-reduce-transparency','true'));assert.equal(await dialog.evaluate(e=>getComputedStyle(e).backdropFilter),'none');const rect=await dialog.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=viewport.height);
  const close=page.getByRole('button',{name:'Close',exact:true});const box=await close.boundingBox();if(viewport.width<=700)assert.ok(box.width>=44&&box.height>=44);
  for(const control of [page.getByRole('button',{name:'Share',exact:true}),page.getByRole('link',{name:'Download',exact:true})]) {const action=await control.boundingBox();assert.ok(action.y>=0&&action.y+action.height<=viewport.height);}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:(process.env.EVIDENCE_OUTPUT||'/evidence')+'/artifact-'+viewport.width+'x'+viewport.height+'.png'});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.ok(await page.getByRole('button',{name:'Open artifact'}).evaluate(e=>e===document.activeElement));
 }
 await browser.close();assert.deepEqual(errors,[]);console.log('Passed: mobile viewport/keyboard/touch controls at 320/390/768px; native billing/web purchases; consent initial denial, grant, withdraw, account switch, GET/POST failures; settings/profile/logout; report success receipt and failure without false receipt. No browser page errors.');
})().catch(e=>{console.error(e);process.exit(1)});
