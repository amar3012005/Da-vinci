import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArtworkWelcome from './ArtworkWelcome';
import { uploadEverythingArtwork } from './upload-everything-artwork';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
test('Uploads uses the corrected artwork and closes the native modal before activating the existing file picker', () => {
  let modal;
  const upload = jest.fn(() => expect(modal.open).toBe(false));
  render(<ArtworkWelcome artwork={uploadEverythingArtwork} title="Upload Everything" closeLabel="Close uploads introduction" actionLabel="Upload files" onAction={upload}/>);
  modal = screen.getByRole('dialog', { name: 'Upload Everything' });
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/announcements/upload-everything.png');
  fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));
  expect(upload).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).not.toBe('hidden');
});
