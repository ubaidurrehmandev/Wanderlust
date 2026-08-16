const http = require("http");

const BASE_URL = "http://127.0.0.1:8080";

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

(async () => {
  const freshJar = new CookieJar();
  const userJar = new CookieJar();
  const username = `session_user_${Date.now()}`;
  const password = "Password123!";
  const email = `${username}@example.com`;

  console.log("Fresh visitor GET /");
  const freshHome = await request("GET", "/", { jar: freshJar });
  console.log(JSON.stringify({ status: freshHome.status, location: freshHome.headers.location || null, hasLogout: freshHome.body.includes("Log Out"), hasLogin: freshHome.body.includes("Log In") }));

  console.log("Signup/login user");
  const signup = await request("POST", "/signup", { jar: userJar, form: { username, password, email } });
  console.log(JSON.stringify({ status: signup.status, location: signup.headers.location || null }));

  console.log("Authenticated GET /listings");
  const authedListings = await request("GET", "/listings", { jar: userJar });
  console.log(JSON.stringify({ status: authedListings.status, hasLogout: authedListings.body.includes("Log Out"), hasGreeting: authedListings.body.includes(`Hi, ${username}!`) }));

  console.log("Refresh GET /listings");
  const refresh = await request("GET", "/listings", { jar: userJar });
  console.log(JSON.stringify({ status: refresh.status, hasLogout: refresh.body.includes("Log Out"), hasGreeting: refresh.body.includes(`Hi, ${username}!`) }));

  console.log("Logout");
  const logout = await request("GET", "/logout", { jar: userJar });
  console.log(JSON.stringify({ status: logout.status, location: logout.headers.location || null, setCookie: logout.headers["set-cookie"] || null }));

  console.log("Post-logout GET /listings");
  const postLogout = await request("GET", "/listings", { jar: userJar });
  console.log(JSON.stringify({ status: postLogout.status, hasLogout: postLogout.body.includes("Log Out"), hasLogin: postLogout.body.includes("Log In"), hasGreeting: postLogout.body.includes(`Hi, ${username}!`) }));

  console.log("New fresh visitor GET /listings");
  const anotherFreshJar = new CookieJar();
  const anotherFresh = await request("GET", "/listings", { jar: anotherFreshJar });
  console.log(JSON.stringify({ status: anotherFresh.status, hasLogout: anotherFresh.body.includes("Log Out"), hasLogin: anotherFresh.body.includes("Log In") }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
