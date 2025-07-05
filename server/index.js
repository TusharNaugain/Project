import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Utility function to get file size in human readable format
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to get image metadata
async function getImageMetadata(imagePath) {
  try {
    const stats = fs.statSync(imagePath);
    const metadata = await sharp(imagePath).metadata();
    
    return {
      filename: path.basename(imagePath),
      originalName: path.basename(imagePath).split('-').slice(1).join('-'), // Remove UUID prefix
      fileSize: stats.size,
      fileSizeFormatted: formatFileSize(stats.size),
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      format: metadata.format,
      channels: metadata.channels,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      colorSpace: metadata.space
    };
  } catch (error) {
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
}

// Utility function to convert image to PNG buffer
async function convertToPNG(imagePath) {
  try {
    const buffer = await sharp(imagePath)
      .png()
      .toBuffer();
    return buffer;
  } catch (error) {
    throw new Error(`Failed to convert image: ${error.message}`);
  }
}

// Utility function to resize images to same dimensions
async function resizeToMatch(buffer1, buffer2) {
  try {
    const image1 = sharp(buffer1);
    const image2 = sharp(buffer2);
    
    const { width: width1, height: height1 } = await image1.metadata();
    const { width: width2, height: height2 } = await image2.metadata();
    
    const maxWidth = Math.max(width1, width2);
    const maxHeight = Math.max(height1, height2);
    
    const resized1 = await image1.resize(maxWidth, maxHeight, { 
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }).png().toBuffer();
    
    const resized2 = await image2.resize(maxWidth, maxHeight, { 
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }).png().toBuffer();
    
    return { resized1, resized2, width: maxWidth, height: maxHeight };
  } catch (error) {
    throw new Error(`Failed to resize images: ${error.message}`);
  }
}

// Enhanced analysis functions
function analyzeColorChanges(png1, png2, width, height, diffData) {
  const colorChanges = [];
  const regionSize = 10;
  
  for (let y = 0; y < height; y += regionSize) {
    for (let x = 0; x < width; x += regionSize) {
      let regionDiffs = 0;
      let totalR1 = 0, totalG1 = 0, totalB1 = 0;
      let totalR2 = 0, totalG2 = 0, totalB2 = 0;
      let pixelCount = 0;
      
      for (let dy = 0; dy < regionSize && y + dy < height; dy++) {
        for (let dx = 0; dx < regionSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          
          if (diffData[idx] > 0 || diffData[idx + 1] > 0 || diffData[idx + 2] > 0) {
            regionDiffs++;
          }
          
          totalR1 += png1.data[idx];
          totalG1 += png1.data[idx + 1];
          totalB1 += png1.data[idx + 2];
          
          totalR2 += png2.data[idx];
          totalG2 += png2.data[idx + 1];
          totalB2 += png2.data[idx + 2];
          
          pixelCount++;
        }
      }
      
      if (regionDiffs > regionSize * regionSize * 0.1) {
        const avgR1 = Math.round(totalR1 / pixelCount);
        const avgG1 = Math.round(totalG1 / pixelCount);
        const avgB1 = Math.round(totalB1 / pixelCount);
        
        const avgR2 = Math.round(totalR2 / pixelCount);
        const avgG2 = Math.round(totalG2 / pixelCount);
        const avgB2 = Math.round(totalB2 / pixelCount);
        
        const rDiff = avgR2 - avgR1;
        const gDiff = avgG2 - avgG1;
        const bDiff = avgB2 - avgB1;
        
        let changeType = [];
        if (Math.abs(rDiff) > 20) changeType.push(rDiff > 0 ? 'More Red' : 'Less Red');
        if (Math.abs(gDiff) > 20) changeType.push(gDiff > 0 ? 'More Green' : 'Less Green');
        if (Math.abs(bDiff) > 20) changeType.push(bDiff > 0 ? 'More Blue' : 'Less Blue');
        
        const brightness1 = (avgR1 + avgG1 + avgB1) / 3;
        const brightness2 = (avgR2 + avgG2 + avgB2) / 3;
        const brightnessDiff = brightness2 - brightness1;
        
        if (Math.abs(brightnessDiff) > 20) {
          changeType.push(brightnessDiff > 0 ? 'Brightened' : 'Darkened');
        }
        
        if (changeType.length > 0) {
          colorChanges.push({
            position: { x, y },
            region: `${x}-${x + regionSize}, ${y}-${y + regionSize}`,
            changeType: changeType.join(', '),
            beforeColor: { r: avgR1, g: avgG1, b: avgB1 },
            afterColor: { r: avgR2, g: avgG2, b: avgB2 },
            intensity: Math.max(Math.abs(rDiff), Math.abs(gDiff), Math.abs(bDiff))
          });
        }
      }
    }
  }
  
  return colorChanges.slice(0, 20);
}

function analyzeStructuralChanges(png1, png2, width, height) {
  const structuralChanges = [];
  
  // Simple edge detection
  function getEdgeStrength(data, x, y, width, height) {
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return 0;
    
    const idx = (y * width + x) * 4;
    const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    
    const neighbors = [
      ((y - 1) * width + (x - 1)) * 4,
      ((y - 1) * width + x) * 4,
      ((y - 1) * width + (x + 1)) * 4,
      (y * width + (x - 1)) * 4,
      (y * width + (x + 1)) * 4,
      ((y + 1) * width + (x - 1)) * 4,
      ((y + 1) * width + x) * 4,
      ((y + 1) * width + (x + 1)) * 4
    ];
    
    let maxDiff = 0;
    neighbors.forEach(nIdx => {
      const neighbor = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
      maxDiff = Math.max(maxDiff, Math.abs(center - neighbor));
    });
    
    return maxDiff;
  }
  
  const regionSize = 20;
  for (let y = 0; y < height; y += regionSize) {
    for (let x = 0; x < width; x += regionSize) {
      let edges1 = 0, edges2 = 0;
      
      for (let dy = 0; dy < regionSize && y + dy < height; dy++) {
        for (let dx = 0; dx < regionSize && x + dx < width; dx++) {
          const edge1 = getEdgeStrength(png1.data, x + dx, y + dy, width, height);
          const edge2 = getEdgeStrength(png2.data, x + dx, y + dy, width, height);
          
          if (edge1 > 30) edges1++;
          if (edge2 > 30) edges2++;
        }
      }
      
      const edgeDiff = edges2 - edges1;
      if (Math.abs(edgeDiff) > 5) {
        structuralChanges.push({
          position: { x, y },
          region: `${x}-${x + regionSize}, ${y}-${y + regionSize}`,
          changeType: edgeDiff > 0 ? 'New edges/shapes detected' : 'Edges/shapes removed',
          edgesBefore: edges1,
          edgesAfter: edges2,
          intensity: Math.abs(edgeDiff)
        });
      }
    }
  }
  
  return structuralChanges.slice(0, 15);
}

function analyzePositionalChanges(colorChanges, structuralChanges) {
  const positionalChanges = [];
  const allChanges = [...colorChanges, ...structuralChanges];
  
  // Group nearby changes
  const grouped = [];
  allChanges.forEach(change => {
    let addedToGroup = false;
    for (let group of grouped) {
      const avgX = group.reduce((sum, c) => sum + c.position.x, 0) / group.length;
      const avgY = group.reduce((sum, c) => sum + c.position.y, 0) / group.length;
      
      const distance = Math.sqrt(
        Math.pow(change.position.x - avgX, 2) + 
        Math.pow(change.position.y - avgY, 2)
      );
      
      if (distance < 50) {
        group.push(change);
        addedToGroup = true;
        break;
      }
    }
    
    if (!addedToGroup) {
      grouped.push([change]);
    }
  });
  
  // Identify major shifts
  grouped.forEach((group, index) => {
    if (group.length > 3) {
      const avgX = Math.round(group.reduce((sum, c) => sum + c.position.x, 0) / group.length);
      const avgY = Math.round(group.reduce((sum, c) => sum + c.position.y, 0) / group.length);
      
      const changeTypes = [...new Set(group.map(c => c.changeType))];
      
      positionalChanges.push({
        position: { x: avgX, y: avgY },
        changeType: group.length > 10 ? 'Major element shift' : 
                   group.length > 6 ? 'Element added/removed' : 'Minor positional change',
        affectedArea: `${group.length} regions`,
        changeDetails: changeTypes.slice(0, 3).join(', '),
        intensity: group.length
      });
    }
  });
  
  return positionalChanges.slice(0, 10);
}

// Main comparison function
async function compareImages(imagePath1, imagePath2) {
  try {
    // Get metadata for both images
    const metadata1 = await getImageMetadata(imagePath1);
    const metadata2 = await getImageMetadata(imagePath2);
    
    // Convert both images to PNG
    const buffer1 = await convertToPNG(imagePath1);
    const buffer2 = await convertToPNG(imagePath2);
    
    // Resize to match dimensions
    const { resized1, resized2, width, height } = await resizeToMatch(buffer1, buffer2);
    
    // Parse PNG data
    const png1 = PNG.sync.read(resized1);
    const png2 = PNG.sync.read(resized2);
    
    // Create diff image
    const diff = new PNG({ width, height });
    
    // Compare images
    const numDiffPixels = pixelmatch(
      png1.data, 
      png2.data, 
      diff.data, 
      width, 
      height,
      {
        threshold: 0.1,
        includeAA: false,
        alpha: 0.2,
        aaColor: [255, 255, 0],
        diffColor: [255, 0, 0]
      }
    );
    
    // Calculate similarity percentage
    const totalPixels = width * height;
    const similarityPercentage = ((totalPixels - numDiffPixels) / totalPixels) * 100;
    
    // Generate diff image buffer
    const diffBuffer = PNG.sync.write(diff);
    
    // Save diff image
    const diffFilename = `diff-${uuidv4()}.png`;
    const diffPath = path.join(uploadsDir, diffFilename);
    fs.writeFileSync(diffPath, diffBuffer);
    
    // Perform detailed analysis
    const colorChanges = analyzeColorChanges(png1, png2, width, height, diff.data);
    const structuralChanges = analyzeStructuralChanges(png1, png2, width, height);
    const positionalChanges = analyzePositionalChanges(colorChanges, structuralChanges);
    
    // Generate summary
    const summary = [];
    if (colorChanges.length > 0) {
      const colorTypes = [...new Set(colorChanges.map(c => c.changeType.split(', ')).flat())];
      summary.push(`Color differences detected: ${colorTypes.slice(0, 3).join(', ')} in ${colorChanges.length} regions`);
    }
    if (structuralChanges.length > 0) {
      summary.push(`${structuralChanges.length} structural changes detected`);
    }
    if (positionalChanges.length > 0) {
      summary.push(`${positionalChanges.length} major element shifts detected`);
    }
    if (summary.length === 0) {
      summary.push('No significant differences detected');
    }
    
    return {
      similarity: parseFloat(similarityPercentage.toFixed(2)),
      totalPixels,
      differentPixels: numDiffPixels,
      diffImagePath: diffFilename,
      dimensions: { width, height },
      metadata: {
        image1: metadata1,
        image2: metadata2
      },
      analysis: {
        identical: numDiffPixels === 0,
        highSimilarity: similarityPercentage > 95,
        moderateSimilarity: similarityPercentage > 80 && similarityPercentage <= 95,
        lowSimilarity: similarityPercentage <= 80
      },
      detailedAnalysis: {
        colorChanges,
        structuralChanges,
        positionalChanges,
        summary: summary.join('. ')
      }
    };
  } catch (error) {
    throw new Error(`Comparison failed: ${error.message}`);
  }
}

// API Routes
app.post('/api/compare', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.image1 || !req.files.image2) {
      return res.status(400).json({
        success: false,
        message: 'Please upload both images'
      });
    }
    
    const image1Path = req.files.image1[0].path;
    const image2Path = req.files.image2[0].path;
    
    const comparisonResult = await compareImages(image1Path, image2Path);
    
    res.json({
      success: true,
      data: {
        ...comparisonResult,
        uploadedImages: {
          image1: req.files.image1[0].filename,
          image2: req.files.image2[0].filename
        }
      }
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Serve uploaded images
app.get('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: 'Image not found' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});