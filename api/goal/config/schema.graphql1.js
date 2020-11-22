const getIsAdmin = (user) => {
  return user.role === 'admin'
};

const getMyGoal = async (user, goalId) => {
  const [myGoal] = await strapi.controllers.goal.find({
    query: {
      id: goalId,
      assignee: user.id,
    },
  });
  return myGoal;
}

const getIsRequestAuditing = (type) => {
  return type === 'auditing'
};

module.exports = {
  Mutation: `
    createGoal(input: createGoalInput): createGoalPayload
    updateGoal(input: updateGoalInput): updateGoalPayload
  `,
  resolver: {
    Mutation: {
      createGoal: {
        resolverOf: "application::goal.goal.create",
        resolver: async (obj, options, ctx) => {
          console.log(obj, options);
        },
      },
      updateGoal: {
        resolverOf: "application::goal.goal.update",
        policies: ["global::isAdmin"],
        resolver: async (obj, options, ctx) => {
          const user = ctx.context.state.user;
          const isAdmin = getIsAdmin(user);
          const myGoal = await getMyGoal(user, options.input.where.id);
          const isRequestAuditing = getIsRequestAuditing(options);
          if (isAdmin || myGoal) {
            // return await strapi.controllers.goal.update();
          }
          if (isRequestAuditing) {

            // return await strapi.controllers.goal.update(ctx);
          }
        },
      },
    },
  },
};
