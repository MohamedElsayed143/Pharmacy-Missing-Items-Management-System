import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initSocketIO } from './realtime/socket';
import authRouter from './modules/auth/auth.router';
import ordersRouter from './modules/orders/orders.router';
import purchasingRouter from './modules/purchasing/purchasing.router';
import receivingRouter from './modules/receiving/receiving.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import employeesRouter from './modules/employees/employees.router';
import activityRouter from './modules/activity/activity.router';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Pharmacy Missing Items API',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/purchasing', purchasingRouter);
app.use('/api/receiving', receivingRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/activity-logs', activityRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: err.message || 'حدث خطأ داخلي في الخادم' });
});

const PORT = parseInt(process.env.PORT || '4000', 10);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  Pharmacy API Server running on http://localhost:${PORT}`);
  console.log(`  WebSocket Server ready for real-time synchronization`);
  console.log(`====================================================`);
});

export { app, server };
