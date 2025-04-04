import React from 'react';
import './App.css';
import MainWindow from './components/MainWindow';
import { AuthProvider } from './services/AuthContext';
import { WebSocketProvider } from './services/WebSocketContext';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <WebSocketProvider>
          <MainWindow />
        </WebSocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
