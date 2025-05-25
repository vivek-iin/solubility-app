// server.js
const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// Configure multer with file validation
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/predict', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = path.resolve(__dirname, req.file.path);
    
    // Verify file exists and is readable
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(500).json({ error: 'Uploaded file is not accessible' });
    }

    console.log(`Processing file: ${req.file.originalname}`);

    // Run the Python script with timeout
    const python = spawn('python', ['predict.py', filePath], {
      timeout: 60000 // 60 second timeout
    });

    let data = '';
    let errorData = '';

    python.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    python.stderr.on('data', (err) => {
      errorData += err.toString();
      console.error('Python stderr:', err.toString());
    });

    python.on('close', async (code) => {
      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (cleanupErr) {
        console.warn('Failed to cleanup uploaded file:', cleanupErr);
      }

      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error('Error output:', errorData);
        return res.status(500).json({ 
          error: 'Prediction failed', 
          details: errorData || 'Unknown error occurred'
        });
      }

      try {
        if (!data.trim()) {
          return res.status(500).json({ error: 'No output from prediction script' });
        }

        const result = JSON.parse(data);
        
        // Validate result structure
        if (!Array.isArray(result)) {
          return res.status(500).json({ error: 'Invalid prediction result format' });
        }

        res.json({
          success: true,
          predictions: result,
          count: result.length
        });
      } catch (err) {
        console.error('Error parsing JSON:', err);
        console.error('Raw output:', data);
        res.status(500).json({ 
          error: 'Failed to parse prediction results',
          details: err.message
        });
      }
    });

    python.on('error', async (err) => {
      console.error('Failed to start Python process:', err);
      
      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (cleanupErr) {
        console.warn('Failed to cleanup uploaded file:', cleanupErr);
      }
      
      res.status(500).json({ 
        error: 'Failed to start prediction process',
        details: err.message
      });
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    
    // Clean up uploaded file if it exists
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupErr) {
        console.warn('Failed to cleanup uploaded file:', cleanupErr);
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message === 'Only CSV files are allowed') {
    return res.status(400).json({ error: 'Only CSV files are allowed' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /predict - Upload CSV and get predictions`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});