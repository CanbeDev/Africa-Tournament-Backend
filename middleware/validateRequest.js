const { validationResult, matchedData } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.param,
        message: error.msg,
      })),
    });
  }

  const sanitizedBody = matchedData(req, {
    includeOptionals: true,
    locations: ['body'],
  });
  const sanitizedParams = matchedData(req, {
    includeOptionals: true,
    locations: ['params'],
  });
  const sanitizedQuery = matchedData(req, {
    includeOptionals: true,
    locations: ['query'],
  });

  req.sanitized = {
    body: sanitizedBody,
    params: sanitizedParams,
    query: sanitizedQuery,
  };

  if (Object.keys(sanitizedBody).length > 0) {
    req.body = { ...req.body, ...sanitizedBody };
  }
  if (Object.keys(sanitizedParams).length > 0) {
    req.params = { ...req.params, ...sanitizedParams };
  }
  if (Object.keys(sanitizedQuery).length > 0) {
    req.query = { ...req.query, ...sanitizedQuery };
  }

  next();
};

