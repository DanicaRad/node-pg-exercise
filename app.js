/** BizTime express application. */
/** What does this mean? **/
  // These routes need to be given data in JSON format, not the standard “url-encoded form body” — so you’ll need to make sure that your app.js includes the middleware to parse JSON.

const express = require("express");

const app = express();
const ExpressError = require("./expressError")
const companiesRoutes = require('./routes/companies');
const invoiceRoutes = require('./routes/invoices');

app.use(express.json());

app.use('/companies', companiesRoutes);
app.use('/invoices', invoiceRoutes);


/** 404 handler */

app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  
  return res.json({
    error: err.status,
    message: err.message
  });
});


module.exports = app;
