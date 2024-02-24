import express from "express";
import { checkForDiscounts } from "./server.js";
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  return res.send("Not a valid endpoint");
});

app.get("/check", async (req, res) => {
  await checkForDiscounts();
  return res.send("fetching discounts");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
