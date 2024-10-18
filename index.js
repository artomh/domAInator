// Description: This file contains the code for the backend server that will handle the API requests from the frontend.
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const whoiser = require("whoiser");
require("dotenv").config();

// Initialize Express app
const app = express();

app.use(cors());
// Use express.json() middleware to parse JSON request bodies
app.use(express.json());

const openai = new OpenAI({
  organization: process.env.OPENAI_ORG_ID,
  project: process.env.OPENAI_PROJECT_ID,
});

app.get("/", function (req, res) {
  res.sendFile("main.html", { root: "." });
});

// Route to handle the domain generation request
app.post("/domaingen", async (req, res) => {
  const description = req.body.description;
  const tld = req.body.tld;
  const length = req.body.length;
  const count = req.body.count;
  try {
    const domainrequest =
      "Generate a list of " +
      count +
      " domain name ideas for the following description:" +
      description +
      ". Do not add a domain extension. Keep the domain name under " +
      length +
      " characters. Return the list of domain names as a flat JSON array. Make sure first parameter is called 'domainNames'.";
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 1000,
      messages: [
        { role: "system", content: "You are a highly intelligent chatbot." },
        { role: "user", content: domainrequest },
      ],
    });
    const result = JSON.parse(response.choices[0].message.content);
    let domainLookups = {};
    for (const domain of result.domainNames) {
      const domainWithSuffix = domain + tld;
      const domainInfo = await whoiser(domainWithSuffix);
      console.log(domainInfo);
      const registrarData = domainInfo[Object.keys(domainInfo)[0]];
      const domainStatus = registrarData["Domain Status"];
      if (domainStatus.length === 0) {
        domainLookups[domainWithSuffix] = "Available";
      } else {
        domainLookups[domainWithSuffix] = "Taken";
      }
    }
    res.json({ message: "Data received", data: domainLookups });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to handle the domain availability request
app.post("/domainverify", async (req, res) => {
  const domain = req.body.domainName;
  try {
    const domainInfo = await whoiser(domain);
    const registrarData = domainInfo[Object.keys(domainInfo)[0]];
    const domainStatus = registrarData["Domain Status"];
    if (domainStatus.length === 0) {
      res.json({ message: "Domain is available", data: "Available" });
    } else {
      res.json({ message: "Domain is taken", data: "Taken" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start the server with appropriate port
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
