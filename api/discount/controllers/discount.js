const axios = require("axios");
const { v4 } = require("uuid");

const shopifyHost = (
  username = "3da73d1488017188df235891161cdbfd",
  password = "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"
) => {
  return `https://${username}:${password}@hukegeek.myshopify.com/admin/api/2020-10/`;
};

const priceRules = "price_rules.json";
const discount = (price_rule_id) =>
  `price_rules/${price_rule_id}/discount_codes.json`;

const getFullUser = async ({ email }) => {
  const user = await strapi.plugins["users-permissions"].services.user.fetch({
    email: email,
  });
  return user;
};

const getMyTotalGeeks = ({ goals }) => {
  return goals
    .filter(({ status }) => status === "closed")
    .reduce((prev, { geek }) => prev + geek, 0);
};

const createPriceRules = (amount) => {
  return {
    price_rule: {
      title: "aftership_discount",
      target_type: "line_item",
      usage_limit: "1",
      target_selection: "all",
      allocation_method: "across",
      value_type: "fixed_amount",
      value: Math.min(amount, -amount),
      customer_selection: "all",
      starts_at: "2017-01-19T17:59:10Z",
    },
  };
};

const createDiscount = () => {
  return {
    discount_code: {
      code: v4(),
    },
  };
};

module.exports = {
  // GET /hello
  async index(ctx) {
    const amount = ctx.request.body.amount;
    const fullUser = await getFullUser(ctx.state.user);
    if (!amount) {
      return ctx.badRequest("need set amount");
    }
    const totalGeek = await getMyTotalGeeks(fullUser);
    if (totalGeek < amount) {
      return ctx.forbidden("geek value is not enough");
    }
    const { data: priceRuleData } = await axios.post(
      `${shopifyHost()}${priceRules}`,
      createPriceRules(amount)
    );
    const priceRuleId = priceRuleData.price_rule.id;
    const { data } = await axios.post(
      `${shopifyHost()}${discount(priceRuleId)}`,
      createDiscount()
    );

    ctx.send(JSON.stringify(data));
  },
};
