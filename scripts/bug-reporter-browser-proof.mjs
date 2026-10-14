// Local-only proof: email is never sent; the report endpoint is a fixture.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const widget=await readFile(new URL('../public/bug-reporter.js',import.meta.url));
let received;
const server=createServer(async(req,res)=>{
  if(req.url==='/bug-reporter.js'){res.setHeader('content-type','text/javascript');res.end(widget);return;}
  if(req.url==='/api/hivemind/bug-reports'){
    const parts=[];for await(const part of req)parts.push(part);
    received=await new Response(Buffer.concat(parts),{headers:{'content-type':req.headers['content-type']}}).formData();
    res.setHeader('content-type','application/json');res.end(JSON.stringify({status:'sent',reportId:'local-preview-only'}));return;
  }
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#f8fafc;font-family:system-ui"><h1>SINGULANCE workspace fixture</h1><p>No production sessions or email service connected.</p><script src="/bug-reporter.js"></script></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(()=>{
    navigator.mediaDevices.getDisplayMedia=async()=>{throw new DOMException('User declined','NotAllowedError');};
    navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext();const tone=ctx.createOscillator();tone.connect(ctx.createMediaStreamDestination());const destination=ctx.createMediaStreamDestination();tone.connect(destination);tone.start();window.fixtureAudioContext=ctx;return destination.stream;};
  });
  await page.goto(`${origin}/hivemind/app/overview/new`);
  await page.getByRole('button',{name:'Report a bug',exact:true}).click();
  assert.equal(await page.getByRole('dialog').isVisible(),true);
  await page.getByRole('button',{name:'Send bug report',exact:true}).click();
  await page.getByText('Review the report and check the consent box first.').waitFor();
  await page.getByRole('button',{name:'Take screenshot',exact:true}).click();
  await page.getByText('No screenshot captured. Try again or upload one.').waitFor();
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;const context=canvas.getContext('2d');context.fillStyle='red';context.fillRect(0,0,200,100);return canvas.toDataURL('image/png').split(',')[1];});
  await page.locator('#upload').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.locator('#shot').waitFor({state:'visible'});
  const rect=await page.locator('#preview').boundingBox();
  await page.mouse.move(rect.x+20,rect.y+20);await page.mouse.down();await page.mouse.move(rect.x+70,rect.y+60);await page.mouse.up();
  assert.deepEqual(await page.locator('#preview').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(30,30,1,1).data)),[0,0,0,255]);
  await page.getByRole('button',{name:'Record voice remark',exact:true}).click();
  await page.getByRole('button',{name:'Stop recording',exact:true}).waitFor();
  await page.waitForTimeout(1100);
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.locator('#sound').waitFor({state:'visible'});
  await page.getByLabel('What happened?').fill('The employee details did not save. This is a local fixture.');
  await page.screenshot({path:'/private/tmp/bug-reporter-preview-desktop.png'});
  await page.setViewportSize({width:320,height:740});
  assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.screenshot({path:'/private/tmp/bug-reporter-preview-mobile.png'});
  await page.getByLabel('I reviewed this report').check();
  await page.getByRole('button',{name:'Send bug report',exact:true}).click();
  await page.getByText('Report sent. Reference: local-preview-only').waitFor();
  assert.equal(received.get('consent'),'yes');assert.equal(received.get('path'),'/hivemind/app/overview/new');assert.equal(received.get('screenshot').type,'image/jpeg');assert.ok(received.get('audio').size>0);
  assert.equal(await page.locator('#shot').isVisible(),false);assert.equal(await page.locator('#sound').isVisible(),false);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').isVisible(),false);
  console.log('PASS: desktop/mobile popup, consent gate, capture denial, upload and pixel redaction, microphone stop/review, mocked submission, cleanup and Escape. No real email sent.');
}finally{await browser.close();server.close();}
