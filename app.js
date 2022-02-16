var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var trgovacRouter = require('./routes/trgovac');
var kupacRouter = require('./routes/kupac');
const fileUpload = require('express-fileupload');
const multer = require('multer');
const Chart = require('chart.js');


var app = express();
// view engine setup
app.set('views', [path.join(__dirname, 'views'),
                  path.join(__dirname, 'views/admin/')]);
app.set('view engine', 'ejs');

app.use(
    session({
      secret: 'supersecret string',
      cookie: {},
      resave: false,
      saveUninitialized: false
    })
);

app.use(fileUpload())



app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);
app.use('/trgovac', trgovacRouter);
app.use('/kupac', kupacRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
