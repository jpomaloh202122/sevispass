import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PublicServantDuplicateDetector } from '@/lib/duplicate-detector';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-admin-jwt-secret-key-2024';

// Verify admin token middleware
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { permissions?: string[] };
    return decoded;
  } catch (_error) {
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminData = verifyAdminToken(request);

    if (!adminData.permissions?.includes('view_applications')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view duplicate analytics' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'summary'; // summary, trends, detailed
    const timeRange = url.searchParams.get('timeRange') || '30d'; // 7d, 30d, 90d, 1y

    const duplicateDetector = new PublicServantDuplicateDetector();

    switch (type) {
      case 'summary':
        const analytics = await duplicateDetector.getDuplicateAnalytics();
        return NextResponse.json({
          success: true,
          data: analytics,
          generatedAt: new Date().toISOString(),
          timeRange
        });

      case 'trends':
        // This would return trend data over time
        return NextResponse.json({
          success: true,
          data: {
            dailyDuplicates: await generateDailyTrends(timeRange),
            weeklyTrends: await generateWeeklyTrends(timeRange),
            monthlyTrends: await generateMonthlyTrends(timeRange),
            peakHours: await generatePeakHours(),
            departmentBreakdown: await generateDepartmentBreakdown()
          },
          generatedAt: new Date().toISOString(),
          timeRange
        });

      case 'detailed':
        const detailedAnalytics = await generateDetailedAnalytics();
        return NextResponse.json({
          success: true,
          data: detailedAnalytics,
          generatedAt: new Date().toISOString(),
          timeRange
        });

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type. Must be: summary, trends, or detailed' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error fetching duplicate analytics:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch duplicate analytics' },
      { status: 500 }
    );
  }
}

// Helper functions for generating trend data
async function generateDailyTrends(timeRange: string): Promise<Array<{ date: string; count: number; riskLevel: string }>> {
  // This would query historical data
  // For now, return mock data
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 10),
      riskLevel: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)]
    });
  }
  
  return trends;
}

async function generateWeeklyTrends(timeRange: string): Promise<Array<{ week: string; count: number; trend: 'up' | 'down' | 'stable' }>> {
  // Mock weekly trend data
  const weeks = timeRange === '7d' ? 1 : timeRange === '30d' ? 4 : timeRange === '90d' ? 12 : 52;
  const trends = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7));
    trends.push({
      week: `Week ${weeks - i}`,
      count: Math.floor(Math.random() * 50),
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
    });
  }
  
  return trends;
}

async function generateMonthlyTrends(timeRange: string): Promise<Array<{ month: string; count: number; percentage: number }>> {
  // Mock monthly trend data
  const months = timeRange === '1y' ? 12 : 3;
  const trends = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const month = new Date();
    month.setMonth(month.getMonth() - i);
    trends.push({
      month: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      count: Math.floor(Math.random() * 200),
      percentage: Math.floor(Math.random() * 100)
    });
  }
  
  return trends;
}

async function generatePeakHours(): Promise<Array<{ hour: number; count: number }>> {
  // Mock peak hours data
  const peakHours = [];
  for (let hour = 0; hour < 24; hour++) {
    peakHours.push({
      hour,
      count: Math.floor(Math.random() * 20)
    });
  }
  return peakHours;
}

async function generateDepartmentBreakdown(): Promise<Array<{ department: string; count: number; percentage: number }>> {
  // Mock department breakdown
  const departments = [
    'Department of Prime Minister and NEC',
    'Department of Personnel Management',
    'Department of Finance',
    'Department of Health',
    'Department of Education',
    'Department of Defence',
    'Other Government Agency'
  ];
  
  return departments.map(dept => ({
    department: dept,
    count: Math.floor(Math.random() * 50),
    percentage: Math.floor(Math.random() * 100)
  }));
}

async function generateDetailedAnalytics(): Promise<{
  performanceMetrics: {
    averageResolutionTime: number;
    falsePositiveRate: number;
    detectionAccuracy: number;
    systemUptime: number;
  };
  adminMetrics: {
    totalAdmins: number;
    activeAdmins: number;
    averageReviewsPerAdmin: number;
    resolutionEfficiency: number;
  };
  systemHealth: {
    databasePerformance: number;
    apiResponseTime: number;
    errorRate: number;
    lastMaintenance: string;
  };
}> {
  return {
    performanceMetrics: {
      averageResolutionTime: Math.floor(Math.random() * 24) + 1, // hours
      falsePositiveRate: Math.random() * 5, // percentage
      detectionAccuracy: 95 + Math.random() * 5, // percentage
      systemUptime: 99.5 + Math.random() * 0.5 // percentage
    },
    adminMetrics: {
      totalAdmins: 15,
      activeAdmins: 12,
      averageReviewsPerAdmin: Math.floor(Math.random() * 20) + 10,
      resolutionEfficiency: 85 + Math.random() * 15 // percentage
    },
    systemHealth: {
      databasePerformance: 95 + Math.random() * 5, // percentage
      apiResponseTime: Math.random() * 500 + 100, // milliseconds
      errorRate: Math.random() * 2, // percentage
      lastMaintenance: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  };
}

