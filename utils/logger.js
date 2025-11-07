const path = require('path');
const { createLogger, format, transports, config } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const ENV = process.env.NODE_ENV || 'development';

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

const { combine, timestamp, printf, colorize, errors, splat, json } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp: ts, level, message, stack, ...meta }) => {
    const base = `${ts} [${level}]: ${message}`;
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack ? `${base}\n${stack}${metaString}` : `${base}${metaString}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json()
);

const transportsList = [];

if (ENV !== 'production') {
  transportsList.push(
    new transports.Console({
      level: 'debug',
      format: devFormat,
    })
  );
} else {
  transportsList.push(
    new transports.Console({
      level: 'info',
      format: devFormat,
    })
  );
}

const rotatingTransportOptions = {
  dirname: LOG_DIR,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '20m',
  maxFiles: '14d',
  format: prodFormat,
};

transportsList.push(
  new DailyRotateFile({
    filename: 'combined-%DATE%.log',
    level: 'debug',
    ...rotatingTransportOptions,
  })
);

transportsList.push(
  new DailyRotateFile({
    filename: 'error-%DATE%.log',
    level: 'error',
    ...rotatingTransportOptions,
  })
);

const logger = createLogger({
  levels: customLevels.levels,
  level: ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'pan-african-kicks-backend' },
  format: ENV === 'production' ? prodFormat : devFormat,
  transports: transportsList,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;

