import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import MobileHero, { HeroMotionBoundary } from '../MobileHero';

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
