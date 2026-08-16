const http = require("http");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/user");
const Listing = require("../models/listing");
const Review = require("../models/review");

const BASE_URL = "http://127.0.0.1:8080";
const dbUrl =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/wanderlust";
const fixtureBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFfQAAAAASUVORK5CYII=";
const fixturePath = path.join(__dirname, "..", "public", "uploads", "e2e-source-image.png");

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  add(setCookieHeaders = []) {
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) continue;
      this.cookies.set(pair.slice(0, eqIndex).trim(), pair.slice(eqIndex + 1).trim());
    }
  }
  header() {
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function request(method, urlPath, { jar, form } = {}) {
  return new Promise((resolve, reject) => {
    const body = form ? new URLSearchParams(form).toString() : null;
    const req = http.request(`${BASE_URL}${urlPath}`, {
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

function multipartRequest(urlPath, { jar, fields, fileField, filePath, fileName, contentType }) {
  return new Promise((resolve, reject) => {
    const boundary = `----WanderlustBoundary${Date.now()}`;
    const fileBuffer = fs.readFileSync(filePath);
    const parts = [];

    for (const [name, value] of Object.entries(fields)) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
    }

    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const req = http.request(`${BASE_URL}${urlPath}`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
        ...(jar && jar.header() ? { Cookie: jar.header() } : {}),
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
    req.write(body);
    req.end();
  });
}

async function main() {
  const ts = Date.now();
  const jar = new CookieJar();
  const user = {
    username: `upload_user_${ts}`,
    email: `upload_user_${ts}@example.com`,
    password: "Password123!",
  };

  fs.writeFileSync(fixturePath, Buffer.from(fixtureBase64, "base64"));

  await mongoose.connect(dbUrl);
  await User.deleteMany({ username: user.username });
  await mongoose.disconnect();

  console.log("1. Signup and login");
  const signup = await request("POST", "/signup", { jar, form: user });
  expect(signup.status === 302 && signup.headers.location === "/listings", "Signup/login failed");

  console.log("2. Create listing with local image upload");
  const createListing = await multipartRequest("/listings", {
    jar,
    fields: {
      "listing[title]": `Local Upload Listing ${ts}`,
      "listing[description]": "Listing created with a local uploaded image",
      "listing[price]": "3000",
      "listing[location]": "Lahore",
      "listing[country]": "Pakistan",
      "listing[category]": "City",
      "listing[propertyType]": "Apartment",
      "listing[maxGuests]": "2",
    },
    fileField: "image",
    filePath: fixturePath,
    fileName: "selected-local-image.png",
    contentType: "image/png",
  });
  expect(createListing.status === 302, `Create listing failed with ${createListing.status}`);
  expect(/^\/listings\/[a-f0-9]{24}$/i.test(createListing.headers.location), `Unexpected redirect: ${createListing.headers.location}`);
  const listingId = createListing.headers.location.split("/").pop();

  await mongoose.connect(dbUrl);
  const listing = await Listing.findById(listingId);
  const dbUser = await User.findOne({ username: user.username });
  expect(listing, "Listing not found in DB");
  expect(String(listing.owner) === String(dbUser._id), "Listing owner mismatch");
  expect(listing.image && typeof listing.image.url === "string", "Listing image URL not saved");
  expect(listing.image.url.startsWith("/uploads/"), `Expected local uploads URL, got ${listing.image.url}`);
  expect(listing.image.filename && !listing.image.filename.includes("\\"), "Listing image filename invalid");
  const uploadedPath = path.join(__dirname, "..", "public", listing.image.url.replace(/^\//, ""));
  expect(fs.existsSync(uploadedPath), `Uploaded file not found at ${uploadedPath}`);
  await mongoose.disconnect();

  console.log("3. Confirm uploaded image renders on show page");
  const showPage = await request("GET", `/listings/${listingId}`, { jar });
  expect(showPage.status === 200, `Show page failed with ${showPage.status}`);
  expect(showPage.body.includes(listing.image.url), "Show page does not render uploaded image URL");

  console.log("4. Confirm uploaded image renders on listings index");
  const indexPage = await request("GET", "/listings", { jar });
  expect(indexPage.status === 200, `Index page failed with ${indexPage.status}`);
  expect(indexPage.body.includes(listing.image.url), "Index page does not render uploaded image URL");

  console.log("5. Confirm static file is directly accessible");
  const staticImage = await request("GET", listing.image.url, { jar });
  expect(staticImage.status === 200, `Static uploaded image not accessible, got ${staticImage.status}`);

  console.log("6. Confirm review creation still works");
  const createReview = await request("POST", `/listings/${listingId}/reviews`, {
    jar,
    form: {
      "review[rating]": "5",
      "review[comment]": "Local upload review still works",
    },
  });
  expect(createReview.status === 302 && createReview.headers.location === `/listings/${listingId}`, "Review creation failed after upload changes");

  await mongoose.connect(dbUrl);
  const listingWithReview = await Listing.findById(listingId).populate("reviews");
  expect(listingWithReview.reviews.length > 0, "Review was not attached after upload changes");
  const review = await Review.findById(listingWithReview.reviews[listingWithReview.reviews.length - 1]._id);
  expect(String(review.author) === String(dbUser._id), "Review author mismatch after upload changes");
  await mongoose.disconnect();

  console.log("7. Confirm ownership edit access still works");
  const editPage = await request("GET", `/listings/${listingId}/edit`, { jar });
  expect(editPage.status === 200, `Owner edit page access failed with ${editPage.status}`);

  console.log("8. Confirm logout/login still works");
  const logout = await request("GET", "/logout", { jar });
  expect(logout.status === 302 && logout.headers.location === "/listings", "Logout failed");
  const login = await request("POST", "/login", { jar, form: { username: user.username, password: user.password } });
  expect(login.status === 302 && login.headers.location === "/listings", "Login after logout failed");

  console.log("All localhost upload checks passed.");
}

main().catch((err) => {
  console.error("LOCAL UPLOAD TEST FAILED:", err.message);
  process.exit(1);
});
