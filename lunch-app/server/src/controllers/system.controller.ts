import { Request, Response } from 'express';

/**
 * Get server system information including timezone
 */
export const getSystemInfo = (req: Request, res: Response) => {
  try {
    // Get timezone information from system
    const now = new Date();
    
    // Calculate timezone offset in hours and minutes
    const offsetInMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetInMinutes / 60));
    const offsetMinutes = Math.abs(offsetInMinutes % 60);
    
    // Format timezone display string (e.g., "UTC-05:00")
    const offsetSign = offsetInMinutes <= 0 ? '+' : '-';
    const offsetString = `UTC${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    
    // Try to get timezone name if possible
    let timezoneName;
    try {
      timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (err) {
      timezoneName = null;
    }
    
    res.status(200).json({
      success: true,
      data: {
        serverTime: now.toISOString(),
        localTime: now.toString(),
        timezone: {
          offset: offsetInMinutes,
          offsetString,
          name: timezoneName
        }
      }
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving system information' 
    });
  }
}; 