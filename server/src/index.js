import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth.js';
import { householdsRouter } from './routes/households.js';
import { createExpensesRouter } from './routes/expenses.js';
import { requireAuth } from './auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

// credentials: true is required for the httpOnly auth cookie to be sent/read
// cross-origin between the Vite dev server and this API.
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/households', requireAuth, householdsRouter);
app.use('/api/expenses', requireAuth, createExpensesRouter(io));

io.on('connection', (socket) => {
  socket.on('household:join', (householdId) => {
    socket.join(`household:${householdId}`);
  });
  socket.on('household:leave', (householdId) => {
    socket.leave(`household:${householdId}`);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Ledger server running on http://localhost:${PORT}`);
});
