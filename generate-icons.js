const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  const inputPath = path.join(__dirname, 'public', 'newlogo.png');
  const outputDir = path.join(__dirname, 'public', 'icons');

  try {
    // Check if input file exists
    await fs.access(inputPath);
    console.log('✓ Found input logo:', inputPath);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate each icon size
    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
        
      console.log(`✓ Generated ${size}x${size} icon`);
    }
    
    // Create shortcut icons (96x96 is good for shortcuts)
    const shortcutIcons = [
      { name: 'wallet-shortcut.png', color: '#8B5CF6' },
      { name: 'dashboard-shortcut.png', color: '#3B82F6' },
      { name: 'services-shortcut.png', color: '#10B981' }
    ];
    
    for (const shortcut of shortcutIcons) {
      const outputPath = path.join(outputDir, shortcut.name);
      
      // Create a simple colored square with icon
      await sharp({
        create: {
          width: 96,
          height: 96,
          channels: 4,
          background: shortcut.color
        }
      })
      .png()
      .toFile(outputPath);
      
      console.log(`✓ Generated ${shortcut.name}`);
    }
    
    console.log('\n🎉 All PWA icons generated successfully!');
    console.log(`📁 Icons saved to: ${outputDir}`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('❌ Input logo not found at:', inputPath);
      console.log('💡 Please ensure you have newlogo.png in the public folder');
      console.log('💡 Or update the inputPath in this script to point to your logo file');
    } else {
      console.error('❌ Error generating icons:', error.message);
    }
  }
}

// Run the generator
generateIcons();