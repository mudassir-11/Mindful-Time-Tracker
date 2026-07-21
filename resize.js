const { Jimp } = require('jimp');

async function processIcon(filePath, outPath) {
  try {
    console.log(`Processing ${filePath}...`);
    const image = await Jimp.read(filePath);
    const origWidth = image.bitmap.width;
    const origHeight = image.bitmap.height;
    
    const newImage = new Jimp({ width: origWidth, height: origHeight, color: 0x00000000 });
    
    const newWidth = Math.floor(origWidth * 0.70);
    const newHeight = Math.floor(origHeight * 0.70);
    
    image.resize({ w: newWidth, h: newHeight });
    
    const x = Math.floor((origWidth - newWidth) / 2);
    const y = Math.floor((origHeight - newHeight) / 2);
    
    newImage.composite(image, x, y);
    await newImage.write(outPath);
    console.log(`Done! ${filePath} -> ${outPath}`);
  } catch (err) {
    console.error(`Error for ${filePath}:`, err);
  }
}

async function run() {
  await processIcon('apps/mobile/assets/android-icon-foreground.png', 'apps/mobile/assets/android-icon-foreground.png');
  await processIcon('apps/mobile/assets/icon.png', 'apps/mobile/assets/icon.png');
}

run();
