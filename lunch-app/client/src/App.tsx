import React, { useState, useEffect } from 'react';
import './App.css';
import MainWindow from './components/MainWindow';
import Win98Taskbar from './components/Win98Taskbar';
import HelpIcon from './components/HelpIcon';
import HelpWindow from './components/HelpWindow';
import GitHubIcon from './components/GitHubIcon';
import { AuthProvider } from './services/AuthContext';
import { WebSocketProvider } from './services/WebSocketContext';

function App() {
  // Read initial visibility state from sessionStorage, default to true if not found
  const initialVisibility = sessionStorage.getItem('window_visibility_main') === 'false' ? false : true;
  const initialHelpVisibility = sessionStorage.getItem('window_visibility_help') === 'true';
  const [isMainWindowVisible, setIsMainWindowVisible] = useState<boolean>(initialVisibility);
  const [isHelpWindowVisible, setIsHelpWindowVisible] = useState<boolean>(initialHelpVisibility);

  // Save window visibility state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('window_visibility_main', isMainWindowVisible.toString());
  }, [isMainWindowVisible]);

  // Listen for lunch time events to show the window
  useEffect(() => {
    const handleLunchTimeEvent = (event: CustomEvent) => {
      console.log('Lunch time event received:', event.detail);
      
      // Make window visible when it's lunch time
      if (!isMainWindowVisible) {
        setIsMainWindowVisible(true);
      }
      
      // Try to bring the window to focus if minimized
      try {
        // Focus the window if the browser allows it
        window.focus();
        
        // Only play sound if this is a scheduled event
        const isScheduledEvent = event.detail?.isScheduledEvent === true;
        
        if (isScheduledEvent) {
          // Play a notification sound if available
          const notificationSound = new Audio('/sounds/notification.mp3');
          notificationSound.volume = 0.3; // Reduced volume (was 1.0)
          notificationSound.loop = false;
          
          // Preload the sound
          notificationSound.preload = 'auto';
          
          // Once loaded, play it
          notificationSound.oncanplaythrough = () => {
            const playPromise = notificationSound.play();
            if (playPromise) {
              playPromise.catch(e => {
                console.error('Could not play notification sound:', e);
                // Try again with user interaction if autoplay was blocked
                document.addEventListener('click', () => {
                  notificationSound.play().catch(e => console.error('Failed to play sound even after user interaction:', e));
                }, { once: true });
              });
            }
          };
          
          // Also try an immediate play in case it's already loaded
          notificationSound.play().catch(e => console.log('Initial sound play failed:', e));
        }
        
        // Explicitly ensure restaurant panel doesn't show
        // Dispatch an event that MainWindow will listen for
        const closeRestaurantPanelEvent = new CustomEvent('close:restaurant_panel');
        window.dispatchEvent(closeRestaurantPanelEvent);
      } catch (error) {
        console.error('Error focusing window:', error);
      }
    };

    // Add event listener with type assertion
    window.addEventListener('lunch:time', handleLunchTimeEvent as EventListener);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('lunch:time', handleLunchTimeEvent as EventListener);
    };
  }, [isMainWindowVisible]);

  const toggleMainWindowVisibility = () => {
    setIsMainWindowVisible(!isMainWindowVisible);
  };

  const toggleHelpWindowVisibility = () => {
    setIsHelpWindowVisible(!isHelpWindowVisible);
  };

  return (
    <div className="App">
      <AuthProvider>
        <WebSocketProvider>
          {/* Desktop Icons */}
          <HelpIcon onClick={toggleHelpWindowVisibility} />
          <GitHubIcon />
          
          {/* Windows */}
          <MainWindow 
            isVisible={isMainWindowVisible}
            toggleVisibility={toggleMainWindowVisibility}
          />
          <HelpWindow 
            isVisible={isHelpWindowVisible}
            onClose={toggleHelpWindowVisibility}
          />
          
          {/* Taskbar */}
          <Win98Taskbar 
            toggleMainWindowVisibility={toggleMainWindowVisibility}
          />
        </WebSocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
