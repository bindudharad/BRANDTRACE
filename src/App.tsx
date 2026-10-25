/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyProvider, useKeyContext } from './context/KeyContext';
import { BrandtraceHero } from './components/BrandtraceHero';
import { BrandtraceWorkspacePremium } from './components/BrandtraceWorkspacePremium';
import { BrandtraceWorkspace } from './components/BrandtraceWorkspace';

function MainAppContent() {
  const [showWorkspace, setShowWorkspace] = useState(false);

  if (!showWorkspace) {
    return <BrandtraceHero onEnterWorkspace={() => setShowWorkspace(true)} />;
  }

  return (
    <BrandtraceWorkspacePremium
      onBackToHero={() => setShowWorkspace(false)}
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
