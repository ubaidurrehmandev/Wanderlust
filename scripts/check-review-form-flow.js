const http = require("http");
const mongoose = require("mongoose");
const User = require("../models/user");
const Listing = require("../models/listing");
const Review = require("../models/review");

const BASE_URL = "http://127.0.0.1:8080";
const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";
const targetListingId = "6a7a401a9311278dd86bd373";

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  add(setCookieHeaders = []) {
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      this.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  header() {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

function request(method, path, { jar, form } = {}) {
  return new Promise((resolve, reject) => {
    const body = form ? new URLSearchParams(form).toString() : null;
    const req = http.request(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(jar && jar.header() ? { Cookie: jar.header() } : {}),
        ...(body ? {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        } : {}),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (jar && res.headers["set-cookie"]) jar.add(res.headers["set-cookie"]);
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const ts = Date.now();
  const jar = new CookieJar();
  const guestJar = new CookieJar();
  const user = {
    username: `review_form_user_${ts}`,
    email: `review_form_user_${ts}@example.com`,
    password: "Password123!",
  };
  const comment = `Review flow comment ${ts}`;

  await mongoose.connect(dbUrl);
  await User.deleteMany({ username: user.username });
  await mongoose.disconnect();

  console.log("1. Guest does not see review form");
  const guestPage = await request("GET", `/listings/${targetListingId}`, { jar: guestJar });
  expect(guestPage.status === 200, `Guest listing page failed: ${guestPage.status}`);
  expect(!guestPage.body.includes("Logged in as:"), "Guest should not see logged-in review form");
  expect(!guestPage.body.includes(`action=\"/listings/${targetListingId}/reviews\"`), "Guest should not see review submission form");

  console.log("2. Login user");
  const signup = await request("POST", "/signup", { jar, form: user });
  expect(signup.status === 302 && signup.headers.location === "/listings", "Signup/login failed");

  console.log("3. Logged-in listing page shows current username above review form");
  const listingPage = await request("GET", `/listings/${targetListingId}`, { jar });
  expect(listingPage.status === 200, `Logged-in listing page failed: ${listingPage.status}`);
  expect(listingPage.body.includes(`Logged in as: <strong>${user.username}</strong>`), "Current username not shown above review form");
  expect(listingPage.body.includes(`action="/listings/${targetListingId}/reviews"`), "Review form action incorrect");
  expect(listingPage.body.includes("name=\"review[rating]\""), "Rating field missing");
  expect(listingPage.body.includes("name=\"review[comment]\""), "Comment field missing");

  console.log("4. Submit review");
  const submitReview = await request("POST", `/listings/${targetListingId}/reviews`, {
    jar,
    form: {
      "review[rating]": "5",
      "review[comment]": comment,
    },
  });
  expect(submitReview.status === 302 && submitReview.headers.location === `/listings/${targetListingId}`, "Review submit failed");

  await mongoose.connect(dbUrl);
  const dbUser = await User.findOne({ username: user.username });
  const review = await Review.findOne({ comment }).sort({ createdAt: -1 });
  const listing = await Listing.findById(targetListingId);
  expect(review, "Review was not saved to MongoDB");
  expect(String(review.author) === String(dbUser._id), "Review author does not match logged-in user");
  expect(listing.reviews.some((id) => String(id) === String(review._id)), "Listing does not contain review reference");
  await mongoose.disconnect();

  console.log("5. Review appears on listing and remains after refresh");
  const pageAfterSubmit = await request("GET", `/listings/${targetListingId}`, { jar });
  expect(pageAfterSubmit.body.includes(comment), "Saved review comment not displayed");
  expect(pageAfterSubmit.body.includes(user.username), "Saved review username not displayed");
  const refreshedPage = await request("GET", `/listings/${targetListingId}`, { jar });
  expect(refreshedPage.body.includes(comment), "Review missing after refresh");

  console.log("6. Unauthenticated review POST is blocked and uses flash redirect flow");
  const blocked = await request("POST", `/listings/${targetListingId}/reviews`, {
    jar: guestJar,
    form: {
      "review[rating]": "4",
      "review[comment]": "Guest should not be allowed",
    },
  });
  expect(blocked.status === 302 && blocked.headers.location === "/login", `Unauthenticated review should redirect to /login, got ${blocked.status} ${blocked.headers.location}`);
  const loginPage = await request("GET", "/login", { jar: guestJar });
  expect(loginPage.status === 200, `Login page failed after guest review redirect: ${loginPage.status}`);
  expect(loginPage.body.includes("You must be logged in first!"), "Flash message missing after unauthenticated review attempt");

  console.log("Review form flow checks passed.");
}

main().catch((err) => {
  console.error("REVIEW FORM FLOW FAILED:", err.message);
  process.exit(1);
});
