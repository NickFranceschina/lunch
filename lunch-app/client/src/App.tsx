import React, { useState, useEffect } from 'react';
import './App.css';
import MainWindow from './components/MainWindow';
import Win98Taskbar from './components/Win98Taskbar';
import { AuthProvider } from './services/AuthContext';
import { WebSocketProvider } from './services/WebSocketContext';

function App() {
  // Read initial visibility state from sessionStorage, default to true if not found
  const initialVisibility = sessionStorage.getItem('window_visibility_main') === 'false' ? false : true;
  const [isMainWindowVisible, setIsMainWindowVisible] = useState<boolean>(initialVisibility);

  // Save window visibility state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('window_visibility_main', isMainWindowVisible.toString());
  }, [isMainWindowVisible]);

  const toggleMainWindowVisibility = () => {
    setIsMainWindowVisible(!isMainWindowVisible);
  };

  return (
    <div className="App">
      <AuthProvider>
        <WebSocketProvider>
          <MainWindow 
            isVisible={isMainWindowVisible}
            toggleVisibility={toggleMainWindowVisibility}
          />
          <Win98Taskbar 
            toggleMainWindowVisibility={toggleMainWindowVisibility}
          />
        </WebSocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
