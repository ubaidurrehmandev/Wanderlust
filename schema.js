const Joi = require("joi");
const { PROPERTY_TYPES, CATEGORIES, AMENITIES } = require("./config/constants.js");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    price: Joi.number().required().min(0),
    category: Joi.string().valid(...CATEGORIES).optional().allow(null, ""),
    propertyType: Joi.string().valid(...PROPERTY_TYPES).optional().allow(null, ""),
    maxGuests: Joi.number().min(1).max(100).optional().allow(null, ""),
    amenities: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().valid(...AMENITIES)),
        Joi.string().valid(...AMENITIES)
      )
      .optional()
      .allow(null, ""),
    image: Joi.alternatives()
      .try(
        Joi.object({
          filename: Joi.string().allow("", null),
          url: Joi.string().allow("", null),
          public_id: Joi.string().allow("", null),
        }),
        Joi.string().allow("", null)
      )
      .optional()
      .allow(null),
    coordinates: Joi.object({
      lat: Joi.number().allow(null),
      lng: Joi.number().allow(null),
    })
      .optional()
      .allow(null),
  }).required(),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});