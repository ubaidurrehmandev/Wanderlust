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

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  add(setCookieHeaders = []) {
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) continue;
      const key = pair.slice(0, eqIndex).trim();
      const value = pair.slice(eqIndex + 1).trim();
      this.cookies.set(key, value);
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

function request(method, path, { form, jar, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const body = form
      ? new URLSearchParams(form).toString()
      : null;

    const req = http.request(
      `${BASE_URL}${path}`,
      {
        method,
        headers: {
          ...(body
            ? {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body),
              }
            : {}),
          ...(jar && jar.header() ? { Cookie: jar.header() } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (jar && res.headers["set-cookie"]) {
            jar.add(res.headers["set-cookie"]);
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const ts = Date.now();
  const user1 = {
    username: `wander_user_${ts}`,
    email: `wander_user_${ts}@example.com`,
    password: "Password123!",
  };
  const user2 = {
    username: `wander_user_b_${ts}`,
    email: `wander_user_b_${ts}@example.com`,
    password: "Password123!",
  };

  const ownerJar = new CookieJar();
  const otherJar = new CookieJar();
  let firstListingId = null;
  let secondListingId = null;
  let reviewId = null;

  await mongoose.connect(dbUrl);
  await User.deleteMany({ username: { $in: [user1.username, user2.username] } });
  await mongoose.disconnect();

  console.log("1. GET /");
  const home = await request("GET", "/", { jar: ownerJar });
  expect(home.status === 302, `Expected / redirect, got ${home.status}`);
  expect(home.headers.location === "/listings", `Expected / -> /listings, got ${home.headers.location}`);

  console.log("2. Signup user 1");
  const signup1 = await request("POST", "/signup", {
    jar: ownerJar,
    form: user1,
  });
  expect(signup1.status === 302, `Signup user1 failed with ${signup1.status}`);
  expect(signup1.headers.location === "/listings", `Signup redirect should go to /listings, got ${signup1.headers.location}`);

  console.log("3. Logout user 1");
  const logout1 = await request("GET", "/logout", { jar: ownerJar });
  expect(logout1.status === 302, `Logout user1 failed with ${logout1.status}`);
  expect(logout1.headers.location === "/listings", `Logout redirect should go to /listings, got ${logout1.headers.location}`);

  console.log("4. Login user 1");
  const login1 = await request("POST", "/login", {
    jar: ownerJar,
    form: { username: user1.username, password: user1.password },
  });
  expect(login1.status === 302, `Login user1 failed with ${login1.status}`);
  expect(login1.headers.location === "/listings", `Login redirect should go to /listings, got ${login1.headers.location}`);

  console.log("5. Confirm session / req.user via /listings/new");
  const newForm = await request("GET", "/listings/new", { jar: ownerJar });
  expect(newForm.status === 200, `Expected logged-in access to /listings/new, got ${newForm.status}`);
  expect(newForm.body.includes(`Hi, ${user1.username}!`), "Navbar did not render logged-in user; req.user/session may be broken");

  console.log("6. Create listing");
  const createListing = await request("POST", "/listings", {
    jar: ownerJar,
    form: {
      "listing[title]": `Test Listing ${ts}`,
      "listing[description]": "Created by automated auth/listing test",
      "listing[price]": "1500",
      "listing[location]": "Lahore",
      "listing[country]": "Pakistan",
      "listing[category]": "City",
      "listing[propertyType]": "Apartment",
      "listing[maxGuests]": "2",
      "listing[image][url]": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=60",
    },
  });
  expect(createListing.status === 302, `Create listing failed with ${createListing.status}`);
  expect(/^\/listings\/[a-f0-9]{24}$/i.test(createListing.headers.location), `Unexpected listing create redirect: ${createListing.headers.location}`);
  firstListingId = createListing.headers.location.split("/").pop();

  await mongoose.connect(dbUrl);
  const createdListing = await Listing.findById(firstListingId);
  const ownerUser = await User.findOne({ username: user1.username });
  expect(createdListing, "Created listing not found in DB");
  expect(String(createdListing.owner) === String(ownerUser._id), "Listing owner was not saved as logged-in user");
  await mongoose.disconnect();

  console.log("7. Open listing and confirm owner controls");
  const listingPage = await request("GET", `/listings/${firstListingId}`, { jar: ownerJar });
  expect(listingPage.status === 200, `Show listing failed with ${listingPage.status}`);
  expect(listingPage.body.includes(`/listings/${firstListingId}/edit`), "Owner does not see Edit button");
  expect(listingPage.body.includes(`/_method=DELETE`) || listingPage.body.includes(`?_method=DELETE`), "Owner does not see Delete button");

  console.log("8. Edit listing");
  const updateListing = await request("POST", `/listings/${firstListingId}?_method=PUT`, {
    jar: ownerJar,
    form: {
      "listing[title]": `Updated Listing ${ts}`,
      "listing[description]": "Updated description",
      "listing[price]": "1800",
      "listing[location]": "Karachi",
      "listing[country]": "Pakistan",
      "listing[category]": "City",
      "listing[propertyType]": "Apartment",
      "listing[maxGuests]": "3",
      "listing[image][url]": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=60",
    },
  });
  expect(updateListing.status === 302, `Update listing failed with ${updateListing.status}`);
  expect(updateListing.headers.location === `/listings/${firstListingId}`, `Update listing redirected to ${updateListing.headers.location}`);

  await mongoose.connect(dbUrl);
  const updatedListing = await Listing.findById(firstListingId);
  expect(updatedListing.title === `Updated Listing ${ts}`, "Listing title was not updated");
  await mongoose.disconnect();

  console.log("9. Delete listing");
  const deleteListing = await request("POST", `/listings/${firstListingId}?_method=DELETE`, {
    jar: ownerJar,
  });
  expect(deleteListing.status === 302, `Delete listing failed with ${deleteListing.status}`);
  expect(deleteListing.headers.location === "/listings", `Delete listing redirect should go to /listings, got ${deleteListing.headers.location}`);

  await mongoose.connect(dbUrl);
  const deletedListing = await Listing.findById(firstListingId);
  expect(!deletedListing, "Listing was not deleted");
  await mongoose.disconnect();

  console.log("10. Create another listing for review flow");
  const createListing2 = await request("POST", "/listings", {
    jar: ownerJar,
    form: {
      "listing[title]": `Review Listing ${ts}`,
      "listing[description]": "Listing for review tests",
      "listing[price]": "2200",
      "listing[location]": "Islamabad",
      "listing[country]": "Pakistan",
      "listing[category]": "City",
      "listing[propertyType]": "House",
      "listing[maxGuests]": "4",
      "listing[image][url]": "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=800&q=60",
    },
  });
  expect(createListing2.status === 302, `Create second listing failed with ${createListing2.status}`);
  secondListingId = createListing2.headers.location.split("/").pop();

  console.log("11. Add review");
  const createReview = await request("POST", `/listings/${secondListingId}/reviews`, {
    jar: ownerJar,
    form: {
      "review[rating]": "5",
      "review[comment]": "Amazing stay",
    },
  });
  expect(createReview.status === 302, `Create review failed with ${createReview.status}`);
  expect(createReview.headers.location === `/listings/${secondListingId}`, `Create review redirected to ${createReview.headers.location}`);

  await mongoose.connect(dbUrl);
  const listingWithReview = await Listing.findById(secondListingId).populate("reviews");
  expect(listingWithReview.reviews.length > 0, "Review was not attached to listing");
  reviewId = String(listingWithReview.reviews[listingWithReview.reviews.length - 1]._id);
  const reviewDoc = await Review.findById(reviewId);
  expect(String(reviewDoc.author) === String(ownerUser._id), "Review author was not saved as logged-in user");
  await mongoose.disconnect();

  console.log("12. Confirm review displays with owner controls");
  const reviewPage = await request("GET", `/listings/${secondListingId}`, { jar: ownerJar });
  expect(reviewPage.status === 200, `Show listing with review failed with ${reviewPage.status}`);
  expect(reviewPage.body.includes("Amazing stay"), "Review comment not displayed on listing page");
  expect(reviewPage.body.includes(`review-edit-${reviewId}`), "Review owner does not see review edit controls");

  console.log("13. Edit review");
  const updateReview = await request("POST", `/listings/${secondListingId}/reviews/${reviewId}?_method=PUT`, {
    jar: ownerJar,
    form: {
      "review[rating]": "4",
      "review[comment]": "Updated amazing stay",
    },
  });
  expect(updateReview.status === 302, `Update review failed with ${updateReview.status}`);
  expect(updateReview.headers.location === `/listings/${secondListingId}`, `Update review redirected to ${updateReview.headers.location}`);

  await mongoose.connect(dbUrl);
  const updatedReview = await Review.findById(reviewId);
  expect(updatedReview.comment === "Updated amazing stay", "Review comment was not updated");
  expect(updatedReview.rating === 4, "Review rating was not updated");
  await mongoose.disconnect();

  console.log("14. Signup second user");
  const signup2 = await request("POST", "/signup", {
    jar: otherJar,
    form: user2,
  });
  expect(signup2.status === 302, `Signup user2 failed with ${signup2.status}`);
  expect(signup2.headers.location === "/listings", `Signup user2 redirect should go to /listings, got ${signup2.headers.location}`);

  console.log("15. Confirm non-owner cannot edit/delete listing or review");
  const otherListingPage = await request("GET", `/listings/${secondListingId}`, { jar: otherJar });
  expect(otherListingPage.status === 200, `Other user could not open listing page: ${otherListingPage.status}`);
  expect(!otherListingPage.body.includes(`/listings/${secondListingId}/edit`), "Non-owner should not see listing edit button");
  expect(!otherListingPage.body.includes(`review-edit-${reviewId}`), "Non-owner should not see review edit button");

  const unauthorizedListingEdit = await request("GET", `/listings/${secondListingId}/edit`, { jar: otherJar });
  expect(unauthorizedListingEdit.status === 302, `Unauthorized listing edit should redirect, got ${unauthorizedListingEdit.status}`);
  expect(unauthorizedListingEdit.headers.location === `/listings/${secondListingId}`, `Unauthorized listing edit redirected to ${unauthorizedListingEdit.headers.location}`);

  const unauthorizedListingDelete = await request("POST", `/listings/${secondListingId}?_method=DELETE`, { jar: otherJar });
  expect(unauthorizedListingDelete.status === 302, `Unauthorized listing delete should redirect, got ${unauthorizedListingDelete.status}`);
  expect(unauthorizedListingDelete.headers.location === `/listings/${secondListingId}`, `Unauthorized listing delete redirected to ${unauthorizedListingDelete.headers.location}`);

  const unauthorizedReviewUpdate = await request("POST", `/listings/${secondListingId}/reviews/${reviewId}?_method=PUT`, {
    jar: otherJar,
    form: {
      "review[rating]": "1",
      "review[comment]": "Hacked",
    },
  });
  expect(unauthorizedReviewUpdate.status === 302, `Unauthorized review update should redirect, got ${unauthorizedReviewUpdate.status}`);
  expect(unauthorizedReviewUpdate.headers.location === `/listings/${secondListingId}`, `Unauthorized review update redirected to ${unauthorizedReviewUpdate.headers.location}`);

  const unauthorizedReviewDelete = await request("POST", `/listings/${secondListingId}/reviews/${reviewId}?_method=DELETE`, {
    jar: otherJar,
  });
  expect(unauthorizedReviewDelete.status === 302, `Unauthorized review delete should redirect, got ${unauthorizedReviewDelete.status}`);
  expect(unauthorizedReviewDelete.headers.location === `/listings/${secondListingId}`, `Unauthorized review delete redirected to ${unauthorizedReviewDelete.headers.location}`);

  await mongoose.connect(dbUrl);
  const stillThereListing = await Listing.findById(secondListingId);
  const stillThereReview = await Review.findById(reviewId);
  expect(stillThereListing, "Unauthorized user should not be able to delete listing");
  expect(stillThereReview, "Unauthorized user should not be able to delete review");
  expect(stillThereReview.comment === "Updated amazing stay", "Unauthorized user should not be able to update review");
  await mongoose.disconnect();

  console.log("16. Delete review as owner");
  const deleteReview = await request("POST", `/listings/${secondListingId}/reviews/${reviewId}?_method=DELETE`, {
    jar: ownerJar,
  });
  expect(deleteReview.status === 302, `Delete review failed with ${deleteReview.status}`);
  expect(deleteReview.headers.location === `/listings/${secondListingId}`, `Delete review redirected to ${deleteReview.headers.location}`);

  await mongoose.connect(dbUrl);
  const deletedReview = await Review.findById(reviewId);
  expect(!deletedReview, "Review was not deleted");
  await mongoose.disconnect();

  console.log("All end-to-end checks passed.");
}

main().catch((err) => {
  console.error("E2E TEST FAILED:", err.message);
  process.exit(1);
});
