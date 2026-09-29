const express = require('express');
const projectsRouter = require('./routes/projects');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/projects', projectsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
