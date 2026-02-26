import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import consultaRouter from './routes/consulta.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/consulta', consultaRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno no servidor.' });
});

app.listen(PORT, () => {
  console.log(`FipeFácil backend running on http://localhost:${PORT}`);
});

export default app;
