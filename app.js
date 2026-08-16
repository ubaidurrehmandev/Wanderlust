require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo").MongoStore;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user.js");
const ExpressError = require("./utils/expressError.js");

const listingsRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const isProduction = process.env.NODE_ENV === "production";

// ================= DATABASE =================

const dbUrl =
    process.env.MONGO_URL ||
    process.env.ATLASDB_URL ||
    (!isProduction
        ? "mongodb://127.0.0.1:27017/wanderlust"
        : null);

if (!dbUrl) {
    console.error("FATAL ERROR: MONGO_URL environment variable is required.");
    process.exit(1);
}

// ================= SESSION =================

const sessionSecret =
    process.env.SESSION_SECRET || "wanderlust-dev-only-secret";

if (isProduction && !process.env.SESSION_SECRET) {
    console.error(
        "FATAL ERROR: SESSION_SECRET environment variable is required in production."
    );
    process.exit(1);
}

if (isProduction) {
    app.set("trust proxy", 1);
}

// ================= VIEW ENGINE =================

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");

app.set("views", [
    path.join(__dirname, "views"),
    path.join(__dirname, "Views"),
]);

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));

// ================= SESSION STORE =================

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: sessionSecret,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.error("ERROR IN MONGO SESSION STORE:", err);
});

app.use(
    session({
        store,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,

        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "lax",
            secure: isProduction,
        },
    })
);

app.use(flash());

// ================= PASSPORT =================

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ================= GLOBAL VARIABLES =================

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user || null;

    next();
});

// ================= HOME =================

// IMPORTANT:
// Visiting "/" goes to listings.
// It does NOT go to account/profile.

app.get("/", (req, res) => {
    res.redirect("/listings");
});

// ================= ROUTES =================

app.use("/listings", listingsRouter);

app.use("/listings/:id/reviews", reviewRouter);

app.use("/", userRouter);

// ================= 404 =================

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// ================= ERROR HANDLER =================

app.use((err, req, res, next) => {
    let {
        statusCode = 500,
        message = "Something went wrong!",
    } = err;

    if (err.name === "CastError") {
        statusCode = 404;
        message = "The requested resource was not found.";
    }

    if (err.name === "ValidationError") {
        statusCode = 400;

        message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
    }

    if (err.name === "MulterError") {
        statusCode = 400;

        message =
            err.code === "LIMIT_FILE_SIZE"
                ? "Image file is too large (maximum 10 MB)."
                : "Invalid file upload.";
    }

    if (err.message === "Only image files are allowed!") {
        statusCode = 400;
        message = err.message;
    }

    if (isProduction && statusCode === 500) {
        message = "Something went wrong!";
    }

    res.status(statusCode).render("error.ejs", {
        message,
        currUser: res.locals.currUser || null,
        success: res.locals.success || [],
        error: res.locals.error || [],
    });
});

// ================= START SERVER =================

async function startServer() {
    try {
        await mongoose.connect(dbUrl);

        console.log("Connected to MongoDB successfully.");

        const port = process.env.PORT || 8080;

        app.listen(port, () => {
            console.log(`Wanderlust server running on port ${port}`);
            console.log(`http://localhost:${port}`);
        });

    } catch (err) {
        console.error(
            "FATAL: Failed to connect to MongoDB:",
            err.message
        );

        process.exit(1);
    }
}

startServer();