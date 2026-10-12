import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function OpenDotEntry() {
  const { pathname, search } = useLocation();
  const suffix = pathname.slice('/hivemind/app/employee/dots'.length);
  const validPath = !suffix || suffix === '/' || /^\/dot_[a-zA-Z0-9_-]+$/.test(suffix);
  const conversation = new URLSearchParams(search).get('c');
  const validConversation = !conversation || /^conv_[a-zA-Z0-9_-]+$/.test(conversation);
  const target = new URL(validPath && suffix && suffix !== '/' ? `/dots${suffix}` : '/', 'https://dots.singulancelabs.com');
  if (validConversation && conversation) target.searchParams.set('c', conversation);
  useEffect(() => {
    if (validPath && validConversation) window.location.replace(target.href);
  }, [pathname, search, validPath, validConversation, target.href]);
  if (!validPath || !validConversation) return <p>Invalid dot address.</p>;
  return <p>Opening your dots… <a href={target.href}>Continue</a></p>;
}
