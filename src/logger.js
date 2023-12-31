import { createLogger, format, transports } from "winston";

const logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      handleExceptions: true,
    }),
  ],
});

export { logger };
