const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const noteRoutes = require('./routes/noteRoutes');
const playroutes = require('./routes/play.route');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('Task Management API Server');
});

app.use('/api', playroutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
