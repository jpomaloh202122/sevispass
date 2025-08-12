import { NextRequest, NextResponse } from 'next/server';
import { ocrService } from '@/lib/ocr-service';

interface DocumentValidationResponse {
  success: boolean;
  isValid: boolean;
  confidence: number;
  details: string;
  extractedNumber?: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const documentImage = formData.get('documentImage') as File;
    const expectedNumber = formData.get('expectedNumber') as string;
    const documentType = formData.get('documentType') as string; // 'passport' or 'nid'

    if (!documentImage || !expectedNumber || !documentType) {
      return NextResponse.json({
        success: false,
        isValid: false,
        confidence: 0,
        details: 'Missing required parameters',
        message: 'Document image, expected number, and document type are required'
      } as DocumentValidationResponse, { status: 400 });
    }

    if (!['passport', 'nid'].includes(documentType.toLowerCase())) {
      return NextResponse.json({
        success: false,
        isValid: false,
        confidence: 0,
        details: 'Invalid document type',
        message: 'Document type must be either "passport" or "nid"'
      } as DocumentValidationResponse, { status: 400 });
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await documentImage.arrayBuffer());

    console.log(`Starting ${documentType} validation for number: ${expectedNumber}`);

    let validationResult;
    
    // Perform OCR validation based on document type
    if (documentType.toLowerCase() === 'passport') {
      validationResult = await ocrService.validatePassportNumber(imageBuffer, expectedNumber);
    } else {
      validationResult = await ocrService.validateNIDNumber(imageBuffer, expectedNumber);
    }

    console.log(`${documentType} validation result:`, validationResult);

    const response: DocumentValidationResponse = {
      success: true,
      isValid: validationResult.isValid,
      confidence: validationResult.confidence,
      details: validationResult.details,
      extractedNumber: validationResult.extractedNumber,
      message: validationResult.isValid 
        ? `${documentType.toUpperCase()} number validation successful`
        : `${documentType.toUpperCase()} number validation failed`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Document validation error:', error);
    
    // Clean up OCR worker on error
    try {
      await ocrService.cleanup();
    } catch (cleanupError) {
      console.warn('OCR cleanup error:', cleanupError);
    }

    return NextResponse.json({
      success: false,
      isValid: false,
      confidence: 0,
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Document validation service error'
    } as DocumentValidationResponse, { status: 500 });
  }
}