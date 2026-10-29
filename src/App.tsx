/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { KeyProvider, useKeyContext } from './context/KeyContext';
import { BrandtraceHero } from './components/BrandtraceHero';
import { BrandtraceWorkspacePremium } from './components/BrandtraceWorkspacePremium';
import { BrandtraceWorkspace } from './components/BrandtraceWorkspace';

function getInitialWorkspaceState(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  return (
    hash.startsWith('#workspace') ||
    hash.startsWith('#overview') ||
    hash.startsWith('#constitution') ||
    hash.startsWith('#review') ||
    hash.startsWith('#queue') ||
    hash.startsWith('#audit') ||
    hash.startsWith('#insights') ||
    hash.startsWith('#facts') ||
    hash.startsWith('#impact') ||
    hash.startsWith('#health') ||
    hash.startsWith('#assets') ||
    hash.startsWith('#tour')
  );
}

function MainAppContent() {
  const [showWorkspace, setShowWorkspace] = useState(getInitialWorkspaceState);
  const [initialTourOpen, setInitialTourOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.toLowerCase() === '#tour';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (!hash || hash === '#' || hash === '#hero') {
        setShowWorkspace(false);
      } else if (
        hash.startsWith('#workspace') ||
        hash.startsWith('#overview') ||
        hash.startsWith('#constitution') ||
        hash.startsWith('#review') ||
        hash.startsWith('#queue') ||
        hash.startsWith('#audit') ||
        hash.startsWith('#insights') ||
        hash.startsWith('#facts') ||
        hash.startsWith('#impact') ||
        hash.startsWith('#health') ||
        hash.startsWith('#assets') ||
        hash.startsWith('#tour')
      ) {
        setShowWorkspace(true);
        if (hash === '#tour') setInitialTourOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleEnterWorkspace = () => {
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#hero') {
      window.location.hash = '#overview';
    }
    setShowWorkspace(true);
  };

  const handleOpenTourFromHero = () => {
    window.location.hash = '#tour';
    setInitialTourOpen(true);
    setShowWorkspace(true);
  };

  const handleBackToHero = () => {
    window.location.hash = '#hero';
    setShowWorkspace(false);
  };

  if (!showWorkspace) {
    return (
      <BrandtraceHero
        onEnterWorkspace={handleEnterWorkspace}
        onOpenTour={handleOpenTourFromHero}
      />
    );
  }

  return (
    <BrandtraceWorkspacePremium
      onBackToHero={handleBackToHero}
      initialTourOpen={initialTourOpen}
      onTourClosed={() => setInitialTourOpen(false)}
    />
  );
}

export default function App() {
  return (
    <KeyProvider>
      <MainAppContent />
    </KeyProvider>
  );
}
