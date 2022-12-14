const express = require('express');
const Router = require('./routes/index');
const errorHandler = require('./advice/errorHandler');
const logger = require('./advice/winston');
const morganMiddleware = require('./middlewares/morgan');

const session = require('cookie-session');
const passport = require('passport');
const passportConfig = require('./passport');

const scheduler = require('./advice/scheduler');

require('dotenv').config();

const app = express();

app.use(morganMiddleware);

//
// const path = require('path');
// app.use(express.static(path.join(__dirname, 'src')));
//

const cors = require('cors');
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://www.gomgom.site'], // 출처 허용 옵션
    credentials: true, // 사용자 인증이 필요한 리소스(쿠키 ..등) 접근
  })
);

passportConfig();

app.use(express.json());
app.use(express.static('public'));
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: [process.env.KAKAO_SECRET, process.env.GOOGLE_SECRET],
    cookie: {
      httpOnly: true,
      secure: false,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', Router);
app.get('/', (req, res) => {
  res.status(200).json({ massage: '서버 잘 켜짐.' });
});
scheduler.scheduler();
app.use(errorHandler);

module.exports = app;
