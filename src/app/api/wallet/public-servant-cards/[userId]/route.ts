import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

interface PublicServantCardResponse {
  success: boolean;
  publicServantCards?: any[];
  message: string;
}

// Verify JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
    return decoded;
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const tokenData = verifyToken(request);
    
    // Await the params
    const { userId } = await params;
    
    // Check if the user is requesting their own cards
    if (tokenData.uid !== userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access to user cards'
      } as PublicServantCardResponse, { status: 403 });
    }

    // Load Public Servant ID cards for the user
    const cardsDir = path.join(process.cwd(), 'data', 'public-servant-cards');
    
    if (!existsSync(cardsDir)) {
      return NextResponse.json({
        success: true,
        publicServantCards: [],
        message: 'No Public Servant ID cards found'
      } as PublicServantCardResponse);
    }

    // Read all card files
    const cardFiles = await readdir(cardsDir);
    const userCards = [];

    for (const file of cardFiles) {
      if (file.endsWith('.json')) {
        try {
          const cardPath = path.join(cardsDir, file);
          const cardData = await readFile(cardPath, 'utf-8');
          const card = JSON.parse(cardData);
          
          // Only include cards for this user
          if (card.userId === userId) {
            // Normalize the card type to match our type system
            card.type = 'public_servant_id';
            
            // Add QR code if not present
            if (!card.qrCode) {
              const QRCode = await import('qrcode');
              const qrData = {
                type: 'SevisPassVC',
                version: '1.0',
                cardId: card.id,
                holderName: card.holderName,
                cardNumber: card.cardNumber,
                issuer: card.issuer,
                metadata: card.metadata
              };
              card.qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
            }
            
            userCards.push(card);
          }
        } catch (error) {
          console.error(`Error reading card file ${file}:`, error);
          // Continue with other files
        }
      }
    }

    return NextResponse.json({
      success: true,
      publicServantCards: userCards,
      message: `Found ${userCards.length} Public Servant ID card(s)`
    } as PublicServantCardResponse);

  } catch (error) {
    console.error('Get Public Servant ID cards error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      } as PublicServantCardResponse, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to load Public Servant ID cards'
    } as PublicServantCardResponse, { status: 500 });
  }
}
