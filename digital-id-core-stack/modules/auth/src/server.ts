import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});