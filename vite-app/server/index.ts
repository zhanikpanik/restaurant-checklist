import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// Import routes
import authRoutes from './routes/auth';
import sectionsRoutes from './routes/sections';
import ordersRoutes from './routes/orders';
import categoriesRoutes from './routes/categories';
import suppliersRoutes from './routes/suppliers';
import productsRoutes from './routes/products';
import usersRoutes from './routes/users';
import userSectionsRoutes from './routes/user-sections';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/section-products', productsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/user-sections', userSectionsRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
