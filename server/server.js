import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import todoRoutes from './routes/todoRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { getHealth } from './controllers/todoController.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Security Headers
app.use(helmet());

// CORS configuration (allows credentials and flexible cloud/local origins)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://to-do-ai3p.onrender.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(origin.replace(/\/$/, '')) ||
        /render\.com$|vercel\.app$|netlify\.app$|localhost/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body and cookie parsers
app.use(express.json());
app.use(cookieParser());

// Root Health check endpoint
app.get('/api/health', getHealth);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`
  );
});
