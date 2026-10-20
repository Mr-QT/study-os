import type { FastifyReply } from "fastify";

import { apiErrorCodes } from "@study-os/contracts";

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  options: { details?: unknown; retryable?: boolean } = {},
): FastifyReply {
  return reply.code(statusCode).send({
    code,
    message,
    correlationId: reply.request.id,
    retryable: options.retryable ?? false,
    ...(options.details === undefined ? {} : { details: options.details }),
  });
}

export function notFound(reply: FastifyReply, message = "资源不存在"): FastifyReply {
  return sendError(reply, 404, apiErrorCodes.notFound, message);
}

export function unauthorized(reply: FastifyReply, message = "需要登录或有效会话"): FastifyReply {
  return sendError(reply, 401, apiErrorCodes.unauthorized, message);
}

export function forbidden(reply: FastifyReply, message = "没有执行该操作的权限"): FastifyReply {
  return sendError(reply, 403, apiErrorCodes.forbidden, message);
}

export function serviceUnavailable(reply: FastifyReply): FastifyReply {
  return sendError(
    reply,
    503,
    apiErrorCodes.serviceUnavailable,
    "数据库未配置，该接口暂不可用",
    { retryable: false },
  );
}

export function validationError(reply: FastifyReply, details: unknown): FastifyReply {
  return sendError(reply, 400, apiErrorCodes.validation, "请求参数不合法", { details });
}
