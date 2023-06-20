const express = require('express'),
      morgan = require('morgan'),
      cors = require('cors'),
      { config } = require('dotenv');

      config();

const PORT = process.env.PORT;
const app = express();

app.use(morgan('short'));
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api', require('./routes/main.routes'));

app.listen(PORT, () => {
    console.log('API Running in port ==> ', PORT);
});