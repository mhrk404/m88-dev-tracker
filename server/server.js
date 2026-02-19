import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// Log environment check
console.log('🔵 Server starting...');
console.log('📡 Supabase URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? '✓ Set' : '✗ Missing');

app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
});

export default app;