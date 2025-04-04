import { useState, useRef, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

/**
 * Hook to make an element draggable by its header
 * @param initialPosition - Optional initial position
 * @param skipCentering - When true, use the exact initial position without centering
 * @returns Object with position, ref for the container, and ref for the drag handle
 */
const useDraggable = (initialPosition: Position = { x: 0, y: 0 }, skipCentering: boolean = false) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<Position>({ x: 0, y: 0 });
  const positionedRef = useRef(false);

  // Set initial position on mount
  useEffect(() => {
    // If skipCentering is true, we don't modify the position at all
    if (skipCentering) {
      positionedRef.current = true;
      return;
    }
    
    // Otherwise, center the dialog (default behavior)
    const timer = setTimeout(() => {
      if (containerRef.current && !positionedRef.current) {
        positionedRef.current = true;
        
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Center the element in the viewport
        const newX = Math.max(0, (viewportWidth - rect.width) / 2);
        const newY = Math.max(0, (viewportHeight - rect.height) / 3); // Position it at 1/3 from the top
        
        setPosition({
          x: newX,
          y: newY
        });
      }
    }, 50); // Small delay to ensure the element is rendered
    
    return () => clearTimeout(timer);
  }, [skipCentering]);

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
        y: Math.max(0, (viewportHeight - rect.height) / 3) // Position it at 1/3 from the top
      });
    }
  }, []);

  return {
    position,
    isDragging,
    containerRef,
    dragHandleRef,
    resetPosition,
    setPosition
  };
};

export default useDraggable; 