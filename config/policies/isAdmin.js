'use strict';

/**
 * `isAdmin` policy.
 */

module.exports = async (ctx, next) => {
  if (ctx.state.user && ctx.state.user.role === "admin") {
    return await next();
  }
  return ctx.unauthorized(`You're not admin user!`);
};
