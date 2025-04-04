import { useState, useRef, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

/**
 * Hook to make an element draggable by its header
 * @param initialPosition - Optional initial position
 * @returns Object with position, ref for the container, and ref for the drag handle
 */
const useDraggable = (initialPosition: Position = { x: 0, y: 0 }) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<Position>({ x: 0, y: 0 });
  const isInitialRenderRef = useRef(true);

  // Center the dialog on initial render only
  useEffect(() => {
    if (containerRef.current && isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      setPosition({
        x: Math.max(0, (viewportWidth - rect.width) / 2),
        y: Math.max(0, (viewportHeight - rect.height) / 2)
      });
    }
  }, []); // Only run once on mount

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
      
      // Optional: Ensure the element stays within viewport bounds
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Ensure element doesn't go off screen
        newPosition.x = Math.max(0, Math.min(newPosition.x, viewportWidth - rect.width));
        newPosition.y = Math.max(0, Math.min(newPosition.y, viewportHeight - rect.height));
      }
      
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
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
  }, [isDragging]);

  // Memoize resetPosition to prevent recreation on each render
  const resetPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      setPosition({
        x: Math.max(0, (viewportWidth - rect.width) / 2),
        y: Math.max(0, (viewportHeight - rect.height) / 2)
      });
    }
  }, []);

  return {
    position,
    isDragging,
    containerRef,
    dragHandleRef,
    resetPosition
  };
};

export default useDraggable; 