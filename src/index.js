import dotenv from "dotenv";
import connectDB from "./db/index.db.js";
import { app } from "./app.js";

dotenv.config({
  path: "../.env",
});


const Port = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.listen(Port, () => {
      console.log(`Server is running on port ${Port}`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection failed !! ", err);
  });
