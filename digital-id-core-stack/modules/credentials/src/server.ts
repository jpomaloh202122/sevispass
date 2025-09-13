import express from 'express';
import helmet from 'helmet';

const app = express();
const PORT = process.env.CREDENTIALS_PORT || 3003;

app.use(helmet());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'credentials' });
});

app.listen(PORT, () => {
  console.log(`Credentials service running on port ${PORT}`);
});