const Stripe = require("stripe");

const env = require("./env");

const stripe = new Stripe(env.stripe.secretKey);

module.exports = stripe;