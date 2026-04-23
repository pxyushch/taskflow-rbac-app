
const helmet = require('helmet');
const compression = require('compression');

const applySecurity = (app) => {
  app.use(helmet());
  app.use(compression());
};

module.exports = { applySecurity };
