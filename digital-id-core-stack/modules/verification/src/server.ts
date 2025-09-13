import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.VERIFICATION_PORT || 3002;

app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'verification' });
});

app.listen(PORT, () => {
  console.log(`Verification service running on port ${PORT}`);
});