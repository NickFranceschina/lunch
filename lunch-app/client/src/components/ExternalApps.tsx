import React, { useState, useEffect } from 'react';
import DesktopIcon from './DesktopIcon';
import IframeWindow from './IframeWindow';
import externalApps from '../data/externalApps';

const ExternalApps: React.FC = () => {
  // Read initial visibility state from sessionStorage
  const initialVisibility = externalApps.reduce((acc, app) => {
    acc[app.id] = sessionStorage.getItem(`window_visibility_${app.id}`) === 'true';
    return acc;
  }, {} as Record<string, boolean>);

  const [visibleWindows, setVisibleWindows] = useState<Record<string, boolean>>(initialVisibility);

  // Save window visibility state to sessionStorage whenever it changes
  useEffect(() => {
    Object.entries(visibleWindows).forEach(([id, isVisible]) => {
      sessionStorage.setItem(`window_visibility_${id}`, isVisible.toString());
    });
  }, [visibleWindows]);

  // Listen for toggle_app events from the Start menu
  useEffect(() => {
    const handleToggleApp = (event: CustomEvent) => {
      const { id, visible } = event.detail;
      console.log(`Toggle app event received for ${id}, visible: ${visible}`);
      setVisibleWindows(prev => ({
        ...prev,
        [id]: visible
      }));
    };

    window.addEventListener('toggle_app', handleToggleApp as EventListener);
    return () => {
      window.removeEventListener('toggle_app', handleToggleApp as EventListener);
    };
  }, []);

  // Listen for shutdown_all_apps event
  useEffect(() => {
    const handleShutdownAllApps = () => {
      console.log('Shutting down all external apps');
      // Close all windows by setting all to false
      const allClosed = Object.keys(visibleWindows).reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {} as Record<string, boolean>);
      
      setVisibleWindows(allClosed);
    };

    window.addEventListener('shutdown_all_apps', handleShutdownAllApps);
    return () => {
      window.removeEventListener('shutdown_all_apps', handleShutdownAllApps);
    };
  }, [visibleWindows]);

  const toggleWindowVisibility = (id: string) => {
    setVisibleWindows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <>
      {/* Desktop Icons */}
      {externalApps.map(app => (
        <DesktopIcon
          key={app.id}
          name={app.name}
          position={app.position}
          icon={<div dangerouslySetInnerHTML={{ __html: app.icon }} />}
          onClick={() => toggleWindowVisibility(app.id)}
          url={app.url}
        />
      ))}

      {/* App Windows */}
      {externalApps.map(app => (
        <IframeWindow
          key={app.id}
          title={app.name}
          url={app.url}
          width={app.windowWidth}
          height={app.windowHeight}
          isVisible={visibleWindows[app.id] || false}
          onClose={() => toggleWindowVisibility(app.id)}
        />
      ))}
    </>
  );
};

export default ExternalApps; 