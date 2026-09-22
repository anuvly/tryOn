import "dotenv/config";
console.log("cwd:", process.cwd());
console.log("AI_PROVIDER seen by server.js:", JSON.stringify(process.env.AI_PROVIDER));
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTryOn } from './services/aiProvider.js';
import profileRouter from './routes/profile.js';
import tryonRouter from './routes/tryon.js';
import resultsRouter from './routes/results.js';
import { storage } from './services/storage.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for Chrome Extension requests
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes for Chrome Extension
app.use('/profile', profileRouter);
app.use('/tryon', tryonRouter);
app.use('/results', resultsRouter);

// Helper function to convert Image URL or Data URI into a Node.js Buffer
async function urlToBuffer(imageUrl) {
  if (!imageUrl) return Buffer.from([]);

  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Fallback dummy profile image buffer if user hasn't uploaded one yet
const DEFAULT_PROFILE_URL = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';

// API Endpoint called by standalone web client if needed
app.post('/api/tryon', async (req, res) => {
  try {
    const { productImage, category, profileImage } = req.body;

    console.log(`[TryOn Request] Processing category: ${category || 'general'}`);

    const productImageBuffer = await urlToBuffer(productImage || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500');
    const profilePhotoBuffer = await urlToBuffer(profileImage || DEFAULT_PROFILE_URL);

    const resultBuffer = await generateTryOn({
      profilePhotoBuffer,
      productImageBuffer,
      category: category || 'apparel'
    });

    const base64Image = `data:image/jpeg;base64,${resultBuffer.toString('base64')}`;

    return res.json({
      success: true,
      resultImageUrl: base64Image
    });

  } catch (error) {
    console.error('[TryOn Error]:', error.message);

    return res.json({
      success: false,
      error: error.message,
      resultImageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Mirror backend listening on http://localhost:${PORT}`);
});