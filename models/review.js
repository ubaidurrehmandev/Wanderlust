const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: {
        type: String,
        required: true,
    },

    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },

    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
});

reviewSchema.virtual("owner")
    .get(function () {
        return this.author;
    })
    .set(function (value) {
        this.author = value;
    });

module.exports = mongoose.model("Review", reviewSchema);