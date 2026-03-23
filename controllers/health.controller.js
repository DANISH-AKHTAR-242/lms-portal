import { getDBStatus } from "../database/db.js";

export const checkHealth = async (req, res) => {
  try {
    const dbStatus = getDBStatus();

    const healthStatus = {
      status: "ok",
      timeStamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus.isConnecteed ? "healthy" : "unhealthy",
          details: {
            ...dbStatus,
            readyState: getReadyStateText(dbStatus.readyState),
          },
        },
        server: {
          status: "healthy",
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      },
    };
    const httpStatus =
      healthStatus.services.database.status === "healthy" ? 200 : 503;

    res.status(httpStatus).json(healthStatus);
  } catch (error) {
    console.error("Healthcheck failed", error);
    res.status(500).json({
      status: "error",
      timeStamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

function getReadyStateText(state) {
  switch (state) {
    case 0:
      return "Disconnected";
    case 1:
      return "Connected";
    case 2:
      return "Connecting";
    case 3:
      return "Disconnecting";
    default:
      return "Unkown";
  }
}
