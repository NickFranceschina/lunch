import React, { useState } from 'react';
import './App.css';
import MainWindow from './components/MainWindow';
import Win98Taskbar from './components/Win98Taskbar';
import { AuthProvider } from './services/AuthContext';
import { WebSocketProvider } from './services/WebSocketContext';

function App() {
  const [isMainWindowVisible, setIsMainWindowVisible] = useState<boolean>(true);

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
