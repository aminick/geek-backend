"use strict";
const _ = require("lodash");

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const getIsAdmin = (user) => {
  const type = _.get(user, "role.type", "").toLowerCase();
  const name = _.get(user, "roles[0].name", "").toLowerCase();
  return type.includes("admin") || name.includes("admin");
};

const getMyGoal = async (user, goalId) => {
  const [myGoal] = await strapi.controllers.goal.find({
    query: {
      id: goalId,
      assignee: user.id,
    },
  });
  return myGoal;
};

const getFullUser = async ({ email }) => {
  const user = await strapi.plugins["users-permissions"].services.user.fetch({
    email: "k.hu@aftership.com",
  });
  return user;
};

const getMyTotalGeeks = ({ goals }) => {
  return goals
    .filter(({ status }) => status === "closed")
    .reduce((prev, { geek }) => prev + geek, 0);
};

const getMyRemainGeeks = ({ goals }) => {
  const requestingGeek = goals
    .filter(({ status }) => status === "requesting")
    .reduce((prev, { geek }) => prev + geek, 0);
  return getMyTotalGeeks({ goals }) + requestingGeek;
};

const getIsRequestAuditing = (status) => {
  return status === "auditing";
};

const getIsRequesting = (status) => {
  return status === "requesting";
};

const getIsAssigning = (assignee, user) => {
  return assignee === _.get(user, "id");
};

const findAdmin = async (goalId) => {
  return await strapi.services.goal.find({ id: goalId });
};

const getGoalBody = async (ctx) => {
  const body = ctx.request.body;
  const [admin, user] = await Promise.all([
    findAdmin(ctx.params.id),
    getFullUser(ctx.state.user),
  ]);
  switch (body.status) {
    case "requesting":
    case "auditing":
      body.assignee = admin.id;
      break;
    case "ongoing":
      body.assignee = body.assignee || user.id;
      break;
    case "active":
      body.assignee = null;
      break;
  }
  return body;
};

module.exports = {
  async create(ctx) {
    let { status, geek = 0 } = ctx.request.body;
    geek = Math.min(geek, -geek);
    const user = await getFullUser(ctx.state.user);
    const isAdmin = getIsAdmin(user);
    const isRequesting = getIsRequesting(status);
    // 管理员有所有权限
    if (isAdmin) {
      return await strapi.services.goal.create({
        status: ctx.request.body.assignee ? "ongoing" : "active",
        ...ctx.request.body,
        createdBy: user.id,
      });
    }
    // request discount
    if (isRequesting) {
      if (getMyRemainGeeks(user) >= -geek) {
        ctx.request.body = {
          ...ctx.request.body,
          status: "requesting",
          createdBy: user.id,
        };
        return await strapi.services.goal.create(ctx.request.body);
      }
      return ctx.forbidden("geek value is not enough");
    }
    // 创建ticket, 并且assign给自己
    ctx.request.body = {
      ...ctx.request.body,
      geek: 0,
      status: "ongoing",
      assignee: user.id,
      createdBy: user.id,
    };
    return await strapi.services.goal.create(ctx.request.body);
  },
  async update(ctx) {
    const user = ctx.state.user;
    const isAdmin = getIsAdmin(user);
    const myGoal = await getMyGoal(user, ctx.params.id);
    const isRequestAuditing = getIsRequestAuditing(ctx.request.body.status);
    const isAssigning = getIsAssigning(Number(ctx.request.body.assignee), user);
    // 管理员有所有权限
    if (isAdmin) {
      return await strapi.services.goal.update(
        { id: ctx.params.id },
        await getGoalBody(ctx)
      );
    }
    /**
     * 1. 我接受的goal， 我可以Request auditing
     * 2. 我接受的goal， 我可以unassign
     */
    if (myGoal) {
      const { status, assignee } = ctx.request.body;
      if (isRequestAuditing) {
        ctx.body = {
          status,
          ...myGoal,
          assignee: assignee || myGoal.assignee,
        };
        return await strapi.services.goal.update(
          { id: ctx.params.id },
          await getGoalBody(ctx)
        );
      }
      if (assignee === null || status === "active") {
        ctx.body = {
          assignee: null,
        };
        return await strapi.services.goal.update(
          { id: ctx.params.id },
          await getGoalBody(ctx)
        );
      }
    }
    // 用户可以assign给自己
    if (isAssigning) {
      ctx.body = {
        assignee: user.id,
      };
      return await strapi.services.goal.update(
        { id: ctx.params.id },
        await getGoalBody(ctx)
      );
    }
    ctx.unauthorized(`not authenticated`);
  },
};
