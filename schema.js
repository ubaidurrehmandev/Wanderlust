

const Joi = require("joi");
const { PROPERTY_TYPES, CATEGORIES } = require("./config/constants.js");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),
        category: Joi.string().valid(...CATEGORIES),
        propertyType: Joi.string().valid(...PROPERTY_TYPES).optional().allow(null, ""),
        maxGuests: Joi.number().min(1).max(100),
        amenities: Joi.array().items(
            Joi.string().valid(
                "WiFi",
                "Parking",
                "Pool",
                "Kitchen",
                "AC",
                "Heating",
                "Laundry",
                "Garden",
                "TV",
                "Gym",
                "Balcony",
                "Fireplace",
                "Washer",
                "Dryer",
                "Dishwasher",
                "Iron",
                "Hair Dryer"
            )
        ),
        image: Joi.object({
            filename: Joi.string().allow("", null),
            url: Joi.string().allow("", null),
            public_id: Joi.string().allow("", null)
        }).optional().allow(null),
        coordinates: Joi.object({
            lat: Joi.number(),
            lng: Joi.number()
        }).optional().allow(null)
    }).required()
});



module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number()
            .required()
            .min(1)
            .max(5),

        comment: Joi.string()
            .required()
    }).required()
});