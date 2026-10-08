// Isolated outer-shell geometry, not an authenticated native-chat test.
// PLAYWRIGHT_MODULE points to a disposable install; no app dependency needed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { readFileSync } = require('fs');
const assert = require('assert/strict');
(async () => {
 const browser = await chromium.launch({ args:['--no-sandbox'] });
 const page = await browser.newPage();
 const css = ['layout/mobile-chat-viewport.css','pages/HarnessSurface.css','layout/employee-mobile-roster.css'].map(p=>readFileSync('src/components/hivemind/app/'+p,'utf8')).join('\n').replaceAll('env(safe-area-inset-top, 0px)', '24px').replaceAll('env(safe-area-inset-top,0px)', '24px');
 for (const width of [320,360,390,430,820]) for(const height of [844,568,360]) {
  await page.setViewportSize({width,height});
  await page.setContent(`<html data-dsh-mode="hivemind-chat"><style>*{box-sizing:border-box}body{margin:0} .frame{padding-top:24px;box-sizing:border-box}.main{height:calc(100dvh - 56px);overflow:hidden;min-height:0}.rooms{height:calc(100dvh - 56px);display:flex}.canvas{height:100%;width:100%;display:flex;flex-direction:column;min-width:0}.messages{flex:1;min-height:0;overflow:auto}.composerStack{height:100px;flex-shrink:0}.header{height:56px;flex-shrink:0} ${css}</style><div data-native-compact-chat ${width<=600?'data-mobile-agent-overlay':''}><div class="frame" data-native-chat-frame>${width>600?'<div class="header">Navigation</div>':''}<main class="main" data-native-chat-main><div class="rooms" data-os-harness-rooms><div class="canvas" data-hivemind-harness-surface><div class="messages"><div style="height:2200px">History</div></div><div class="composerStack">Message Runtime…</div></div></div></main></div></div></html>`);
  const result=await page.evaluate(()=>{const r=document.querySelector('.composerStack').getBoundingClientRect();const m=document.querySelector('.messages');return {width:document.documentElement.scrollWidth, bottom:r.bottom,top:r.top,left:r.left,right:r.right,scroll:m.scrollHeight>m.clientHeight}});
  assert.equal(result.width,width);assert.ok(result.bottom<=height+1,JSON.stringify(result));assert.ok(result.top>=0);assert.equal(result.left,0);assert.equal(result.right,width);assert.equal(result.scroll,true);if(width===390 && height===844 && process.env.EVIDENCE_DIR) await page.screenshot({path:process.env.EVIDENCE_DIR+'/outer-runtime-390.png'});
 }
 // Popup contract: viewport height follows the keyboard, independently of page scroll.
 for(const width of [320,360,390,430]) {
  await page.setViewportSize({width,height:844});
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0} :root{--hm-app-viewport-height:360px}.popup{position:fixed;top:0;right:0;height:100vh;width:440px;max-width:100%;display:flex;flex-direction:column}.messages{flex:1;min-height:0;overflow:auto}.composer{height:100px;flex-shrink:0}${css}</style><div class="popup" data-hivemind-chat-panel><div class="messages"><div style="height:2000px">History</div></div><div class="composer" data-hivemind-popup-composer>Message HIVE…</div></div>`);
  const r=await page.locator('.popup').boundingBox();assert.equal(r.width,width);assert.equal(r.height,360);
 }
 if(process.env.EVIDENCE_DIR) await page.screenshot({path:process.env.EVIDENCE_DIR+'/outer-popup-keyboard-430.png'}); await browser.close();console.log('Passed 15 outer room viewport cases and 4 keyboard popup cases. Native content and authenticated UI remain separate checks.');
})().catch(e=>{console.error(e);process.exit(1)});
