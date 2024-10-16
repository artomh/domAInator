// Import necessary module using ES6 syntax
import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";
import whoiser from "whoiser";

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
  res.sendFile("index.html", { root: "." });
});

// Define a single POST route
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
