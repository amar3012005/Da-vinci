import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import MobileHero, { HeroMotionBoundary } from '../MobileHero';
import SubProducts from '../SubProducts';

jest.mock('../ProductCard',()=>({name})=><span>{name}</span>);
jest.mock('../three/NebulaBackdrop',()=>()=>{throw new Error('No WebGL');});
jest.mock('../HeroCtas',()=>()=> <button>Talk to founder</button>);
jest.mock('../three/HeroScene',()=>()=> <div data-testid="water-scene"/>);
jest.mock('../three/CinematicPlate',()=>()=>null);

beforeEach(()=>{
  window.matchMedia = jest.fn(query=>({matches:query==='(min-width: 768px)', addEventListener:jest.fn(),removeEventListener:jest.fn(),addListener:jest.fn(),removeListener:jest.fn()}));
});

test('the same poster stays mounted when the optional scene replaces its lazy fallback',async()=>{
  let idle;
  window.requestIdleCallback=jest.fn(callback=>{idle=callback;return 1;});
  window.cancelIdleCallback=jest.fn();
  const {container}=render(<MobileHero/>);
  const desktop=within(container.querySelector('#hero'));
  const poster=desktop.getByAltText('SINGULANCE');
  expect(poster.closest('picture').querySelector('source').getAttribute('srcset')).toContain('1600.avif');
  await act(async()=>{idle();});
  expect(screen.getByTestId('water-scene')).toBeTruthy();
  expect(desktop.getByAltText('SINGULANCE')).toBe(poster);
  expect(desktop.getByRole('button',{name:'Talk to founder'})).toBeTruthy();
});

test('WebGL or texture failure removes only motion and preserves poster and controls',()=>{
  const log=jest.spyOn(console,'error').mockImplementation(()=>{});
  const Broken=()=>{throw new Error('WebGL unavailable');};
  render(<><img alt="Poster" src="/poster.webp"/><HeroMotionBoundary><Broken/></HeroMotionBoundary><button>Open HIVEMIND</button></>);
  expect(screen.getByAltText('Poster')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Open HIVEMIND'})).toBeTruthy();
  log.mockRestore();
});

test('a failed product background preserves the product section', async()=>{
  window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { queueMicrotask(()=>this.callback([{target,isIntersecting:true,intersectionRatio:1}])); }
    unobserve() {}
    disconnect() {}
  };
  const log=jest.spyOn(console,'error').mockImplementation(()=>{});
  await act(async()=>{render(<SubProducts/>);});
  expect(screen.getByRole('heading',{name:'Three minds. One sovereign system.'})).toBeTruthy();
  expect(screen.getByText('TARA')).toBeTruthy();
  expect(screen.getByText('HIVEMIND')).toBeTruthy();
  expect(screen.getByText('HYPERAGENTS')).toBeTruthy();
  log.mockRestore();
});
