const { chromium } = require('playwright');
const fs = require('fs'); const assert = require('assert/strict');
(async () => {
 const browser = await chromium.launch({args:['--no-sandbox']});
 const page = await browser.newPage(); const errors=[];
 page.on('pageerror', e=>errors.push(e.message));
 await page.route('http://fixture/**', async route=> {
  const path=new URL(route.request().url()).pathname; const file=path==='/'?'index.html':path.slice(1);
  const local='/visual/'+file; const asset='/fixture/public/'+file;
  if(!fs.existsSync(local)&&!fs.existsSync(asset)) return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(fs.existsSync(local)?local:asset),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html'});
 });
 for (const width of [320,390,768]) {
  await page.setViewportSize({width,height:844}); await page.goto('http://fixture/');
  await page.getByRole('heading',{name:'Stay in the loop.'}).waitFor(); await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,shell:document.querySelector('[data-mobile-shell]').getBoundingClientRect().height,selectSize:parseFloat(getComputedStyle(document.querySelector('select')).fontSize),switchHeight:document.querySelector('[role=switch]').getBoundingClientRect().height}));
  assert.equal(geometry.width,width); assert.equal(geometry.shell,844);assert.equal(geometry.selectSize,16);assert.ok(geometry.switchHeight>=44);
  await page.screenshot({path:'/evidence/settings-'+width+'.png'});
  await page.setViewportSize({width,height:400}); await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-mobile-shell]').evaluate(e=>Math.round(e.getBoundingClientRect().height)),400);
  await page.goto('http://fixture/?view=profile');
  await page.getByText('Delete my account',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Delete',exact:true}).last().click();
  await page.getByRole('dialog',{name:'Profile action'}).waitFor(); await page.waitForTimeout(500);
  const box=await page.getByRole('dialog',{name:'Profile action'}).boundingBox();assert.ok(box.y>=0);assert.ok(box.y+box.height<=401);
  assert.ok((await page.getByRole('dialog').innerText()).includes('Shared company records'));
  await page.screenshot({path:'/evidence/delete-keyboard-'+width+'.png'});
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://fixture/?view=billing&native=1');await page.locator('[data-native-plan-summary]').waitFor(); await page.waitForTimeout(500);
 assert.equal(await page.getByRole('button',{name:/Upgrade|Manage subscription/}).count(),0);
 assert.equal(await page.getByText('€79',{exact:true}).count(),0);
 await page.screenshot({path:'/evidence/native-plan-390.png'});
 await page.goto('http://fixture/?view=billing');await page.getByRole('heading',{name:'Billing and plans'}).waitFor();
 assert.ok(await page.getByRole('button',{name:/Upgrade/}).count()>0);
 await browser.close();assert.deepEqual(errors,[]);console.log('Mobile shell, keyboard sheets, 44px settings controls, native consumption-only billing and unchanged web purchases verified at 320/390/768px.');
})().catch(e=>{console.error(e);process.exit(1)});
