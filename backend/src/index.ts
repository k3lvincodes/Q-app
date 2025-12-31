import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import authRoutes from './api/routes/auth.routes';
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

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
