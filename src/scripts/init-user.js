require("dotenv").config();
const { registerUser } = require("../../src/auth");
(async () => {
  const pass = process.argv[2] || "admin1234";
  const result = await registerUser("admin", pass);
  if (result.success) {
    console.log("OK - admin created");
    console.log("TOTP Secret:", result.secret);
  } else {
    console.error("Error:", result.error);
  }
})();
