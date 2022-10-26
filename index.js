const app = require("express")();
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("redis");
require("dotenv").config();

const port = 8080;
const duration = 3600;

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

(async () => {
  await redisClient.connect();
})();

redisClient.on("connect", () => console.log("::> Redis Client Connected"));
redisClient.on("error", (err) => console.log("<:: Redis Client Error", err));

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const redisData = await getRedisData("photos");
  if (redisData != null) {
    res.json(JSON.parse(redisData));
  } else {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos/",
      {
        params: { albumId },
      }
    );

    await redisClient.setex("photos", duration, JSON.stringify(data));

    res.json(data);
  }
});

app.get("/photos/:id", async (req, res) => {
  const redisData = await getRedisData(`photo-${req.params.id}`);
  if (redisData != null) {
    res.json(JSON.parse(redisData));
  } else {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );

    await redisClient.setex(
      `photo-${req.params.id}`,
      duration,
      JSON.stringify(data)
    );
    res.json(data);
  }
});

app.listen(port, () => console.log(`server running on ${port}`));

const getRedisData = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data;
  } catch (e) {
    console.log(e.message);
  }
};
