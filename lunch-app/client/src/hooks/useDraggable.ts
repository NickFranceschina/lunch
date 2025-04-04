import { useState, useRef, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

/**
 * Hook to make an element draggable by its header and save its position
 * @param windowId - Unique identifier for this window to save position in sessionStorage
 * @param initialPosition - Optional initial position
 * @param skipCentering - When true, use the exact initial position without centering
 * @returns Object with position, ref for the container, and ref for the drag handle
 */
const useDraggable = (
  windowId: string,
  initialPosition: Position = { x: 0, y: 0 }, 
  skipCentering: boolean = false
) => {
  // Try to get saved position from sessionStorage
  const getSavedPosition = (): Position | null => {
    try {
      const savedPositionStr = sessionStorage.getItem(`window_position_${windowId}`);
      if (savedPositionStr) {
        return JSON.parse(savedPositionStr) as Position;
      }
    } catch (err) {
      console.error(`Error loading position for window ${windowId}:`, err);
    }
    return null;
  };

  // Get saved position or use initial position
  const savedPosition = getSavedPosition();
  
  // Set the initial state directly for immediate positioning
  const initialCenteredPosition = savedPosition || (skipCentering ? initialPosition : { x: 0, y: 0 });
  const [position, setPosition] = useState<Position>(initialCenteredPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<Position>({ x: 0, y: 0 });
  const positionedRef = useRef(savedPosition !== null);

  // Save position to sessionStorage when it changes
  const savePosition = useCallback((pos: Position) => {
    try {
      sessionStorage.setItem(`window_position_${windowId}`, JSON.stringify(pos));
    } catch (err) {
      console.error(`Error saving position for window ${windowId}:`, err);
    }
  }, [windowId]);

  // Custom position setter that also saves to sessionStorage
  const setPositionAndSave = useCallback((newPosition: Position | ((prev: Position) => Position)) => {
    setPosition(prevPosition => {
      const nextPosition = typeof newPosition === 'function' 
        ? newPosition(prevPosition) 
        : newPosition;
      
      savePosition(nextPosition);
      return nextPosition;
    });
  }, [savePosition]);

  // Set initial position on mount if not using saved position
  useEffect(() => {
    // If we have a saved position or skipCentering is true, we don't need to center
    if (savedPosition || skipCentering) {
      positionedRef.current = true;
      return;
    }
    
    // Apply centering immediately with no delay
    if (containerRef.current && !positionedRef.current) {
      positionedRef.current = true;
      
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Center the element in the viewport
      const newX = Math.max(0, (viewportWidth - rect.width) / 2);
      const newY = Math.max(0, (viewportHeight - rect.height) / 3); // Position it at 1/3 from the top
      
      const newPosition = { x: newX, y: newY };
      setPositionAndSave(newPosition);
    }
  }, [skipCentering, savedPosition, setPositionAndSave]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!dragHandleRef.current?.contains(e.target as Node)) return;
      
      // Prevent text selection during drag
      e.preventDefault();
      
      // Calculate the offset between mouse position and element position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        offsetRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
      
      setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate new position
      const newPosition = {
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y
      };
      
      // Ensure the element stays within viewport bounds
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Make sure top of the window is always visible and at least 5px from top
        newPosition.y = Math.max(5, newPosition.y);
        
        // Make sure at least 40px of the bottom is always visible
        newPosition.y = Math.min(newPosition.y, viewportHeight - 40);
        
        // Make sure the window is not moved completely off-screen horizontally
        // At least 100px should remain visible
        newPosition.x = Math.max(-rect.width + 100, newPosition.x);
        newPosition.x = Math.min(newPosition.x, viewportWidth - 100);
      }
      
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      // Save position when dragging stops
      if (isDragging) {
        savePosition(position);
      }
      setIsDragging(false);
    };

    // Attach event listeners
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, savePosition]);

  // Memoize resetPosition to prevent recreation on each render
  const resetPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const newPosition = {
        x: Math.max(0, (viewportWidth - rect.width) / 2),
        y: Math.max(0, (viewportHeight - rect.height) / 3) // Position it at 1/3 from the top
      };
      
      setPositionAndSave(newPosition);
    }
  }, [setPositionAndSave]);

  // Function to clear the saved position
  const clearSavedPosition = useCallback(() => {
    try {
      sessionStorage.removeItem(`window_position_${windowId}`);
    } catch (err) {
      console.error(`Error clearing position for window ${windowId}:`, err);
    }
  }, [windowId]);

  return {
    position,
    isDragging,
    containerRef,
    dragHandleRef,
    resetPosition,
    setPosition: setPositionAndSave,
    clearSavedPosition
  };
};

export default useDraggable; 