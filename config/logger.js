const formatLog = (level, message, meta = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  return JSON.stringify(payload);
};

export const logger = {
  info(message, meta = {}) {
    console.log(formatLog("info", message, meta));
  },
  warn(message, meta = {}) {
    console.warn(formatLog("warn", message, meta));
  },
  error(message, meta = {}) {
    console.error(formatLog("error", message, meta));
  },
};

export default logger;
