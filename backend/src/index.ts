import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import authRoutes from './api/routes/auth.routes';
import giftsRoutes from './api/routes/gifts.routes';
import invitesRoutes from './api/routes/invites.routes';
import notificationsRoutes from './api/routes/notifications.routes';
import profileRoutes from './api/routes/profile.routes';
import requestsRoutes from './api/routes/requests.routes';
import servicesRoutes from './api/routes/services.routes';
import subscriptionsRoutes from './api/routes/subscriptions.routes';
import supportRoutes from './api/routes/support.routes';
import transactionsRoutes from './api/routes/transactions.routes';
import uploadRoutes from './api/routes/upload.routes';
import webhookRoutes from './api/routes/webhook.routes';

import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:3001',
  'https://joinq.ng',
  'http://localhost:8081', // Internal App Dev
  'http://localhost:3000' // Self
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/gifts', giftsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
