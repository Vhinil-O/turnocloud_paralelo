import express from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'turnocloud-api' });
});

app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
});