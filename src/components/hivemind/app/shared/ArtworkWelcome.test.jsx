import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArtworkWelcome from './ArtworkWelcome';
import { uploadEverythingArtwork } from './upload-everything-artwork';
import { introDismissalKey } from './intro-dismissal';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
test('Uploads uses the corrected artwork and closes the native modal before activating the existing file picker', () => {
  let modal;
  const upload = jest.fn(() => expect(modal.open).toBe(false));
  render(<ArtworkWelcome artwork={uploadEverythingArtwork} title="Upload Everything" closeLabel="Close uploads introduction" actionLabel="Upload files" onAction={upload}/>);
  modal = screen.getByRole('dialog', { name: 'Upload Everything' });
  // The decorative window dots carry no role or label, so only the class selector can reach them.
  // eslint-disable-next-line testing-library/no-node-access
  expect(modal.querySelectorAll('.feature-window-dots i')).toHaveLength(3);
  expect(screen.getByRole('img')).toHaveStyle({ transform: 'scale(1)' });
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/feature-banners/uploads.webp');
  fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));
  expect(upload).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe('hidden');
});

test('a dismissed introduction stays closed on the next mount for the same tenant and user', () => {
  const key = introDismissalKey({ tenant: 'org-1', user: 'user-1', step: 'company-brain' });
  expect(key).toBe('hm:org-1:user-1:onboarding:company-brain');
  window.localStorage.removeItem(key);

  const { unmount: unmountFirst } = render(<ArtworkWelcome artwork={uploadEverythingArtwork} title="Company Brain" closeLabel="Close Company Brain introduction" actionLabel="Explore page" dismissKey={key}/>);
  expect(screen.getByRole('dialog', { name: 'Company Brain' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close Company Brain introduction' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(window.localStorage.getItem(key)).toBe('1');
  unmountFirst();

  render(<ArtworkWelcome artwork={uploadEverythingArtwork} title="Company Brain" closeLabel="Close Company Brain introduction" actionLabel="Explore page" dismissKey={key}/>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  window.localStorage.removeItem(key);
});

test('an introduction without a dismiss key reopens on every mount', () => {
  const { unmount: unmountFirst } = render(<ArtworkWelcome artwork={uploadEverythingArtwork} title="Connectors" closeLabel="Close connectors introduction" actionLabel="Connect apps"/>);
  fireEvent.click(screen.getByRole('button', { name: 'Close connectors introduction' }));
  unmountFirst();

  render(<ArtworkWelcome artwork={uploadEverythingArtwork} title="Connectors" closeLabel="Close connectors introduction" actionLabel="Connect apps"/>);
  expect(screen.getByRole('dialog', { name: 'Connectors' })).toBeInTheDocument();
});
