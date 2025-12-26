const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputImage = path.join(__dirname, '../public/LogoSantana.jpg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('Generando iconos PWA...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generado: icon-${size}x${size}.png`);
  }
  
  console.log('✓ Todos los iconos generados exitosamente');
}

generateIcons().catch(err => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
