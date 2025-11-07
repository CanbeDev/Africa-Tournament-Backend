const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const createLimiter = (maxRequests, message) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.',
      });
    },
    keyGenerator: (req) => req.ip,
  });

const authLimiter = createLimiter(5, 'Too many authentication attempts. Please wait before trying again.');
const apiLimiter = createLimiter(100, 'Rate limit exceeded. Please slow down your requests.');
const strictLimiter = createLimiter(10, 'Too many admin requests. Please wait before trying again.');

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
};

