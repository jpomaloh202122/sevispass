import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.GATEWAY_PORT || 3004;

app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});