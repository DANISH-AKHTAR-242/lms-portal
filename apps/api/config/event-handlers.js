import logger from "./logger.js";

export const domainEventHandlers = {
  USER_REGISTERED: async (payload) =>
    logger.info("event_user_registered", {
      traceId: payload.traceId,
      userId: payload.userId,
    }),
  USER_ENROLLED: async (payload) =>
    logger.info("event_user_enrolled", {
      traceId: payload.traceId,
      userId: payload.userId,
      courseId: payload.courseId,
    }),
  PAYMENT_SUCCESS: async (payload) =>
    logger.info("event_payment_success", {
      traceId: payload.traceId,
      orderId: payload.orderId,
      paymentId: payload.paymentId,
    }),
  LECTURE_WATCHED: async (payload) =>
    logger.info("event_lecture_watched", {
      traceId: payload.traceId,
      userId: payload.userId,
      courseId: payload.courseId,
      lectureId: payload.lectureId,
    }),
  COURSE_CREATED: async (payload) =>
    logger.info("event_course_created", {
      traceId: payload.traceId,
      courseId: payload.courseId,
      userId: payload.userId,
    }),
  COURSE_VIEWED: async (payload) =>
    logger.info("event_course_viewed", {
      traceId: payload.traceId,
      userId: payload.userId,
    }),
};
