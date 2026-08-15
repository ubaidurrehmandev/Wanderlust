  require('dotenv').config();
  const express = require("express");
  const app = express();
  const mongoose = require("mongoose");
  const Listing = require("./models/listing.js");
  const path = require("path");
  const methodOverride = require("method-override");
  const ejsMate = require("ejs-mate");
  const ExpressError = require("./utils/expressError.js");
  const session = require("express-session");
  const MongoStore = require("connect-mongo").MongoStore;
  const flash = require("connect-flash");
  const passport = require("passport");
  const LocalStrategy = require("passport-local");
  const User = require("./models/user.js");



  const listingsRouter = require("./routes/listing.js");
  const reviewRouter = require("./routes/review.js"); 
  const userRouter = require("./routes/user.js"); 


  const dbUrl = process.env.ATLASDB_URL;

  main()
    .then(() => {
      console.log("connected to DB");
    })
    .catch((err) => {
      console.log(err);
    });

  async function main() {
    await mongoose.connect(dbUrl);
  }

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "Views"));
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride("_method"));
  app.engine('ejs', ejsMate);
  app.use(express.static(path.join(__dirname, "public")));
  app.use('/uploads', express.static(path.join(__dirname, 'upload')));

  const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
      secret: process.env.SESSION_SECRET,
    },
    touchAfter: 24 * 3600,
  });

  store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
  });
    

  const sessionOptions = {
    store,
    secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true
      }
  };

  // app.get("/", (req, res) => {
  //   res.send("Hi, I am root");
  // });



  app.use(session(sessionOptions));
  app.use(flash());

  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(new LocalStrategy(User.authenticate()));


  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());






  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;  // available in all EJS templates
    next();
  });





  app.use("/listings", listingsRouter);
  app.use("/listings/:id/reviews", reviewRouter);
  app.use("/", userRouter);




  app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
  });

  app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    console.error(err);
    res.status(statusCode);
    res.render("error.ejs", { message });
  });

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`server is listening to port ${port}`);
  });