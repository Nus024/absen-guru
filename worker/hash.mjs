import bcrypt from "bcryptjs";

const hash = bcrypt.hashSync("password123", 10);
console.log("Hashed password:", hash);
