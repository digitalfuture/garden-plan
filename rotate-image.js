const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, 'docs', 'drawing.jpg');
const outputDir = path.join(__dirname, 'public', 'assets');
const outputPath = path.join(outputDir, 'base_plan.jpg');

console.log('Rotating image from', inputPath, 'to', outputPath);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

Jimp.read(inputPath)
  .then(image => {
    // Rotate 90 degrees clockwise
    return image.rotate(90)
      .write(outputPath);
  })
  .then(() => {
    console.log('Image successfully rotated 90 degrees and saved to', outputPath);
  })
  .catch(err => {
    console.error('Error rotating image:', err);
    process.exit(1);
  });
