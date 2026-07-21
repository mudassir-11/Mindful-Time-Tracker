const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const svgBuffer = fs.readFileSync('../../apps/web/public/icon.svg');

  // Main Icon (1024x1024) - Padded with gray background
  await sharp({
    create: {
      width: 1024, height: 1024, channels: 4,
      background: { r: 241, g: 245, b: 249, alpha: 1 } // #f1f5f9
    }
  })
    .composite([{
      input: await sharp(svgBuffer).resize(650, 650).toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toFile('./assets/icon.png');
    
  console.log('Generated icon.png');

  // Splash Icon
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile('./assets/splash-icon.png');
    
  console.log('Generated splash-icon.png');

  // Android Foreground (1024x1024) - Padded with transparent background
  await sharp({
    create: {
      width: 1024, height: 1024, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: await sharp(svgBuffer).resize(550, 550).toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toFile('./assets/android-icon-foreground.png');
    
  console.log('Generated android-icon-foreground.png');

  // Android Background (Solid gray)
  await sharp({
    create: {
      width: 1024, height: 1024, channels: 4,
      background: { r: 241, g: 245, b: 249, alpha: 1 } // #f1f5f9
    }
  })
    .png()
    .toFile('./assets/android-icon-background.png');
    
  console.log('Generated android-icon-background.png');

  // Favicon (256x256)
  await sharp(svgBuffer).resize(256, 256).png().toFile('./assets/favicon.png');
  console.log('Generated favicon.png');
}

generateIcons().catch(console.error);
