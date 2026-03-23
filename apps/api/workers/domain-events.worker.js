import { startEventWorker } from "../config/event-bus.js";
import { domainEventHandlers } from "../config/event-handlers.js";

export const startDomainEventsWorker = () =>
  startEventWorker({
    handlers: domainEventHandlers,
    workerName: "domain-events-worker",
  });

export default startDomainEventsWorker;

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  startDomainEventsWorker();
}
